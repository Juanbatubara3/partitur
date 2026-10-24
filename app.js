import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/+esm';

// Isi dari Supabase → Project Settings → API Keys (lihat README.md).
const SUPABASE_URL = 'https://didowuqjuxipzfqdngnq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dpLZqudFvFqxtTO8UNjNEg_M9e93YpW';

const configured = !SUPABASE_URL.startsWith('GANTI') && !SUPABASE_ANON_KEY.startsWith('GANTI');
const sb = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);

let songs = [];
let isAdmin = false;
let activeCategory = 'Semua';
let editingId = null;

const showStatus = (message) => { $('statusMessage').textContent = message || ''; };
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function getDriveFileId(input) {
  const value = String(input || '').trim();
  const match = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/) || value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(value)) return value;
  return '';
}
const driveViewUrl = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
const drivePreviewUrl = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
const driveDownloadUrl = (id) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
const driveThumbUrl = (id) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w480`;

/* ---------- Tampilan daftar ---------- */
function renderCategories() {
  const cats = ['Semua', ...new Set(songs.map(s => s.category).filter(Boolean))].sort((a, b) => a === 'Semua' ? -1 : b === 'Semua' ? 1 : a.localeCompare(b, 'id'));
  if (!cats.includes(activeCategory)) activeCategory = 'Semua';
  $('categoryBar').innerHTML = cats.length > 2 ? cats.map(c =>
    `<button type="button" class="chip" data-cat="${escapeHtml(c)}" aria-pressed="${c === activeCategory}">${escapeHtml(c)}</button>`).join('') : '';
  $('categoryList').innerHTML = cats.filter(c => c !== 'Semua').map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
}

function renderSongs() {
  renderCategories();
  const term = $('searchInput').value.trim().toLocaleLowerCase('id');
  const filtered = songs.filter(s =>
    (activeCategory === 'Semua' || s.category === activeCategory) &&
    [s.title, s.creator, s.category].join(' ').toLocaleLowerCase('id').includes(term));
  $('songCount').textContent = `${filtered.length} partitur`;
  if (!filtered.length) {
    $('songGrid').innerHTML = '';
    showStatus(songs.length ? 'Tidak ada partitur yang cocok. Coba kata kunci atau kategori lain.' : 'Belum ada partitur. Admin bisa menambahkannya lewat panel admin.');
    return;
  }
  showStatus('');
  $('songGrid').innerHTML = filtered.map(s => `
    <article class="song-card">
      <button class="thumb" type="button" data-view="${escapeHtml(s.id)}" aria-label="Lihat ${escapeHtml(s.title)}">
        <span class="thumb-fallback" aria-hidden="true">♫</span>
        <img src="${driveThumbUrl(s.driveFileId)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
      </button>
      <div class="card-body">
        <span class="pill">${escapeHtml(s.category)}</span>
        <h3>${escapeHtml(s.title)}</h3>
        <p class="song-meta">${escapeHtml(s.creator || 'Pencipta tidak dicantumkan')}</p>
        <div class="card-actions">
          <button class="button button-outline" type="button" data-view="${escapeHtml(s.id)}">Lihat</button>
          <button class="button" type="button" data-download="${escapeHtml(s.id)}">Unduh PDF</button>
        </div>
        ${isAdmin ? `<div class="card-actions admin-actions">
          <button class="button button-ghost" type="button" data-edit="${escapeHtml(s.id)}">Edit</button>
          <button class="button button-danger" type="button" data-delete="${escapeHtml(s.id)}">Hapus</button>
        </div>` : ''}
      </div>
    </article>`).join('');
}

async function loadSongs() {
  if (!sb) {
    showStatus('Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di app.js (lihat README.md).');
    $('songCount').textContent = '';
    return;
  }
  const { data, error } = await sb.from('lagu').select('*').order('judul');
  if (error) {
    console.error(error);
    showStatus('Gagal memuat data. Periksa tabel dan policy di Supabase (lihat README.md).');
    $('songCount').textContent = '';
    return;
  }
  songs = data.map(d => ({
    id: d.id,
    title: d.judul || 'Tanpa judul',
    creator: d.pencipta || '',
    category: d.kategori || 'Umum',
    pdfUrl: d.pdf_url || '',
    driveFileId: getDriveFileId(d.pdf_url)
  })).filter(s => s.driveFileId)
    .sort((a, b) => a.title.localeCompare(b.title, 'id'));
  renderSongs();
}

/* ---------- Pencarian, filter, thumbnail ---------- */
$('searchInput').addEventListener('input', renderSongs);
$('categoryBar').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-cat]');
  if (!chip) return;
  activeCategory = chip.dataset.cat;
  renderSongs();
});
// Jika thumbnail Drive tidak tersedia, tampilkan ikon not.
$('songGrid').addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.remove(); }, true);

/* ---------- Pratinjau PDF ---------- */
const viewer = $('viewer');
function openViewer(song) {
  $('viewerTitle').textContent = song.title;
  $('viewerFrame').src = drivePreviewUrl(song.driveFileId);
  $('viewerDownload').href = driveDownloadUrl(song.driveFileId);
  $('viewerOpen').href = driveViewUrl(song.driveFileId);
  viewer.showModal();
}
function closeViewer() { viewer.close(); }
viewer.addEventListener('close', () => { $('viewerFrame').src = 'about:blank'; });
$('viewerClose').addEventListener('click', closeViewer);
viewer.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });

/* ---------- Panel admin & login ---------- */
$('adminToggle').addEventListener('click', () => {
  const panel = $('adminPanel');
  panel.classList.toggle('hidden');
  $('adminToggle').setAttribute('aria-expanded', String(!panel.classList.contains('hidden')));
  if (!panel.classList.contains('hidden')) panel.scrollIntoView({ behavior: 'smooth' });
});

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!sb) { $('loginMessage').textContent = 'Supabase belum dikonfigurasi di app.js.'; return; }
  $('loginMessage').textContent = 'Sedang masuk…';
  const { error } = await sb.auth.signInWithPassword({ email: $('adminEmail').value.trim(), password: $('adminPassword').value });
  if (error) {
    console.error(error);
    $('loginMessage').textContent = /invalid login/i.test(error.message) ? 'Email atau kata sandi salah.'
      : /confirm/i.test(error.message) ? 'Email belum dikonfirmasi. Konfirmasi di Supabase → Authentication → Users.'
      : `Gagal masuk: ${error.message}`;
    return;
  }
  $('loginMessage').textContent = '';
  $('loginForm').reset();
});
$('logoutButton').addEventListener('click', () => sb && sb.auth.signOut());

async function applySession(session) {
  const user = session && session.user;
  isAdmin = false;
  if (user) {
    // Keamanan sebenarnya ada di policy database; ini hanya menentukan tampilan admin.
    const { data } = await sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    isAdmin = Boolean(data);
  }
  $('loginBox').classList.toggle('hidden', isAdmin);
  $('uploadBox').classList.toggle('hidden', !isAdmin);
  $('logoutButton').classList.toggle('hidden', !user);
  $('loginMessage').textContent = (user && !isAdmin)
    ? `Login berhasil, tetapi akun ini belum terdaftar sebagai admin. User ID: ${user.id}`
    : '';
  if (!isAdmin) resetForm();
  renderSongs();
}
if (sb) {
  sb.auth.onAuthStateChange((_event, session) => { setTimeout(() => applySession(session), 0); });
}

/* ---------- Tambah / edit partitur ---------- */
function resetForm() {
  editingId = null;
  $('songForm').reset();
  $('formTitle').textContent = 'Tambah partitur';
  $('uploadButton').textContent = 'Tambah partitur';
  $('cancelEdit').classList.add('hidden');
}
$('cancelEdit').addEventListener('click', () => { resetForm(); $('uploadMessage').textContent = ''; });

function startEdit(song) {
  editingId = song.id;
  $('songTitle').value = song.title;
  $('songCreator').value = song.creator;
  $('songCategory').value = song.category;
  $('songDriveLink').value = song.pdfUrl || driveViewUrl(song.driveFileId);
  $('formTitle').textContent = 'Edit partitur';
  $('uploadButton').textContent = 'Simpan perubahan';
  $('cancelEdit').classList.remove('hidden');
  $('uploadMessage').textContent = '';
  $('adminPanel').classList.remove('hidden');
  $('adminToggle').setAttribute('aria-expanded', 'true');
  $('uploadBox').scrollIntoView({ behavior: 'smooth' });
  $('songTitle').focus();
}

$('songForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!isAdmin) return;
  const link = $('songDriveLink').value.trim();
  if (!getDriveFileId(link)) {
    $('uploadMessage').textContent = 'Link Google Drive tidak valid. Salin link dari menu Bagikan.';
    return;
  }
  const row = {
    judul: $('songTitle').value.trim(),
    pencipta: $('songCreator').value.trim(),
    kategori: $('songCategory').value.trim() || 'Umum',
    pdf_url: link
  };
  $('uploadButton').disabled = true;
  $('uploadMessage').textContent = 'Menyimpan…';
  const wasEditing = Boolean(editingId);
  const { error } = wasEditing
    ? await sb.from('lagu').update(row).eq('id', editingId)
    : await sb.from('lagu').insert(row);
  $('uploadButton').disabled = false;
  if (error) {
    console.error(error);
    $('uploadMessage').textContent = /row-level security/i.test(error.message)
      ? 'Ditolak oleh database. Pastikan akunmu sudah ada di tabel admins (lihat README.md).'
      : `Gagal menyimpan: ${error.message}`;
    return;
  }
  resetForm();
  $('uploadMessage').textContent = wasEditing ? 'Perubahan disimpan.' : 'Partitur ditambahkan. Pastikan akses file Drive: “Siapa saja yang memiliki link”.';
  await loadSongs();
});

/* ---------- Aksi di kartu ---------- */
$('songGrid').addEventListener('click', async (event) => {
  const find = (attr) => { const el = event.target.closest(`[data-${attr}]`); return el ? songs.find(s => s.id === el.dataset[attr]) : null; };
  const view = find('view'), download = find('download'), edit = find('edit'), del = find('delete');
  if (view) openViewer(view);
  if (download) window.open(driveDownloadUrl(download.driveFileId), '_blank', 'noopener,noreferrer');
  if (edit && isAdmin) startEdit(edit);
  if (del && isAdmin) {
    if (!confirm(`Hapus partitur "${del.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const { error } = await sb.from('lagu').delete().eq('id', del.id);
    if (error) { console.error(error); alert('Gagal menghapus partitur. Periksa policy di Supabase.'); return; }
    await loadSongs();
  }
});

loadSongs();
if (sb) sb.auth.getSession().then(({ data }) => applySession(data.session));
