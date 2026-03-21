
import { CashEntry, Expense, CardRates, Supplier } from '../types.ts';
import { db as firestore, auth } from '../firebase.ts';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const KEYS = {
  ENTRIES: 'caixa',
  EXPENSES: 'contas',
  RATES: 'fm_card_rates',
  SUPPLIERS: 'fornecedores',
  RESTORE_POINT: 'fm_auto_restore_point'
};

export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError')) {
      alert("⚠️ O limite de armazenamento do navegador foi atingido!");
    }
    return false;
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const isDemo = () => localStorage.getItem('isDemoMode') === 'true';

// Sanitização robusta para precisão financeira (Arredondamento fixo em 2 casas)
const sanitizeNumber = (val: any): number => {
  if (val === null || val === undefined || isNaN(val)) return 0;
  if (typeof val === 'number') {
    return isFinite(val) ? Math.round(val * 100) / 100 : 0;
  }
  const s = String(val)
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, (match, offset, string) => {
        return string.indexOf(',') > -1 ? '' : '.';
    })
    .replace(',', '.')
    .trim();
  const n = parseFloat(s);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export const db = {
  generateId,

  testConnection: async () => {
    try {
      await getDocFromServer(doc(firestore, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. ");
      }
    }
  },
  
  getCardRates: async (): Promise<CardRates> => {
    if (auth.currentUser && !isDemo()) {
      try {
        const docRef = doc(firestore, 'configuracoes', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            debit: sanitizeNumber(data.debit) || 0.8,
            credit: sanitizeNumber(data.credit) || 2.8
          };
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `configuracoes/${auth.currentUser.uid}`);
      }
    }
    // Fallback to localStorage
    try {
      const data = localStorage.getItem(KEYS.RATES);
      const parsed = data ? JSON.parse(data) : { debit: 0.8, credit: 2.8 };
      return {
        debit: sanitizeNumber(parsed.debit) || 0.8,
        credit: sanitizeNumber(parsed.credit) || 2.8
      };
    } catch (e) {
      return { debit: 0.8, credit: 2.8 };
    }
  },

  saveCardRates: async (rates: CardRates) => {
    if (auth.currentUser && !isDemo()) {
      try {
        await setDoc(doc(firestore, 'configuracoes', auth.currentUser.uid), {
          ...rates,
          debit: sanitizeNumber(rates.debit),
          credit: sanitizeNumber(rates.credit),
          uid: auth.currentUser.uid
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `configuracoes/${auth.currentUser.uid}`);
      }
    }
    safeSetItem(KEYS.RATES, JSON.stringify({
      debit: sanitizeNumber(rates.debit),
      credit: sanitizeNumber(rates.credit)
    }));
  },

  getEntries: async (): Promise<CashEntry[]> => {
    if (auth.currentUser && !isDemo()) {
      try {
        const q = query(collection(firestore, 'caixa'), where('uid', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          cash: sanitizeNumber(doc.data().cash),
          pix: sanitizeNumber(doc.data().pix),
          credit: sanitizeNumber(doc.data().credit),
          debit: sanitizeNumber(doc.data().debit)
        } as CashEntry));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'caixa');
      }
    }
    // Fallback to localStorage
    try {
      const data = localStorage.getItem(KEYS.ENTRIES);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed.map(e => ({
        ...e,
        cash: sanitizeNumber(e.cash),
        pix: sanitizeNumber(e.pix),
        credit: sanitizeNumber(e.credit),
        debit: sanitizeNumber(e.debit)
      })) : [];
    } catch (e) {
      return [];
    }
  },

  upsertEntry: async (entry: Omit<CashEntry, 'id' | 'code'>) => {
    const sanitized = {
      ...entry,
      cash: sanitizeNumber(entry.cash),
      pix: sanitizeNumber(entry.pix),
      credit: sanitizeNumber(entry.credit),
      debit: sanitizeNumber(entry.debit)
    };

    if (auth.currentUser && !isDemo()) {
      try {
        const q = query(
          collection(firestore, 'caixa'), 
          where('uid', '==', auth.currentUser.uid),
          where('date', '==', sanitized.date),
          where('shift', '==', sanitized.shift)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docId = querySnapshot.docs[0].id;
          await updateDoc(doc(firestore, 'caixa', docId), { ...sanitized });
        } else {
          // Need to get all entries to calculate code, or just use a timestamp
          const allEntries = await db.getEntries();
          await addDoc(collection(firestore, 'caixa'), {
            ...sanitized,
            uid: auth.currentUser.uid,
            code: (allEntries.length + 1).toString().padStart(4, '0')
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'caixa');
      }
    }

    // LocalStorage sync
    const entries = await db.getEntries();
    const idx = entries.findIndex(e => e.date === sanitized.date && e.shift === sanitized.shift);
    if (idx !== -1) {
      entries[idx] = { ...entries[idx], ...sanitized };
    } else {
      entries.push({ ...sanitized, id: generateId(), code: (entries.length + 1).toString().padStart(4, '0') });
    }
    safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  saveEntry: async (entry: CashEntry) => {
    if (auth.currentUser && !isDemo()) {
      try {
        await addDoc(collection(firestore, 'caixa'), {
          ...entry,
          cash: sanitizeNumber(entry.cash),
          pix: sanitizeNumber(entry.pix),
          credit: sanitizeNumber(entry.credit),
          debit: sanitizeNumber(entry.debit),
          uid: auth.currentUser.uid
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'caixa');
      }
    }
    const entries = await db.getEntries();
    entries.push({
      ...entry,
      cash: sanitizeNumber(entry.cash),
      pix: sanitizeNumber(entry.pix),
      credit: sanitizeNumber(entry.credit),
      debit: sanitizeNumber(entry.debit)
    });
    safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  updateEntry: async (id: string, updated: Omit<CashEntry, 'id' | 'code'>) => {
    const sanitized = {
      ...updated,
      cash: sanitizeNumber(updated.cash),
      pix: sanitizeNumber(updated.pix),
      credit: sanitizeNumber(updated.credit),
      debit: sanitizeNumber(updated.debit)
    };

    if (auth.currentUser && !isDemo()) {
      try {
        await updateDoc(doc(firestore, 'caixa', id), sanitized);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `caixa/${id}`);
      }
    }

    const entries = await db.getEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx !== -1) {
      entries[idx] = { 
        ...entries[idx], 
        ...sanitized
      };
      safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
    }
  },

  getExpenses: async (): Promise<Expense[]> => {
    if (auth.currentUser && !isDemo()) {
      try {
        const q = query(collection(firestore, 'contas'), where('uid', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          value: sanitizeNumber(doc.data().value)
        } as Expense));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'contas');
      }
    }
    try {
      const data = localStorage.getItem(KEYS.EXPENSES);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed.map(e => ({
        ...e,
        value: sanitizeNumber(e.value)
      })) : [];
    } catch (e) {
      return [];
    }
  },

  saveExpense: async (expense: Omit<Expense, 'id'>) => {
    if (auth.currentUser && !isDemo()) {
      try {
        await addDoc(collection(firestore, 'contas'), {
          ...expense,
          value: sanitizeNumber(expense.value),
          uid: auth.currentUser.uid
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'contas');
      }
    }
    const expenses = await db.getExpenses();
    expenses.push({ ...expense, id: generateId(), value: sanitizeNumber(expense.value) });
    safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  updateExpense: async (id: string, updated: Omit<Expense, 'id'>) => {
    const sanitized = { ...updated, value: sanitizeNumber(updated.value) };
    if (auth.currentUser && !isDemo()) {
      try {
        await updateDoc(doc(firestore, 'contas', id), sanitized);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `contas/${id}`);
      }
    }
    const expenses = await db.getExpenses();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      expenses[idx] = { ...expenses[idx], ...sanitized };
      safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
    }
  },

  updateExpenseStatus: async (id: string, status: 'Pendente' | 'Pago') => {
    if (auth.currentUser && !isDemo()) {
      try {
        await updateDoc(doc(firestore, 'contas', id), { status });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `contas/${id}`);
      }
    }
    const expenses = await db.getExpenses();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      expenses[idx].status = status;
      safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
    }
  },

  deleteEntry: async (id: string) => {
    if (auth.currentUser && !isDemo()) {
      try {
        await deleteDoc(doc(firestore, 'caixa', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `caixa/${id}`);
      }
    }
    const entries = (await db.getEntries()).filter(e => e.id !== id);
    safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  deleteExpense: async (id: string) => {
    if (auth.currentUser && !isDemo()) {
      try {
        await deleteDoc(doc(firestore, 'contas', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `contas/${id}`);
      }
    }
    const expenses = (await db.getExpenses()).filter(e => e.id !== id);
    safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    if (auth.currentUser && !isDemo()) {
      try {
        const q = query(collection(firestore, 'fornecedores'), where('uid', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Supplier));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'fornecedores');
      }
    }
    try {
      const data = localStorage.getItem(KEYS.SUPPLIERS);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },

  saveSupplier: async (supplier: Omit<Supplier, 'id'>) => {
    if (auth.currentUser && !isDemo()) {
      try {
        await addDoc(collection(firestore, 'fornecedores'), {
          ...supplier,
          uid: auth.currentUser.uid
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'fornecedores');
      }
    }
    const suppliers = await db.getSuppliers();
    suppliers.push({ ...supplier, id: generateId() });
    safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  updateSupplier: async (id: string, updated: Omit<Supplier, 'id'>) => {
    if (auth.currentUser && !isDemo()) {
      try {
        await updateDoc(doc(firestore, 'fornecedores', id), updated);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `fornecedores/${id}`);
      }
    }
    const suppliers = await db.getSuppliers();
    const idx = suppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      const oldName = suppliers[idx].name;
      suppliers[idx] = { ...suppliers[idx], ...updated };
      safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));

      // Cascade update to expenses if supplier name changed
      if (oldName !== updated.name) {
        const expenses = await db.getExpenses();
        let changed = false;
        expenses.forEach(async exp => {
          if (exp.supplier === oldName || exp.supplier.toLowerCase() === oldName.toLowerCase()) {
            exp.supplier = updated.name;
            changed = true;
            if (auth.currentUser && !isDemo()) {
              await updateDoc(doc(firestore, 'contas', exp.id), { supplier: updated.name });
            }
          }
        });
        if (changed) {
          safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
        }
      }
    }
  },

  deleteSupplier: async (id: string) => {
    if (auth.currentUser && !isDemo()) {
      try {
        await deleteDoc(doc(firestore, 'fornecedores', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `fornecedores/${id}`);
      }
    }
    const suppliers = (await db.getSuppliers()).filter(s => s.id !== id);
    safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  getFullBackup: async () => ({
    version: '5.0',
    timestamp: new Date().toISOString(),
    data: {
      entries: await db.getEntries(),
      expenses: await db.getExpenses(),
      suppliers: await db.getSuppliers(),
      rates: await db.getCardRates()
    }
  }),

  restoreFullBackup: async (backup: any) => {
    try {
      if (!backup?.data) return false;

      // 1. Merge de Entradas de Caixa (Upsert por Data e Turno)
      const currentEntries = await db.getEntries();
      if (Array.isArray(backup.data.entries)) {
        for (const newEntry of backup.data.entries) {
          const idx = currentEntries.findIndex(ce => ce.date === newEntry.date && ce.shift === newEntry.shift);
          if (idx !== -1) {
            currentEntries[idx] = { ...currentEntries[idx], ...newEntry };
            if (auth.currentUser && !isDemo()) {
              await updateDoc(doc(firestore, 'caixa', currentEntries[idx].id), { ...newEntry });
            }
          } else {
            currentEntries.push(newEntry);
            if (auth.currentUser && !isDemo()) {
              await addDoc(collection(firestore, 'caixa'), { ...newEntry, uid: auth.currentUser.uid });
            }
          }
        }
      }
      safeSetItem(KEYS.ENTRIES, JSON.stringify(currentEntries));

      // 2. Merge de Despesas (Upsert por ID)
      const currentExpenses = await db.getExpenses();
      if (Array.isArray(backup.data.expenses)) {
        for (const newExp of backup.data.expenses) {
          const idx = currentExpenses.findIndex(ce => ce.id === newExp.id);
          if (idx !== -1) {
            currentExpenses[idx] = { ...currentExpenses[idx], ...newExp };
            if (auth.currentUser && !isDemo()) {
              await updateDoc(doc(firestore, 'contas', currentExpenses[idx].id), { ...newExp });
            }
          } else {
            currentExpenses.push(newExp);
            if (auth.currentUser && !isDemo()) {
              await addDoc(collection(firestore, 'contas'), { ...newExp, uid: auth.currentUser.uid });
            }
          }
        }
      }
      safeSetItem(KEYS.EXPENSES, JSON.stringify(currentExpenses));

      // 3. Merge de Fornecedores (Upsert por Nome)
      const currentSuppliers = await db.getSuppliers();
      if (Array.isArray(backup.data.suppliers)) {
        for (const newSup of backup.data.suppliers) {
          const idx = currentSuppliers.findIndex(cs => cs.name.toLowerCase() === newSup.name.toLowerCase());
          if (idx !== -1) {
            currentSuppliers[idx] = { ...currentSuppliers[idx], ...newSup };
            if (auth.currentUser && !isDemo()) {
              await updateDoc(doc(firestore, 'fornecedores', currentSuppliers[idx].id), { ...newSup });
            }
          } else {
            currentSuppliers.push(newSup);
            if (auth.currentUser && !isDemo()) {
              await addDoc(collection(firestore, 'fornecedores'), { ...newSup, uid: auth.currentUser.uid });
            }
          }
        }
      }
      safeSetItem(KEYS.SUPPLIERS, JSON.stringify(currentSuppliers));

      // 4. Taxas de Cartão (Sobrescrita simples pois é configuração única)
      if (backup.data.rates) {
        await db.saveCardRates(backup.data.rates);
      }

      return true;
    } catch (e) { 
      console.error("Erro na mesclagem de backup:", e);
      return false; 
    }
  },

  clearAllData: async () => {
    if (auth.currentUser && !isDemo()) {
      // Delete all user data from Firestore
      try {
        const entries = await db.getEntries();
        for (const e of entries) await deleteDoc(doc(firestore, 'caixa', e.id));
        
        const expenses = await db.getExpenses();
        for (const e of expenses) await deleteDoc(doc(firestore, 'contas', e.id));
        
        const suppliers = await db.getSuppliers();
        for (const s of suppliers) await deleteDoc(doc(firestore, 'fornecedores', s.id));
        
        await deleteDoc(doc(firestore, 'configuracoes', auth.currentUser.uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'all');
      }
    }
    localStorage.removeItem(KEYS.ENTRIES);
    localStorage.removeItem(KEYS.EXPENSES);
    localStorage.removeItem(KEYS.SUPPLIERS);
    localStorage.removeItem(KEYS.RATES);
    return true;
  },

  seedInitialData: async (csv: string) => {
    const entries = await db.getEntries();
    if (entries.length > 0) return 0;
    const lines = csv.trim().split('\n');
    for (const line of lines.slice(1)) {
      const [date, shift, cash, credit, debit, pix] = line.split(',');
      await db.upsertEntry({
        date: date.trim(),
        shift: (shift.includes('Tarde') ? 'CAIXA 02 (TARDE)' : 'CAIXA 01 (MANHÃ)') as any,
        cash: sanitizeNumber(cash),
        credit: sanitizeNumber(credit),
        debit: sanitizeNumber(debit),
        pix: sanitizeNumber(pix)
      });
    }
    return lines.length - 1;
  }
};

