import test from 'node:test';
import assert from 'node:assert/strict';
import { parseId, validateItem } from '../src/validation.js';

const good = { sku: 'atk-010', name: 'Kertas HVS A4', category: 'ATK', stock: 12, price: 65000 };

test('menerima data valid dan menormalkan SKU', () => {
  assert.deepEqual(validateItem(good).value, { ...good, sku: 'ATK-010' });
});
test('menolak SKU tidak valid', () => {
  assert.match(validateItem({ ...good, sku: 'x!' }).error, /SKU/);
});
test('menolak stok negatif atau pecahan', () => {
  assert.match(validateItem({ ...good, stock: -1 }).error, /Stok/);
  assert.match(validateItem({ ...good, stock: 1.5 }).error, /Stok/);
  assert.match(validateItem({ ...good, stock: false }).error, /Stok/);
});
test('menolak harga negatif dan lebih dari dua desimal', () => {
  assert.match(validateItem({ ...good, price: -5 }).error, /Harga/);
  assert.match(validateItem({ ...good, price: 1.235 }).error, /Harga/);
});
test('menolak kategori tidak dikenal', () => {
  assert.match(validateItem({ ...good, category: 'Makanan' }).error, /Kategori/);
});
test('ID harus integer positif pada jangkauan MySQL', () => {
  assert.equal(parseId('42'), 42);
  assert.equal(parseId('0'), null);
  assert.equal(parseId('abc'), null);
  assert.equal(parseId('4.2'), null);
  assert.equal(parseId('999999999999999999'), null);
});

