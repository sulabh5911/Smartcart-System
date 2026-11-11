import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Category, Product, Batch } from '../models/index.js';

/**
 * Supermarket Demo Data Seed Script
 * Pre-populates the MongoDB database with real-world supermarket data:
 * - Users (Admin & Cashier)
 * - Categories (Departments)
 * - Products (Master SKUs)
 * - Batches (Inventory with MFG & Expiry dates)
 */
async function seedDatabase() {
  try {
    console.log('\n===============================================');
    console.log('🌱 Starting Smart Mart Pro Database Seeding...');
    console.log('===============================================');

    await connectDB();

    // 1. Clean existing records
    console.log('🧹 Clearing old collections...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Batch.deleteMany({});
    console.log('✅ Collections wiped clean.');

    // 2. Seed Users
    console.log('👤 Seeding Users...');
    const users = await User.create([
      {
        name: 'Supermarket Admin',
        email: 'admin@smartmartpro.com',
        password: 'AdminPassword123!', // In production this would be hashed via bcrypt
        role: 'admin'
      },
      {
        name: 'Pooja Sharma',
        email: 'pooja.cashier@smartmartpro.com',
        password: 'CashierPassword123!',
        role: 'cashier'
      }
    ]);
    console.log(`✅ Seeded ${users.length} users.`);

    // 3. Seed Categories
    console.log('📂 Seeding Categories...');
    const categories = await Category.create([
      { name: 'Dairy Products', description: 'Fresh milk, cheese, butter, yogurt, cream', color: '#3b82f6' },
      { name: 'Snacks', description: 'Chips, biscuits, wafers, namkeen', color: '#f59e0b' },
      { name: 'Grocery', description: 'Salt, sugar, pulses, grains, flour, spices', color: '#ec4899' },
      { name: 'Personal Care', description: 'Soap, shampoo, toothpaste, oral care, cosmetics', color: '#8b5cf6' },
      { name: 'Beverages', description: 'Cold drinks, juices, soda, water, energy drinks', color: '#10b981' },
      { name: 'Household', description: 'Detergents, surface cleaners, paper rolls, wipes', color: '#06b6d4' }
    ]);
    console.log(`✅ Seeded ${categories.length} categories.`);

    const catMap = new Map();
    categories.forEach((c) => catMap.set(c.name, c._id));

    // 4. Seed Products
    console.log('📦 Seeding Products...');
    const productDocs = [
      {
        name: 'Amul Milk',
        sku: 'SKU001',
        barcode: '890123456001',
        category: catMap.get('Dairy Products'),
        unit: 'packet',
        sellingPrice: 60.00,
        minStockAlert: 30,
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120&auto=format&fit=crop&q=80',
        description: 'Amul Taaza Toned Milk 1L Pouch'
      },
      {
        name: 'Maggi Noodles',
        sku: 'SKU002',
        barcode: '890123456002',
        category: catMap.get('Snacks'),
        unit: 'pack',
        sellingPrice: 15.00,
        minStockAlert: 25,
        image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=120&auto=format&fit=crop&q=80',
        description: 'Nestle Maggi 2-Minute Masala Noodles 70g'
      },
      {
        name: 'TATA Salt',
        sku: 'SKU003',
        barcode: '890123456003',
        category: catMap.get('Grocery'),
        unit: 'pack',
        sellingPrice: 25.00,
        minStockAlert: 20,
        image: 'https://images.unsplash.com/photo-1518110903416-5231a547214e?w=120&auto=format&fit=crop&q=80',
        description: 'Tata Salt Vacuum Evaporated Iodised Salt 1kg'
      },
      {
        name: 'Colgate Toothpaste',
        sku: 'SKU004',
        barcode: '890123456004',
        category: catMap.get('Personal Care'),
        unit: 'tube',
        sellingPrice: 85.00,
        minStockAlert: 15,
        image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=120&auto=format&fit=crop&q=80',
        description: 'Colgate Strong Teeth Dental Cream 150g'
      },
      {
        name: "Lay's Chips",
        sku: 'SKU005',
        barcode: '890123456005',
        category: catMap.get('Snacks'),
        unit: 'pack',
        sellingPrice: 20.00,
        minStockAlert: 50,
        image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=120&auto=format&fit=crop&q=80',
        description: "Lay's Classic Salted Potato Chips 50g"
      },
      {
        name: 'Dove Soap',
        sku: 'SKU006',
        barcode: '890123456006',
        category: catMap.get('Personal Care'),
        unit: 'bar',
        sellingPrice: 45.00,
        minStockAlert: 20,
        image: 'https://images.unsplash.com/photo-1607006314177-3806a12534f3?w=120&auto=format&fit=crop&q=80',
        description: 'Dove Cream Beauty Bathing Bar 100g'
      },
      {
        name: 'Coca Cola',
        sku: 'SKU007',
        barcode: '890123456007',
        category: catMap.get('Beverages'),
        unit: 'can',
        sellingPrice: 40.00,
        minStockAlert: 30,
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=120&auto=format&fit=crop&q=80',
        description: 'Coca Cola Refreshing Soft Drink 300ml Can'
      },
      {
        name: 'Sunfeast Biscuits',
        sku: 'SKU008',
        barcode: '890123456008',
        category: catMap.get('Snacks'),
        unit: 'pack',
        sellingPrice: 30.00,
        minStockAlert: 30,
        image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=120&auto=format&fit=crop&q=80',
        description: 'Sunfeast Dark Fantasy Choco Fills 75g'
      },
      {
        name: 'Parle Biscuits',
        sku: 'SKU009',
        barcode: '890123456009',
        category: catMap.get('Snacks'),
        unit: 'pack',
        sellingPrice: 10.00,
        minStockAlert: 15,
        image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=120&auto=format&fit=crop&q=80',
        description: 'Parle-G Original Gluco Biscuits 130g'
      }
    ];

    const products = await Product.create(productDocs);
    console.log(`✅ Seeded ${products.length} products.`);

    const prodMap = new Map();
    products.forEach((p) => prodMap.set(p.sku, p._id));

    // 5. Seed Batches (Linked to Products with realistic expiry dates)
    console.log('🏷️ Seeding Inventory Batches...');
    const now = new Date();
    const batches = await Batch.create([
      // Amul Milk Batch 1: Expiring in 2 days (Urgent)
      {
        batchNumber: 'B001',
        product: prodMap.get('SKU001'),
        mfgDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // in 2 days
        purchasePrice: 45.00,
        availableQuantity: 50
      },
      // Amul Milk Batch 2: Fresh stock (Normal)
      {
        batchNumber: 'B002',
        product: prodMap.get('SKU001'),
        mfgDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // in 20 days
        purchasePrice: 45.00,
        availableQuantity: 70
      },
      // Maggi Noodles: Normal
      {
        batchNumber: 'B010',
        product: prodMap.get('SKU002'),
        mfgDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // in 25 days
        purchasePrice: 12.00,
        availableQuantity: 95
      },
      // TATA Salt: Normal
      {
        batchNumber: 'B015',
        product: prodMap.get('SKU003'),
        mfgDate: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000), // in 23 days
        purchasePrice: 20.00,
        availableQuantity: 30
      },
      // Lay's Chips: Normal
      {
        batchNumber: 'B020',
        product: prodMap.get('SKU005'),
        mfgDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // in 60 days
        purchasePrice: 16.00,
        availableQuantity: 40
      },
      // Parle Biscuits: Warning (Expiring in 10 days)
      {
        batchNumber: 'B020',
        product: prodMap.get('SKU009'),
        mfgDate: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // in 10 days
        purchasePrice: 8.00,
        availableQuantity: 20
      }
    ]);
    console.log(`✅ Seeded ${batches.length} inventory batches.`);

    console.log('\n===============================================');
    console.log('🎉 Supermarket Database Seeding Completed!');
    console.log(`📊 Total Collections: 4`);
    console.log(`👤 Users: ${users.length}`);
    console.log(`📂 Categories: ${categories.length}`);
    console.log(`📦 Products: ${products.length}`);
    console.log(`🏷️ Batches: ${batches.length}`);
    console.log('===============================================\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

seedDatabase();
