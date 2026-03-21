
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Expense, ExpenseNature, Supplier } from '../types';
import { db } from '../services/db';
import { NATURES, COST_TYPES } from '../constants';
import { 
  Plus, Trash2, Search, Filter, X, CheckSquare, Square, 
  ChevronDown, User, Calendar, Edit2, Info, Calculator, Layers,
  TrendingUp, AlertCircle, CheckCircle2, ArrowUpDown, ChevronUp, Tag,
  ArrowRight, FileUp
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { parseNFeXML, convertParsedDataToExpenses } from '../services/xmlParser';

interface AccountsPayableProps {
  onSuccess: () => void;
  expenses: Expense[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccountsPayable: React.FC<AccountsPayableProps> = ({ onSuccess, expenses }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense, direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'asc' });
  
  // Estados para filtro de data
  const [dateFilterMode, setDateFilterMode] = useState<'MES' | 'HOJE' | 'SEMANA' | 'CUSTOM' | 'TODOS'>('MES');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    description: '', supplier: '', dueDate: new Date().toISOString().split('T')[0],
    purchaseDate: new Date().toISOString().split('T')[0],
    value: 0, nature: 'Outros', costType: 'Variável', status: 'Pendente',
  });

  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [intervalDays, setIntervalDays] = useState(30);
  const [valueMode, setValueMode] = useState<'total' | 'parcel'>('total');

  const [selectedNatures, setSelectedNatures] = useState<string[]>(Array.from(NATURES));
  const [showNatureFilter, setShowNatureFilter] = useState(false);

  const [pendingXMLData, setPendingXMLData] = useState<{
    supplier: string;
    invoice: string;
    expenses: Omit<Expense, 'id'>[];
  } | null>(null);

  useEffect(() => {
    const loadSuppliers = async () => {
      const data = await db.getSuppliers();
      setAllSuppliers(data);
    };
    loadSuppliers();
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showForm) {
      const timer = setTimeout(() => {
        supplierInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showForm]);

  const filteredSuppliers = useMemo(() => {
    if (!formData.supplier.trim()) return [];
    return allSuppliers.filter(s => 
      s.name.toLowerCase().includes(formData.supplier.toLowerCase())
    ).slice(0, 5);
  }, [formData.supplier, allSuppliers]);

  const handleSort = (key: keyof Expense) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedExpenses = useMemo(() => {
    const isAllNaturesSelected = selectedNatures.length === NATURES.length;
    const todayStr = new Date().toISOString().split('T')[0];

    return expenses.filter(exp => {
      // 1. Filtro de Busca
      const sTerm = searchTerm.toLowerCase().trim();
      const matchSearch = !sTerm || 
                          exp.supplier.toLowerCase().includes(sTerm) || 
                          exp.description.toLowerCase().includes(sTerm);
      
      // 2. Filtro de Natureza
      const matchNature = isAllNaturesSelected || selectedNatures.includes(exp.nature);
      
      // 3. Filtro de Status
      const matchStatus = 
        filterStatus === 'Todos' || 
        (filterStatus === 'Agendadas' && exp.status === 'Pendente') || 
        (filterStatus === 'Pagas' && exp.status === 'Pago');

      // 4. Filtro de Data
      let matchDate = true;
      const isOverdue = exp.status === 'Pendente' && exp.dueDate < todayStr;

      if (dateFilterMode === 'TODOS') {
        matchDate = true;
      } else if (dateFilterMode === 'HOJE') {
        matchDate = exp.dueDate === todayStr || isOverdue;
      } else if (dateFilterMode === 'SEMANA') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        
        const weekAhead = new Date();
        weekAhead.setDate(weekAhead.getDate() + 7);
        const weekAheadStr = weekAhead.toISOString().split('T')[0];
        
        matchDate = (exp.dueDate >= weekAgoStr && exp.dueDate <= weekAheadStr) || isOverdue;
      } else if (dateFilterMode === 'MES') {
        const monthStr = todayStr.substring(0, 7);
        matchDate = exp.dueDate.startsWith(monthStr) || isOverdue;
      } else if (dateFilterMode === 'CUSTOM') {
        matchDate = (exp.dueDate >= startDate && exp.dueDate <= endDate) || isOverdue;
      }

      return matchSearch && matchNature && matchStatus && matchDate;
    }).sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [expenses, filterStatus, searchTerm, selectedNatures, sortConfig, dateFilterMode, startDate, endDate]);

  const totals = useMemo(() => {
    const pendente = processedExpenses.filter(e => e.status === 'Pendente').reduce((a,c) => a+c.value, 0);
    const pago = processedExpenses.filter(e => e.status === 'Pago').reduce((a,c) => a+c.value, 0);
    return { pendente, pago, total: pendente + pago };
  }, [processedExpenses]);

  const SortIcon = ({ column }: { column: keyof Expense }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="opacity-30 ml-2" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="ml-2 text-blue-600" /> : <ChevronDown size={14} className="ml-2 text-blue-600 rotate-180" />;
  };

  const handleSelectSupplier = (s: Supplier) => {
    setFormData(prev => ({ 
      ...prev, 
      supplier: s.name, 
      nature: (s.category as any) || prev.nature 
    }));
    setShowSuggestions(false);
  };

  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr + 'T12:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      description: expense.description,
      supplier: expense.supplier,
      dueDate: expense.dueDate,
      purchaseDate: expense.purchaseDate || expense.dueDate,
      value: expense.value,
      nature: expense.nature,
      costType: expense.costType,
      status: expense.status
    });
    setIsInstallment(false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFormState = () => {
    setEditingId(null);
    setIsInstallment(false);
    setInstallmentCount(2);
    setValueMode('total');
    setFormData({
      description: '', supplier: '', dueDate: new Date().toISOString().split('T')[0],
      purchaseDate: new Date().toISOString().split('T')[0],
      value: 0, nature: 'Outros', costType: 'Variável', status: 'Pendente',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedSupplier = formData.supplier.trim();
    const expenseToSave = { ...formData, supplier: trimmedSupplier };

    // Auto-create supplier if it doesn't exist
    const suppliers = await db.getSuppliers();
    if (trimmedSupplier && !suppliers.some(s => s.name.toLowerCase() === trimmedSupplier.toLowerCase())) {
      await db.saveSupplier({
        name: trimmedSupplier,
        category: formData.nature,
        contactName: '',
        contactPhone: '',
        contactEmail: ''
      });
    }

    if (editingId) {
      await db.updateExpense(editingId, expenseToSave);
    } else if (isInstallment && installmentCount > 1) {
      const valuePerParcel = valueMode === 'total' 
        ? Math.round((expenseToSave.value / installmentCount) * 100) / 100
        : expenseToSave.value;
        
      const baseDescription = expenseToSave.description;
      for (let i = 0; i < installmentCount; i++) {
        const parcelDate = addDays(expenseToSave.dueDate, i * intervalDays);
        await db.saveExpense({
          ...expenseToSave,
          description: `${baseDescription} (${i + 1}/${installmentCount})`,
          dueDate: parcelDate,
          value: valuePerParcel
        });
      }
    } else {
      await db.saveExpense(expenseToSave);
    }
    onSuccess();
    resetFormState();
    setShowForm(false);
  };

  const handleXMLImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const xmlString = event.target?.result as string;
      const parsedData = parseNFeXML(xmlString);
      
      if (parsedData) {
        const expensesToSave = convertParsedDataToExpenses(parsedData);
        setPendingXMLData({
          supplier: parsedData.supplierName,
          invoice: parsedData.invoiceNumber,
          expenses: expensesToSave
        });
      } else {
        alert("❌ Erro ao processar o arquivo XML. Verifique se é uma NF-e válida.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const confirmXMLImport = async () => {
    if (!pendingXMLData) return;

    const finalSupplier = pendingXMLData.supplier.trim();

    // Auto-create supplier if it doesn't exist
    const suppliers = await db.getSuppliers();
    if (finalSupplier && !suppliers.some(s => s.name.toLowerCase() === finalSupplier.toLowerCase())) {
      await db.saveSupplier({
        name: finalSupplier,
        category: 'Custo da Mercadoria Vendida',
        contactName: '',
        contactPhone: '',
        contactEmail: ''
      });
    }

    for (const exp of pendingXMLData.expenses) {
      await db.saveExpense({
        ...exp,
        supplier: finalSupplier
      });
    }
    
    onSuccess();
    setPendingXMLData(null);
  };

  const xmlFilteredSuppliers = useMemo(() => {
    if (!pendingXMLData?.supplier.trim()) return [];
    return allSuppliers.filter(s => 
      s.name.toLowerCase().includes(pendingXMLData.supplier.toLowerCase())
    ).slice(0, 5);
  }, [pendingXMLData?.supplier, allSuppliers]);

  const toggleNature = (nature: string) => {
    setSelectedNatures(prev => prev.includes(nature) ? prev.filter(n => n !== nature) : [...prev, nature]);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 h-full overflow-hidden">
      <input 
        type="file" 
        accept=".xml" 
        ref={xmlInputRef} 
        className="hidden" 
        onChange={handleXMLImport} 
      />
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => { await db.deleteExpense(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Excluir Registro"
        message="Tem certeza que deseja remover esta conta permanentemente?"
      />

      {/* MODAL DE CONFIRMAÇÃO DE IMPORTAÇÃO XML */}
      {pendingXMLData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-8 text-white relative">
              <button 
                onClick={() => setPendingXMLData(null)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileUp size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Confirmar Importação XML</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NF-e: {pendingXMLData.invoice}</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="mb-6 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Fornecedor (Pode ser alterado)</label>
                <div className="relative mt-1">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                  <input 
                    className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black uppercase outline-none focus:border-blue-400 focus:bg-white transition-all" 
                    value={pendingXMLData.supplier} 
                    onChange={e => setPendingXMLData({...pendingXMLData, supplier: e.target.value})}
                  />
                </div>
                {xmlFilteredSuppliers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-[2rem] z-[300] overflow-hidden p-2">
                    {xmlFilteredSuppliers.map(s => (
                      <button 
                        key={s.id} type="button"
                        onClick={() => setPendingXMLData({...pendingXMLData, supplier: s.name})}
                        className="w-full text-left px-5 py-4 hover:bg-blue-50 flex flex-col border-b border-slate-50 last:border-0 rounded-xl"
                      >
                        <span className="text-xs font-black text-slate-800 uppercase leading-none">{s.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{s.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Lançamentos Identificados ({pendingXMLData.expenses.length})</p>
                <div className="max-h-60 overflow-y-auto custom-scrollbar border rounded-2xl divide-y">
                  {pendingXMLData.expenses.map((exp, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">{exp.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Vencimento: {exp.dueDate.split('-').reverse().join('/')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-black text-slate-900">{formatMoney(exp.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setPendingXMLData(null)}
                  className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmXMLImport}
                  className="flex-1 h-14 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} /> Confirmar Importação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white border p-4 rounded-[1.5rem] shadow-sm flex items-center gap-4 border-l-8 border-l-orange-500">
           <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><AlertCircle size={24}/></div>
           <div>
             <p className="text-[11px] font-black text-slate-400 uppercase leading-none mb-1.5 tracking-wider">A Pagar ({dateFilterMode === 'TODOS' ? 'Tudo' : 'Período'})</p>
             <p className="text-lg font-mono font-black text-slate-800 leading-none">{formatMoney(totals.pendente)}</p>
           </div>
        </div>
        <div className="bg-white border p-4 rounded-[1.5rem] shadow-sm flex items-center gap-4 border-l-8 border-l-green-500">
           <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500 shrink-0"><CheckCircle2 size={24}/></div>
           <div>
             <p className="text-[11px] font-black text-slate-400 uppercase leading-none mb-1.5 tracking-wider">Liquidado ({dateFilterMode === 'TODOS' ? 'Histórico' : 'Período'})</p>
             <p className="text-lg font-mono font-black text-green-600 leading-none">{formatMoney(totals.pago)}</p>
           </div>
        </div>
        <div className="bg-white border p-4 rounded-[1.5rem] shadow-sm flex items-center gap-4 border-l-8 border-l-blue-600">
           <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><TrendingUp size={24}/></div>
           <div>
             <p className="text-[11px] font-black text-slate-400 uppercase leading-none mb-1.5 tracking-wider">Total do Intervalo</p>
             <p className="text-lg font-mono font-black text-slate-900 leading-none">{formatMoney(totals.total)}</p>
           </div>
        </div>
        <div className="col-span-2 lg:col-span-1 flex gap-2">
          <button 
            onClick={() => xmlInputRef.current?.click()}
            className="flex-1 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-slate-800"
            title="Importar XML de NF-e"
          >
            <FileUp size={20}/> Importar XML
          </button>
          <button 
            onClick={() => { if(showForm) resetFormState(); setShowForm(!showForm); }} 
            className={`flex-1 text-white rounded-[1.5rem] text-[11px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${showForm ? 'bg-slate-500' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {showForm ? <X size={20}/> : <Plus size={20}/>} {showForm ? 'Cancelar' : 'Novo Título'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border p-6 rounded-[2rem] shadow-2xl grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 animate-in slide-in-from-top-4 overflow-visible relative">
          <div className="col-span-4 flex items-center gap-3 mb-2">
             <div className={`w-3 h-3 rounded-full ${editingId ? 'bg-orange-500 shadow-orange-200 shadow-lg' : 'bg-blue-500 shadow-blue-200 shadow-lg'}`}></div>
             <h4 className="text-[12px] font-black uppercase text-slate-600 tracking-widest">
               {editingId ? `Editando Lançamento do Título` : 'Novo Compromisso Financeiro'}
             </h4>
          </div>

          <div className="col-span-2 relative">
            <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-wider">Fornecedor / Beneficiário</label>
            <div className="relative mt-1">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
              <input 
                ref={supplierInputRef}
                placeholder="Busca de fornecedor..." 
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-400 focus:bg-white transition-all" 
                value={formData.supplier} 
                onChange={e => {
                  setFormData({...formData, supplier: e.target.value});
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                required 
              />
            </div>
            {showSuggestions && filteredSuppliers.length > 0 && (
              <div ref={suggestionRef} className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-[2rem] z-[100] overflow-hidden p-2">
                {filteredSuppliers.map(s => (
                  <button 
                    key={s.id} type="button"
                    onClick={() => handleSelectSupplier(s)}
                    className="w-full text-left px-5 py-4 hover:bg-blue-50 flex flex-col border-b border-slate-50 last:border-0 rounded-xl"
                  >
                    <span className="text-xs font-black text-slate-800 uppercase leading-none">{s.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="col-span-1">
            <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-wider">Natureza</label>
            <select className="w-full h-12 px-4 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-blue-400 focus:bg-white transition-all" value={formData.nature} onChange={e => setFormData({...formData, nature: e.target.value as any})} required>
              {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="col-span-1">
            <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-wider">Tipo de Custo</label>
            <select className="w-full h-12 px-4 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-blue-400 focus:bg-white transition-all" value={formData.costType} onChange={e => setFormData({...formData, costType: e.target.value as any})} required>
              {COST_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-wider">Descrição Detalhada</label>
            <input placeholder="Ex: Pagamento referente NF 001" className="w-full h-12 px-5 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-400 focus:bg-white transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-wider">Data da Compra</label>
            <input type="date" className="w-full h-12 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-400 focus:bg-white transition-all" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-wider">Vencimento</label>
            <input type="date" className="w-full h-12 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-400 focus:bg-white transition-all" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} required />
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-wider">Valor (R$)</label>
            <input placeholder="0,00" type="number" step="0.01" className="w-full h-12 px-5 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black font-mono outline-none focus:border-blue-400 focus:bg-white transition-all" value={formData.value || ''} onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})} required />
          </div>

          {!editingId && (
            <div className="col-span-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-200 mt-2">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <button type="button" onClick={() => setIsInstallment(!isInstallment)} className={`flex items-center gap-3 text-[12px] font-black uppercase transition-all ${isInstallment ? 'text-blue-600' : 'text-slate-400'}`}>
                    {isInstallment ? <CheckSquare size={22}/> : <Square size={22}/>} Gerar Parcelamento Automático
                  </button>
                  {isInstallment && (
                    <div className="flex bg-white border border-slate-200 p-1.5 rounded-[1.5rem] shadow-sm">
                      <button type="button" onClick={() => setValueMode('total')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${valueMode === 'total' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>Pelo Total</button>
                      <button type="button" onClick={() => setValueMode('parcel')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${valueMode === 'parcel' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>Por Parcela</button>
                    </div>
                  )}
               </div>
               {isInstallment && (
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-left-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Quantidade</label>
                      <input type="number" min="2" max="60" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:border-blue-400 shadow-sm" value={installmentCount} onChange={e => setInstallmentCount(parseInt(e.target.value) || 2)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Periodicidade</label>
                      <select className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:border-blue-400 shadow-sm" value={intervalDays} onChange={e => setIntervalDays(parseInt(e.target.value))}>
                        <option value="7">Semanal (7 dias)</option>
                        <option value="15">Quinzenal (15 dias)</option>
                        <option value="30">Mensal (30 dias)</option>
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center gap-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-inner">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        {valueMode === 'total' ? <Calculator size={22}/> : <Layers size={22}/>}
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed">
                        {valueMode === 'total' ? (<>Lançar {installmentCount}x de <span className="text-blue-600 font-black">{formatMoney(formData.value / installmentCount)}</span></>) : (<>Valor total final: <span className="text-blue-600 font-black">{formatMoney(formData.value * installmentCount)}</span></>)}
                        <br/><span className="text-[9px] text-slate-400 italic">Término: {addDays(formData.dueDate, (installmentCount-1) * intervalDays).split('-').reverse().join('/')}</span>
                      </p>
                    </div>
                 </div>
               )}
            </div>
          )}

          <div className="col-span-4 flex justify-end gap-3 mt-4">
            <button type="submit" className={`w-full lg:w-auto px-16 h-14 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editingId ? <Edit2 size={20}/> : <Calendar size={20}/>} {editingId ? 'Salvar Alterações' : 'Confirmar e Lançar'}
            </button>
          </div>
        </form>
      )}

      {/* ÁREA DE FILTROS INTEGRADA */}
      <div className="bg-white border border-slate-200 p-4 rounded-[2rem] flex flex-col gap-4 shrink-0 shadow-sm overflow-visible">
        
        <div className="flex flex-col xl:flex-row gap-4">
          {/* Filtro de Período */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <FilterBtn active={dateFilterMode === 'HOJE'} onClick={() => setDateFilterMode('HOJE')} label="Hoje" />
            <FilterBtn active={dateFilterMode === 'SEMANA'} onClick={() => setDateFilterMode('SEMANA')} label="7 Dias" />
            <FilterBtn active={dateFilterMode === 'MES'} onClick={() => setDateFilterMode('MES')} label="Mês" />
            <FilterBtn active={dateFilterMode === 'TODOS'} onClick={() => setDateFilterMode('TODOS')} label="Tudo" />
            <FilterBtn active={dateFilterMode === 'CUSTOM'} onClick={() => setDateFilterMode('CUSTOM')} label="Personalizado" />
          </div>

          {dateFilterMode === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 px-3 rounded-2xl shadow-inner animate-in slide-in-from-left-4">
              <Calendar size={14} className="text-slate-400"/>
              <input type="date" className="bg-transparent border-none outline-none text-[10px] font-black uppercase" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-slate-300">|</span>
              <input type="date" className="bg-transparent border-none outline-none text-[10px] font-black uppercase" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}

          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input placeholder="Buscar fornecedor ou descrição no período..." className="w-full h-12 pl-12 pr-6 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-400 transition-all focus:bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
            {['Todos', 'Agendadas', 'Pagas'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === s ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>{s}</button>
            ))}
          </div>

          <button onClick={() => setShowNatureFilter(!showNatureFilter)} className={`w-full sm:w-auto flex items-center justify-between px-6 h-11 rounded-2xl text-[10px] font-black uppercase border transition-all ${showNatureFilter ? 'bg-slate-800 text-white border-slate-700 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
            <div className="flex items-center gap-3"><Filter size={18}/> Naturezas ({selectedNatures.length})</div>
            <ChevronDown size={18} className={`transition-transform ${showNatureFilter ? 'rotate-180' : ''}`}/>
          </button>
        </div>

        {showNatureFilter && (
          <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4 px-2">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Filtrar por Categoria</span>
               <div className="flex gap-6">
                 <button onClick={() => setSelectedNatures(Array.from(NATURES))} className="text-[10px] font-black text-blue-600 uppercase hover:underline">Todas</button>
                 <button onClick={() => setSelectedNatures([])} className="text-[10px] font-black text-slate-400 uppercase hover:underline">Nenhuma</button>
               </div>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
              {NATURES.map(nature => (
                <button key={nature} onClick={() => toggleNature(nature)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedNatures.includes(nature) ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-200'}`}>{nature}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white border shadow-sm rounded-[2rem] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-slate-50 border-b text-[11px] font-black uppercase text-slate-400 z-10">
              <tr>
                <th onClick={() => handleSort('dueDate')} className="px-6 py-5 text-left cursor-pointer hover:bg-slate-100"><div className="flex items-center">Vencimento <SortIcon column="dueDate" /></div></th>
                <th onClick={() => handleSort('supplier')} className="px-6 py-5 text-left cursor-pointer hover:bg-slate-100"><div className="flex items-center">Descrição / Fornecedor <SortIcon column="supplier" /></div></th>
                <th onClick={() => handleSort('nature')} className="px-6 py-5 text-left cursor-pointer hover:bg-slate-100"><div className="flex items-center">Natureza <SortIcon column="nature" /></div></th>
                <th onClick={() => handleSort('value')} className="px-6 py-5 text-right cursor-pointer hover:bg-slate-100"><div className="flex items-center justify-end">Valor <SortIcon column="value" /></div></th>
                <th onClick={() => handleSort('status')} className="px-6 py-5 text-center w-36 cursor-pointer hover:bg-slate-100"><div className="flex items-center justify-center">Status <SortIcon column="status" /></div></th>
                <th className="px-6 py-5 text-center w-28">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedExpenses.map((exp) => {
                const isOverdue = exp.status === 'Pendente' && exp.dueDate < new Date().toISOString().split('T')[0];
                return (
                <tr key={exp.id} className={`hover:bg-slate-50/80 transition-colors ${editingId === exp.id ? 'bg-orange-50' : ''} ${isOverdue ? 'bg-red-50/30' : ''}`}>
                  <td className={`px-6 py-5 text-[13px] font-mono font-black ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                    {exp.dueDate.split('-').reverse().join('/')}
                    {isOverdue && (
                      <div className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase tracking-wider inline-block ml-2">Atrasado</div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-[13px] font-black text-slate-900 uppercase truncate max-w-[250px] leading-tight mb-1">{exp.supplier}</div>
                    <div className="text-[10px] font-bold text-slate-400 truncate max-w-[250px] uppercase tracking-tight">{exp.description}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-200 uppercase whitespace-nowrap">{exp.nature}</span>
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase ${exp.costType === 'Fixo' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>{exp.costType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-mono font-black text-sm text-slate-900">{formatMoney(exp.value)}</td>
                  <td className="px-6 py-5 text-center">
                    <button onClick={async () => { await db.updateExpenseStatus(exp.id, exp.status === 'Pendente' ? 'Pago' : 'Pendente'); onSuccess(); }} className={`w-full py-2.5 rounded-[1rem] text-[10px] font-black uppercase border ${exp.status === 'Pago' ? 'bg-green-500 border-green-400 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                      {exp.status}
                    </button>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(exp)} className={`p-2.5 rounded-xl ${editingId === exp.id ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}><Edit2 size={20}/></button>
                      <button onClick={() => setDeletingId(exp.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={20}/></button>
                    </div>
                  </td>
                </tr>
              )})}
              {processedExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-32 text-center grayscale opacity-30">
                    <Calendar size={64} className="mx-auto mb-4 text-slate-200"/><p className="text-sm font-black uppercase tracking-widest text-slate-300">Nenhum título localizado no período</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FilterBtn = ({ active, onClick, label }: any) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${active ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
  >
    {label}
  </button>
);

export default AccountsPayable;
