# Galeri Partitur — GitHub Pages + Supabase + Google Drive

Galeri partitur PDF: pencarian, filter kategori, pratinjau PDF, unduh, dan panel admin (tambah, edit, hapus lagu).

File: `index.html`, `style.css`, `app.js`, `setup.sql`, `README.md` (unggah ke root repository).

## 1. Google Drive
Unggah PDF → klik kanan → **Bagikan** → **Siapa saja yang memiliki link** (Pelihat) → salin link. Link ini ditempel admin di website.

## 2. Supabase
1. Daftar di https://supabase.com → **New project** (gratis).
2. Buka **SQL Editor → New query**, tempel isi `setup.sql`, klik **Run**.
3. **Authentication → Users → Add user → Create new user**: isi email + kata sandi, centang **Auto Confirm User**.
4. Jadikan akun itu admin: di SQL Editor jalankan
   `insert into public.admins (user_id) select id from auth.users where email = 'emailmu@gmail.com';`
5. **Project Settings → API**: salin **Project URL** dan **publishable key (sb_publishable_...)**, lalu isi di bagian atas `app.js`:
   ```js
   const SUPABASE_URL = 'https://xxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'sb_publishable_...';
   ```
   Publishable key aman ada di frontend karena data dilindungi policy (RLS). **Jangan** pakai Secret key / `service_role`.
6. (Opsional) **Authentication → URL Configuration → Site URL**: isi URL GitHub Pages-mu.

## 3. Deploy ke GitHub Pages
Buat repository → unggah file ke root → **Settings → Pages → Deploy from a branch → main → / (root) → Save**. Buka `https://USERNAME.github.io/NAMA-REPO/`.

## Admin tambahan
Buat user baru di Authentication → Users, lalu jalankan perintah `insert into public.admins ...` dengan email barunya.

## Catatan
- Data lama di Firebase tidak otomatis pindah; tambahkan ulang lewat panel admin.
- Free plan Supabase menjeda project yang tidak aktif 7 hari; buka dashboard untuk mengaktifkannya lagi.
- Hanya bagikan PDF yang hak distribusinya kamu miliki.
