
import { CashEntry, Expense, CardRates, Supplier } from '../types.ts';

const KEYS = {
  ENTRIES: 'fm_cash_entries',
  EXPENSES: 'fm_expenses',
  RATES: 'fm_card_rates',
  SUPPLIERS: 'fm_suppliers',
  RESTORE_POINT: 'fm_auto_restore_point'
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError')) {
      alert("⚠️ O limite de armazenamento do navegador foi atingido! Por favor, exporte um backup e limpe os dados antigos.");
    }
    console.error(`[DB Error] Falha ao gravar no LocalStorage (${key}):`, e);
    return false;
  }
};

const getMachineId = () => {
  try {
    let id = localStorage.getItem('fm_machine_id');
    if (!id) {
      id = 'BE-' + Math.random().toString(36).substring(2, 11).toUpperCase();
      safeSetItem('fm_machine_id', id);
    }
    return id;
  } catch (e) {
    return 'OFFLINE-CLIENT';
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Sanitização robusta para precisão financeira
const sanitizeNumber = (val: any): number => {
  if (typeof val === 'number') return isFinite(val) ? Number(val.toFixed(2)) : 0;
  if (!val) return 0;
  const s = String(val)
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const n = parseFloat(s);
  return isFinite(n) ? Number(n.toFixed(2)) : 0;
};

export const db = {
  generateId,
  
  createRestorePoint() {
    try {
      const data = db.getFullBackup();
      safeSetItem(KEYS.RESTORE_POINT, JSON.stringify(data));
    } catch (e) {
      console.warn("Falha ao criar ponto de restauração automático.", e);
    }
  },

  getCardRates: (): CardRates => {
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

  saveCardRates: (rates: CardRates) => {
    safeSetItem(KEYS.RATES, JSON.stringify({
      debit: sanitizeNumber(rates.debit),
      credit: sanitizeNumber(rates.credit)
    }));
  },

  getEntries: (): CashEntry[] => {
    try {
      const data = localStorage.getItem(KEYS.ENTRIES);
      const parsed = data ? JSON.parse(data) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(e => ({
        ...e,
        cash: sanitizeNumber(e.cash),
        pix: sanitizeNumber(e.pix),
        credit: sanitizeNumber(e.credit),
        debit: sanitizeNumber(e.debit),
        sangria: sanitizeNumber(e.sangria)
      }));
    } catch (e) {
      return [];
    }
  },
  
  getNextCode: (): string => {
    const entries = db.getEntries();
    if (entries.length === 0) return '0001';
    const codes = entries.map(e => parseInt(e.code, 10)).filter(n => !isNaN(n));
    const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
    return (maxCode + 1).toString().padStart(4, '0');
  },

  upsertEntry: (entry: Omit<CashEntry, 'id' | 'code'>) => {
    const entries = db.getEntries();
    const sanitizedEntry = {
      ...entry,
      cash: sanitizeNumber(entry.cash),
      pix: sanitizeNumber(entry.pix),
      credit: sanitizeNumber(entry.credit),
      debit: sanitizeNumber(entry.debit),
      sangria: sanitizeNumber(entry.sangria)
    };

    const existingIndex = entries.findIndex(e => e.date === sanitizedEntry.date && e.shift === sanitizedEntry.shift);
    if (existingIndex !== -1) {
      entries[existingIndex] = { ...entries[existingIndex], ...sanitizedEntry };
    } else {
      entries.push({ ...sanitizedEntry, id: generateId(), code: db.getNextCode() });
    }
    safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  saveEntry: (entry: Omit<CashEntry, 'code'>) => {
    const entries = db.getEntries();
    const sanitizedEntry = {
      ...entry,
      cash: sanitizeNumber(entry.cash),
      pix: sanitizeNumber(entry.pix),
      credit: sanitizeNumber(entry.credit),
      debit: sanitizeNumber(entry.debit),
      sangria: sanitizeNumber(entry.sangria)
    };
    entries.push({ ...sanitizedEntry, code: db.getNextCode() });
    safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  updateEntry: (id: string, updatedEntry: Omit<CashEntry, 'id' | 'code'>) => {
    const entries = db.getEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      entries[index] = { 
        ...entries[index], 
        ...updatedEntry, 
        cash: sanitizeNumber(updatedEntry.cash),
        pix: sanitizeNumber(updatedEntry.pix),
        credit: sanitizeNumber(updatedEntry.credit),
        debit: sanitizeNumber(updatedEntry.debit),
        sangria: sanitizeNumber(updatedEntry.sangria)
      };
      safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
    }
  },

  getExpenses: (): Expense[] => {
    try {
      const data = localStorage.getItem(KEYS.EXPENSES);
      const parsed = data ? JSON.parse(data) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(e => ({
        ...e,
        value: sanitizeNumber(e.value)
      }));
    } catch (e) {
      return [];
    }
  },

  upsertExpense: (expense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    const sanitizedValue = sanitizeNumber(expense.value);
    
    const existingIndex = expenses.findIndex(e => 
      e.description === expense.description && 
      e.dueDate === expense.dueDate && 
      Math.abs(e.value - sanitizedValue) < 0.01
    );

    if (existingIndex !== -1) {
      expenses[existingIndex] = { ...expenses[existingIndex], ...expense, value: sanitizedValue };
    } else {
      expenses.push({ ...expense, id: generateId(), value: sanitizedValue });
    }
    safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  saveExpense: (expense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    expenses.push({ ...expense, id: generateId(), value: sanitizeNumber(expense.value) });
    safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  updateExpense: (id: string, updatedExpense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updatedExpense, value: sanitizeNumber(updatedExpense.value) };
      safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
    }
  },

  updateExpenseStatus: (id: string, status: 'Pendente' | 'Pago') => {
    const expenses = db.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index].status = status;
      safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
    }
  },

  deleteEntry: (id: string) => {
    const entries = db.getEntries().filter(e => e.id !== id);
    safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  deleteExpense: (id: string) => {
    const expenses = db.getExpenses().filter(e => e.id !== id);
    safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  getSuppliers: (): Supplier[] => {
    try {
      const data = localStorage.getItem(KEYS.SUPPLIERS);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  saveSupplier: (supplier: Omit<Supplier, 'id'>) => {
    const suppliers = db.getSuppliers();
    suppliers.push({ ...supplier, id: generateId() });
    safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  updateSupplier: (id: string, updatedSupplier: Omit<Supplier, 'id'>) => {
    const suppliers = db.getSuppliers();
    const index = suppliers.findIndex(s => s.id === id);
    if (index !== -1) {
      suppliers[index] = { ...suppliers[index], ...updatedSupplier };
      safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    }
  },

  deleteSupplier: (id: string) => {
    const suppliers = db.getSuppliers().filter(s => s.id !== id);
    safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  getFullBackup: () => {
    return {
      version: '4.3',
      machineId: getMachineId(),
      timestamp: new Date().toISOString(),
      data: {
        entries: db.getEntries(),
        expenses: db.getExpenses(),
        suppliers: db.getSuppliers(),
        rates: db.getCardRates()
      }
    };
  },

  restoreFullBackup: (backupObj: any) => {
    try {
      if (!backupObj || typeof backupObj !== 'object' || !backupObj.data) {
        throw new Error("Backup inválido.");
      }
      
      const { entries, expenses, suppliers, rates } = backupObj.data;
      if (!Array.isArray(entries) || !Array.isArray(expenses) || !Array.isArray(suppliers)) {
        throw new Error("Dados corrompidos.");
      }

      db.createRestorePoint();
      
      const success = 
        safeSetItem(KEYS.ENTRIES, JSON.stringify(entries)) &&
        safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses)) &&
        safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
      
      if (success && rates) {
        safeSetItem(KEYS.RATES, JSON.stringify(rates));
      }
      
      return success;
    } catch (e) {
      console.error("Restauração falhou:", e);
      return false;
    }
  },

  clearAllData: () => {
    db.createRestorePoint();
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  },

  seedInitialData: (csvData: string) => {
    const entries = db.getEntries();
    if (entries.length > 0) return 0;
    
    const lines = csvData.trim().split('\n');
    const delimiter = lines[0].includes(';') ? ';' : ',';
    
    let importCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter);
      if (parts.length < 6) continue;
      
      const [date, shiftStr, cash, credit, debit, pix] = parts;
      const mappedShift = String(shiftStr).includes('Tarde') ? 'CAIXA 02 (TARDE)' : 'CAIXA 01 (MANHÃ)';
      
      db.upsertEntry({
        date: date.trim(),
        shift: mappedShift as any,
        cash: sanitizeNumber(cash),
        credit: sanitizeNumber(credit),
        debit: sanitizeNumber(debit),
        pix: sanitizeNumber(pix),
        sangria: 0
      });
      importCount++;
    }
    return importCount;
  }
};
