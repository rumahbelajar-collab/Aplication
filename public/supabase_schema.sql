-- =============================================================
-- SKEMA SUPABASE POSTGRESQL UNTUK APLIKASI RUMAH BELAJAR
-- =============================================================
-- Jalankan seluruh script SQL ini di:
-- Dashboard Supabase > SQL Editor > New Query > Run
-- =============================================================

-- 1. TABEL UTAMA (JSONB SNAPSHOT) UNTUK SINKRONISASI OTOMATIS APLIKASI
CREATE TABLE IF NOT EXISTS public.rumah_belajar_db (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Matikan RLS (Row Level Security) agar Client-Side Anon Key dapat membaca & menulis data
ALTER TABLE public.rumah_belajar_db DISABLE ROW LEVEL SECURITY;

-- Aktifkan Fitur Sinkronisasi Real-Time untuk tabel ini di Supabase
ALTER TABLE public.rumah_belajar_db REPLICA IDENTITY FULL;

-- Tambahkan tabel ke publikasi realtime Supabase
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rumah_belajar_db;
EXCEPTION
  WHEN OTHERS THEN
    -- Abaikan jika tabel sudah terdaftar dalam publikasi
END $$;


-- 2. TABEL RELASIONAL OPTIONAL: SISWA
CREATE TABLE IF NOT EXISTS public.siswa (
  id VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(250) NOT NULL,
  program_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'aktif',
  telepon_orang_tua VARCHAR(30),
  alamat TEXT,
  tanggal_daftar DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.siswa DISABLE ROW LEVEL SECURITY;


-- 3. TABEL RELASIONAL OPTIONAL: TUTOR
CREATE TABLE IF NOT EXISTS public.tutor (
  id VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(250) NOT NULL,
  id_login VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'aktif',
  telepon VARCHAR(30),
  alamat TEXT,
  tanggal_bergabung DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.tutor DISABLE ROW LEVEL SECURITY;


-- 4. TABEL RELASIONAL OPTIONAL: BUKU KAS LEMBAGA
CREATE TABLE IF NOT EXISTS public.kas_lembaga (
  id VARCHAR(30) PRIMARY KEY,
  tanggal DATE NOT NULL,
  tipe VARCHAR(10) CHECK (tipe IN ('masuk', 'keluar')),
  keterangan TEXT NOT NULL,
  jumlah NUMERIC(15, 2) NOT NULL DEFAULT 0,
  saldo_berjalan NUMERIC(15, 2) NOT NULL DEFAULT 0,
  referensi_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.kas_lembaga DISABLE ROW LEVEL SECURITY;
