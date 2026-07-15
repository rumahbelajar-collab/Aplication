import { 
  ProgramBelajar, 
  Siswa, 
  Tutor, 
  RiwayatPertemuan, 
  TransaksiRekeningSiswa, 
  PembayaranSiswa, 
  TransaksiHonorTutor, 
  SlipGaji, 
  KasLembaga,
  PemasukanLain,
  LaporanKehadiran,
  JadwalTutor,
  RaportSiswa
} from "../types";
import { pushToSupabase } from "./supabase";

export interface Database {
  programs: ProgramBelajar[];
  students: Siswa[];
  tutors: Tutor[];
  sessions: RiwayatPertemuan[];
  studentLedger: TransaksiRekeningSiswa[];
  payments: PembayaranSiswa[];
  tutorLedger: TransaksiHonorTutor[];
  slips: SlipGaji[];
  kas: KasLembaga[];
  otherIncomes: PemasukanLain[];
  attendanceReports: LaporanKehadiran[];
  schedules: JadwalTutor[];
  raports?: RaportSiswa[];
  broadcastMessage?: string;
  adminPassword?: string;
}

// FORMATTERS
export function formatRupiah(value: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

const BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parts[1].padStart(2, "0");
  const day = parts[2].padStart(2, "0");
  return `${day}/${month}/${year}`;
}

