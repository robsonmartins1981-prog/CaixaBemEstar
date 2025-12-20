
export type ShiftType = 'CAIXA 01 (MANHÃ)' | 'CAIXA 02 (TARDE)' | 'CAIXA 03 (NOITE)';

export interface CashEntry {
  id: string;
  code: string; // Ex: 0001
  date: string;
  shift: ShiftType;
  cash: number;
  credit: number;
  debit: number;
  pix: number;
  sangria: number; // Novo campo para retiradas
}

export type ExpenseCategory = 'Fornecedores' | 'Energia' | 'Pessoal' | 'Aluguel' | 'Outros';
export type ExpenseStatus = 'Pendente' | 'Pago';

export interface Expense {
  id: string;
  description: string;
  dueDate: string;
  value: number;
  category: ExpenseCategory;
  status: ExpenseStatus;
}

export interface UnifiedEntry {
  id: string;
  date: string;
  type: 'Entrada' | 'Saída';
  description: string;
  value: number;
  originalData?: any;
}
