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

// INITIAL SEED DATA - CLEAN EMPTY SLATE AS REQUESTED BY USER
const INITIAL_PROGRAMS: ProgramBelajar[] = [];
const INITIAL_TUTORS: Tutor[] = [];
const INITIAL_STUDENTS: Siswa[] = [];

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
        schedules: parsed.schedules || [],
        broadcastMessage: parsed.broadcastMessage ?? "📢 PENGUMUMAN TUTOR: Mohon lakukan serah terima uang titipan pembayaran siswa kepada Staf Administrasi dan catat riwayat pertemuan secara tertib. Terima kasih!",
        adminPassword: parsed.adminPassword ?? ""
      };
    }
  } catch (e) {
    console.error("Error loading database, resetting", e);
  }
  
  // Create Clean Empty Database
  const db = generateCleanDatabase();
  saveDatabase(db);
  return db;
}

export function saveDatabase(db: Database): void {
  safeSetItem(DB_STORAGE_KEY, JSON.stringify(db));
  pushToSupabase(db).catch(err => {
    console.error("Failed background sync to Supabase:", err);
  });
}

function generateCleanDatabase(): Database {
  return {
    programs: [],
    students: [],
    tutors: [],
    sessions: [],
    studentLedger: [],
    payments: [],
    tutorLedger: [],
    slips: [],
    kas: [],
    otherIncomes: [],
    attendanceReports: [],
    raports: [],
    schedules: [],
    broadcastMessage: "📢 PENGUMUMAN TUTOR: Mohon lakukan serah terima uang titipan pembayaran siswa kepada Staf Administrasi dan catat riwayat pertemuan secara tertib. Terima kasih!",
    adminPassword: ""
  };
}

export function clearPrototypeData(currentDb?: Database): Database {
  const cleanDb: Database = {
    programs: [],
    students: [],
    tutors: [],
    sessions: [],
    studentLedger: [],
    payments: [],
    tutorLedger: [],
    slips: [],
    kas: [],
    otherIncomes: [],
    attendanceReports: [],
    raports: [],
    schedules: [],
    broadcastMessage: currentDb?.broadcastMessage || "📢 PENGUMUMAN TUTOR: Mohon lakukan serah terima uang titipan pembayaran siswa kepada Staf Administrasi dan catat riwayat pertemuan secara tertib. Terima kasih!",
    adminPassword: currentDb?.adminPassword || ""
  };
  saveDatabase(cleanDb);
  return cleanDb;
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