export function formatBulanTahun(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-"); // YYYY-MM-DD
  if (parts.length >= 2) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${BULAN_INDO[monthIdx]} ${parts[0]}`;
  }
  return dateStr;
}

export function getTodayDateString(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

// STORAGE KEY
const DB_STORAGE_KEY = "rumah_belajar_db_v2";

// INITIAL SEED DATA FOR DEMO
const INITIAL_PROGRAMS: ProgramBelajar[] = [
  { id: "PB-01", nama: "Matematika SD Kelas 6", jenjang: "SD", mapel: "Matematika", durasi: 90, tarifSiswa: 120000, honorTutor: 60000, status: "aktif", deskripsi: "Persiapan Ujian Sekolah dasar matematika" },
  { id: "PB-02", nama: "IPA Terpadu SMP Kelas 9", jenjang: "SMP", mapel: "IPA", durasi: 90, tarifSiswa: 150000, honorTutor: 75000, status: "aktif", deskripsi: "Fisika, Kimia, Biologi SMP" },
  { id: "PB-03", nama: "Fisika SMA Kelas 12", jenjang: "SMA", mapel: "Fisika", durasi: 90, tarifSiswa: 180000, honorTutor: 90000, status: "aktif", deskripsi: "Persiapan UTBK / SNBT materi Fisika" },
  { id: "PB-04", nama: "English Speaking for Beginners", jenjang: "Umum", mapel: "Bahasa Inggris", durasi: 120, tarifSiswa: 200000, honorTutor: 100000, status: "aktif", deskripsi: "Conversation and grammar basics" },
];

const INITIAL_TUTORS: Tutor[] = [
  { id: "RBT01", nama: "Budi Santoso, S.Pd.", idLogin: "budi", password: "123", status: "aktif", telepon: "081234567890", alamat: "Jl. Merdeka No. 45, Jakarta", tanggalBergabung: "2026-01-10" },
  { id: "RBT02", nama: "Siti Aminah, M.Si.", idLogin: "siti", password: "123", status: "aktif", telepon: "085678901234", alamat: "Jl. Anggrek No. 12, Bandung", tanggalBergabung: "2026-02-15" },
  { id: "RBT03", nama: "Rian Hidayat, B.Eng.", idLogin: "rian", password: "123", status: "aktif", telepon: "087789012345", alamat: "Kost Harmoni, Depok", tanggalBergabung: "2026-03-01" },
  { id: "RBT04", nama: "Dewi Lestari, S.Hum.", idLogin: "dewi", password: "123", status: "nonaktif", telepon: "089912345678", alamat: "Jl. Melati Baru 4, Bekasi", tanggalBergabung: "2025-08-01" },
];

const INITIAL_STUDENTS: Siswa[] = [
  { id: "RBS01", nama: "Adi Wijaya", programId: "PB-01", status: "aktif", teleponOrangTua: "081122334455", alamat: "Komp. Permai Lestari Blok C/10", tanggalDaftar: "2026-05-01" },
  { id: "RBS02", nama: "Bella Pratama", programId: "PB-02", status: "aktif", teleponOrangTua: "081133445566", alamat: "Perum Graha Indah No. 22", tanggalDaftar: "2026-05-15" },
  { id: "RBS03", nama: "Candra Kirana", programId: "PB-03", status: "aktif", teleponOrangTua: "081144556677", alamat: "Jl. Cemara Hijau II No. 8", tanggalDaftar: "2026-06-01" },
  { id: "RBS04", nama: "Dian Lestari", programId: "PB-01", status: "aktif", teleponOrangTua: "081155667788", alamat: "Jl. Flamboyan Raya No. 15", tanggalDaftar: "2026-06-05" },
  { id: "RBS05", nama: "Elga Pradipta", programId: "PB-04", status: "aktif", teleponOrangTua: "081166778899", alamat: "Apartemen Gateway Tower B-32", tanggalDaftar: "2026-06-10" },
];

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("Storage access denied:", e);
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Storage access denied:", e);
  }
}

export function getDatabase(): Database {
  try {
    const raw = safeGetItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all arrays exist
      return {
        programs: parsed.programs || [],
        students: parsed.students || [],
        tutors: parsed.tutors || [],
        sessions: parsed.sessions || [],
        studentLedger: parsed.studentLedger || [],
        payments: parsed.payments || [],
        tutorLedger: parsed.tutorLedger || [],
        slips: parsed.slips || [],
        kas: parsed.kas || [],
        otherIncomes: parsed.otherIncomes || [],
        attendanceReports: parsed.attendanceReports || [],
        raports: parsed.raports || [],
        schedules: parsed.schedules || [
          { id: "JDW-0001", hari: "Senin", waktu: "13:30 - 15:00", tutorId: "RBT01", tutorNama: "Budi Santoso, S.Pd.", siswaId: "RBS01", siswaNama: "Adi Wijaya", programId: "PB-01", programNama: "Matematika SD Kelas 6" },
          { id: "JDW-0002", hari: "Senin", waktu: "15:30 - 17:00", tutorId: "RBT01", tutorNama: "Budi Santoso, S.Pd.", siswaId: "RBS04", siswaNama: "Dian Lestari", programId: "PB-01", programNama: "Matematika SD Kelas 6" },
          { id: "JDW-0003", hari: "Senin", waktu: "14:00 - 15:30", tutorId: "RBT02", tutorNama: "Siti Aminah, M.Si.", siswaId: "RBS02", siswaNama: "Bella Pratama", programId: "PB-02", programNama: "IPA Terpadu SMP Kelas 9" },
          { id: "JDW-0004", hari: "Senin", waktu: "16:00 - 17:30", tutorId: "RBT03", tutorNama: "Rian Hidayat, B.Eng.", siswaId: "RBS03", siswaNama: "Candra Kirana", programId: "PB-03", programNama: "Fisika SMA Kelas 12" },
          { id: "JDW-0005", hari: "Senin", waktu: "14:00 - 15:30", tutorId: "RBT04", tutorNama: "Dewi Lestari, S.Hum.", siswaId: "RBS05", siswaNama: "Elga Pradipta", programId: "PB-04", programNama: "English Speaking for Beginners" },
        ],
        broadcastMessage: parsed.broadcastMessage ?? "📢 PENGUMUMAN TUTOR: Mohon segera lakukan serah terima uang titipan pembayaran siswa yang diterima kepada Staf Administrasi maksimal 3 hari sejak diterima. | Harap catat riwayat pertemuan di hari bimbingan yang sama untuk ketertiban honor. | Terima kasih!",
        adminPassword: parsed.adminPassword ?? "admin123"
      };
    }
  } catch (e) {
    console.error("Error loading database, resetting", e);
  }
  
  // Create Seed Data
  const db = generateSeedDatabase();
  saveDatabase(db);
  return db;
}

export function saveDatabase(db: Database): void {
  safeSetItem(DB_STORAGE_KEY, JSON.stringify(db));
  pushToSupabase(db).catch(err => {
    console.error("Failed background sync to Supabase:", err);
  });
}

function generateSeedDatabase(): Database {
  const db: Database = {
    programs: [...INITIAL_PROGRAMS],
    students: [...INITIAL_STUDENTS],
    tutors: [...INITIAL_TUTORS],
    sessions: [],
    studentLedger: [],
    payments: [],
    tutorLedger: [],
    slips: [],
    kas: [],
    otherIncomes: [],
    attendanceReports: [],
    raports: [],
    schedules: [
      { id: "JDW-0001", hari: "Senin", waktu: "13:30 - 15:00", tutorId: "RBT01", tutorNama: "Budi Santoso, S.Pd.", siswaId: "RBS01", siswaNama: "Adi Wijaya", programId: "PB-01", programNama: "Matematika SD Kelas 6" },
      { id: "JDW-0002", hari: "Senin", waktu: "15:30 - 17:00", tutorId: "RBT01", tutorNama: "Budi Santoso, S.Pd.", siswaId: "RBS04", siswaNama: "Dian Lestari", programId: "PB-01", programNama: "Matematika SD Kelas 6" },
      { id: "JDW-0003", hari: "Senin", waktu: "14:00 - 15:30", tutorId: "RBT02", tutorNama: "Siti Aminah, M.Si.", siswaId: "RBS02", siswaNama: "Bella Pratama", programId: "PB-02", programNama: "IPA Terpadu SMP Kelas 9" },
      { id: "JDW-0004", hari: "Senin", waktu: "16:00 - 17:30", tutorId: "RBT03", tutorNama: "Rian Hidayat, B.Eng.", siswaId: "RBS03", siswaNama: "Candra Kirana", programId: "PB-03", programNama: "Fisika SMA Kelas 12" },
      { id: "JDW-0005", hari: "Senin", waktu: "14:00 - 15:30", tutorId: "RBT04", tutorNama: "Dewi Lestari, S.Hum.", siswaId: "RBS05", siswaNama: "Elga Pradipta", programId: "PB-04", programNama: "English Speaking for Beginners" },
    ],
    broadcastMessage: "📢 PENGUMUMAN TUTOR: Mohon segera lakukan serah terima uang titipan pembayaran siswa yang diterima kepada Staf Administrasi maksimal 3 hari sejak diterima. | Harap catat riwayat pertemuan di hari bimbingan yang sama untuk ketertiban honor. | Terima kasih!",
    adminPassword: "admin123"
  };

  // Let's seed initial transactions in June 2026!
  // Our dates: 2026-06-02 to 2026-06-28.
  // We want to create dynamic entries that are consistent.
  
  // Let's pre-populate some sessions:
  const initialSess = [
    { tanggal: "2026-06-02", studentId: "RBS01", tutorId: "RBT01" }, // Adi, Budi, PB-01
    { tanggal: "2026-06-03", studentId: "RBS02", tutorId: "RBT02" }, // Bella, Siti, PB-02
    { tanggal: "2026-06-04", studentId: "RBS03", tutorId: "RBT03" }, // Candra, Rian, PB-03
    { tanggal: "2026-06-09", studentId: "RBS01", tutorId: "RBT01" }, // Adi, Budi, PB-01
    { tanggal: "2026-06-10", studentId: "RBS02", tutorId: "RBT02" }, // Bella, Siti, PB-02
    { tanggal: "2026-06-11", studentId: "RBS03", tutorId: "RBT03" }, // Candra, Rian, PB-03
    { tanggal: "2026-06-15", studentId: "RBS04", tutorId: "RBT01" }, // Dian, Budi, PB-01
    { tanggal: "2026-06-16", studentId: "RBS01", tutorId: "RBT01" }, // Adi, Budi, PB-01
    { tanggal: "2026-06-17", studentId: "RBS02", tutorId: "RBT02" }, // Bella, Siti, PB-02
    { tanggal: "2026-06-18", studentId: "RBS03", tutorId: "RBT03" }, // Candra, Rian, PB-03
    { tanggal: "2026-06-22", studentId: "RBS04", tutorId: "RBT01" }, // Dian, Budi, PB-01
    { tanggal: "2026-06-23", studentId: "RBS01", tutorId: "RBT01" }, // Adi, Budi, PB-01
    { tanggal: "2026-06-24", studentId: "RBS02", tutorId: "RBT02" }, // Bella, Siti, PB-02
    { tanggal: "2026-06-25", studentId: "RBS05", tutorId: "RBT03" }, // Elga, Rian, PB-04
    { tanggal: "2026-06-26", studentId: "RBS03", tutorId: "RBT03" }, // Candra, Rian, PB-03
  ];

  let sessionCounter = 1;
  let ledgerStudentCounter = 1;
  let ledgerTutorCounter = 1;
  let kasCounter = 1;
  let paymentCounter = 1;

  // Let's seed some direct payments and tutor payments to make the financial books interesting
  // Seed initial Kas
  let currentKasSaldo = 5000000; // Starting general cash 5 Million
  db.kas.push({
    id: `KAS-${String(kasCounter++).padStart(4, "0")}`,
    tanggal: "2026-06-01",
    tipe: "masuk",
    keterangan: "Saldo Awal Kas Lembaga (Bulan Juni 2026)",
    jumlah: 5000000,
    saldoBerjalan: 5000000
  });

  // Re-use core triggers to preserve calculations
  initialSess.forEach((s) => {
    const student = db.students.find(st => st.id === s.studentId)!;
    const tutor = db.tutors.find(t => t.id === s.tutorId)!;
    const program = db.programs.find(p => p.id === student.programId)!;

    const rpId = `RP-${String(sessionCounter++).padStart(4, "0")}`;
    db.sessions.push({
      id: rpId,
      tanggal: s.tanggal,
      siswaId: student.id,
      siswaNama: student.nama,
      tutorId: tutor.id,
      tutorNama: tutor.nama,
      programId: program.id,
      programNama: program.nama,
      tarifSiswaSnapshot: program.tarifSiswa,
      honorTutorSnapshot: program.honorTutor,
      catatan: `Sesi pembelajaran ${program.nama}`
    });

    // Debit Student Account (Session costs student)
    const prevStudentLedger = db.studentLedger.filter(l => l.siswaId === student.id);
    const prevStudentSaldo = prevStudentLedger.length > 0 ? prevStudentLedger[prevStudentLedger.length - 1].saldoBerjalan : 0;
    db.studentLedger.push({
      id: `TXS-${String(ledgerStudentCounter++).padStart(4, "0")}`,
      tanggal: s.tanggal,
      siswaId: student.id,
      tipe: "debit",
      keterangan: `Riwayat Pertemuan [${rpId}] - ${program.nama}`,
      jumlah: program.tarifSiswa,
      saldoBerjalan: prevStudentSaldo + program.tarifSiswa,
      referensiId: rpId
    });

    // Kredit Tutor Account (Session earns tutor money)
    const prevTutorLedger = db.tutorLedger.filter(l => l.tutorId === tutor.id);
    const prevTutorSaldo = prevTutorLedger.length > 0 ? prevTutorLedger[prevTutorLedger.length - 1].saldoBerjalan : 0;
    db.tutorLedger.push({
      id: `TXT-${String(ledgerTutorCounter++).padStart(4, "0")}`,
      tanggal: s.tanggal,
      tutorId: tutor.id,
      tipe: "kredit",
      keterangan: `Riwayat Pertemuan [${rpId}] - Siswa: ${student.nama} - ${program.nama}`,
      jumlah: program.honorTutor,
      saldoBerjalan: prevTutorSaldo + program.honorTutor,
      referensiId: rpId
    });
  });

  // Seed Student Payments
  // Let's record some payments that have been made in June
  const paymentsToSeed = [
    // Direct Admin payments (Kas increases directly)
    { tanggal: "2026-06-10", siswaId: "RBS01", jumlah: 240000, metode: "admin" as const }, // Adi pays 2 sessions
    { tanggal: "2026-06-12", siswaId: "RBS02", jumlah: 300000, metode: "admin" as const }, // Bella pays 2 sessions
    { tanggal: "2026-06-15", siswaId: "RBS03", jumlah: 360000, metode: "admin" as const }, // Candra pays 2 sessions

    // Payments via Tutor (Titipan Tutor)
    // One that is already handed over to Admin
    { tanggal: "2026-06-20", siswaId: "RBS01", jumlah: 120000, metode: "tutor" as const, tutorId: "RBT01", statusTitipan: "diserahkan" as const, tanggalSerah: "2026-06-21" },
    // One that is still PENDING with Tutor (this forms the tutor's deposit balance!)
    { tanggal: "2026-06-26", siswaId: "RBS04", jumlah: 240000, metode: "tutor" as const, tutorId: "RBT01", statusTitipan: "pending" as const },
    { tanggal: "2026-06-27", siswaId: "RBS02", jumlah: 150000, metode: "tutor" as const, tutorId: "RBT02", statusTitipan: "pending" as const },
  ];

  paymentsToSeed.forEach((p) => {
    const student = db.students.find(st => st.id === p.siswaId)!;
    const tutor = p.tutorId ? db.tutors.find(t => t.id === p.tutorId) : undefined;
    
    const payId = `PAY-${String(paymentCounter++).padStart(4, "0")}`;
    db.payments.push({
      id: payId,
      tanggal: p.tanggal,
      siswaId: student.id,
      siswaNama: student.nama,
      jumlah: p.jumlah,
      metode: p.metode,
      tutorId: p.tutorId,
      tutorNama: tutor ? tutor.nama : undefined,
      statusTitipan: p.statusTitipan || "diserahkan",
      tanggalSerah: p.tanggalSerah
    });

    // Credit student ledger (reduces student's outstanding balance)
    const prevStudentLedger = db.studentLedger.filter(l => l.siswaId === student.id);
    const prevStudentSaldo = prevStudentLedger.length > 0 ? prevStudentLedger[prevStudentLedger.length - 1].saldoBerjalan : 0;
    db.studentLedger.push({
      id: `TXS-${String(ledgerStudentCounter++).padStart(4, "0")}`,
      tanggal: p.tanggal,
      siswaId: student.id,
      tipe: "kredit",
      keterangan: p.metode === "admin" 
        ? "Pembayaran langsung ke Admin" 
        : `Titipan Pembayaran via Tutor: ${tutor?.nama}`,
      jumlah: p.jumlah,
      saldoBerjalan: prevStudentSaldo - p.jumlah,
      referensiId: payId
    });

    // If direct to admin or already handed over: add to General Kas!
    if (p.metode === "admin" || p.statusTitipan === "diserahkan") {
      const transTanggal = p.metode === "admin" ? p.tanggal : (p.tanggalSerah || p.tanggal);
      const prevKasSaldo = db.kas.length > 0 ? db.kas[db.kas.length - 1].saldoBerjalan : 0;
      db.kas.push({
        id: `KAS-${String(kasCounter++).padStart(4, "0")}`,
        tanggal: transTanggal,
        tipe: "masuk",
        keterangan: p.metode === "admin" 
          ? `Pembayaran Siswa [${payId}] - ${student.nama}`
          : `Penerimaan Titipan Tutor [${payId}] - ${tutor?.nama} (Siswa: ${student.nama})`,
        jumlah: p.jumlah,
        saldoBerjalan: prevKasSaldo + p.jumlah
      });
    }
  });

  // Pay some tutor honors & create slip gaji
  // Tutor Budi (RBT01) had 5 sessions * 60,000 = 300,000. Let's pay 180,000 on June 20.
  const sliId = "SG-0001";
  db.slips.push({
    id: sliId,
    tanggal: "2026-06-20",
    tutorId: "RBT01",
    tutorNama: "Budi Santoso, S.Pd.",
    jumlah: 180000,
    periode: "Juni 2026",
    catatan: "Pembayaran Sebagian Honor Tutor Pertengahan Bulan"
  });

  // Debit tutor ledger for honor paid
  const budiLedger = db.tutorLedger.filter(l => l.tutorId === "RBT01");
  const budiSaldo = budiLedger.length > 0 ? budiLedger[budiLedger.length - 1].saldoBerjalan : 0;
  db.tutorLedger.push({
    id: `TXT-${String(ledgerTutorCounter++).padStart(4, "0")}`,
    tanggal: "2026-06-20",
    tutorId: "RBT01",
    tipe: "debit",
    keterangan: `Pembayaran Honor [${sliId}] - Periode Juni 2026`,
    jumlah: 180000,
    saldoBerjalan: budiSaldo - 180000,
    referensiId: sliId
  });

  // Reduce General Kas
  const prevKasSaldo = db.kas.length > 0 ? db.kas[db.kas.length - 1].saldoBerjalan : 0;
  db.kas.push({
    id: `KAS-${String(kasCounter++).padStart(4, "0")}`,
    tanggal: "2026-06-20",
    tipe: "keluar",
    keterangan: `Pembayaran Honor Tutor [${sliId}] - Budi Santoso, S.Pd.`,
    jumlah: 180000,
    saldoBerjalan: prevKasSaldo - 180000,
    referensiId: sliId
  });

  return db;
}

// TRANSACTION HANDLERS (AUTOMATIONS)
// These ensure that recording any operation maintains ledger consistency.

// 1. Record New Session
export function addSessionTransaction(
  db: Database,
  data: {
    tanggal: string;
    siswaId: string;
    tutorId: string;
    programId: string;
    catatan?: string;
  }
): Database {
  const nextDb = { ...db };
  const student = nextDb.students.find(s => s.id === data.siswaId);
  const tutor = nextDb.tutors.find(t => t.id === data.tutorId);
  const program = nextDb.programs.find(p => p.id === data.programId);

  if (!student || !tutor || !program) {
    console.error("Failed to add session transaction: missing student, tutor, or program", { student, tutor, program });
    return db;
  }

  // Jika programId siswa masih kosong, kaitkan siswa tersebut ke program ini secara otomatis
  if (!student.programId || student.programId === "") {
    nextDb.students = nextDb.students.map(s =>
      s.id === student.id ? { ...s, programId: program.id } : s
    );
  }

  // Generate ID
  const newId = `RP-${String(nextDb.sessions.length + 1).padStart(4, "0")}`;
  
  // Create Riwayat Pertemuan
  const newSession: RiwayatPertemuan = {
    id: newId,
    tanggal: data.tanggal,
    siswaId: student.id,
    siswaNama: student.nama,
    tutorId: tutor.id,
    tutorNama: tutor.nama,
    programId: program.id,
    programNama: program.nama,
    tarifSiswaSnapshot: program.tarifSiswa,
    honorTutorSnapshot: program.honorTutor,
    catatan: data.catatan || `Sesi pembelajaran ${program.nama}`
  };
  nextDb.sessions = [newSession, ...nextDb.sessions]; // Newest first

  // 1. Update Student Ledger (Debit = Charge)
  const studentTxList = nextDb.studentLedger.filter(tx => tx.siswaId === student.id);
  const studentCurrentSaldo = studentTxList.length > 0 ? studentTxList[studentTxList.length - 1].saldoBerjalan : 0;
  const newStudentTx: TransaksiRekeningSiswa = {
    id: `TXS-${String(nextDb.studentLedger.length + 1).padStart(4, "0")}`,
    tanggal: data.tanggal,
    siswaId: student.id,
    tipe: "debit",
    keterangan: `Riwayat Pertemuan [${newId}] - ${program.nama}`,
    jumlah: program.tarifSiswa,
    saldoBerjalan: studentCurrentSaldo + program.tarifSiswa,
    referensiId: newId
  };
  nextDb.studentLedger = [...nextDb.studentLedger, newStudentTx]; // Appended chronologically

  // 2. Update Tutor Ledger (Kredit = Earned honor)
  const tutorTxList = nextDb.tutorLedger.filter(tx => tx.tutorId === tutor.id);
  const tutorCurrentSaldo = tutorTxList.length > 0 ? tutorTxList[tutorTxList.length - 1].saldoBerjalan : 0;
  const newTutorTx: TransaksiHonorTutor = {
    id: `TXT-${String(nextDb.tutorLedger.length + 1).padStart(4, "0")}`,
    tanggal: data.tanggal,
    tutorId: tutor.id,
    tipe: "kredit",
    keterangan: `Riwayat Pertemuan [${newId}] - Siswa: ${student.nama} - ${program.nama}`,
    jumlah: program.honorTutor,
    saldoBerjalan: tutorCurrentSaldo + program.honorTutor,
    referensiId: newId
  };
  nextDb.tutorLedger = [...nextDb.tutorLedger, newTutorTx]; // Appended chronologically

  saveDatabase(nextDb);
  return nextDb;
}

// 2. Record Student Payment
export function addPaymentTransaction(
  db: Database,
  data: {
    tanggal: string;
    siswaId: string;
    jumlah: number;
    metode: "admin" | "tutor";
    tutorId?: string;
  }
): Database {
  const nextDb = { ...db };
  const student = nextDb.students.find(s => s.id === data.siswaId)!;
  const tutor = data.tutorId ? nextDb.tutors.find(t => t.id === data.tutorId) : undefined;

  const payId = `PAY-${String(nextDb.payments.length + 1).padStart(4, "0")}`;
  
  const newPayment: PembayaranSiswa = {
    id: payId,
    tanggal: data.tanggal,
    siswaId: student.id,
    siswaNama: student.nama,
    jumlah: data.jumlah,
    metode: data.metode,
    tutorId: data.tutorId,
    tutorNama: tutor ? tutor.nama : undefined,
    statusTitipan: data.metode === "tutor" ? "pending" : "diserahkan",
    tanggalSerah: undefined
  };
  nextDb.payments = [newPayment, ...nextDb.payments]; // Newest first

  // Update Student Ledger (Kredit = Reduces outstanding bill) IF paid directly to Admin
  if (data.metode === "admin") {
    const studentTxList = nextDb.studentLedger.filter(tx => tx.siswaId === student.id);
    const studentCurrentSaldo = studentTxList.length > 0 ? studentTxList[studentTxList.length - 1].saldoBerjalan : 0;
    const newStudentTx: TransaksiRekeningSiswa = {
      id: `TXS-${String(nextDb.studentLedger.length + 1).padStart(4, "0")}`,
      tanggal: data.tanggal,
      siswaId: student.id,
      tipe: "kredit",
      keterangan: "Pembayaran langsung ke Admin",
      jumlah: data.jumlah,
      saldoBerjalan: studentCurrentSaldo - data.jumlah,
      referensiId: payId
    };
    nextDb.studentLedger = [...nextDb.studentLedger, newStudentTx];
  }

  // If directly paid to Admin: immediately enters Kas Lembaga
  if (data.metode === "admin") {
    const prevKasSaldo = nextDb.kas.length > 0 ? nextDb.kas[nextDb.kas.length - 1].saldoBerjalan : 0;
    const newKasTx: KasLembaga = {
      id: `KAS-${String(nextDb.kas.length + 1).padStart(4, "0")}`,
      tanggal: data.tanggal,
      tipe: "masuk",
      keterangan: `Pembayaran Siswa [${payId}] - ${student.nama}`,
      jumlah: data.jumlah,
      saldoBerjalan: prevKasSaldo + data.jumlah,
      referensiId: payId
    };
    nextDb.kas = [...nextDb.kas, newKasTx];
  }

  saveDatabase(nextDb);
  return nextDb;
}

// 3. Confirm Tutor Handing Over Deposits
export function confirmTutorDepositHandover(
  db: Database,
  paymentId: string,
  tanggalSerah: string
): Database {
  const paymentIdx = db.payments.findIndex(p => p.id === paymentId);
  if (paymentIdx === -1) return db;

  const payment = db.payments[paymentIdx];
  if (payment.metode !== "tutor" || payment.statusTitipan === "diserahkan") return db;

  // Update payment status
  const updatedPayment = {
    ...payment,
    statusTitipan: "diserahkan" as const,
    tanggalSerah: tanggalSerah
  };

  const nextDb = {
    ...db,
    payments: [...db.payments],
    studentLedger: [...db.studentLedger],
    kas: [...db.kas]
  };
  
  nextDb.payments[paymentIdx] = updatedPayment;

  // Update Student Ledger right now! (Kredit = Reduces outstanding bill)
  const studentTxList = nextDb.studentLedger.filter(tx => tx.siswaId === payment.siswaId);
  const studentCurrentSaldo = studentTxList.length > 0 ? studentTxList[studentTxList.length - 1].saldoBerjalan : 0;
  const newStudentTx: TransaksiRekeningSiswa = {
    id: `TXS-${String(nextDb.studentLedger.length + 1).padStart(4, "0")}`,
    tanggal: tanggalSerah,
    siswaId: payment.siswaId,
    tipe: "kredit",
    keterangan: `Penerimaan Pembayaran via Tutor: ${payment.tutorNama}`,
    jumlah: payment.jumlah,
    saldoBerjalan: studentCurrentSaldo - payment.jumlah,
    referensiId: payment.id
  };
  nextDb.studentLedger.push(newStudentTx);

  // Insert into General Kas Lembaga
  const prevKasSaldo = nextDb.kas.length > 0 ? nextDb.kas[nextDb.kas.length - 1].saldoBerjalan : 0;
  const newKasTx: KasLembaga = {
    id: `KAS-${String(nextDb.kas.length + 1).padStart(4, "0")}`,
    tanggal: tanggalSerah,
    tipe: "masuk",
    keterangan: `Penerimaan Titipan Tutor [${payment.id}] - ${payment.tutorNama} (Siswa: ${payment.siswaNama})`,
    jumlah: payment.jumlah,
    saldoBerjalan: prevKasSaldo + payment.jumlah,
    referensiId: payment.id
  };
  nextDb.kas.push(newKasTx);

  saveDatabase(nextDb);
  return nextDb;
}

// 4. Pay Tutor Honor & Generate Slip Gaji
export function payTutorHonorTransaction(
  db: Database,
  data: {
    tanggal: string;
    tutorId: string;
    jumlah: number; // Total honor kotor yang diselesaikan dari saldo
    periode: string;
    catatan?: string;
    potongan?: number; // Potongan honor jika ada
    keteranganPotongan?: string; // Alasan potongan
  }
): Database {
  const nextDb = { ...db };
  const tutor = nextDb.tutors.find(t => t.id === data.tutorId)!;

  const slipId = `SG-${String(nextDb.slips.length + 1).padStart(4, "0")}`;
  const potonganAmt = data.potongan || 0;
  const netPaid = Math.max(0, data.jumlah - potonganAmt);
  
  const newSlip: SlipGaji = {
    id: slipId,
    tanggal: data.tanggal,
    tutorId: tutor.id,
    tutorNama: tutor.nama,
    jumlah: netPaid, // Net paid (bersih)
    periode: data.periode,
    catatan: data.catatan || "Pembayaran Honor Tutor",
    potongan: potonganAmt,
    keteranganPotongan: data.keteranganPotongan || "",
    totalHonor: data.jumlah // Gross (kotor)
  };
  nextDb.slips = [newSlip, ...nextDb.slips];

  // Update Tutor Ledger (Debit = Decreases outstanding honor owed by Gross Amount)
  const tutorTxList = nextDb.tutorLedger.filter(tx => tx.tutorId === tutor.id);
  const tutorCurrentSaldo = tutorTxList.length > 0 ? tutorTxList[tutorTxList.length - 1].saldoBerjalan : 0;
  const newTutorTx: TransaksiHonorTutor = {
    id: `TXT-${String(nextDb.tutorLedger.length + 1).padStart(4, "0")}`,
    tanggal: data.tanggal,
    tutorId: tutor.id,
    tipe: "debit",
    keterangan: potonganAmt > 0 
      ? `Pembayaran Honor [${slipId}] (Potongan: ${formatRupiah(potonganAmt)}) - Periode ${data.periode}`
      : `Pembayaran Honor [${slipId}] - Periode ${data.periode}`,
    jumlah: data.jumlah, // Mengurangi saldo terutang sebesar Gross
    saldoBerjalan: tutorCurrentSaldo - data.jumlah,
    referensiId: slipId
  };
  nextDb.tutorLedger = [...nextDb.tutorLedger, newTutorTx];

  // Outflow from General Kas (The full gross amount leaves the kas because any deductions do not enter or remain in the institutional cash)
  const prevKasSaldo = nextDb.kas.length > 0 ? nextDb.kas[nextDb.kas.length - 1].saldoBerjalan : 0;
  const newKasTx: KasLembaga = {
    id: `KAS-${String(nextDb.kas.length + 1).padStart(4, "0")}`,
    tanggal: data.tanggal,
    tipe: "keluar",
    keterangan: potonganAmt > 0
      ? `Pembayaran Honor Tutor [${slipId}] - ${tutor.nama} (Bersih: ${formatRupiah(netPaid)}, Potongan: ${formatRupiah(potonganAmt)})`
      : `Pembayaran Honor Tutor [${slipId}] - ${tutor.nama}`,
    jumlah: data.jumlah, // Mengurangi kas sebesar GROSS (potongan tidak masuk kas lembaga)
    saldoBerjalan: prevKasSaldo - data.jumlah,
    referensiId: slipId
  };
  nextDb.kas = [...nextDb.kas, newKasTx];

  saveDatabase(nextDb);
  return nextDb;
}

// 5. Add Custom General Outflow Expense (Pengeluaran Operasional)
export function addGeneralExpenseTransaction(
  db: Database,
  data: {
    tanggal: string;
    keterangan: string;
    jumlah: number;
  }
): Database {
  const nextDb = { ...db };
  
  const prevKasSaldo = nextDb.kas.length > 0 ? nextDb.kas[nextDb.kas.length - 1].saldoBerjalan : 0;
  const newKasTx: KasLembaga = {
    id: `KAS-${String(nextDb.kas.length + 1).padStart(4, "0")}`,
    tanggal: data.tanggal,
    tipe: "keluar",
    keterangan: data.keterangan,
    jumlah: data.jumlah,
    saldoBerjalan: prevKasSaldo - data.jumlah,
    referensiId: undefined
  };
  nextDb.kas = [...nextDb.kas, newKasTx];

  saveDatabase(nextDb);
  return nextDb;
}

// CALCULATION BALANCES QUICK ACCESSORS
export function getStudentBalance(db: Database, studentId: string): number {
  const list = db.studentLedger.filter(tx => tx.siswaId === studentId);
  return list.length > 0 ? list[list.length - 1].saldoBerjalan : 0;
}

export function getTutorHonorBalance(db: Database, tutorId: string): number {
  const list = db.tutorLedger.filter(tx => tx.tutorId === tutorId);
  return list.length > 0 ? list[list.length - 1].saldoBerjalan : 0;
}

export function getTutorDepositBalance(db: Database, tutorId: string): number {
  // Total pending payments on hand for this tutor
  return db.payments
    .filter(p => p.metode === "tutor" && p.tutorId === tutorId && p.statusTitipan === "pending")
    .reduce((sum, p) => sum + p.jumlah, 0);
}

export function getKasLembagaBalance(db: Database): number {
  return db.kas.length > 0 ? db.kas[db.kas.length - 1].saldoBerjalan : 0;
}

// FILTER HELPER
export function filterByDateRange<T extends { tanggal: string }>(
  items: T[],
  rangeType: "hari" | "minggu" | "bulan" | "tahun" | "custom",
  customStart?: string,
  customEnd?: string,
  baseDate: string = getTodayDateString() // The context local date
): T[] {
  const base = new Date(baseDate);
  let startStr = "";
  let endStr = "";

  if (rangeType === "hari") {
    startStr = baseDate;
    endStr = baseDate;
  } else if (rangeType === "minggu") {
    // Current week (Monday to Sunday)
    const day = base.getDay();
    const diffToMonday = base.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(base);
    monday.setDate(diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (num: number) => String(num).padStart(2, "0");
    startStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    endStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
  } else if (rangeType === "bulan") {
    // Current month (1st to end of month)
    const year = base.getFullYear();
    const month = base.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    const pad = (num: number) => String(num).padStart(2, "0");
    startStr = `${year}-${pad(month + 1)}-01`;
    endStr = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  } else if (rangeType === "tahun") {
    startStr = `${base.getFullYear()}-01-01`;
    endStr = `${base.getFullYear()}-12-31`;
  } else if (rangeType === "custom" && customStart && customEnd) {
    startStr = customStart;
    endStr = customEnd;
  } else {
    // No filter
    return items;
  }

  return items.filter(item => item.tanggal >= startStr && item.tanggal <= endStr);
}

// 6. Add Other Income Transaction
export function addOtherIncomeTransaction(
  db: Database,
  data: {
    tanggal: string;
    jenis: string;
    nominal: number;
    keterangan?: string;
  }
): Database {
  const nextDb = { ...db };
  const newId = `PML-${String(nextDb.otherIncomes.length + 1).padStart(4, "0")}`;
  const newIncome: PemasukanLain = {
    id: newId,
    tanggal: data.tanggal,
    jenis: data.jenis,
    nominal: data.nominal,
    keterangan: data.keterangan
  };
  nextDb.otherIncomes = [newIncome, ...nextDb.otherIncomes];

  // Update General Kas Lembaga
  const prevKasSaldo = nextDb.kas.length > 0 ? nextDb.kas[nextDb.kas.length - 1].saldoBerjalan : 0;
  const newKasTx: KasLembaga = {
    id: `KAS-${String(nextDb.kas.length + 1).padStart(4, "0")}`,
    tanggal: data.tanggal,
    tipe: "masuk",
    keterangan: `Pemasukan Lain [${newId}] (${data.jenis})${data.keterangan ? ' - ' + data.keterangan : ''}`,
    jumlah: data.nominal,
    saldoBerjalan: prevKasSaldo + data.nominal,
    referensiId: newId
  };
  nextDb.kas = [...nextDb.kas, newKasTx];

  saveDatabase(nextDb);
  return nextDb;
}

// 7. Submit Attendance Report by Tutor
export function submitAttendanceReport(
  db: Database,
  data: {
    tanggal: string;
    tutorId: string;
    siswaId: string;
    programId: string;
    fotoJurnal: string;
    keterangan?: string;
  }
): Database {
  const nextDb = { ...db };
  const tutor = nextDb.tutors.find(t => t.id === data.tutorId);
  const student = nextDb.students.find(s => s.id === data.siswaId);
  const program = nextDb.programs.find(p => p.id === data.programId);

  if (!tutor || !student || !program) {
    console.error("Failed to submit attendance report: missing entities", { tutor, student, program });
    return db;
  }

  const newId = `LPK-${String(nextDb.attendanceReports.length + 1).padStart(4, "0")}`;
  const newReport: LaporanKehadiran = {
    id: newId,
    tanggal: data.tanggal,
    tutorId: tutor.id,
    tutorNama: tutor.nama,
    siswaId: student.id,
    siswaNama: student.nama,
    programId: program.id,
    programNama: program.nama,
    fotoJurnal: data.fotoJurnal,
    keterangan: data.keterangan,
    status: "pending"
  };
  nextDb.attendanceReports = [newReport, ...nextDb.attendanceReports];

  saveDatabase(nextDb);
  return nextDb;
}

// 8. Verify Attendance Report by Admin
export function verifyAttendanceReport(
  db: Database,
  reportId: string,
  status: "setuju" | "tolak",
  catatanAdmin?: string,
  tanggalProses: string = getTodayDateString()
): Database {
  let nextDb = { ...db };
  const reportIdx = nextDb.attendanceReports.findIndex(r => r.id === reportId);
  if (reportIdx === -1) return db;

  const report = nextDb.attendanceReports[reportIdx];
  if (report.status !== "pending") return db;

  // Update report status
  const updatedReport: LaporanKehadiran = {
    ...report,
    status,
    tanggalProses,
    catatanAdmin
  };
  nextDb.attendanceReports = [...nextDb.attendanceReports];
  nextDb.attendanceReports[reportIdx] = updatedReport;

  if (status === "setuju") {
    // Automatically trigger session transaction!
    nextDb = addSessionTransaction(nextDb, {
      tanggal: report.tanggal,
      siswaId: report.siswaId,
      tutorId: report.tutorId,
      programId: report.programId,
      catatan: `Laporan Kehadiran Terverifikasi [${report.id}]` + (report.keterangan ? ` - ${report.keterangan}` : "")
    });
  } else {
    saveDatabase(nextDb);
  }

  return nextDb;
}

// 8b. Undo Verification of Attendance Report
export function undoVerifyAttendanceReport(
  db: Database,
  reportId: string
): Database {
  let nextDb = { ...db };
  const reportIdx = nextDb.attendanceReports.findIndex(r => r.id === reportId);
  if (reportIdx === -1) return db;

  const report = nextDb.attendanceReports[reportIdx];
  if (report.status === "pending") return db;

  const oldStatus = report.status;

  // Update report status back to pending
  const updatedReport: LaporanKehadiran = {
    ...report,
    status: "pending",
    tanggalProses: undefined,
    catatanAdmin: undefined
  };
  nextDb.attendanceReports = [...nextDb.attendanceReports];
  nextDb.attendanceReports[reportIdx] = updatedReport;

  if (oldStatus === "setuju") {
    // Find the corresponding session
    const session = nextDb.sessions.find(
      s => s.tanggal === report.tanggal &&
           s.siswaId === report.siswaId &&
           s.tutorId === report.tutorId &&
           s.programId === report.programId &&
           s.catatan && s.catatan.includes(reportId)
    );
    if (session) {
      nextDb = deleteSessionTransaction(nextDb, session.id);
    } else {
      saveDatabase(nextDb);
    }
  } else {
    saveDatabase(nextDb);
  }

  return nextDb;
}

// 8c. Delete Session Transaction
export function deleteSessionTransaction(
  db: Database,
  sessionId: string
): Database {
  const nextDb = { ...db };
  
  // Find the session
  const session = nextDb.sessions.find(s => s.id === sessionId);
  if (!session) return db;

  // Remove session from array
  nextDb.sessions = nextDb.sessions.filter(s => s.id !== sessionId);

  // If this session was created from an attendance report, revert the report status back to pending
  if (session.catatan) {
    const match = session.catatan.match(/\[(LPK-\d+)\]/);
    if (match && match[1]) {
      const reportId = match[1];
      const reportIdx = nextDb.attendanceReports.findIndex(r => r.id === reportId);
      if (reportIdx !== -1) {
        nextDb.attendanceReports = [...nextDb.attendanceReports];
        nextDb.attendanceReports[reportIdx] = {
          ...nextDb.attendanceReports[reportIdx],
          status: "pending",
          tanggalProses: undefined,
          catatanAdmin: undefined
        };
      }
    }
  }

  // Remove corresponding student ledger entry
  nextDb.studentLedger = nextDb.studentLedger.filter(
    tx => !(tx.referensiId === sessionId && tx.siswaId === session.siswaId)
  );
  // Recalculate Student Ledger running balance
  let studentRunning = 0;
  nextDb.studentLedger = nextDb.studentLedger.map(tx => {
    if (tx.siswaId === session.siswaId) {
      if (tx.tipe === "debit") {
        studentRunning += tx.jumlah;
      } else {
        studentRunning -= tx.jumlah;
      }
      return { ...tx, saldoBerjalan: studentRunning };
    }
    return tx;
  });

  // Remove corresponding tutor ledger entry
  nextDb.tutorLedger = nextDb.tutorLedger.filter(
    tx => !(tx.referensiId === sessionId && tx.tutorId === session.tutorId)
  );
  // Recalculate Tutor Ledger running balance
  let tutorRunning = 0;
  nextDb.tutorLedger = nextDb.tutorLedger.map(tx => {
    if (tx.tutorId === session.tutorId) {
      if (tx.tipe === "kredit") {
        tutorRunning += tx.jumlah;
      } else {
        tutorRunning -= tx.jumlah;
      }
      return { ...tx, saldoBerjalan: tutorRunning };
    }
    return tx;
  });

  saveDatabase(nextDb);
  return nextDb;
}

// 8d. Delete Attendance Report entirely
export function deleteAttendanceReport(
  db: Database,
  reportId: string
): Database {
  let nextDb = { ...db };
  const report = nextDb.attendanceReports.find(r => r.id === reportId);
  if (!report) return db;

  // If approved, we must first delete the session transaction associated with it
  if (report.status === "setuju") {
    const session = nextDb.sessions.find(
      s => s.tanggal === report.tanggal &&
           s.siswaId === report.siswaId &&
           s.tutorId === report.tutorId &&
           s.programId === report.programId &&
           s.catatan && s.catatan.includes(reportId)
    );
    if (session) {
      nextDb = deleteSessionTransaction(nextDb, session.id);
    }
  }

  // Delete from array
  nextDb.attendanceReports = nextDb.attendanceReports.filter(r => r.id !== reportId);
  saveDatabase(nextDb);
  return nextDb;
}

// 9. Check Duplicate Session Helper
export function checkDuplicateSession(
  db: Database,
  data: {
    tanggal: string;
    siswaId: string;
    tutorId: string;
    programId: string;
  }
): boolean {
  return db.sessions.some(
    s => s.tanggal === data.tanggal &&
         s.siswaId === data.siswaId &&
         s.tutorId === data.tutorId &&
         s.programId === data.programId
  );
}

// 10. Indonesian Day Name Mapper
export function getNamaHariIndo(dateStr: string): string {
  if (!dateStr) return "Senin";
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[day];
}

// 11. Schedule Helpers
export function addScheduleTransaction(
  db: Database,
  data: {
    hari: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Minggu";
    waktu: string;
    tutorId: string;
    siswaId: string;
    programId: string;
  }
): Database {
  const nextDb = { ...db };
  const tutor = nextDb.tutors.find(t => t.id === data.tutorId)!;
  const student = nextDb.students.find(s => s.id === data.siswaId)!;
  const program = nextDb.programs.find(p => p.id === data.programId)!;

  const newId = `JDW-${String(nextDb.schedules.length + 1).padStart(4, "0")}`;
  const newSchedule: JadwalTutor = {
    id: newId,
    hari: data.hari,
    waktu: data.waktu,
    tutorId: tutor.id,
    tutorNama: tutor.nama,
    siswaId: student.id,
    siswaNama: student.nama,
    programId: program.id,
    programNama: program.nama
  };

  nextDb.schedules = [...nextDb.schedules, newSchedule];
  saveDatabase(nextDb);
  return nextDb;
}

export function deleteScheduleTransaction(db: Database, scheduleId: string): Database {
  const nextDb = { ...db };
  nextDb.schedules = nextDb.schedules.filter(s => s.id !== scheduleId);
  saveDatabase(nextDb);
  return nextDb;
}

export function updateBroadcastMessageTransaction(db: Database, message: string): Database {
  const nextDb = { ...db };
  nextDb.broadcastMessage = message;
  saveDatabase(nextDb);
  return nextDb;
}


