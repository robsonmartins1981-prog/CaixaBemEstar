
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
import { auth, onAuthStateChanged, User, db as firestore } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { CashEntry, Expense, Supplier } from './types';
import { handleFirestoreError, OperationType } from './services/db';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState(false);
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
    if (user && !isDemo) {
      // Real-time listeners for Firestore
      const qCaixa = query(collection(firestore, 'caixa'), where('uid', '==', user.uid));
      const qContas = query(collection(firestore, 'contas'), where('uid', '==', user.uid));
      const qFornecedores = query(collection(firestore, 'fornecedores'), where('uid', '==', user.uid));

      const unsubCaixa = onSnapshot(qCaixa, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          cash: Number(doc.data().cash || 0),
          pix: Number(doc.data().pix || 0),
          credit: Number(doc.data().credit || 0),
          debit: Number(doc.data().debit || 0),
          sangria: Number(doc.data().sangria || 0)
        } as CashEntry));
        setEntries(data);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'caixa'));

      const unsubContas = onSnapshot(qContas, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          value: Number(doc.data().value || 0)
        } as Expense));
        setExpenses(data);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'contas'));

      const unsubFornecedores = onSnapshot(qFornecedores, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Supplier));
        setSuppliers(data);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'fornecedores'));

      return () => {
        unsubCaixa();
        unsubContas();
        unsubFornecedores();
      };
    } else if (isDemo) {
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

