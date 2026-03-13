
import { CashEntry, Expense, CardRates, Supplier } from '../types.ts';

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

  upsertEntry: (entry: Omit<CashEntry, 'id' | 'code'>) => {
    const entries = db.getEntries();
    const sanitized = {
      ...entry,
      cash: sanitizeNumber(entry.cash),
      pix: sanitizeNumber(entry.pix),
      credit: sanitizeNumber(entry.credit),
      debit: sanitizeNumber(entry.debit)
    };

    const idx = entries.findIndex(e => e.date === sanitized.date && e.shift === sanitized.shift);
    if (idx !== -1) {
      entries[idx] = { ...entries[idx], ...sanitized };
    } else {
      entries.push({ ...sanitized, id: generateId(), code: (entries.length + 1).toString().padStart(4, '0') });
    }
    safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  saveEntry: (entry: CashEntry) => {
    const entries = db.getEntries();
    entries.push({
      ...entry,
      cash: sanitizeNumber(entry.cash),
      pix: sanitizeNumber(entry.pix),
      credit: sanitizeNumber(entry.credit),
      debit: sanitizeNumber(entry.debit)
    });
    safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  updateEntry: (id: string, updated: Omit<CashEntry, 'id' | 'code'>) => {
    const entries = db.getEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx !== -1) {
      entries[idx] = { 
        ...entries[idx], 
        ...updated,
        cash: sanitizeNumber(updated.cash),
        pix: sanitizeNumber(updated.pix),
        credit: sanitizeNumber(updated.credit),
        debit: sanitizeNumber(updated.debit)
      };
      safeSetItem(KEYS.ENTRIES, JSON.stringify(entries));
    }
  },

  getExpenses: (): Expense[] => {
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

  saveExpense: (expense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    expenses.push({ ...expense, id: generateId(), value: sanitizeNumber(expense.value) });
    safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  updateExpense: (id: string, updated: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      expenses[idx] = { ...expenses[idx], ...updated, value: sanitizeNumber(updated.value) };
      safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
    }
  },

  updateExpenseStatus: (id: string, status: 'Pendente' | 'Pago') => {
    const expenses = db.getExpenses();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      expenses[idx].status = status;
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
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },

  saveSupplier: (supplier: Omit<Supplier, 'id'>) => {
    const suppliers = db.getSuppliers();
    suppliers.push({ ...supplier, id: generateId() });
    safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  updateSupplier: (id: string, updated: Omit<Supplier, 'id'>) => {
    const suppliers = db.getSuppliers();
    const idx = suppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      const oldName = suppliers[idx].name;
      suppliers[idx] = { ...suppliers[idx], ...updated };
      safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));

      // Cascade update to expenses if supplier name changed
      if (oldName !== updated.name) {
        const expenses = db.getExpenses();
        let changed = false;
        expenses.forEach(exp => {
          if (exp.supplier === oldName || exp.supplier.toLowerCase() === oldName.toLowerCase()) {
            exp.supplier = updated.name;
            changed = true;
          }
        });
        if (changed) {
          safeSetItem(KEYS.EXPENSES, JSON.stringify(expenses));
        }
      }
    }
  },

  deleteSupplier: (id: string) => {
    const suppliers = db.getSuppliers().filter(s => s.id !== id);
    safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  getFullBackup: () => ({
    version: '5.0',
    timestamp: new Date().toISOString(),
    data: {
      entries: db.getEntries(),
      expenses: db.getExpenses(),
      suppliers: db.getSuppliers(),
      rates: db.getCardRates()
    }
  }),

  restoreFullBackup: (backup: any) => {
    try {
      if (!backup?.data) return false;

      // 1. Merge de Entradas de Caixa (Upsert por Data e Turno)
      const currentEntries = db.getEntries();
      if (Array.isArray(backup.data.entries)) {
        backup.data.entries.forEach((newEntry: any) => {
          const idx = currentEntries.findIndex(ce => ce.date === newEntry.date && ce.shift === newEntry.shift);
          if (idx !== -1) {
            currentEntries[idx] = { ...currentEntries[idx], ...newEntry };
          } else {
            currentEntries.push(newEntry);
          }
        });
      }
      safeSetItem(KEYS.ENTRIES, JSON.stringify(currentEntries));

      // 2. Merge de Despesas (Upsert por ID)
      const currentExpenses = db.getExpenses();
      if (Array.isArray(backup.data.expenses)) {
        backup.data.expenses.forEach((newExp: any) => {
          const idx = currentExpenses.findIndex(ce => ce.id === newExp.id);
          if (idx !== -1) {
            currentExpenses[idx] = { ...currentExpenses[idx], ...newExp };
          } else {
            currentExpenses.push(newExp);
          }
        });
      }
      safeSetItem(KEYS.EXPENSES, JSON.stringify(currentExpenses));

      // 3. Merge de Fornecedores (Upsert por Nome)
      const currentSuppliers = db.getSuppliers();
      if (Array.isArray(backup.data.suppliers)) {
        backup.data.suppliers.forEach((newSup: any) => {
          const idx = currentSuppliers.findIndex(cs => cs.name.toLowerCase() === newSup.name.toLowerCase());
          if (idx !== -1) {
            currentSuppliers[idx] = { ...currentSuppliers[idx], ...newSup };
          } else {
            currentSuppliers.push(newSup);
          }
        });
      }
      safeSetItem(KEYS.SUPPLIERS, JSON.stringify(currentSuppliers));

      // 4. Taxas de Cartão (Sobrescrita simples pois é configuração única)
      if (backup.data.rates) {
        db.saveCardRates(backup.data.rates);
      }

      return true;
    } catch (e) { 
      console.error("Erro na mesclagem de backup:", e);
      return false; 
    }
  },

  clearAllData: () => {
    localStorage.removeItem(KEYS.ENTRIES);
    localStorage.removeItem(KEYS.EXPENSES);
    localStorage.removeItem(KEYS.SUPPLIERS);
    localStorage.removeItem(KEYS.RATES);
    return true;
  },

  seedInitialData: (csv: string) => {
    const entries = db.getEntries();
    if (entries.length > 0) return 0;
    const lines = csv.trim().split('\n');
    lines.slice(1).forEach(line => {
      const [date, shift, cash, credit, debit, pix] = line.split(',');
      db.upsertEntry({
        date: date.trim(),
        shift: (shift.includes('Tarde') ? 'CAIXA 02 (TARDE)' : 'CAIXA 01 (MANHÃ)') as any,
        cash: sanitizeNumber(cash),
        credit: sanitizeNumber(credit),
        debit: sanitizeNumber(debit),
        pix: sanitizeNumber(pix)
      });
    });
    return lines.length - 1;
  }
};
