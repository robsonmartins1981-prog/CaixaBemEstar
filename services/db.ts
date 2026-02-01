
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

// Sanitização robusta para precisão financeira
const sanitizeNumber = (val: any): number => {
  if (val === null || val === undefined || isNaN(val)) return 0;
  if (typeof val === 'number') return isFinite(val) ? Number(val.toFixed(2)) : 0;
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
        debit: sanitizeNumber(e.debit),
        sangria: sanitizeNumber(e.sangria)
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
      debit: sanitizeNumber(entry.debit),
      sangria: sanitizeNumber(entry.sangria)
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
      debit: sanitizeNumber(entry.debit),
      sangria: sanitizeNumber(entry.sangria)
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
        debit: sanitizeNumber(updated.debit),
        sangria: sanitizeNumber(updated.sangria)
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
      suppliers[idx] = { ...suppliers[idx], ...updated };
      safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    }
  },

  deleteSupplier: (id: string) => {
    const suppliers = db.getSuppliers().filter(s => s.id !== id);
    safeSetItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  getFullBackup: () => ({
    version: '4.6',
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
      safeSetItem(KEYS.ENTRIES, JSON.stringify(backup.data.entries));
      safeSetItem(KEYS.EXPENSES, JSON.stringify(backup.data.expenses));
      safeSetItem(KEYS.SUPPLIERS, JSON.stringify(backup.data.suppliers));
      safeSetItem(KEYS.RATES, JSON.stringify(backup.data.rates));
      return true;
    } catch (e) { return false; }
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
        pix: sanitizeNumber(pix),
        sangria: 0
      });
    });
    return lines.length - 1;
  }
};
