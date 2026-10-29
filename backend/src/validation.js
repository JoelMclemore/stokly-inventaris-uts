export const categories = ['Elektronik', 'ATK', 'Peralatan', 'Lainnya'];

export function validateItem(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Data barang harus berupa objek.' };
  }

  const sku = typeof input.sku === 'string' ? input.sku.trim().toUpperCase() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const category = typeof input.category === 'string' ? input.category.trim() : '';
  const stock = input.stock;
  const price = input.price;

  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(sku)) {
    return { error: 'Kode SKU harus 3–32 karakter (huruf, angka, - atau _).' };
  }
  if (name.length < 3 || name.length > 100) {
    return { error: 'Nama barang harus 3–100 karakter.' };
  }
  if (!categories.includes(category)) {
    return { error: 'Kategori barang tidak valid.' };
  }
  const stockIsScalar = typeof stock === 'number' || (typeof stock === 'string' && stock.trim() !== '');
  const priceIsScalar = typeof price === 'number' || (typeof price === 'string' && price.trim() !== '');
  if (!stockIsScalar || !Number.isInteger(Number(stock)) || Number(stock) < 0 || Number(stock) > 1_000_000) {
    return { error: 'Stok harus bilangan bulat antara 0 dan 1.000.000.' };
  }
  if (!priceIsScalar || !Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 9_999_999_999.99) {
    return { error: 'Harga harus angka antara 0 dan 9.999.999.999,99.' };
  }

  const priceNumber = Number(price);
  if (Math.round(priceNumber * 100) !== priceNumber * 100 && Math.abs(Math.round(priceNumber * 100) - priceNumber * 100) > 1e-7) {
    return { error: 'Harga maksimal memiliki dua angka desimal.' };
  }

  return { value: { sku, name, category, stock: Number(stock), price: priceNumber } };
}

export function parseId(id) {
  const value = Number(id);
  return Number.isSafeInteger(value) && value > 0 && value <= 4294967295 ? value : null;
}

