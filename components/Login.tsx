import React, { useState } from 'react';
import { LogIn, Mail, Lock, UserPlus, ArrowRight, Clock } from 'lucide-react';
import { signInWithGoogle, loginWithEmail, registerWithEmail } from '../firebase';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError("Erro ao fazer login com Google. Verifique sua conexão ou chaves de API.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("E-mail ou senha incorretos.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está em uso.");
      } else if (err.code === 'auth/weak-password') {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else if (err.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
        setError("O servidor do Google ainda está configurando seu banco de dados (isso pode levar 15-30 min). Por favor, use o 'Modo de Demonstração (Local)' abaixo para começar agora mesmo!");
      } else {
        setError("Ocorreu um erro ao processar sua solicitação.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
            <span className="text-3xl font-black italic text-white">BE</span>
          </div>
          
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">
            Bem Estar
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            Sistema de Gestão Financeira
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-relaxed">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-green-500 transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-green-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-green-500/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />}
                {isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <span className="relative bg-white px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou continue com</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-xl disabled:opacity-50 mb-4"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Google
        </button>

        <button
          onClick={() => {
            localStorage.setItem('isDemoMode', 'true');
            onLoginSuccess();
          }}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 hover:border-green-500 text-slate-500 hover:text-green-500 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
        >
          <Clock size={18} />
          Modo de Demonstração (Local)
        </button>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-[10px] font-black text-slate-400 hover:text-green-500 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
