import React, { useState } from 'react';
import { Search, Bell, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ searchPlaceholder = 'Search products, customers, invoices...' }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleBadgeConfig = {
    admin: {
      label: 'Admin',
      badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
      avatarBg: 'bg-purple-700'
    },
    manager: {
      label: 'Manager',
      badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
      avatarBg: 'bg-blue-600'
    },
    cashier: {
      label: 'Cashier',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      avatarBg: 'bg-emerald-600'
    }
  };

  const currentRoleConfig = roleBadgeConfig[role] || {
    label: role || 'Staff',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    avatarBg: 'bg-slate-700'
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input Bar */}
      <div className="relative w-80 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
        />
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>

        {/* User Profile Pill & Logout Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer select-none"
          >
            <div
              className={`w-7 h-7 rounded-lg ${currentRoleConfig.avatarBg} text-white flex items-center justify-center font-bold text-xs shadow-sm`}
            >
              {userInitial}
            </div>

            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {user?.name || 'Staff User'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {user?.email || 'authenticated'}
              </div>
            </div>

            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${currentRoleConfig.badgeClass} ml-1`}
            >
              {currentRoleConfig.label}
            </span>
          </button>

          {/* Profile Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-fadeIn">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-800">{user?.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Role: {role?.toUpperCase()}</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out from Terminal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
