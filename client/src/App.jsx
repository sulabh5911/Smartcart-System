import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Page imports
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import POSBilling from './pages/POSBilling';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import ExpiryAlerts from './pages/ExpiryAlerts';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

// 404 Not Found Page Component
function NotFound() {
  return (
    <div className="py-24 text-center space-y-4">
      <div className="text-6xl font-black text-emerald-400 font-mono">404</div>
      <h2 className="text-xl font-bold text-white">Page Not Found</h2>
      <p className="text-sm text-slate-400 max-w-md mx-auto">
        The requested supermarket navigation route does not exist.
      </p>
      <a
        href="/"
        className="inline-block px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20"
      >
        Return to Terminal
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected App Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Admin & Manager Dashboard */}
                <Route
                  index
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* POS Billing (Admin, Manager, Cashier) */}
                <Route
                  path="pos"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                      <POSBilling />
                    </ProtectedRoute>
                  }
                />

                {/* Products Catalog (Admin, Manager, Cashier) */}
                <Route
                  path="products"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                      <Products />
                    </ProtectedRoute>
                  }
                />

                {/* Categories (Admin & Manager) */}
                <Route
                  path="categories"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <Categories />
                    </ProtectedRoute>
                  }
                />

                {/* Inventory (Admin & Manager) */}
                <Route
                  path="inventory"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <Inventory />
                    </ProtectedRoute>
                  }
                />

                {/* Sales & Invoices (Admin, Manager, Cashier) */}
                <Route
                  path="sales"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                      <Sales />
                    </ProtectedRoute>
                  }
                />

                {/* Purchases Inward PO (Admin & Manager) */}
                <Route
                  path="purchases"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <Purchases />
                    </ProtectedRoute>
                  }
                />

                {/* Customers (Admin, Manager, Cashier) */}
                <Route
                  path="customers"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                      <Customers />
                    </ProtectedRoute>
                  }
                />

                {/* Suppliers (Admin & Manager) */}
                <Route
                  path="suppliers"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <Suppliers />
                    </ProtectedRoute>
                  }
                />

                {/* Expiry Alerts (Admin & Manager) */}
                <Route
                  path="expiry-alerts"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <ExpiryAlerts />
                    </ProtectedRoute>
                  }
                />

                {/* Reports & Analytics (Admin & Manager) */}
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <Reports />
                    </ProtectedRoute>
                  }
                />

                {/* Staff User Management (Admin Only) */}
                <Route
                  path="users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Users />
                    </ProtectedRoute>
                  }
                />

                {/* Store Settings (Admin Only) */}
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
