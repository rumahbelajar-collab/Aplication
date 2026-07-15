export interface ProgramBelajar {
  id: string; // e.g., PB-01
  nama: string;
  jenjang: "SD" | "SMP" | "SMA" | "Umum";
  mapel: string;
  durasi: number; // in minutes
  tarifSiswa: number; // rate for student
  honorTutor: number; // rate for tutor
  status: "aktif" | "nonaktif";
  deskripsi?: string;
}

export interface Siswa {
  id: string; // e.g., RBS01
  nama: string;
  programId: string; // Active learning program
  status: "aktif" | "nonaktif";
  teleponOrangTua: string;
  alamat?: string;
  tanggalDaftar: string; // YYYY-MM-DD
}

export interface Tutor {
  id: string; // e.g., RBT01
  nama: string;
  idLogin: string; // Custom username created by admin
  password?: string;
  status: "aktif" | "nonaktif";
  telepon: string;
  alamat?: string;
  tanggalBergabung: string; // YYYY-MM-DD
}

export interface RiwayatPertemuan {
  id: string; // e.g., RP-0001
  tanggal: string; // YYYY-MM-DD
  siswaId: string;
  siswaNama: string; // snapshot
  tutorId: string;
  tutorNama: string; // snapshot
  programId: string;
  programNama: string; // snapshot
  tarifSiswaSnapshot: number; // price at time of session
  honorTutorSnapshot: number; // tutor honor at time of session
  catatan?: string;
}

export interface TransaksiRekeningSiswa {
  id: string; // e.g., TXS-0001
  tanggal: string; // YYYY-MM-DD
  siswaId: string;
  tipe: "debit" | "kredit"; // debit (tagihan dari sesi), kredit (pembayaran dari ortu)
  keterangan: string;
  jumlah: number;
  saldoBerjalan: number;
  referensiId?: string; // refers to RiwayatPertemuan.id or PembayaranSiswa.id
}

export interface PembayaranSiswa {
  id: string; // e.g., PAY-0001
  tanggal: string; // YYYY-MM-DD
  siswaId: string;
  siswaNama: string; // snapshot
  jumlah: number;
  metode: "admin" | "tutor"; // direct to admin vs via tutor
  tutorId?: string; // if via tutor
  tutorNama?: string; // snapshot
  statusTitipan: "pending" | "diserahkan"; // "pending" means with tutor, "diserahkan" means handed to admin
  tanggalSerah?: string; // YYYY-MM-DD
}

export interface TransaksiHonorTutor {
  id: string; // e.g., TXT-0001
  tanggal: string; // YYYY-MM-DD
  tutorId: string;
  tipe: "debit" | "kredit"; // kredit (honor masuk dari sesi), debit (honor dibayarkan oleh admin)
  keterangan: string;
  jumlah: number;
  saldoBerjalan: number;
  referensiId?: string; // refers to RiwayatPertemuan.id or SlipGaji.id
}

export interface SlipGaji {
  id: string; // e.g., SG-0001
  tanggal: string; // YYYY-MM-DD
  tutorId: string;
  tutorNama: string;
  jumlah: number; // Jumlah bersih yang dibayarkan
  periode: string; // e.g., "Juni 2026"
  catatan?: string;
  potongan?: number; // Potongan/Denda/Cuts
  keteranganPotongan?: string; // Keterangan potongan
  totalHonor?: number; // Total honor kotor yang diselesaikan
}

export interface KasLembaga {
  id: string; // e.g., KAS-0001
  tanggal: string; // YYYY-MM-DD
  tipe: "masuk" | "keluar";
  keterangan: string;
  jumlah: number;
  saldoBerjalan: number;
  referensiId?: string; // refers to PembayaranSiswa.id or SlipGaji.id or custom exp
}

// User role session
export interface UserSession {
  role: "admin" | "tutor";
  userId: string; // "admin" or Tutor.id
  nama: string;
}

export interface PemasukanLain {
  id: string; // e.g., PML-0001
  tanggal: string; // YYYY-MM-DD
  jenis: string; // e.g., Biaya pendaftaran, Penjualan modul, Penjualan seragam, Donasi, Sponsorship, Lain-lain
  nominal: number;
  keterangan?: string;
}

export interface LaporanKehadiran {
  id: string; // e.g., LPK-0001
  tanggal: string; // YYYY-MM-DD
  tutorId: string;
  tutorNama: string;
  siswaId: string;
  siswaNama: string;
  programId: string;
  programNama: string;
  fotoJurnal: string; // Image URL or Base64 representation of custom learning journal
  keterangan?: string;
  status: "pending" | "setuju" | "tolak";
  tanggalProses?: string; // YYYY-MM-DD
  catatanAdmin?: string;
}

export interface JadwalTutor {
  id: string; // e.g., JDW-0001
  hari: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Minggu";
  waktu: string; // e.g. "13:30 - 15:00"
  tutorId: string;
  tutorNama: string;
  siswaId: string;
  siswaNama: string;
  programId: string;
  programNama: string;
}

export interface RaportSubject {
  name: string;
  to1: number;
  to2: number;
  to3: number;
}

export interface RaportSiswa {
  id: string;
  tutor: string;
  name: string;
  class: string;
  grade: string;
  notes: string;
  subjects: RaportSubject[];
  average: string;
  date: string;
}


