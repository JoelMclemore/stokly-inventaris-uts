'use strict';

const API_URL = '/api/items';
const PAGE_SIZE = 7;
const icons = {
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 5h6v6M19 5l-9.5 9.5-4 1 1-4L16 2.5"/><path d="M19 14v5H5V5h5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7M10 11v5M14 11v5"/></svg>'
};

const state = { items: [], search: '', category: '', sort: 'newest', page: 1, editingId: null, deletingId: null, loading: true, error: null };
const $ = (id) => document.getElementById(id);
const rupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: Number(value) % 1 === 0 ? 0 : 2 }).format(Number(value) || 0);
const number = (value) => new Intl.NumberFormat('id-ID').format(value);
let toastTimer;

function showToast(message, isError = false) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa Docker dan koneksi Anda.');
  }
  let result;
  try { result = await response.json(); } catch { throw new Error('Server memberikan respons yang tidak dikenal.'); }
  if (!response.ok) throw new Error(result.message || 'Permintaan gagal diproses.');
  return result;
}

function connection(online) {
  $('connectionDot').className = `connection-dot ${online ? 'online' : 'offline'}`;
  $('connectionTitle').textContent = online ? 'Sistem Online' : 'Koneksi Terputus';
  $('connectionDescription').textContent = online ? 'MySQL terhubung' : 'Periksa layanan Docker';
}

async function loadItems() {
  state.loading = true;
  state.error = null;
  renderTable();
  try {
    const response = await request(API_URL);
    state.items = response.data;
    state.error = null;
    connection(true);
  } catch (error) {
    state.error = error.message;
    connection(false);
    showToast(error.message, true);
  } finally {
    state.loading = false;
    renderAll();
  }
}

function filteredItems() {
  const term = state.search.toLocaleLowerCase('id-ID');
  const list = state.items.filter((item) => {
    return (!term || item.name.toLocaleLowerCase('id-ID').includes(term) || item.sku.toLocaleLowerCase('id-ID').includes(term)) &&
      (!state.category || item.category === state.category);
  });
  switch (state.sort) {
    case 'name': list.sort((a, b) => a.name.localeCompare(b.name, 'id')); break;
    case 'stock-asc': list.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name)); break;
    case 'stock-desc': list.sort((a, b) => b.stock - a.stock || a.name.localeCompare(b.name)); break;
    default: list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at) || b.id - a.id);
  }
  return list;
}

function updateSummary() {
  const items = state.items;
  $('totalItems').textContent = number(items.length);
  $('totalStock').textContent = number(items.reduce((sum, item) => sum + Number(item.stock), 0));
  $('lowStock').textContent = number(items.filter((item) => item.stock <= 5).length);
  $('totalValue').textContent = rupiah(items.reduce((sum, item) => sum + Number(item.price) * Number(item.stock), 0));
  $('navCount').textContent = items.length;
  $('itemCountBadge').textContent = items.length;
}

