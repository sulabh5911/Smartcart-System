import React, { createContext, useContext, useState } from 'react';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_PURCHASES,
  INITIAL_SALES,
  STORE_SETTINGS
} from '../data/mockData';

const MockDataContext = createContext(null);

export function MockDataProvider({ children }) {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [suppliers, setSuppliers] = useState(INITIAL_SUPPLIERS);
  const [purchases, setPurchases] = useState(INITIAL_PURCHASES);
  const [sales, setSales] = useState(INITIAL_SALES);
  const [settings, setSettings] = useState(STORE_SETTINGS);

  // Product management actions
  const addProduct = (productData) => {
    const newProduct = {
      ...productData,
      id: `prod-${Date.now()}`,
      status: productData.stock <= 0 ? 'Out of Stock' : (productData.stock <= (productData.minStockThreshold || 10) ? 'Low Stock' : 'In Stock')
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (id, updatedFields) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updatedFields };
          updated.status = updated.stock <= 0 ? 'Out of Stock' : (updated.stock <= (updated.minStockThreshold || 10) ? 'Low Stock' : 'In Stock');
          return updated;
        }
        return item;
      })
    );
  };

  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Stock adjustment (Inventory Page)
  const adjustStock = (productId, deltaQty, reason = 'Adjustment') => {
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id === productId) {
          const newStock = Math.max(0, prod.stock + deltaQty);
          return {
            ...prod,
            stock: newStock,
            status: newStock <= 0 ? 'Out of Stock' : (newStock <= prod.minStockThreshold ? 'Low Stock' : 'In Stock')
          };
        }
        return prod;
      })
    );
  };

  // Category management
  const addCategory = (categoryData) => {
    const newCat = {
      ...categoryData,
      id: `cat-${Date.now()}`,
      productCount: 0,
      slug: categoryData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    };
    setCategories((prev) => [...prev, newCat]);
    return newCat;
  };

  // Customer management
  const addCustomer = (customerData) => {
    const newCust = {
      ...customerData,
      id: `cust-${Date.now()}`,
      loyaltyPoints: 0,
      tier: 'Bronze',
      totalSpent: 0
    };
    setCustomers((prev) => [newCust, ...prev]);
    return newCust;
  };

  // Supplier management
  const addSupplier = (supplierData) => {
    const newSup = {
      ...supplierData,
      id: `sup-${Date.now()}`,
      balanceDue: Number(supplierData.balanceDue) || 0
    };
    setSuppliers((prev) => [newSup, ...prev]);
    return newSup;
  };

  // Purchase management
  const addPurchase = (purchaseData) => {
    const newPurchase = {
      ...purchaseData,
      id: `po-${Date.now()}`,
      poNumber: `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0]
    };
    setPurchases((prev) => [newPurchase, ...prev]);
    return newPurchase;
  };

  // POS Sale Checkout
  const createSale = (saleData) => {
    const newSale = {
      ...saleData,
      id: `inv-${Date.now()}`,
      invoiceNumber: `SMP-INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'Completed'
    };

    // Deduct stock for each cart item
    if (saleData.items && Array.isArray(saleData.items)) {
      setProducts((prev) =>
        prev.map((prod) => {
          const soldItem = saleData.items.find((item) => item.id === prod.id);
          if (soldItem) {
            const newStock = Math.max(0, prod.stock - soldItem.quantity);
            return {
              ...prod,
              stock: newStock,
              status: newStock <= 0 ? 'Out of Stock' : (newStock <= prod.minStockThreshold ? 'Low Stock' : 'In Stock')
            };
          }
          return prod;
        })
      );
    }

    setSales((prev) => [newSale, ...prev]);
    return newSale;
  };

  // Store Settings
  const updateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <MockDataContext.Provider
      value={{
        products,
        categories,
        customers,
        suppliers,
        purchases,
        sales,
        settings,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        addCategory,
        addCustomer,
        addSupplier,
        addPurchase,
        createSale,
        updateSettings
      }}
    >
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
}
