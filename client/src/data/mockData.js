/**
 * ============================================================================
 * [MOCK DATA ONLY - FRONTEND PHASE]
 * Smart Mart Pro - Supermarket Inventory & Billing Management System
 * Matches the reference design UI mockup with authentic product catalogs,
 * batch codes, expiry tracking, and sales history.
 * ============================================================================
 */

export const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'Dairy Products', description: 'Milk, cheese, yogurt, butter & cream', productCount: 25, status: 'Active', color: '#3b82f6' },
  { id: 'cat-2', name: 'Snacks', description: 'Chips, biscuits, namkeen, wafers', productCount: 18, status: 'Active', color: '#f59e0b' },
  { id: 'cat-3', name: 'Beverages', description: 'Soft drinks, fruit juices, cold brew', productCount: 12, status: 'Active', color: '#10b981' },
  { id: 'cat-4', name: 'Personal Care', description: 'Soap, shampoo, toothpaste, skincare', productCount: 20, status: 'Active', color: '#8b5cf6' },
  { id: 'cat-5', name: 'Household', description: 'Cleaning items, detergents, wipes', productCount: 15, status: 'Active', color: '#06b6d4' },
  { id: 'cat-6', name: 'Grocery', description: 'Salt, sugar, pulses, grains, flour', productCount: 35, status: 'Active', color: '#ec4899' }
];

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Amul Milk',
    sku: 'SKU001',
    barcode: '890123456001',
    category: 'Dairy Products',
    price: 60.00,
    costPrice: 45.00,
    stock: 120,
    minStockThreshold: 30,
    unit: 'packet',
    batchNo: 'B001',
    mfgDate: '2026-10-01',
    expiryDate: '2026-10-28', // 2 days left -> Urgent
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-2',
    name: 'Maggi Noodles',
    sku: 'SKU002',
    barcode: '890123456002',
    category: 'Snacks',
    price: 15.00,
    costPrice: 12.00,
    stock: 95,
    minStockThreshold: 25,
    unit: 'pack',
    batchNo: 'B010',
    mfgDate: '2026-10-05',
    expiryDate: '2026-11-20',
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-3',
    name: 'TATA Salt',
    sku: 'SKU003',
    barcode: '890123456003',
    category: 'Grocery',
    price: 25.00,
    costPrice: 20.00,
    stock: 80,
    minStockThreshold: 20,
    unit: 'pack',
    batchNo: 'B015',
    mfgDate: '2026-09-01',
    expiryDate: '2026-11-18',
    status: 'Low Stock',
    image: 'https://images.unsplash.com/photo-1518110903416-5231a547214e?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-4',
    name: 'Colgate Toothpaste',
    sku: 'SKU004',
    barcode: '890123456004',
    category: 'Personal Care',
    price: 85.00,
    costPrice: 68.00,
    stock: 65,
    minStockThreshold: 15,
    unit: 'tube',
    batchNo: 'B008',
    mfgDate: '2026-08-15',
    expiryDate: '2027-05-15',
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-5',
    name: "Lay's Chips",
    sku: 'SKU005',
    barcode: '890123456005',
    category: 'Snacks',
    price: 20.00,
    costPrice: 16.00,
    stock: 40,
    minStockThreshold: 50,
    unit: 'pack',
    batchNo: 'B020',
    mfgDate: '2026-10-10',
    expiryDate: '2026-12-25',
    status: 'Low Stock',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-6',
    name: 'Dove Soap',
    sku: 'SKU006',
    barcode: '890123456006',
    category: 'Personal Care',
    price: 45.00,
    costPrice: 36.00,
    stock: 110,
    minStockThreshold: 20,
    unit: 'bar',
    batchNo: 'B012',
    mfgDate: '2026-07-20',
    expiryDate: '2028-01-10',
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1607006314177-3806a12534f3?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-7',
    name: 'Coca Cola',
    sku: 'SKU007',
    barcode: '890123456007',
    category: 'Beverages',
    price: 40.00,
    costPrice: 32.00,
    stock: 150,
    minStockThreshold: 30,
    unit: 'can',
    batchNo: 'B005',
    mfgDate: '2026-09-15',
    expiryDate: '2027-03-15',
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-8',
    name: 'Sunfeast Biscuits',
    sku: 'SKU008',
    barcode: '890123456008',
    category: 'Snacks',
    price: 30.00,
    costPrice: 24.00,
    stock: 25,
    minStockThreshold: 30,
    unit: 'pack',
    batchNo: 'B022',
    mfgDate: '2026-08-01',
    expiryDate: '2026-11-25',
    status: 'Low Stock',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-9',
    name: 'Parle Biscuits',
    sku: 'SKU009',
    barcode: '890123456009',
    category: 'Snacks',
    price: 10.00,
    costPrice: 8.00,
    stock: 20,
    minStockThreshold: 15,
    unit: 'pack',
    batchNo: 'B020',
    mfgDate: '2026-09-01',
    expiryDate: '2026-11-05',
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=120&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_CUSTOMERS = [
  { id: 'cust-1', name: 'Walk-in Customer', phone: '---', email: '---', loyaltyPoints: 0, tier: 'General', totalSpent: 520 },
  { id: 'cust-2', name: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul.s@example.com', loyaltyPoints: 340, tier: 'Gold', totalSpent: 12450 },
  { id: 'cust-3', name: 'Priya Singh', phone: '+91 98111 22334', email: 'priya.s@example.com', loyaltyPoints: 780, tier: 'Platinum', totalSpent: 28900 },
  { id: 'cust-4', name: 'Amit Verma', phone: '+91 97222 33445', email: 'amit.v@example.com', loyaltyPoints: 120, tier: 'Silver', totalSpent: 4500 }
];

export const INITIAL_SUPPLIERS = [
  { id: 'sup-1', companyName: 'Gujarat Milk Co-operative (Amul)', contactPerson: 'Suresh Patel', phone: '+91 98220 11223', email: 'orders@amuldist.in', category: 'Dairy Products', balanceDue: 14500 },
  { id: 'sup-2', companyName: 'Britannia & Parle Distribution', contactPerson: 'Karan Mehra', phone: '+91 98330 22334', email: 'sales@britannia-parle.in', category: 'Snacks', balanceDue: 8200 },
  { id: 'sup-3', companyName: 'Tata Consumer Products', contactPerson: 'Deepak Roy', phone: '+91 98440 33445', email: 'supply@tataconsumer.in', category: 'Grocery', balanceDue: 32000 }
];

export const INITIAL_PURCHASES = [
  { id: 'po-1001', poNumber: 'PO-2026-089', supplier: 'Gujarat Milk Co-operative (Amul)', date: '2026-10-24', itemsCount: 4, totalAmount: 18500, paymentStatus: 'Paid', receivingStatus: 'Received' },
  { id: 'po-1002', poNumber: 'PO-2026-090', supplier: 'Britannia & Parle Distribution', date: '2026-10-25', itemsCount: 6, totalAmount: 12300, paymentStatus: 'Partial', receivingStatus: 'Received' },
  { id: 'po-1003', poNumber: 'PO-2026-091', supplier: 'Tata Consumer Products', date: '2026-10-26', itemsCount: 8, totalAmount: 45000, paymentStatus: 'Unpaid', receivingStatus: 'Pending' }
];

export const INITIAL_SALES = [
  {
    id: 'inv-15',
    invoiceNumber: 'INV-0015',
    date: '2026-10-26 14:15',
    customerName: 'Walk-in Customer',
    customerPhone: '---',
    cashier: 'Admin',
    itemsCount: 2,
    subtotal: 500.00,
    tax: 20.00,
    discount: 0.00,
    totalAmount: 520.00,
    paymentMethod: 'Cash',
    status: 'Completed'
  },
  {
    id: 'inv-14',
    invoiceNumber: 'INV-0014',
    date: '2026-10-26 13:40',
    customerName: 'Rahul Sharma',
    customerPhone: '+91 98765 43210',
    cashier: 'Admin',
    itemsCount: 4,
    subtotal: 1200.00,
    tax: 50.00,
    discount: 0.00,
    totalAmount: 1250.00,
    paymentMethod: 'UPI',
    status: 'Completed'
  },
  {
    id: 'inv-13',
    invoiceNumber: 'INV-0013',
    date: '2026-10-26 12:10',
    customerName: 'Priya Singh',
    customerPhone: '+91 98111 22334',
    cashier: 'Admin',
    itemsCount: 3,
    subtotal: 850.00,
    tax: 40.00,
    discount: 0.00,
    totalAmount: 890.00,
    paymentMethod: 'Card',
    status: 'Completed'
  }
];

export const STORE_SETTINGS = {
  storeName: 'Smart Mart Pro',
  branch: 'Supermarket Management',
  gstin: '07AAAAA0000A1Z5',
  phone: '+91 11 4567 8900',
  email: 'admin@smartmartpro.com',
  address: 'Shop 12-15, Central Market, New Delhi, India 110001',
  currency: '₹',
  defaultGstRate: 5,
  receiptFooter: 'Thank you for shopping at Smart Mart Pro! Visit again.',
  lowStockThresholdDefault: 20
};
