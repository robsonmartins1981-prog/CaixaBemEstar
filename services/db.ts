
import { CashEntry, Expense } from '../types';

const KEYS = {
  ENTRIES: 'fm_cash_entries',
  EXPENSES: 'fm_expenses',
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const db = {
  generateId,
  
  getEntries: (): CashEntry[] => {
    try {
      const data = localStorage.getItem(KEYS.ENTRIES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Erro ao ler entradas do banco local:", e);
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

  saveEntry: (entry: Omit<CashEntry, 'code'>) => {
    const entries = db.getEntries();
    const newEntry: CashEntry = {
      ...entry,
      sangria: entry.sangria || 0,
      code: db.getNextCode()
    };
    entries.push(newEntry);
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
      console.error("Erro ao ler despesas do banco local:", e);
      return [];
    }
  },

  saveExpense: (expense: Expense) => {
    const expenses = db.getExpenses();
    expenses.push(expense);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
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
  }
};
