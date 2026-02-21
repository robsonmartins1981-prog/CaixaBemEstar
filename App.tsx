
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CashEntryForm from './components/CashEntryForm';
import AccountsPayable from './components/AccountsPayable';
import Suppliers from './components/Suppliers';
import Reports from './components/Reports';
import ImportData from './components/ImportData';
import { db } from './services/db';
import { CashEntry, Expense, Supplier } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const loadData = () => {
    try {
      setEntries(db.getEntries());
      setExpenses(db.getExpenses());
      setSuppliers(db.getSuppliers());
    } catch (e) {
      console.error("Erro ao carregar dados do banco:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard entries={entries} expenses={expenses} />;
      case 'entries':
        return <CashEntryForm entries={entries} onSuccess={loadData} />;
      case 'expenses':
        return <AccountsPayable expenses={expenses} onSuccess={loadData} />;
      case 'suppliers':
        return <Suppliers suppliers={suppliers} onSuccess={loadData} />;
      case 'reports':
        return <Reports entries={entries} expenses={expenses} />;
      case 'import':
        return <ImportData onSuccess={loadData} />;
      default:
        return <Dashboard entries={entries} expenses={expenses} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
