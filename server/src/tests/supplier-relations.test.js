import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  buildSupplierRelations,
  collectSupplierCategoryIds,
  normalizeSupplierReferenceIds,
  supplierProvidesProduct
} from '../utils/supplierRelations.js';

test('normalizes and deduplicates selected supplier reference IDs', () => {
  const firstId = new mongoose.Types.ObjectId();
  const secondId = new mongoose.Types.ObjectId();

  assert.deepEqual(
    normalizeSupplierReferenceIds([firstId, firstId.toString(), secondId], 'products'),
    [firstId.toString(), secondId.toString()]
  );
});

test('rejects malformed supplier reference selections', () => {
  assert.throws(() => normalizeSupplierReferenceIds('not-an-array', 'categories'), /must be an array/);
  assert.throws(() => normalizeSupplierReferenceIds(['invalid-id'], 'products'), /invalid ID/);
});

test('includes product categories and readable legacy category text', () => {
  const categoryId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const relations = buildSupplierRelations(
    [{ _id: categoryId, name: 'Dairy' }],
    [{ _id: productId, category: categoryId }]
  );

  assert.deepEqual(relations.categories, [categoryId.toString()]);
  assert.deepEqual(relations.products, [productId]);
  assert.equal(relations.category, 'Dairy');
});

test('adds selected product categories to the supplier category links', () => {
  const selectedCategory = new mongoose.Types.ObjectId();
  const productCategory = new mongoose.Types.ObjectId();

  assert.deepEqual(
    collectSupplierCategoryIds(
      [selectedCategory.toString()],
      [{ category: productCategory }, { category: selectedCategory }]
    ),
    [selectedCategory.toString(), productCategory.toString()]
  );
});

test('allows purchases only for linked products or linked categories', () => {
  const productId = new mongoose.Types.ObjectId();
  const otherProductId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();
  const product = { _id: productId, category: categoryId };

  assert.equal(supplierProvidesProduct({ products: [productId] }, product), true);
  assert.equal(supplierProvidesProduct({ products: [otherProductId], categories: [categoryId] }, product), false);
  assert.equal(supplierProvidesProduct({ categories: [categoryId] }, product), true);
  assert.equal(supplierProvidesProduct({}, product), true);
});
