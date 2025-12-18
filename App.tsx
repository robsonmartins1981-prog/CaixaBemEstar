
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CashEntryForm from './components/CashEntryForm';
import AccountsPayable from './components/AccountsPayable';
import Reports from './components/Reports';
import { db } from './services/db';
import { CashEntry, Expense } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const loadData = () => {
    setEntries(db.getEntries());
    setExpenses(db.getExpenses());
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
      case 'reports':
        return <Reports entries={entries} expenses={expenses} />;
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