function makeCell(text, className = '') {
  const cell = document.createElement('td');
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function makeRow(item) {
  const tr = document.createElement('tr');
  const product = document.createElement('td');
  const visual = document.createElement('div');
  visual.className = 'item-cell';
  const badge = document.createElement('span');
  const symbols = { Elektronik: '💻', ATK: '📝', Peralatan: '🪑', Lainnya: '📦' };
  badge.className = `item-icon ${item.category === 'Elektronik' ? 'elektronik' : item.category === 'ATK' ? 'atk' : item.category === 'Peralatan' ? 'peralatan' : ''}`;
  badge.textContent = symbols[item.category] || '📦';
  const details = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'item-name';
  name.textContent = item.name;
  name.title = item.name;
  const caption = document.createElement('div');
  caption.className = 'item-caption';
  caption.textContent = `ID #${String(item.id).padStart(3, '0')}`;
  details.append(name, caption);
  visual.append(badge, details);
  product.append(visual);
  tr.append(product);

  const sku = document.createElement('td');
  const chip = document.createElement('span');
  chip.className = 'sku-chip';
  chip.textContent = item.sku;
  sku.append(chip);
  tr.append(sku, makeCell(item.category, 'category-text'));
  tr.append(makeCell(number(item.stock) + ' unit', 'stock-count'));
  tr.append(makeCell(rupiah(item.price), 'price-text'));
  const statusCell = document.createElement('td');
  const status = document.createElement('span');
  const empty = item.stock === 0;
  const low = item.stock <= 5;
  status.className = `status-badge ${empty ? 'empty' : low ? 'low' : 'available'}`;
  status.textContent = empty ? 'Habis' : low ? 'Stok Menipis' : 'Tersedia';
  statusCell.append(status);
  tr.append(statusCell);

  const actions = document.createElement('td');
  actions.className = 'action-cell';
  for (const [action, title, icon] of [['edit', 'Edit barang', icons.edit], ['delete', 'Hapus barang', icons.trash]]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `action-btn ${action === 'delete' ? 'delete' : ''}`;
    btn.title = `${title}: ${item.name}`;
    btn.setAttribute('aria-label', `${title}: ${item.name}`);
    btn.innerHTML = icon;
    btn.addEventListener('click', () => action === 'edit' ? openForm(item) : openDelete(item));
    actions.append(btn);
  }
  tr.append(actions);
  return tr;
}

function renderTable() {
  const body = $('itemsBody');
  body.replaceChildren();
  if (state.loading || state.error) {
    const tr = document.createElement('tr');
    const td = makeCell(state.loading ? 'Memuat data inventaris...' : state.error, 'loading-cell');
    td.colSpan = 7;
    tr.append(td);
    body.append(tr);
    $('showingText').textContent = state.loading ? 'Mengambil data...' : 'Gagal memuat data';
    $('pageLabel').textContent = '1 / 1';
    $('prevPage').disabled = $('nextPage').disabled = true;
    return;
  }
  const items = filteredItems();
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  if (items.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'empty-state';
    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.textContent = '📭';
    const heading = document.createElement('strong');
    heading.textContent = state.items.length ? 'Barang tidak ditemukan' : 'Belum ada data barang';
    const description = document.createElement('p');
    description.textContent = state.items.length ? 'Coba ubah kata pencarian atau filter kategori.' : 'Klik tombol Tambah Barang untuk mulai mencatat inventaris.';
    cell.append(icon, heading, description);
    row.append(cell);
    body.append(row);
  } else {
    for (const item of items.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE)) body.append(makeRow(item));
  }
  const start = items.length ? (state.page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(state.page * PAGE_SIZE, items.length);
  $('showingText').textContent = `Menampilkan ${start}–${end} dari ${items.length} barang`;
  $('pageLabel').textContent = `${state.page} / ${totalPages}`;
  $('prevPage').disabled = state.page <= 1;
  $('nextPage').disabled = state.page >= totalPages;
}

function renderAll() { updateSummary(); renderTable(); }

function openForm(item = null) {
  state.editingId = item?.id ?? null;
  $('itemForm').reset();
  $('formError').hidden = true;
  $('modalTitle').textContent = item ? 'Edit Data Barang' : 'Tambah Barang Baru';
  $('modalSubtitle').textContent = item ? 'Perbarui informasi barang yang dipilih.' : 'Isi informasi barang dengan lengkap.';
  $('saveButton').textContent = item ? 'Simpan Perubahan' : 'Simpan Barang';
  if (item) {
    $('itemName').value = item.name;
    $('itemSku').value = item.sku;
    $('itemCategory').value = item.category;
    $('itemStock').value = item.stock;
    $('itemPrice').value = item.price;
  }
  $('itemModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('itemName').focus();
}

function closeForm() {
  $('itemModal').hidden = true;
  document.body.style.overflow = '';
  state.editingId = null;
}

async function saveItem(event) {
  event.preventDefault();
  const data = {
    name: $('itemName').value.trim(),
    sku: $('itemSku').value.trim().toUpperCase(),
    category: $('itemCategory').value,
    stock: $('itemStock').value,
    price: $('itemPrice').value
  };
  if (data.name.length < 3 || !data.sku || !data.category || !data.stock || !data.price) {
    $('formError').textContent = 'Lengkapi semua kolom dengan data yang valid.';
    $('formError').hidden = false;
    return;
  }
  const editing = state.editingId !== null;
  $('saveButton').disabled = true;
  $('saveButton').textContent = 'Menyimpan...';
  $('formError').hidden = true;
  try {
    const response = await request(editing ? `${API_URL}/${state.editingId}` : API_URL, {
      method: editing ? 'PUT' : 'POST', body: JSON.stringify(data)
    });
    closeForm();
    state.page = 1;
    await loadItems();
    showToast(response.message);
  } catch (error) {
    $('formError').textContent = error.message;
    $('formError').hidden = false;
  } finally {
    $('saveButton').disabled = false;
    $('saveButton').textContent = editing ? 'Simpan Perubahan' : 'Simpan Barang';
  }
}

function openDelete(item) {
  state.deletingId = item.id;
  $('deleteMessage').textContent = `"${item.name}" akan dihapus permanen dari database MySQL. Tindakan ini tidak dapat dibatalkan.`;
  $('deleteModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('cancelDeleteButton').focus();
}

function closeDelete() {
  $('deleteModal').hidden = true;
  document.body.style.overflow = '';
  state.deletingId = null;
}

async function deleteItem() {
  if (state.deletingId === null) return;
  const id = state.deletingId;
  $('confirmDeleteButton').disabled = true;
  $('confirmDeleteButton').textContent = 'Menghapus...';
  try {
    const response = await request(`${API_URL}/${id}`, { method: 'DELETE' });
    closeDelete();
    await loadItems();
    showToast(response.message);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    $('confirmDeleteButton').disabled = false;
    $('confirmDeleteButton').textContent = 'Ya, Hapus';
  }
}

function exportCSV() {
  const items = filteredItems();
  if (!items.length) return showToast('Tidak ada data untuk diekspor.', true);
  const fields = [['SKU', 'Nama Barang', 'Kategori', 'Stok', 'Harga Satuan'], ...items.map((item) => [item.sku, item.name, item.category, item.stock, item.price])];
  const lines = fields.map((cells) => cells.map((value) => {
    let v = String(value ?? '');
    // Prevent spreadsheet formula injection when CSV opened in Excel/Sheets.
    if (/^[\s]*[=+@\-]/.test(v)) v = `'${v}`;
    return `"${v.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + lines], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `stokly-inventaris-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('Data berhasil diekspor ke CSV.');
}

function init() {
  $('todayDate').textContent = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  $('addTopButton').addEventListener('click', () => openForm());
  $('closeModalButton').addEventListener('click', closeForm);
  $('cancelFormButton').addEventListener('click', closeForm);
  $('itemForm').addEventListener('submit', saveItem);
  $('cancelDeleteButton').addEventListener('click', closeDelete);
  $('confirmDeleteButton').addEventListener('click', deleteItem);
  $('searchInput').addEventListener('input', (event) => { state.search = event.target.value.trim(); state.page = 1; renderTable(); });
  $('categoryFilter').addEventListener('change', (event) => { state.category = event.target.value; state.page = 1; renderTable(); });
  $('sortFilter').addEventListener('change', (event) => { state.sort = event.target.value; state.page = 1; renderTable(); });
  $('prevPage').addEventListener('click', () => { state.page--; renderTable(); });
  $('nextPage').addEventListener('click', () => { state.page++; renderTable(); });
  $('exportButton').addEventListener('click', exportCSV);
  $('menuButton').addEventListener('click', () => {
    const open = $('sidebar').classList.toggle('open');
    $('menuButton').setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((node) => node.classList.remove('active'));
    link.classList.add('active');
    $('sidebar').classList.remove('open');
    $('menuButton').setAttribute('aria-expanded', 'false');
  }));
  for (const [id, close] of [['itemModal', closeForm], ['deleteModal', closeDelete]]) {
    $(id).addEventListener('mousedown', (event) => { if (event.target === $(id)) close(); });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!$('deleteModal').hidden) closeDelete();
      else if (!$('itemModal').hidden) closeForm();
      else { $('sidebar').classList.remove('open'); $('menuButton').setAttribute('aria-expanded', 'false'); }
    }
  });
  loadItems();
}

document.addEventListener('DOMContentLoaded', init);

