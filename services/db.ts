
import { CashEntry, Expense } from '../types';

const KEYS = {
  ENTRIES: 'fm_cash_entries',
  EXPENSES: 'fm_expenses',
};

export const db = {
  getEntries: (): CashEntry[] => {
    const data = localStorage.getItem(KEYS.ENTRIES);
    return data ? JSON.parse(data) : [];
  },
  
  getNextCode: (): string => {
    const entries = db.getEntries();
    if (entries.length === 0) return '0001';
    
    // Extrai os números dos códigos existentes e encontra o maior
    const codes = entries.map(e => parseInt(e.code, 10)).filter(n => !isNaN(n));
    const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
    return (maxCode + 1).toString().padStart(4, '0');
  },

  saveEntry: (entry: Omit<CashEntry, 'code'>) => {
    const entries = db.getEntries();
    const newEntry: CashEntry = {
      ...entry,
      code: db.getNextCode()
    };
    entries.push(newEntry);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  updateEntry: (id: string, updatedEntry: Omit<CashEntry, 'id' | 'code'>) => {
    const entries = db.getEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      // Preserva o código original ao atualizar
      entries[index] = { ...entries[index], ...updatedEntry };
      localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    }
  },

  getExpenses: (): Expense[] => {
    const data = localStorage.getItem(KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
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
