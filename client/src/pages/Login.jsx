import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShoppingCart,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  UserCheck
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quick Demo Staff Accounts
  const demoAccounts = [
    {
      role: 'Admin',
      email: 'admin@smartmartpro.com',
      password: 'AdminPassword123!',
      color: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100',
      badge: 'Full Store Control'
    },
    {
      role: 'Manager',
      email: 'manager@smartmartpro.com',
      password: 'ManagerPassword123!',
      color: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
      badge: 'Inventory & Reports'
    },
    {
      role: 'Cashier',
      email: 'cashier@smartmartpro.com',
      password: 'CashierPassword123!',
      color: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      badge: 'POS Billing'
    }
  ];

  const handleQuickFill = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both staff email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login(email, password);
      addToast(`Welcome back, ${user.name}! Logged in as ${user.role.toUpperCase()}`, 'success');

      // Direct cashier straight to POS billing; others to intended destination or Dashboard
      const defaultPath = user.role === 'cashier' ? '/pos' : '/';
      const destination = location.state?.from?.pathname || defaultPath;
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090e1a] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Background Decorative Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[250px] bg-emerald-600/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-400 p-0.5 shadow-xl shadow-blue-500/20">
            <div className="w-full h-full bg-[#0d1527] rounded-[14px] flex items-center justify-center text-amber-400">
              <ShoppingCart className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            Smart Mart <span className="text-blue-400">Pro</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Supermarket Inventory & POS Terminal • Secure Staff Authentication
          </p>
        </div>

        {/* Demo Quick-Fill Bar */}
        <div className="bg-[#10192e] border border-[#1e2a4a] rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-blue-400">
              <KeyRound className="w-3.5 h-3.5" />
              Quick Demo Access
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Click to auto-fill</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickFill(acc)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${acc.color}`}
              >
                <span>{acc.role}</span>
                <span className="text-[9px] font-normal opacity-80 mt-0.5">{acc.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-[#10192e] border border-[#1e2a4a] rounded-2xl p-6 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Staff Email Address</span>
                <span className="text-[10px] text-slate-500 font-normal">Required</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@smartmartpro.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a1020] border border-[#233154] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-slate-500 font-normal">Bcrypt Protected</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0a1020] border border-[#233154] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In to Terminal</span>
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-2 border-t border-[#1e2a4a] flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              JWT 24h & RBAC Enforced
            </span>
            <span>Brute-force Rate Limited</span>
          </div>
        </div>

        {/* Credentials reminder footnote */}
        <div className="text-center text-[11px] text-slate-500">
          Default Passwords: <code className="text-slate-400 bg-[#10192e] px-1.5 py-0.5 rounded">AdminPassword123!</code> /{' '}
          <code className="text-slate-400 bg-[#10192e] px-1.5 py-0.5 rounded">CashierPassword123!</code>
        </div>
      </div>
    </div>
  );
}
