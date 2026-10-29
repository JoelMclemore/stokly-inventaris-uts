// Menguji CRUD end-to-end melalui Nginx -> API -> MySQL.
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const base = process.env.TEST_BASE_URL || 'http://localhost:8080';
let ready = false;
for (let attempt = 1; attempt <= 60; attempt++) {
  try {
    const response = await fetch(`${base}/api/health`);
    if (response.ok && (await response.json()).database === 'connected') {
      ready = true;
      break;
    }
  } catch { /* Container mungkin belum siap. */ }
  await delay(2000);
}
assert.ok(ready, 'API dan MySQL tidak sehat dalam 120 detik.');

async function api(path, method = 'GET', body) {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) })
  });
  const result = await response.json();
  return { status: response.status, ...result };
}

const initial = await api('items');
assert.equal(initial.status, 200);
assert.ok(Array.isArray(initial.data));
console.log('✓ READ: daftar barang dapat dibaca');

const sku = `UTS-${Date.now()}`;
let createdId;
try {
  const created = await api('items', 'POST', { sku, name: 'Barang Test CI', category: 'Lainnya', stock: 3, price: 12500 });
  assert.equal(created.status, 201);
  assert.equal(created.data.sku, sku);
  createdId = created.data.id;
  console.log('✓ CREATE: barang baru masuk database');

  const updated = await api(`items/${createdId}`, 'PUT', { sku, name: 'Barang Test Diperbarui', category: 'Lainnya', stock: 10, price: 14000 });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.stock, 10);
  console.log('✓ UPDATE: perubahan tersimpan di database');

  const single = await api(`items/${createdId}`);
  assert.equal(single.status, 200);
  assert.equal(single.data.name, 'Barang Test Diperbarui');
  console.log('✓ READ DETAIL: perubahan benar-benar terbaca');

  const removed = await api(`items/${createdId}`, 'DELETE');
  assert.equal(removed.status, 200);
  createdId = null;
  console.log('✓ DELETE: data dihapus');

  console.log('Semua pengujian CRUD end-to-end LULUS.');
} finally {
  if (createdId) {
    await api(`items/${createdId}`, 'DELETE').catch(() => {});
  }
}

