-- Jalankan di Supabase → SQL Editor → New query → Run

create table if not exists public.lagu (
  id uuid primary key default gen_random_uuid(),
  judul text not null check (char_length(judul) > 0),
  pencipta text default '',
  kategori text default 'Umum',
  pdf_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.lagu enable row level security;
alter table public.admins enable row level security;

-- Semua orang boleh membaca lagu
create policy "lagu_read" on public.lagu for select using (true);

-- Hanya admin yang boleh tambah / ubah / hapus
create policy "lagu_insert" on public.lagu for insert to authenticated
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
create policy "lagu_update" on public.lagu for update to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
create policy "lagu_delete" on public.lagu for delete to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Pengguna hanya bisa melihat baris admins miliknya sendiri
create policy "admins_self" on public.admins for select to authenticated
  using (user_id = auth.uid());

-- Setelah membuat akun di Authentication → Users, jadikan admin dengan
-- (ganti emailnya):
-- insert into public.admins (user_id) select id from auth.users where email = 'emailmu@gmail.com';
