
import { CashEntry, Expense, CardRates, Supplier } from '../types';

const KEYS = {
  ENTRIES: 'fm_cash_entries',
  EXPENSES: 'fm_expenses',
  RATES: 'fm_card_rates',
  SUPPLIERS: 'fm_suppliers',
  SHEETS_URL: 'fm_sheets_url'
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const db = {
  generateId,

  setSheetsUrl: (url: string) => localStorage.setItem(KEYS.SHEETS_URL, url),
  getSheetsUrl: () => localStorage.getItem(KEYS.SHEETS_URL),

  syncToSheets: async () => {
    const url = db.getSheetsUrl();
    if (!url) throw new Error("URL do Google Sheets não configurada.");

    const backup = db.getFullBackup();
    const tables = [
      { tab: 'Entries', data: backup.data.entries },
      { tab: 'Expenses', data: backup.data.expenses },
      { tab: 'Suppliers', data: backup.data.suppliers }
    ];

    for (const table of tables) {
      for (const item of table.data) {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({ tab: table.tab, data: item })
        });
      }
    }
    return true;
  },
  
  getCardRates: (): CardRates => {
    const data = localStorage.getItem(KEYS.RATES);
    return data ? JSON.parse(data) : { debit: 0.8, credit: 2.8 };
  },

  saveCardRates: (rates: CardRates) => {
    localStorage.setItem(KEYS.RATES, JSON.stringify(rates));
  },

  getEntries: (): CashEntry[] => {
    try {
      const data = localStorage.getItem(KEYS.ENTRIES);
      return data ? JSON.parse(data) : [];
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
    const existingIndex = entries.findIndex(e => e.date === entry.date && e.shift === entry.shift);
    if (existingIndex !== -1) {
      entries[existingIndex] = { ...entries[existingIndex], ...entry, sangria: entry.sangria || 0 };
    } else {
      entries.push({ ...entry, id: generateId(), code: db.getNextCode(), sangria: entry.sangria || 0 });
    }
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  saveEntry: (entry: Omit<CashEntry, 'code'>) => {
    const entries = db.getEntries();
    entries.push({ ...entry, sangria: entry.sangria || 0, code: db.getNextCode() });
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  updateEntry: (id: string, updatedEntry: Omit<CashEntry, 'id' | 'code'>) => {
    const entries = db.getEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updatedEntry, sangria: updatedEntry.sangria || 0 };
      localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    }
  },

  getExpenses: (): Expense[] => {
    try {
      const data = localStorage.getItem(KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  upsertExpense: (expense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    const existingIndex = expenses.findIndex(e => e.description === expense.description && e.dueDate === expense.dueDate && Math.abs(e.value - expense.value) < 0.01);
    if (existingIndex !== -1) {
      expenses[existingIndex] = { ...expenses[existingIndex], ...expense };
    } else {
      expenses.push({ ...expense, id: generateId() });
    }
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  saveExpense: (expense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    expenses.push({ ...expense, id: generateId() });
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  updateExpense: (id: string, updatedExpense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updatedExpense };
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    }
  },

  updateExpenseStatus: (id: string, status: 'Pendente' | 'Pago') => {
    const expenses = db.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index].status = status;
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    }
  },

  deleteEntry: (id: string) => {
    const entries = db.getEntries().filter(e => e.id !== id);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  deleteExpense: (id: string) => {
    const expenses = db.getExpenses().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  getSuppliers: (): Supplier[] => {
    try {
      const data = localStorage.getItem(KEYS.SUPPLIERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveSupplier: (supplier: Omit<Supplier, 'id'>) => {
    const suppliers = db.getSuppliers();
    suppliers.push({ ...supplier, id: generateId() });
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  updateSupplier: (id: string, updatedSupplier: Omit<Supplier, 'id'>) => {
    const suppliers = db.getSuppliers();
    const index = suppliers.findIndex(s => s.id === id);
    if (index !== -1) {
      suppliers[index] = { ...suppliers[index], ...updatedSupplier };
      localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    }
  },

  deleteSupplier: (id: string) => {
    const suppliers = db.getSuppliers().filter(s => s.id !== id);
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  getFullBackup: () => {
    return {
      version: '2.0',
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
    if (!backupObj || !backupObj.data) throw new Error("Formato de backup inválido.");
    const { entries, expenses, suppliers, rates } = backupObj.data;
    if (entries) localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    if (expenses) localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    if (suppliers) localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    if (rates) localStorage.setItem(KEYS.RATES, JSON.stringify(rates));
    return true;
  },

  clearAllData: () => {
    localStorage.removeItem(KEYS.ENTRIES);
    localStorage.removeItem(KEYS.EXPENSES);
    localStorage.removeItem(KEYS.RATES);
    localStorage.removeItem(KEYS.SUPPLIERS);
  },

  seedInitialData: (csvData: string) => {
    const lines = csvData.trim().split('\n');
    const startIdx = lines[0].toLowerCase().includes('data') ? 1 : 0;
    let importCount = 0;
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const [date, shiftStr, cash, credit, debit, pix] = line.split(',');
      const mappedShift = shiftStr.trim() === 'Manhã' ? 'CAIXA 01 (MANHÃ)' : 'CAIXA 02 (TARDE)';
      db.upsertEntry({
        date: date.trim(),
        shift: mappedShift as any,
        cash: parseFloat(cash) || 0,
        credit: parseFloat(credit) || 0,
        debit: parseFloat(debit) || 0,
        pix: parseFloat(pix) || 0,
        sangria: 0
      });
      importCount++;
    }
    return importCount;
  }
};
