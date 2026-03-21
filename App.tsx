
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CashEntryForm from './components/CashEntryForm';
import AccountsPayable from './components/AccountsPayable';
import Suppliers from './components/Suppliers';
import Reports from './components/Reports';
import ImportData from './components/ImportData';
import Login from './components/Login';
import { db } from './services/db';
import { auth, onAuthStateChanged, User } from './firebase';
import { CashEntry, Expense, Supplier } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState(localStorage.getItem('isDemoMode') === 'true');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user && !isDemo) return;
    try {
      const [entriesData, expensesData, suppliersData] = await Promise.all([
        db.getEntries(),
        db.getExpenses(),
        db.getSuppliers()
      ]);
      setEntries(entriesData);
      setExpenses(expensesData);
      setSuppliers(suppliersData);
    } catch (e) {
      console.error("Erro ao carregar dados do banco:", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        localStorage.removeItem('isDemoMode');
        setIsDemo(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user || isDemo) {
      loadData();
    }
  }, [user, isDemo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !isDemo) {
    return <Login onLoginSuccess={() => {
      setIsDemo(localStorage.getItem('isDemoMode') === 'true');
      loadData();
    }} />;
  }

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

