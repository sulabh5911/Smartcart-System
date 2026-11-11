import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  ShoppingCart,
  Users,
  Truck,
  ShoppingBag,
  Receipt,
  AlertOctagon,
  BarChart3,
  Settings,
  UserCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { role, logout, user } = useAuth();

  // Navigation Items with Role Restrictions
  const allNavItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['admin', 'manager']
    },
    {
      name: 'POS Billing',
      path: '/pos',
      icon: ShoppingCart,
      roles: ['admin', 'manager', 'cashier'],
      highlight: true
    },
    {
      name: 'Products',
      path: '/products',
      icon: Package,
      roles: ['admin', 'manager', 'cashier']
    },
    {
      name: 'Categories',
      path: '/categories',
      icon: Layers,
      roles: ['admin', 'manager']
    },
    {
      name: 'Inventory',
      path: '/inventory',
      icon: Boxes,
      roles: ['admin', 'manager']
    },
    {
      name: 'Sales & Invoices',
      path: '/sales',
      icon: Receipt,
      roles: ['admin', 'manager', 'cashier']
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: Users,
      roles: ['admin', 'manager', 'cashier']
    },
    {
      name: 'Suppliers',
      path: '/suppliers',
      icon: Truck,
      roles: ['admin', 'manager']
    },
    {
      name: 'Purchases (PO)',
      path: '/purchases',
      icon: ShoppingBag,
      roles: ['admin', 'manager']
    },
    {
      name: 'Expiry Alerts',
      path: '/expiry-alerts',
      icon: AlertOctagon,
      roles: ['admin', 'manager']
    },
    {
      name: 'Reports & P&L',
      path: '/reports',
      icon: BarChart3,
      roles: ['admin', 'manager']
    },
    {
      name: 'Staff Management',
      path: '/users',
      icon: UserCheck,
      roles: ['admin'] // Strictly Admin only
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      roles: ['admin'] // Admin only
    }
  ];

  // Filter items matching current user's role
  const visibleNavItems = allNavItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="w-60 bg-[#0d1527] border-r border-[#1a233a] flex flex-col shrink-0 select-none h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-4 flex items-center gap-3 border-b border-[#1a233a]">
        <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1">
            Smart Mart <span className="text-blue-400">Pro</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Supermarket Terminal
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Sidebar Navigation">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              id={`nav-link-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : item.highlight
                    ? 'text-emerald-400 hover:bg-[#15203b] hover:text-emerald-300'
                    : 'text-slate-400 hover:bg-[#15203b] hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer with Role Info & Quick Logout */}
      <div className="p-3 border-t border-[#1a233a] bg-[#0a1020] space-y-2">
        <div className="flex items-center justify-between">
          <div className="truncate">
            <div className="text-[11px] font-bold text-slate-200 truncate">{user?.name}</div>
            <div className="text-[9px] uppercase tracking-wider font-semibold text-blue-400">
              Role: {role}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#15203b] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-[9px] text-slate-500 text-center border-t border-[#1a233a]/60 pt-1.5">
          RBAC Security • v1.0.5
        </div>
      </div>
    </aside>
  );
}
