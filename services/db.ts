
import { CashEntry, Expense, CardRates, Supplier } from '../types';

const KEYS = {
  ENTRIES: 'fm_cash_entries',
  EXPENSES: 'fm_expenses',
  RATES: 'fm_card_rates',
  SUPPLIERS: 'fm_suppliers',
  RESTORE_POINT: 'fm_auto_restore_point'
};

const getMachineId = () => {
  let id = localStorage.getItem('fm_machine_id');
  if (!id) {
    id = 'BE-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem('fm_machine_id', id);
  }
  return id;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const db = {
  generateId,
  
  createRestorePoint() {
    const data = db.getFullBackup();
    localStorage.setItem(KEYS.RESTORE_POINT, JSON.stringify(data));
  },

  getCardRates: (): CardRates => {
    try {
      const data = localStorage.getItem(KEYS.RATES);
      return data ? JSON.parse(data) : { debit: 0.8, credit: 2.8 };
    } catch (e) {
      return { debit: 0.8, credit: 2.8 };
    }
  },

  saveCardRates: (rates: CardRates) => {
    localStorage.setItem(KEYS.RATES, JSON.stringify(rates));
  },

  getEntries: (): CashEntry[] => {
    try {
      const data = localStorage.getItem(KEYS.ENTRIES);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Erro ao ler entradas de caixa:", e);
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
    // Sanitização de valores para evitar NaN
    const sanitizedEntry = {
      ...entry,
      cash: Number(entry.cash) || 0,
      pix: Number(entry.pix) || 0,
      credit: Number(entry.credit) || 0,
      debit: Number(entry.debit) || 0,
      sangria: Number(entry.sangria) || 0
    };

    const existingIndex = entries.findIndex(e => e.date === sanitizedEntry.date && e.shift === sanitizedEntry.shift);
    if (existingIndex !== -1) {
      entries[existingIndex] = { ...entries[existingIndex], ...sanitizedEntry };
    } else {
      entries.push({ ...sanitizedEntry, id: generateId(), code: db.getNextCode() });
    }
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  saveEntry: (entry: Omit<CashEntry, 'code'>) => {
    const entries = db.getEntries();
    const sanitizedEntry = {
      ...entry,
      cash: Number(entry.cash) || 0,
      pix: Number(entry.pix) || 0,
      credit: Number(entry.credit) || 0,
      debit: Number(entry.debit) || 0,
      sangria: Number(entry.sangria) || 0
    };
    entries.push({ ...sanitizedEntry, code: db.getNextCode() });
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  },

  updateEntry: (id: string, updatedEntry: Omit<CashEntry, 'id' | 'code'>) => {
    const entries = db.getEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      entries[index] = { 
        ...entries[index], 
        ...updatedEntry, 
        cash: Number(updatedEntry.cash) || 0,
        pix: Number(updatedEntry.pix) || 0,
        credit: Number(updatedEntry.credit) || 0,
        debit: Number(updatedEntry.debit) || 0,
        sangria: Number(updatedEntry.sangria) || 0
      };
      localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    }
  },

  getExpenses: (): Expense[] => {
    try {
      const data = localStorage.getItem(KEYS.EXPENSES);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  upsertExpense: (expense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    const sanitizedValue = Number(expense.value) || 0;
    
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
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  saveExpense: (expense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    expenses.push({ ...expense, id: generateId(), value: Number(expense.value) || 0 });
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  updateExpense: (id: string, updatedExpense: Omit<Expense, 'id'>) => {
    const expenses = db.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updatedExpense, value: Number(updatedExpense.value) || 0 };
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
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
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
      version: '4.1',
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
      // Validação Profunda de Esquema
      if (!backupObj || typeof backupObj !== 'object' || !backupObj.data) {
        throw new Error("Formato de backup inválido.");
      }
      
      const { entries, expenses, suppliers, rates } = backupObj.data;
      
      // Valida se as chaves principais são arrays
      if (!Array.isArray(entries) || !Array.isArray(expenses) || !Array.isArray(suppliers)) {
        throw new Error("Estrutura de dados corrompida.");
      }

      db.createRestorePoint();
      
      localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
      localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
      
      if (rates && typeof rates === 'object') {
        localStorage.setItem(KEYS.RATES, JSON.stringify(rates));
      }
      
      return true;
    } catch (e) {
      console.error("Falha ao restaurar backup:", e);
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
