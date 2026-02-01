
import React from 'react';
import { LayoutDashboard, Wallet, CreditCard, Receipt, FileText, PlusCircle, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const COLORS = {
  green: '#8AC926',
  orange: '#F6511D',
  blue: '#1C5CB0',
  cyan: '#6ED1EA',
  yellow: '#FEC601',
};

export const NATURES = [
  'Custo da Mercadoria Vendida', 
  'Frete/Logística',
  'Embalagens', 
  'Impostos', 
  'Aluguel', 
  'Salários e Encargos Trabalhistas', 
  'Pró-labore',
  'Utilidades', 
  'Marketing e Publicidade', 
  'Contabilidade',
  'Manutenção e Limpeza',
  'Sistemas de Gestão',
  'Equipamentos',
  'Lanchonete',
  'Outros'
] as const;

export const COST_TYPES = ['Fixo', 'Variável'] as const;

export const SHIFTS = ['CAIXA 01 (MANHÃ)', 'CAIXA 02 (TARDE)', 'CAIXA 03 (NOITE)'] as const;

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Entries: <Wallet size={20} />,
  Expenses: <Receipt size={20} />,
  Reports: <FileText size={20} />,
  Plus: <PlusCircle size={20} />,
  Alert: <AlertCircle size={20} />,
  In: <ArrowUpRight size={20} />,
  Out: <ArrowDownLeft size={20} />,
};
