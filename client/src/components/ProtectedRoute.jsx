import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, ShoppingCart, LayoutDashboard } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold tracking-wide text-slate-400">
            Verifying staff credentials...
          </span>
        </div>
      </div>
    );
  }

  // Not logged in -> Redirect to login page with return path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check: If route requires specific roles and user does not have permission
  if (allowedRoles && !hasRole(allowedRoles)) {
    const rolesRequired = Array.isArray(allowedRoles) ? allowedRoles.join(', ') : allowedRoles;
    const isCashier = user?.role === 'cashier';

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-8 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-rose-100 text-rose-700">
              HTTP 403 Forbidden
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">Access Restricted</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              You are logged in as <strong className="text-slate-800 uppercase">{user?.role}</strong> ({user?.name}).
              This management module requires <strong className="text-slate-800 uppercase">{rolesRequired}</strong> authorization.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-left text-xs border border-slate-200 space-y-1.5">
            <div className="font-semibold text-slate-700 flex items-center justify-between">
              <span>Security Policy:</span>
              <span className="text-[10px] text-emerald-600 font-mono">ENFORCED AT BACKEND</span>
            </div>
            <p className="text-[11px] text-slate-500">
              API endpoints for this feature are strictly locked. Hiding frontend buttons is not security;
              backend RBAC middleware rejected unauthorized privilege escalation.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            {isCashier ? (
              <Link
                to="/pos"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Go to POS Billing
              </Link>
            ) : (
              <Link
                to="/"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-md hover:bg-slate-800 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return children;
}
