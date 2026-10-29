import express from 'express';
import { pool } from './db.js';
import { parseId, validateItem } from './validation.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

const cols = 'id, sku, name, category, stock, price, created_at, updated_at';

function sendError(res, error) {
  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Kode SKU sudah digunakan. Coba kode yang berbeda.' });
  }
  console.error('Database/API error:', error);
  return res.status(500).json({ message: 'Terjadi kesalahan pada server. Silakan coba lagi.' });
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/items', async (_req, res) => {
  try {
    const [rows] = await pool.query(`SELECT ${cols} FROM items ORDER BY updated_at DESC, id DESC`);
    res.json({ data: rows });
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/items/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID tidak valid.' });

  try {
    const [rows] = await pool.execute(`SELECT ${cols} FROM items WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ message: 'Barang tidak ditemukan.' });
    res.json({ data: rows[0] });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/items', async (req, res) => {
  const result = validateItem(req.body);
  if (result.error) return res.status(400).json({ message: result.error });

  const { sku, name, category, stock, price } = result.value;
  try {
    const [insert] = await pool.execute(
      'INSERT INTO items (sku, name, category, stock, price) VALUES (?, ?, ?, ?, ?)',
      [sku, name, category, stock, price]
    );
    const [rows] = await pool.execute(`SELECT ${cols} FROM items WHERE id = ?`, [insert.insertId]);
    res.status(201).json({ message: 'Barang berhasil ditambahkan.', data: rows[0] });
  } catch (error) {
    sendError(res, error);
  }
});

app.put('/api/items/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID tidak valid.' });
  const result = validateItem(req.body);
  if (result.error) return res.status(400).json({ message: result.error });

  const { sku, name, category, stock, price } = result.value;
  try {
    const [update] = await pool.execute(
      'UPDATE items SET sku = ?, name = ?, category = ?, stock = ?, price = ? WHERE id = ?',
      [sku, name, category, stock, price, id]
    );
    if (!update.affectedRows) return res.status(404).json({ message: 'Barang tidak ditemukan.' });
    const [rows] = await pool.execute(`SELECT ${cols} FROM items WHERE id = ?`, [id]);
    res.json({ message: 'Barang berhasil diperbarui.', data: rows[0] });
  } catch (error) {
    sendError(res, error);
  }
});

app.delete('/api/items/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID tidak valid.' });
  try {
    const [result] = await pool.execute('DELETE FROM items WHERE id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Barang tidak ditemukan.' });
    res.json({ message: 'Barang berhasil dihapus.' });
  } catch (error) {
    sendError(res, error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Format JSON tidak valid.' });
  }
  if (error?.status === 413) {
    return res.status(413).json({ message: 'Ukuran data terlalu besar.' });
  }
  return sendError(res, error);
});

const server = app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
  console.log(`Stokly API berjalan pada port ${process.env.PORT || 3000}`);
});

process.on('SIGTERM', () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

