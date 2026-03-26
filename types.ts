
export type ShiftType = 'CAIXA 01 (MANHÃ)' | 'CAIXA 02 (TARDE)' | 'CAIXA 03 (NOITE)';

export interface CashEntry {
  id: string;
  code: string;
  date: string;
  shift: ShiftType;
  cash: number;
  credit: number;
  debit: number;
  pix: number;
  sangria?: number;
}

export type ExpenseNature = 
  | 'Custo da Mercadoria Vendida (CMV)' 
  | 'Frete/Logística'
  | 'Embalagens'
  | 'Impostos'
  | 'Aluguel'
  | 'Salários e Encargos Trabalhistas'
  | 'Pró-labore'
  | 'Utilidades'
  | 'Marketing e Publicidade'
  | 'Contabilidade'
  | 'Manutenção e Limpeza'
  | 'Sistemas de Gestão'
  | 'Equipamentos'
  | 'Lanchonete'
  | 'Outros';

export type CostType = 'Fixo' | 'Variável';
export type ExpenseStatus = 'Pendente' | 'Pago';

export interface Expense {
  id: string;
  description: string;
  supplier: string;
  dueDate: string;
  purchaseDate?: string;
  value: number;
  nature: ExpenseNature;
  costType: CostType;
  status: ExpenseStatus;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface CardRates {
  debit: number;
  credit: number;
}
