/**
 * ============================================================================
 * [IN-MEMORY REPOSITORY STORE]
 * ============================================================================
 * ⚠️ IMPORTANT MENTORSHIP NOTE (DHYAN SE PADHEIN):
 * Yeh data Node.js process ki RAM (Random Access Memory) me store ho raha hai.
 * 
 * 1. PERSISTENCE LIMITATION:
 *    Jab bhi server restart hoga (nodemon auto-restart ya system reboot),
 *    yeh RAM memory clear ho jaayegi aur data initial default values par reset
 *    ho jaayega. Isiliye production me hum MongoDB / PostgreSQL use karte hain
 *    jo Hard Disk / SSD par data permanently persist karte hain.
 * 
 * 2. ARCHITECTURAL PURPOSE:
 *    Is phase ka maqsad Route -> Controller -> Service -> Repository
 *    ke clean separation of concerns ko practically sikhana hai.
 *    Agli phase me hum sirf repository layer ko Mongoose models se swap karenge
 *    bina controllers aur routes ko disturb kiye!
 * ============================================================================
 */

export const inMemoryStore = {
  categories: [
    {
      id: 'cat-1',
      name: 'Dairy Products',
      slug: 'dairy-products',
      description: 'Milk, cheese, yogurt, butter & cream',
      productCount: 25,
      status: 'Active',
      color: '#3b82f6',
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
    },
    {
      id: 'cat-2',
      name: 'Snacks',
      slug: 'snacks',
      description: 'Chips, biscuits, namkeen, wafers',
      productCount: 18,
      status: 'Active',
      color: '#f59e0b',
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
    },
    {
      id: 'cat-3',
      name: 'Beverages',
      slug: 'beverages',
      description: 'Soft drinks, fruit juices, cold brew',
      productCount: 12,
      status: 'Active',
      color: '#10b981',
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
    },
    {
      id: 'cat-4',
      name: 'Personal Care',
      slug: 'personal-care',
      description: 'Soap, shampoo, toothpaste, skincare',
      productCount: 20,
      status: 'Active',
      color: '#8b5cf6',
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
    },
    {
      id: 'cat-5',
      name: 'Household',
      slug: 'household',
      description: 'Cleaning items, detergents, wipes',
      productCount: 15,
      status: 'Active',
      color: '#06b6d4',
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
    },
    {
      id: 'cat-6',
      name: 'Grocery',
      slug: 'grocery',
      description: 'Salt, sugar, pulses, grains, flour',
      productCount: 35,
      status: 'Active',
      color: '#ec4899',
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
    }
  ],

  products: [
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
      expiryDate: '2026-10-28',
      status: 'In Stock',
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
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
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
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
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
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
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
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
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z'
    }
  ]
};
