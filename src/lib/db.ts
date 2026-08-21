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

/* =========================================================
   TYPES
========================================================= */

export type ProgramRecord = ProgramBelajar & {
  deskripsi?: string;
};

export type TutorRecord = Tutor & {
  idLogin: string;
  status?: string;
  telepon?: string;
  alamat?: string;
};

export type KasRecord = KasLembaga & {
  referensiId?: string;
};

export type OtherIncomeRecord = PemasukanLain & {
  jenis?: string;
  nominal?: number;
};

export type ExpenseRecord = {
  id: string;
  tanggal: string;
  keterangan: string;
  jumlah: number;
};

export type ScheduleRecord = JadwalTutor & {
  waktu?: string;
  hari: string;
  tutorId: string;
  siswaId: string;
  programId: string;
};

export type AttendanceRecord = LaporanKehadiran & {
  status?:
    | "pending"
    | "setuju"
    | "tolak"
    | "disetujui"
    | "ditolak"
    | "diproses";

  catatanAdmin?: string;
  tanggalProses?: string;
};

/**
 * =========================================================
 * DATABASE
 * =========================================================
 *
 * SUMBER DATA UTAMA:
 *
 * programs
 * students
 * tutors
 * sessions
 * payments
 * slips
 * otherIncomes
 * expenses
 * attendanceReports
 * schedules
 * raports
 *
 * LEDGER DI BAWAH ADALAH DERIVED DATA.
 *
 * studentLedger
 * tutorLedger
 * kas
 *
 * Ketiga ledger tersebut SELALU dibangun ulang
 * dari sumber data utama.
 */
export interface Database {
  programs: ProgramRecord[];
  students: Siswa[];
  tutors: TutorRecord[];

  sessions: RiwayatPertemuan[];

  payments: PembayaranSiswa[];

  slips: SlipGaji[];

  otherIncomes: OtherIncomeRecord[];

  expenses: ExpenseRecord[];

  attendanceReports: AttendanceRecord[];

  schedules: ScheduleRecord[];

  raports: RaportSiswa[];

  /**
   * DERIVED LEDGER
   */
  studentLedger: TransaksiRekeningSiswa[];
  tutorLedger: TransaksiHonorTutor[];
  kas: KasRecord[];

  broadcastMessage: string;

  adminPassword?: string;

  lastUpdated: string;

  /**
   * Tombstone.
   *
   * ID yang sudah dihapus tidak boleh hidup kembali
   * ketika local + remote di-merge.
   */
  deletedIds: string[];
}

/* =========================================================
   CONSTANT
========================================================= */

export const DB_STORAGE_KEY =
  "rumah_belajar_db_v2";

const DEFAULT_BROADCAST =
  "📢 PENGUMUMAN TUTOR: Mohon lakukan serah terima uang titipan pembayaran siswa kepada Staf Administrasi dan catat riwayat pertemuan secara tertib. Terima kasih!";

/* =========================================================
   FORMATTER
========================================================= */

const BULAN_INDO = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];

export function generateUniqueId(
  prefix: string
): string {
  const time =
    Date.now()
      .toString(36)
      .toUpperCase();

  const random =
    Math.random()
      .toString(36)
      .slice(2, 10)
      .toUpperCase();

  return `${prefix}-${time}-${random}`;
}

export function formatRupiah(
  value: number
): string {
  return (
    "Rp " +
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value) || 0)
  );
}

export function formatTanggalIndo(
  dateStr: string
): string {
  if (!dateStr) return "-";

  const parts =
    dateStr.split("-");

  if (parts.length !== 3) {
    return dateStr;
  }

  return `${parts[2].padStart(
    2,
    "0"
  )}/${parts[1].padStart(
    2,
    "0"
  )}/${parts[0]}`;
}

export function formatBulanTahun(
  dateStr: string
): string {
  if (!dateStr) return "-";

  const parts =
    dateStr.split("-");

  if (parts.length >= 2) {
    const monthIndex =
      parseInt(parts[1], 10) - 1;

    return `${
      BULAN_INDO[monthIndex] ||
      parts[1]
    } ${parts[0]}`;
  }

  return dateStr;
}

export function getTodayDateString(): string {
  const d = new Date();

  const tzOffset =
    d.getTimezoneOffset() * 60000;

  return new Date(
    d.getTime() - tzOffset
  )
    .toISOString()
    .slice(0, 10);
}

/* =========================================================
   HELPERS
========================================================= */

function amount(
  value: unknown
): number {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return 0;
  }

  return Math.max(0, n);
}

function uniqueStrings(
  values: unknown[]
): string[] {
  return Array.from(
    new Set(
      values.filter(
        (
          value
        ): value is string =>
          typeof value ===
            "string" &&
          value.trim() !== ""
      )
    )
  );
}

function cloneDatabase(
  db: Database
): Database {
  return ensureDatabaseDefaults(
    JSON.parse(
      JSON.stringify(db)
    )
  );
}

function saveAndReturn(
  db: Database
): Database {
  const normalized =
    ensureDatabaseDefaults(db);

  safeSetItem(
    DB_STORAGE_KEY,
    JSON.stringify(
      normalized
    )
  );

  return normalized;
}

/* =========================================================
   SAFE LOCAL STORAGE
========================================================= */

export function safeGetItem(
  key: string
): string | null {
  try {
    return localStorage.getItem(
      key
    );
  } catch (error) {
    console.warn(
      "[DB] localStorage get gagal:",
      error
    );

    return null;
  }
}

export function safeSetItem(
  key: string,
  value: string
): void {
  try {
    localStorage.setItem(
      key,
      value
    );
  } catch (error) {
    console.warn(
      "[DB] localStorage set gagal:",
      error
    );
  }
}

/* =========================================================
   EMPTY DATABASE
========================================================= */

export function generateCleanDatabase(): Database {
  return {
    programs: [],
    students: [],
    tutors: [],

    sessions: [],
    payments: [],
    slips: [],

    otherIncomes: [],
    expenses: [],

    attendanceReports: [],
    schedules: [],
    raports: [],

    /**
     * Derived.
     */
    studentLedger: [],
    tutorLedger: [],
    kas: [],

    broadcastMessage:
      DEFAULT_BROADCAST,

    adminPassword:
      "admin123",

    lastUpdated:
      new Date().toISOString(),

    deletedIds: []
  };
}

/* =========================================================
   NORMALIZE DATABASE
========================================================= */

export function ensureDatabaseDefaults(
  parsed: any
): Database {
  if (
    !parsed ||
    typeof parsed !==
      "object"
  ) {
    return generateCleanDatabase();
  }

  return {
    programs:
      Array.isArray(
        parsed.programs
      )
        ? parsed.programs
        : [],

    students:
      Array.isArray(
        parsed.students
      )
        ? parsed.students
        : [],

    tutors:
      Array.isArray(
        parsed.tutors
      )
        ? parsed.tutors
        : [],

    sessions:
      Array.isArray(
        parsed.sessions
      )
        ? parsed.sessions
        : [],

    payments:
      Array.isArray(
        parsed.payments
      )
        ? parsed.payments
        : [],

    slips:
      Array.isArray(
        parsed.slips
      )
        ? parsed.slips
        : [],

    otherIncomes:
      Array.isArray(
        parsed.otherIncomes
      )
        ? parsed.otherIncomes
        : [],

    /**
     * Database lama belum punya expenses.
     */
    expenses:
      Array.isArray(
        parsed.expenses
      )
        ? parsed.expenses
        : [],

    attendanceReports:
      Array.isArray(
        parsed.attendanceReports
      )
        ? parsed.attendanceReports
        : [],

    schedules:
      Array.isArray(
        parsed.schedules
      )
        ? parsed.schedules
        : [],

    raports:
      Array.isArray(
        parsed.raports
      )
        ? parsed.raports
        : [],

    /**
     * Ledger lama tetap dibaca
     * untuk kompatibilitas.
     *
     * Tetapi setelah itu akan direbuild.
     */
    studentLedger:
      Array.isArray(
        parsed.studentLedger
      )
        ? parsed.studentLedger
        : [],

    tutorLedger:
      Array.isArray(
        parsed.tutorLedger
      )
        ? parsed.tutorLedger
        : [],

    kas:
      Array.isArray(
        parsed.kas
      )
        ? parsed.kas
        : [],

    broadcastMessage:
      parsed.broadcastMessage ??
      DEFAULT_BROADCAST,

    adminPassword:
      parsed.adminPassword ??
      "admin123",

    lastUpdated:
      parsed.lastUpdated ??
      new Date().toISOString(),

    deletedIds:
      Array.isArray(
        parsed.deletedIds
      )
        ? uniqueStrings(
            parsed.deletedIds
          )
        : []
  };
}

/* =========================================================
   LOCAL DATABASE
========================================================= */

export function getDatabase(): Database {
  try {
    const raw =
      safeGetItem(
        DB_STORAGE_KEY
      );

    if (raw) {
      const parsed =
        JSON.parse(raw);

      return saveAndReturn(
        recalculateAllLedgers(
          ensureDatabaseDefaults(
            parsed
          )
        )
      );
    }
  } catch (error) {
    console.error(
      "[DB] Gagal membaca database lokal:",
      error
    );
  }

  const db =
    generateCleanDatabase();

  saveDatabase(db);

  return db;
}

export function saveDatabase(
  db: Database
): void {
  const normalized =
    ensureDatabaseDefaults(db);

  safeSetItem(
    DB_STORAGE_KEY,
    JSON.stringify(
      normalized
    )
  );
}

export function updateDatabase(
  db: Database
): Database {
  return saveAndReturn(
    recalculateAllLedgers(
      db
    )
  );
}

export function getLocalDatabase(): Database {
  return getDatabase();
}

export function saveLocalDatabase(
  db: Database
): void {
  saveDatabase(
    recalculateAllLedgers(db)
  );
}

/* =========================================================
   CLEAR DATA
========================================================= */

export function clearPrototypeData(
  currentDb?: Database
): Database {
  const clean =
    generateCleanDatabase();

  clean.broadcastMessage =
    currentDb?.broadcastMessage ||
    DEFAULT_BROADCAST;

  clean.adminPassword =
    currentDb?.adminPassword ||
    "admin123";

  return saveAndReturn(
    clean
  );
}

/* =========================================================
   SESSION DUPLICATE
========================================================= */

export function checkDuplicateSession(
  db: Database,
  data: {
    tanggal: string;
    siswaId: string;
    tutorId: string;
    programId?: string;
  }
): boolean {
  return db.sessions.some(
    session =>
      session.tanggal ===
        data.tanggal &&
      session.siswaId ===
        data.siswaId &&
      session.tutorId ===
        data.tutorId &&
      (
        !data.programId ||
        session.programId ===
          data.programId
      )
  );
}

/* =========================================================
   SESSION
========================================================= */

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
  const next =
    cloneDatabase(db);

  const student =
    next.students.find(
      s =>
        s.id ===
        data.siswaId
    );

  const tutor =
    next.tutors.find(
      t =>
        t.id ===
        data.tutorId
    );

  const program =
    next.programs.find(
      p =>
        p.id ===
        data.programId
    );

  if (
    !student ||
    !tutor ||
    !program
  ) {
    throw new Error(
      "Data siswa, tutor, atau program tidak ditemukan."
    );
  }

  if (
    checkDuplicateSession(
      next,
      data
    )
  ) {
    throw new Error(
      "Sesi untuk tutor, siswa, program, dan tanggal tersebut sudah ada."
    );
  }

  const sessionId =
    generateUniqueId("RP");

  next.sessions.unshift({
    id: sessionId,

    tanggal:
      data.tanggal,

    siswaId:
      student.id,

    siswaNama:
      student.nama,

    tutorId:
      tutor.id,

    tutorNama:
      tutor.nama,

    programId:
      program.id,

    programNama:
      program.nama,

    tarifSiswaSnapshot:
      amount(
        program.tarifSiswa
      ),

    honorTutorSnapshot:
      amount(
        program.honorTutor
      ),

    catatan:
      data.catatan ||
      `Sesi pembelajaran ${program.nama}`
  });

  /**
   * Program siswa hanya diisi
   * jika sebelumnya kosong.
   */
  if (!student.programId) {
    next.students =
      next.students.map(
        s =>
          s.id === student.id
            ? {
                ...s,
                programId:
                  program.id
              }
            : s
      );
  }

  /**
   * PENTING:
   *
   * Tidak membuat ledger secara manual.
   *
   * Ledger akan dibuat oleh
   * recalculateAllLedgers().
   */

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   PAYMENT
========================================================= */

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
  const next =
    cloneDatabase(db);

  const student =
    next.students.find(
      s =>
        s.id ===
        data.siswaId
    );

  if (!student) {
    throw new Error(
      "Siswa tidak ditemukan."
    );
  }

  const jumlah =
    amount(data.jumlah);

  if (jumlah <= 0) {
    throw new Error(
      "Nominal pembayaran harus lebih dari 0."
    );
  }

  if (
    data.metode === "tutor" &&
    !data.tutorId
  ) {
    throw new Error(
      "Tutor wajib dipilih untuk pembayaran melalui tutor."
    );
  }

  const tutor =
    data.tutorId
      ? next.tutors.find(
          t =>
            t.id ===
            data.tutorId
        )
      : undefined;

  if (
    data.metode === "tutor" &&
    !tutor
  ) {
    throw new Error(
      "Tutor tidak ditemukan."
    );
  }

  const paymentId =
    generateUniqueId("PAY");

  const payment: PembayaranSiswa =
    {
      id: paymentId,

      tanggal:
        data.tanggal,

      siswaId:
        student.id,

      siswaNama:
        student.nama,

      jumlah,

      metode:
        data.metode,

      tutorId:
        data.tutorId,

      tutorNama:
        tutor?.nama,

      statusTitipan:
        data.metode ===
        "tutor"
          ? "pending"
          : "diserahkan",

      tanggalSerah:
        data.metode ===
        "admin"
          ? data.tanggal
          : undefined
    };

  next.payments.unshift(
    payment
  );

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   TUTOR DEPOSIT
========================================================= */

export function getTutorDepositBalance(
  db: Database,
  tutorId: string
): number {
  return db.payments
    .filter(
      payment =>
        payment.metode ===
          "tutor" &&
        payment.tutorId ===
          tutorId &&
        payment.statusTitipan ===
          "pending"
    )
    .reduce(
      (
        total,
        payment
      ) =>
        total +
        amount(
          payment.jumlah
        ),
      0
    );
}

/* =========================================================
   CONFIRM TUTOR DEPOSIT
========================================================= */

export function confirmTutorDepositHandover(
  db: Database,
  paymentId: string,
  tanggalSerah: string
): Database {
  const next =
    cloneDatabase(db);

  const index =
    next.payments.findIndex(
      p =>
        p.id === paymentId
    );

  if (index === -1) {
    return db;
  }

  const payment =
    next.payments[index];

  if (
    payment.metode !==
    "tutor"
  ) {
    return db;
  }

  if (
    payment.statusTitipan ===
    "diserahkan"
  ) {
    return db;
  }

  next.payments[index] = {
    ...payment,

    statusTitipan:
      "diserahkan",

    tanggalSerah
  };

  /**
   * Tidak membuat ledger manual.
   *
   * recalculateAllLedgers()
   * akan otomatis memasukkan:
   *
   * - kredit siswa
   * - kas masuk
   */

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   UNDO TUTOR DEPOSIT
========================================================= */

export function undoTutorDepositHandover(
  db: Database,
  paymentId: string
): Database {
  const next =
    cloneDatabase(db);

  const index =
    next.payments.findIndex(
      p =>
        p.id === paymentId
    );

  if (index === -1) {
    return db;
  }

  const payment =
    next.payments[index];

  if (
    payment.metode !==
      "tutor" ||
    payment.statusTitipan !==
      "diserahkan"
  ) {
    return db;
  }

  next.payments[index] = {
    ...payment,

    statusTitipan:
      "pending",

    tanggalSerah:
      undefined
  };

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   HONOR TUTOR
========================================================= */

export function payTutorHonorTransaction(
  db: Database,
  data: {
    tanggal: string;
    tutorId: string;
    jumlah: number;
    periode: string;
    catatan?: string;
    potongan?: number;
    keteranganPotongan?: string;
  }
): Database {
  const next =
    cloneDatabase(db);

  const tutor =
    next.tutors.find(
      t =>
        t.id ===
        data.tutorId
    );

  if (!tutor) {
    throw new Error(
      "Tutor tidak ditemukan."
    );
  }

  const gross =
    amount(data.jumlah);

  const potongan =
    Math.min(
      gross,
      amount(
        data.potongan
      )
    );

  const netPaid =
    gross - potongan;

  if (gross <= 0) {
    throw new Error(
      "Nominal honor harus lebih dari 0."
    );
  }

  const slipId =
    generateUniqueId("SG");

  const slip: SlipGaji = {
    id: slipId,

    tanggal:
      data.tanggal,

    tutorId:
      tutor.id,

    tutorNama:
      tutor.nama,

    jumlah:
      netPaid,

    periode:
      data.periode,

    catatan:
      data.catatan ||
      "Pembayaran Honor Tutor",

    potongan,

    keteranganPotongan:
      data.keteranganPotongan ||
      "",

    totalHonor:
      gross
  };

  next.slips.unshift(
    slip
  );

  /**
   * Tidak membuat tutorLedger
   * dan kas secara manual.
   *
   * Keduanya dibangun dari slips.
   */

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   GENERAL EXPENSE
========================================================= */

export function addGeneralExpenseTransaction(
  db: Database,
  data: {
    tanggal: string;
    keterangan: string;
    jumlah: number;
  }
): Database {
  const next =
    cloneDatabase(db);

  const jumlah =
    amount(data.jumlah);

  if (jumlah <= 0) {
    throw new Error(
      "Nominal pengeluaran harus lebih dari 0."
    );
  }

  const expenseId =
    generateUniqueId("EXP");

  next.expenses.unshift({
    id: expenseId,

    tanggal:
      data.tanggal,

    keterangan:
      data.keterangan,

    jumlah
  });

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   OTHER INCOME
========================================================= */

export function addOtherIncomeTransaction(
  db: Database,
  data: {
    tanggal: string;
    jenis: string;
    nominal: number;
    keterangan?: string;
  }
): Database {
  const next =
    cloneDatabase(db);

  const nominal =
    amount(data.nominal);

  if (nominal <= 0) {
    throw new Error(
      "Nominal pemasukan harus lebih dari 0."
    );
  }

  const id =
    generateUniqueId("PML");

  next.otherIncomes.unshift({
    id,

    tanggal:
      data.tanggal,

    sumber:
      data.jenis,

    jumlah:
      nominal,

    jenis:
      data.jenis,

    nominal,

    keterangan:
      data.keterangan
  });

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   BALANCE
========================================================= */

/**
 * Saldo siswa:
 *
 * debit  = tagihan
 * kredit = pembayaran
 *
 * POSITIF:
 * siswa masih memiliki tagihan.
 *
 * NEGATIF:
 * siswa kelebihan pembayaran.
 */
export function getStudentBalance(
  db: Database,
  studentId: string
): number {
  return db.studentLedger
    .filter(
      tx =>
        tx.siswaId ===
        studentId
    )
    .reduce(
      (
        total,
        tx
      ) =>
        total +
        (
          tx.tipe ===
          "debit"
            ? amount(
                tx.jumlah
              )
            : -amount(
                tx.jumlah
              )
        ),
      0
    );
}

/**
 * Honor tutor:
 *
 * kredit = honor diperoleh
 * debit  = honor dibayar
 */
export function getTutorHonorBalance(
  db: Database,
  tutorId: string
): number {
  return db.tutorLedger
    .filter(
      tx =>
        tx.tutorId ===
        tutorId
    )
    .reduce(
      (
        total,
        tx
      ) =>
        total +
        (
          tx.tipe ===
          "kredit"
            ? amount(
                tx.jumlah
              )
            : -amount(
                tx.jumlah
              )
        ),
      0
    );
}

/**
 * Saldo kas lembaga.
 */
export function getKasLembagaBalance(
  db: Database
): number {
  return db.kas.reduce(
    (
      total,
      tx
    ) =>
      total +
      (
        tx.tipe ===
        "masuk"
          ? amount(
              tx.jumlah
            )
          : -amount(
              tx.jumlah
            )
      ),
    0
  );
}

/* =========================================================
   DATE FILTER
========================================================= */

export function filterByDateRange<
  T extends {
    tanggal: string;
  }
>(
  items: T[],
  rangeType:
    | "hari"
    | "minggu"
    | "bulan"
    | "tahun"
    | "custom",
  customStart?: string,
  customEnd?: string,
  baseDate: string =
    getTodayDateString()
): T[] {
  const base =
    new Date(
      `${baseDate}T00:00:00`
    );

  let startStr = "";
  let endStr = "";

  const pad =
    (n: number) =>
      String(n).padStart(
        2,
        "0"
      );

  if (
    rangeType === "hari"
  ) {
    startStr =
      baseDate;

    endStr =
      baseDate;
  }

  else if (
    rangeType === "minggu"
  ) {
    const day =
      base.getDay();

    const diff =
      base.getDate() -
      day +
      (
        day === 0
          ? -6
          : 1
      );

    const monday =
      new Date(base);

    monday.setDate(
      diff
    );

    const sunday =
      new Date(monday);

    sunday.setDate(
      monday.getDate() + 6
    );

    startStr =
      `${monday.getFullYear()}-${pad(
        monday.getMonth() + 1
      )}-${pad(
        monday.getDate()
      )}`;

    endStr =
      `${sunday.getFullYear()}-${pad(
        sunday.getMonth() + 1
      )}-${pad(
        sunday.getDate()
      )}`;
  }

  else if (
    rangeType === "bulan"
  ) {
    const year =
      base.getFullYear();

    const month =
      base.getMonth();

    const lastDay =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    startStr =
      `${year}-${pad(
        month + 1
      )}-01`;

    endStr =
      `${year}-${pad(
        month + 1
      )}-${pad(
        lastDay
      )}`;
  }

  else if (
    rangeType === "tahun"
  ) {
    startStr =
      `${base.getFullYear()}-01-01`;

    endStr =
      `${base.getFullYear()}-12-31`;
  }

  else if (
    rangeType === "custom"
  ) {
    if (
      !customStart ||
      !customEnd
    ) {
      return items;
    }

    startStr =
      customStart;

    endStr =
      customEnd;
  }

  else {
    return items;
  }

  return items.filter(
    item =>
      item.tanggal >=
        startStr &&
      item.tanggal <=
        endStr
  );
}

/* =========================================================
   ATTENDANCE
========================================================= */

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
  const next =
    cloneDatabase(db);

  const tutor =
    next.tutors.find(
      t =>
        t.id ===
        data.tutorId
    );

  const student =
    next.students.find(
      s =>
        s.id ===
        data.siswaId
    );

  const program =
    next.programs.find(
      p =>
        p.id ===
        data.programId
    );

  if (
    !tutor ||
    !student ||
    !program
  ) {
    throw new Error(
      "Data tutor, siswa, atau program tidak lengkap."
    );
  }

  const duplicate =
    next.attendanceReports.some(
      report =>
        report.tanggal ===
          data.tanggal &&
        report.tutorId ===
          data.tutorId &&
        report.siswaId ===
          data.siswaId &&
        report.programId ===
          data.programId &&
        (
          report.status ===
            "pending" ||
          report.status ===
            "diproses"
        )
    );

  if (duplicate) {
    throw new Error(
      "Laporan kehadiran untuk sesi tersebut sudah ada."
    );
  }

  /**
   * Jika sesi sudah ada,
   * jangan izinkan membuat attendance
   * baru untuk kombinasi yang sama.
   */
  if (
    checkDuplicateSession(
      next,
      {
        tanggal:
          data.tanggal,
        siswaId:
          data.siswaId,
        tutorId:
          data.tutorId,
        programId:
          data.programId
      }
    )
  ) {
    throw new Error(
      "Sesi untuk tanggal tersebut sudah tercatat."
    );
  }

  const id =
    generateUniqueId("LPK");

  next.attendanceReports.unshift({
    id,

    tanggal:
      data.tanggal,

    tutorId:
      tutor.id,

    tutorNama:
      tutor.nama,

    siswaId:
      student.id,

    siswaNama:
      student.nama,

    programId:
      program.id,

    programNama:
      program.nama,

    fotoJurnal:
      data.fotoJurnal,

    keterangan:
      data.keterangan,

    status:
      "pending"
  });

  next.lastUpdated =
    new Date().toISOString();

  return saveAndReturn(
    next
  );
}

/* =========================================================
   ATTENDANCE VERIFICATION
========================================================= */

export function verifyAttendanceReport(
  db: Database,
  reportId: string,
  status:
    | "setuju"
    | "tolak",
  catatanAdmin?: string,
  tanggalProses: string =
    getTodayDateString()
): Database {
  const next =
    cloneDatabase(db);

  const index =
    next.attendanceReports.findIndex(
      report =>
        report.id ===
        reportId
    );

  if (index === -1) {
    return db;
  }

  const report =
    next.attendanceReports[
      index
    ];

  /**
   * Hanya pending yang boleh diproses.
   */
  if (
    report.status !==
    "pending"
  ) {
    return db;
  }

  /* -------------------------------------------------------
     TOLAK
  ------------------------------------------------------- */

  if (
    status === "tolak"
  ) {
    next.attendanceReports[
      index
    ] = {
      ...report,

      status:
        "tolak",

      tanggalProses,

      catatanAdmin
    };

    return saveAndReturn(
      next
    );
  }

  /* -------------------------------------------------------
     SETUJU
  ------------------------------------------------------- */

  /**
   * Cari session yang sudah terhubung
   * ke attendance ini.
   */
  let session =
    next.sessions.find(
      item =>
        item.tanggal ===
          report.tanggal &&
        item.siswaId ===
          report.siswaId &&
        item.tutorId ===
          report.tutorId &&
        item.programId ===
          report.programId &&
        Boolean(
          item.catatan?.includes(
            `[${report.id}]`
          )
        )
    );

  /**
   * Jika belum ada, buat SEKALI.
   */
  if (!session) {
    /**
     * Tetapi jika ada session bisnis
     * yang sudah dibuat sebelumnya,
     * jangan membuat saldo kedua.
     */
    const existingBusinessSession =
      next.sessions.find(
        item =>
          item.tanggal ===
            report.tanggal &&
          item.siswaId ===
            report.siswaId &&
          item.tutorId ===
            report.tutorId &&
          item.programId ===
            report.programId
      );

    if (existingBusinessSession) {
      /**
       * Kita gunakan session tersebut.
       *
       * Tidak membuat session baru.
       */
      session =
        existingBusinessSession;
    } else {
      const result =
        addSessionTransaction(
          next,
          {
            tanggal:
              report.tanggal,

            siswaId:
              report.siswaId,

            tutorId:
              report.tutorId,

            programId:
              report.programId,

            catatan:
              `Laporan Kehadiran Terverifikasi [${report.id}]${
                report.keterangan
                  ? ` - ${report.keterangan}`
                  : ""
              }`
          }
        );

      /**
       * Ambil database hasil transaksi.
       */
      next.sessions =
        result.sessions;

      next.students =
        result.students;

      session =
        next.sessions.find(
          item =>
            item.catatan?.includes(
              `[${report.id}]`
            )
        );
    }
  }

  /**
   * SAFETY CHECK.
   *
   * Kalau session tidak berhasil ditemukan,
   * approval DIBATALKAN.
   *
   * Ini penting agar attendance tidak
   * berubah setuju tanpa transaksi keuangan.
   */
  if (!session) {
    throw new Error(
      "Gagal membuat sesi dari laporan kehadiran. Persetujuan dibatalkan agar saldo tidak berubah."
    );
  }

  next.attendanceReports[
    index
  ] = {
    ...report,

    status:
      "setuju",

    tanggalProses,

    catatanAdmin
  };

  next.lastUpdated =
    new Date().toISOString();

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   UNDO ATTENDANCE VERIFICATION
========================================================= */

export function undoVerifyAttendanceReport(
  db: Database,
  reportId: string
): Database {
  let next =
    cloneDatabase(db);

  const index =
    next.attendanceReports.findIndex(
      report =>
        report.id ===
        reportId
    );

  if (index === -1) {
    return db;
  }

  const report =
    next.attendanceReports[
      index
    ];

  if (
    report.status ===
    "pending"
  ) {
    return db;
  }

  const oldStatus =
    report.status;

  next.attendanceReports[
    index
  ] = {
    ...report,

    status:
      "pending",

    tanggalProses:
      undefined,

    catatanAdmin:
      undefined
  };

  /**
   * Jika sebelumnya disetujui,
   * hanya hapus session yang memang
   * berasal dari report ini.
   */
  if (
    oldStatus ===
    "setuju"
  ) {
    const session =
      next.sessions.find(
        item =>
          item.tanggal ===
            report.tanggal &&
          item.siswaId ===
            report.siswaId &&
          item.tutorId ===
            report.tutorId &&
          item.programId ===
            report.programId &&
          item.catatan?.includes(
            `[${report.id}]`
          )
      );

    if (session) {
      next =
        deleteSessionTransaction(
          next,
          session.id
        );
    }
  }

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   DELETE SESSION
========================================================= */

export function deleteSessionTransaction(
  db: Database,
  sessionId: string
): Database {
  const next =
    cloneDatabase(db);

  const session =
    next.sessions.find(
      item =>
        item.id ===
        sessionId
    );

  if (!session) {
    return db;
  }

  /**
   * Hapus session.
   */
  next.sessions =
    next.sessions.filter(
      item =>
        item.id !==
        sessionId
    );

  /**
   * Jika berasal dari attendance,
   * kembalikan ke pending.
   */
  const match =
    session.catatan?.match(
      /\[(LPK-[^\]]+)\]/
    );

  if (match?.[1]) {
    const reportId =
      match[1];

    const index =
      next.attendanceReports.findIndex(
        report =>
          report.id ===
          reportId
      );

    if (index !== -1) {
      next.attendanceReports[
        index
      ] = {
        ...next.attendanceReports[
          index
        ],

        status:
          "pending",

        tanggalProses:
          undefined,

        catatanAdmin:
          undefined
      };
    }
  }

  /**
   * Tidak perlu menghapus ledger.
   *
   * Ledger akan hilang otomatis
   * ketika rebuild.
   */
  next.deletedIds =
    uniqueStrings([
      ...next.deletedIds,
      sessionId
    ]);

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   DELETE ATTENDANCE
========================================================= */

export function deleteAttendanceReport(
  db: Database,
  reportId: string
): Database {
  let next =
    cloneDatabase(db);

  const report =
    next.attendanceReports.find(
      item =>
        item.id ===
        reportId
    );

  if (!report) {
    return db;
  }

  /**
   * Jika sudah setuju,
   * hanya hapus session yang memang
   * berasal dari report ini.
   */
  if (
    report.status ===
    "setuju"
  ) {
    const session =
      next.sessions.find(
        item =>
          item.tanggal ===
            report.tanggal &&
          item.siswaId ===
            report.siswaId &&
          item.tutorId ===
            report.tutorId &&
          item.programId ===
            report.programId &&
          item.catatan?.includes(
            `[${reportId}]`
          )
      );

    if (session) {
      next =
        deleteSessionTransaction(
          next,
          session.id
        );
    }
  }

  next.attendanceReports =
    next.attendanceReports.filter(
      item =>
        item.id !==
        reportId
    );

  next.deletedIds =
    uniqueStrings([
      ...next.deletedIds,
      reportId
    ]);

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   DELETE GENERIC
========================================================= */

export function deleteFromDatabase(
  db: Database,
  collection: keyof Database,
  id: string
): Database {
  const next =
    cloneDatabase(db);

  const current =
    (next as any)[
      collection
    ];

  if (
    !Array.isArray(current)
  ) {
    return next;
  }

  (next as any)[
    collection
  ] =
    current.filter(
      (item: any) =>
        item?.id !== id
    );

  next.deletedIds =
    uniqueStrings([
      ...next.deletedIds,
      id
    ]);

  return saveAndReturn(
    recalculateAllLedgers(
      next
    )
  );
}

/* =========================================================
   MERGE HELPERS
========================================================= */

function mergeArrayById<
  T extends {
    id: string;
  }
>(
  local: T[] = [],
  remote: T[] = []
): T[] {
  const map =
    new Map<string, T>();

  /**
   * Local terlebih dahulu.
   */
  for (
    const item of local
  ) {
    if (
      item?.id
    ) {
      map.set(
        item.id,
        item
      );
    }
  }

  /**
   * Remote menimpa jika ID sama.
   */
  for (
    const item of remote
  ) {
    if (
      !item?.id
    ) {
      continue;
    }

    const previous =
      map.get(
        item.id
      );

    map.set(
      item.id,
      previous
        ? {
            ...previous,
            ...item
          }
        : item
    );
  }

  return Array.from(
    map.values()
  );
}

/* =========================================================
   MERGE SESSIONS
========================================================= */

function mergeSessions(
  local: RiwayatPertemuan[],
  remote: RiwayatPertemuan[]
): RiwayatPertemuan[] {
  const merged =
    mergeArrayById(
      local,
      remote
    );

  const result:
    RiwayatPertemuan[] =
    [];

  const seenBusiness =
    new Set<string>();

  for (
    const item of merged
  ) {
    if (
      !item?.id
    ) {
      continue;
    }

    const key =
      [
        item.tanggal,
        item.tutorId,
        item.siswaId,
        item.programId
      ].join("|");

    /**
     * Satu sesi bisnis hanya boleh satu.
     */
    if (
      seenBusiness.has(key)
    ) {
      continue;
    }

    seenBusiness.add(
      key
    );

    result.push(
      item
    );
  }

  return result;
}

/* =========================================================
   MERGE ATTENDANCE
========================================================= */

function mergeAttendance(
  local: AttendanceRecord[],
  remote: AttendanceRecord[]
): AttendanceRecord[] {
  const merged =
    mergeArrayById(
      local,
      remote
    );

  const result:
    AttendanceRecord[] =
    [];

  const seenBusiness =
    new Set<string>();

  for (
    const item of merged
  ) {
    if (
      !item?.id
    ) {
      continue;
    }

    const key =
      [
        item.tanggal,
        item.tutorId,
        item.siswaId,
        item.programId
      ].join("|");

    /**
     * Untuk attendance, satu kombinasi
     * tanggal+tutor+siswa+program hanya
     * boleh satu laporan.
     */
    if (
      seenBusiness.has(key)
    ) {
      continue;
    }

    seenBusiness.add(
      key
    );

    result.push(
      item
    );
  }

  return result;
}

/* =========================================================
   MERGE DATABASE
========================================================= */

export function mergeDatabases(
  localInput:
    | Database
    | null
    | undefined,

  remoteInput:
    | Database
    | null
    | undefined
): Database {
  const local =
    ensureDatabaseDefaults(
      localInput
    );

  const remote =
    ensureDatabaseDefaults(
      remoteInput
    );

  /**
   * Tombstone adalah gabungan permanen.
   */
  const deletedIds =
    uniqueStrings([
      ...local.deletedIds,
      ...remote.deletedIds
    ]);

  const deleted =
    new Set(
      deletedIds
    );

  const filterDeleted = <
    T extends {
      id: string;
    }
  >(
    items: T[]
  ): T[] =>
    items.filter(
      item =>
        Boolean(
          item?.id
        ) &&
        !deleted.has(
          item.id
        )
    );

  const merged: Database = {
    programs:
      filterDeleted(
        mergeArrayById(
          local.programs,
          remote.programs
        )
      ),

    students:
      filterDeleted(
        mergeArrayById(
          local.students,
          remote.students
        )
      ),

    tutors:
      filterDeleted(
        mergeArrayById(
          local.tutors,
          remote.tutors
        )
      ),

    sessions:
      filterDeleted(
        mergeSessions(
          local.sessions,
          remote.sessions
        )
      ),

    payments:
      filterDeleted(
        mergeArrayById(
          local.payments,
          remote.payments
        )
      ),

    slips:
      filterDeleted(
        mergeArrayById(
          local.slips,
          remote.slips
        )
      ),

    otherIncomes:
      filterDeleted(
        mergeArrayById(
          local.otherIncomes,
          remote.otherIncomes
        )
      ),

    expenses:
      filterDeleted(
        mergeArrayById(
          local.expenses,
          remote.expenses
        )
      ),

    attendanceReports:
      filterDeleted(
        mergeAttendance(
          local.attendanceReports,
          remote.attendanceReports
        )
      ),

    schedules:
      filterDeleted(
        mergeArrayById(
          local.schedules,
          remote.schedules
        )
      ),

    raports:
      filterDeleted(
        mergeArrayById(
          local.raports,
          remote.raports
        )
      ),

    /**
     * DERIVED DATA TIDAK DI-MERGE.
     *
     * Akan dibuat ulang.
     */
    studentLedger: [],

    tutorLedger: [],

    kas: [],

    broadcastMessage:
      remote.broadcastMessage ||
      local.broadcastMessage ||
      DEFAULT_BROADCAST,

    adminPassword:
      remote.adminPassword ||
      local.adminPassword ||
      "admin123",

    deletedIds,

    lastUpdated:
      new Date().toISOString()
  };

  /**
   * Satu-satunya sumber saldo:
   * rebuild dari sumber utama.
   */
  return recalculateAllLedgers(
    merged
  );
}

/* =========================================================
   LEDGER REBUILD
========================================================= */

/**
 * =========================================================
 * SUMBER TUNGGAL KEUANGAN
 * =========================================================
 *
 * TIDAK membaca studentLedger lama.
 * TIDAK membaca tutorLedger lama.
 * TIDAK membaca kas lama.
 *
 * Semua dibuat ulang dari:
 *
 * sessions
 * payments
 * slips
 * otherIncomes
 * expenses
 *
 * Dengan demikian:
 *
 * local saldo salah
 * remote saldo salah
 * saldoBerjalan salah
 *
 * semuanya tidak masalah.
 *
 * Yang dipercaya hanya data sumber.
 */
export function recalculateAllLedgers(
  input: Database
): Database {
  const db =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(
          input
        )
      )
    );

  /**
   * =======================================================
   * 1. KOSONGKAN LEDGER
   * =======================================================
   */

  db.studentLedger = [];
  db.tutorLedger = [];
  db.kas = [];

  /**
   * =======================================================
   * 2. SESSION
   * =======================================================
   *
   * Satu session menghasilkan:
   *
   * siswa:
   *   debit tarif siswa
   *
   * tutor:
   *   kredit honor tutor
   */

  const sessions =
    deduplicateSessions(
      db.sessions
    );

  for (
    const session of sessions
  ) {
    const tarifSiswa =
      amount(
        session.tarifSiswaSnapshot
      );

    const honorTutor =
      amount(
        session.honorTutorSnapshot
      );

    if (
      tarifSiswa > 0
    ) {
      db.studentLedger.push({
        id:
          `TXS-${session.id}`,

        tanggal:
          session.tanggal,

        siswaId:
          session.siswaId,

        tipe:
          "debit",

        keterangan:
          `Riwayat Pertemuan [${session.id}] - ${session.siswaNama} - ${session.programNama}`,

        jumlah:
          tarifSiswa,

        saldoBerjalan:
          0,

        referensiId:
          session.id
      });
    }

    if (
      honorTutor > 0
    ) {
      db.tutorLedger.push({
        id:
          `TXT-${session.id}`,

        tanggal:
          session.tanggal,

        tutorId:
          session.tutorId,

        tipe:
          "kredit",

        keterangan:
          `Riwayat Pertemuan [${session.id}] - Siswa: ${session.siswaNama} - ${session.programNama}`,

        jumlah:
          honorTutor,

        saldoBerjalan:
          0,

        referensiId:
          session.id
      });
    }
  }

  /**
   * =======================================================
   * 3. PEMBAYARAN SISWA
   * =======================================================
   *
   * ADMIN:
   *
   * langsung menjadi:
   * - kredit siswa
   * - kas masuk
   *
   * TUTOR:
   *
   * pending:
   * - belum masuk ledger
   * - belum masuk kas
   *
   * diserahkan:
   * - kredit siswa
   * - kas masuk
   */

  const payments =
    deduplicatePayments(
      db.payments
    );

  for (
    const payment of payments
  ) {
    const jumlah =
      amount(
        payment.jumlah
      );

    if (
      jumlah <= 0
    ) {
      continue;
    }

    const isAdmin =
      payment.metode ===
      "admin";

    const isTutorHanded =
      payment.metode ===
        "tutor" &&
      payment.statusTitipan ===
        "diserahkan";

    if (
      !isAdmin &&
      !isTutorHanded
    ) {
      continue;
    }

    /**
     * Kredit siswa.
     */
    db.studentLedger.push({
      id:
        `TXS-${payment.id}`,

      tanggal:
        payment.tanggalSerah ||
        payment.tanggal,

      siswaId:
        payment.siswaId,

      tipe:
        "kredit",

      keterangan:
        isAdmin
          ? `Pembayaran Siswa [${payment.id}] - Pembayaran langsung ke Admin`
          : `Penerimaan Pembayaran via Tutor [${payment.id}] - ${payment.tutorNama || "-"}`,

      jumlah,

      saldoBerjalan:
        0,

      referensiId:
        payment.id
    });

    /**
     * Kas masuk.
     */
    db.kas.push({
      id:
        `KAS-${payment.id}`,

      tanggal:
        payment.tanggalSerah ||
        payment.tanggal,

      tipe:
        "masuk",

      keterangan:
        isAdmin
          ? `Pembayaran Siswa [${payment.id}] - ${payment.siswaNama}`
          : `Penerimaan Titipan Tutor [${payment.id}] - ${payment.tutorNama || "-"} (Siswa: ${payment.siswaNama})`,

      jumlah,

      saldoBerjalan:
        0,

      referensiId:
        payment.id
    });
  }

  /**
   * =======================================================
   * 4. PEMBAYARAN HONOR TUTOR
   * =======================================================
   *
   * Slip:
   *
   * totalHonor = gross
   * potongan   = potongan
   * jumlah     = net
   *
   * Tutor ledger:
   * debit GROSS
   *
   * Kas:
   * keluar NET
   */

  const slips =
    deduplicateSlips(
      db.slips
    );

  for (
    const slip of slips
  ) {
    const gross =
      amount(
        slip.totalHonor ??
        slip.jumlah
      );

    const potongan =
      Math.min(
        gross,
        amount(
          slip.potongan
        )
      );

    const net =
      Math.max(
        0,
        gross -
          potongan
      );

    if (
      gross <= 0
    ) {
      continue;
    }

    db.tutorLedger.push({
      id:
        `TXT-${slip.id}`,

      tanggal:
        slip.tanggal,

      tutorId:
        slip.tutorId,

      tipe:
        "debit",

      keterangan:
        potongan > 0
          ? `Pembayaran Honor [${slip.id}] - Periode ${slip.periode} (Potongan: ${formatRupiah(
              potongan
            )})`
          : `Pembayaran Honor [${slip.id}] - Periode ${slip.periode}`,

      jumlah:
        gross,

      saldoBerjalan:
        0,

      referensiId:
        slip.id
    });

    if (
      net > 0
    ) {
      db.kas.push({
        id:
          `KAS-${slip.id}`,

        tanggal:
          slip.tanggal,

        tipe:
          "keluar",

        keterangan:
          potongan > 0
            ? `Pembayaran Honor Tutor [${slip.id}] - ${slip.tutorNama} (Bersih: ${formatRupiah(
                net
              )}, Potongan: ${formatRupiah(
                potongan
              )})`
            : `Pembayaran Honor Tutor [${slip.id}] - ${slip.tutorNama}`,

        jumlah:
          net,

        saldoBerjalan:
          0,

        referensiId:
          slip.id
      });
    }
  }

  /**
   * =======================================================
   * 5. PEMASUKAN LAIN
   * =======================================================
   */

  const incomes =
    deduplicateById(
      db.otherIncomes
    );

  for (
    const income of incomes
  ) {
    const nominal =
      amount(
        income.nominal ??
        income.jumlah
      );

    if (
      nominal <= 0
    ) {
      continue;
    }

    db.kas.push({
      id:
        `KAS-${income.id}`,

      tanggal:
        income.tanggal,

      tipe:
        "masuk",

      keterangan:
        `Pemasukan Lain [${income.id}] - ${
          income.jenis ||
          income.sumber ||
          "Pemasukan Lain"
        }${
          income.keterangan
            ? ` - ${income.keterangan}`
            : ""
        }`,

      jumlah:
        nominal,

      saldoBerjalan:
        0,

      referensiId:
        income.id
    });
  }

  /**
   * =======================================================
   * 6. PENGELUARAN UMUM
   * =======================================================
   */

  const expenses =
    deduplicateById(
      db.expenses
    );

  for (
    const expense of expenses
  ) {
    const jumlah =
      amount(
        expense.jumlah
      );

    if (
      jumlah <= 0
    ) {
      continue;
    }

    db.kas.push({
      id:
        `KAS-${expense.id}`,

      tanggal:
        expense.tanggal,

      tipe:
        "keluar",

      keterangan:
        `Pengeluaran Operasional [${expense.id}] - ${expense.keterangan}`,

      jumlah,

      saldoBerjalan:
        0,

      referensiId:
        expense.id
    });
  }

  /**
   * =======================================================
   * 7. HITUNG RUNNING BALANCE SISWA
   * =======================================================
   */

  calculateStudentRunningBalance(
    db
  );

  /**
   * =======================================================
   * 8. HITUNG RUNNING BALANCE TUTOR
   * =======================================================
   */

  calculateTutorRunningBalance(
    db
  );

  /**
   * =======================================================
   * 9. HITUNG RUNNING BALANCE KAS
   * =======================================================
   */

  calculateKasRunningBalance(
    db
  );

  /**
   * =======================================================
   * 10. LAST UPDATED
   * =======================================================
   */

  db.lastUpdated =
    new Date().toISOString();

  return db;
}

/* =========================================================
   RUNNING BALANCE - STUDENT
========================================================= */

function calculateStudentRunningBalance(
  db: Database
): void {
  const running =
    new Map<
      string,
      number
    >();

  const transactions =
    [...db.studentLedger]
      .sort(
        compareTransaction
      );

  for (
    const tx of transactions
  ) {
    const previous =
      running.get(
        tx.siswaId
      ) || 0;

    const next =
      previous +
      (
        tx.tipe ===
        "debit"
          ? amount(
              tx.jumlah
            )
          : -amount(
              tx.jumlah
            )
      );

    tx.saldoBerjalan =
      next;

    running.set(
      tx.siswaId,
      next
    );
  }
}

/* =========================================================
   RUNNING BALANCE - TUTOR
========================================================= */

function calculateTutorRunningBalance(
  db: Database
): void {
  const running =
    new Map<
      string,
      number
    >();

  const transactions =
    [...db.tutorLedger]
      .sort(
        compareTransaction
      );

  for (
    const tx of transactions
  ) {
    const previous =
      running.get(
        tx.tutorId
      ) || 0;

    const next =
      previous +
      (
        tx.tipe ===
        "kredit"
          ? amount(
              tx.jumlah
            )
          : -amount(
              tx.jumlah
            )
      );

    tx.saldoBerjalan =
      next;

    running.set(
      tx.tutorId,
      next
    );
  }
}

/* =========================================================
   RUNNING BALANCE - KAS
========================================================= */

function calculateKasRunningBalance(
  db: Database
): void {
  let running =
    0;

  const transactions =
    [...db.kas]
      .sort(
        compareTransaction
      );

  for (
    const tx of transactions
  ) {
    running +=
      tx.tipe ===
      "masuk"
        ? amount(
            tx.jumlah
          )
        : -amount(
            tx.jumlah
          );

    tx.saldoBerjalan =
      running;
  }
}

/* =========================================================
   TRANSACTION SORT
========================================================= */

function compareTransaction<
  T extends {
    tanggal: string;
    id: string;
  }
>(
  a: T,
  b: T
): number {
  const dateCompare =
    String(
      a.tanggal || ""
    ).localeCompare(
      String(
        b.tanggal || ""
      )
    );

  if (
    dateCompare !== 0
  ) {
    return dateCompare;
  }

  return String(
    a.id || ""
  ).localeCompare(
    String(
      b.id || ""
    )
  );
}

/* =========================================================
   DEDUPLICATE
========================================================= */

function deduplicateById<
  T extends {
    id: string;
  }
>(
  items: T[]
): T[] {
  const map =
    new Map<
      string,
      T
    >();

  for (
    const item of items
  ) {
    if (
      item?.id
    ) {
      map.set(
        item.id,
        item
      );
    }
  }

  return Array.from(
    map.values()
  );
}

function deduplicateSessions(
  sessions: RiwayatPertemuan[]
): RiwayatPertemuan[] {
  const map =
    new Map<
      string,
      RiwayatPertemuan
    >();

  for (
    const session of sessions
  ) {
    if (
      !session?.id
    ) {
      continue;
    }

    const businessKey =
      [
        session.tanggal,
        session.tutorId,
        session.siswaId,
        session.programId
      ].join("|");

    /**
     * Business key lebih penting
     * daripada ID.
     *
     * Mencegah dua ID berbeda
     * untuk sesi yang sama.
     */
    if (
      !map.has(
        businessKey
      )
    ) {
      map.set(
        businessKey,
        session
      );
    }
  }

  return Array.from(
    map.values()
  );
}

function deduplicatePayments(
  payments: PembayaranSiswa[]
): PembayaranSiswa[] {
  return deduplicateById(
    payments
  );
}

function deduplicateSlips(
  slips: SlipGaji[]
): SlipGaji[] {
  return deduplicateById(
    slips
  );
}

/* =========================================================
   SUPABASE DELETE
========================================================= */

export async function deleteRecordFromSupabase(
  table: string,
  id: string
): Promise<boolean> {
  try {
    const {
      supabase
    } = await import(
      "./supabase"
    );

    const allowed: Record<
      string,
      string
    > = {
      siswa:
        "siswa",

      tutor:
        "tutor",

      program:
        "program",

      jadwal:
        "jadwal",

      laporan_kehadiran:
        "laporan_kehadiran"
    };

    const target =
      allowed[table];

    if (!target) {
      console.warn(
        `[Supabase] Tabel tidak diizinkan: ${table}`
      );

      return false;
    }

    const {
      error
    } =
      await supabase
        .from(target)
        .delete()
        .eq(
          "id",
          id
        );

    if (error) {
      console.warn(
        `[Supabase] Gagal menghapus ${target}/${id}:`,
        error.message
      );

      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      "[Supabase] Delete helper gagal:",
      error
    );

    return false;
  }
}

/* =========================================================
   DAY
========================================================= */

export function getNamaHariIndo(
  dateStr: string
): string {
  if (!dateStr) {
    return "Senin";
  }

  const date =
    new Date(
      `${dateStr}T00:00:00`
    );

  const days = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu"
  ];

  return (
    days[date.getDay()] ||
    "Senin"
  );
}

/* =========================================================
   SCHEDULE
========================================================= */

export function addScheduleTransaction(
  db: Database,
  data: {
    hari:
      | "Senin"
      | "Selasa"
      | "Rabu"
      | "Kamis"
      | "Jumat"
      | "Sabtu"
      | "Minggu";

    waktu: string;

    tutorId: string;
    siswaId: string;
    programId: string;
  }
): Database {
  const next =
    cloneDatabase(db);

  const tutor =
    next.tutors.find(
      t =>
        t.id ===
        data.tutorId
    );

  const student =
    next.students.find(
      s =>
        s.id ===
        data.siswaId
    );

  const program =
    next.programs.find(
      p =>
        p.id ===
        data.programId
    );

  if (
    !tutor ||
    !student ||
    !program
  ) {
    throw new Error(
      "Tutor, siswa, atau program tidak ditemukan."
    );
  }

  /**
   * Jangan membuat jadwal
   * dengan kombinasi identik.
   */
  const duplicate =
    next.schedules.some(
      schedule =>
        schedule.hari ===
          data.hari &&
        schedule.waktu ===
          data.waktu &&
        schedule.tutorId ===
          data.tutorId &&
        schedule.siswaId ===
          data.siswaId &&
        schedule.programId ===
          data.programId
    );

  if (duplicate) {
    throw new Error(
      "Jadwal yang sama sudah ada."
    );
  }

  const schedule:
    ScheduleRecord = {
    id:
      generateUniqueId(
        "JDW"
      ),

    hari:
      data.hari,

    waktu:
      data.waktu,

    tutorId:
      tutor.id,

    tutorNama:
      tutor.nama,

    siswaId:
      student.id,

    siswaNama:
      student.nama,

    programId:
      program.id,

    programNama:
      program.nama
  };

  next.schedules.push(
    schedule
  );

  return saveAndReturn(
    next
  );
}

export function deleteScheduleTransaction(
  db: Database,
  scheduleId: string
): Database {
  const next =
    cloneDatabase(db);

  const exists =
    next.schedules.some(
      schedule =>
        schedule.id ===
        scheduleId
    );

  if (!exists) {
    return db;
  }

  next.schedules =
    next.schedules.filter(
      schedule =>
        schedule.id !==
        scheduleId
    );

  next.deletedIds =
    uniqueStrings([
      ...next.deletedIds,
      scheduleId
    ]);

  return saveAndReturn(
    next
  );
}

/* =========================================================
   BROADCAST
========================================================= */

export function updateBroadcastMessageTransaction(
  db: Database,
  message: string
): Database {
  const next =
    cloneDatabase(db);

  next.broadcastMessage =
    message;

  return saveAndReturn(
    next
  );
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  getDatabase,
  saveDatabase,
  updateDatabase,

  getLocalDatabase,
  saveLocalDatabase,

  ensureDatabaseDefaults,
  generateCleanDatabase,
  clearPrototypeData,

  mergeDatabases,
  recalculateAllLedgers,

  generateUniqueId,

  formatRupiah,
  formatTanggalIndo,
  formatBulanTahun,
  getTodayDateString,

  getStudentBalance,
  getTutorHonorBalance,
  getTutorDepositBalance,
  getKasLembagaBalance,

  filterByDateRange,

  deleteRecordFromSupabase,
  deleteFromDatabase,

  updateBroadcastMessageTransaction,

  checkDuplicateSession,
  addSessionTransaction,
  deleteSessionTransaction,

  addPaymentTransaction,

  confirmTutorDepositHandover,
  undoTutorDepositHandover,

  payTutorHonorTransaction,
  addGeneralExpenseTransaction,

  addOtherIncomeTransaction,

  submitAttendanceReport,
  verifyAttendanceReport,
  undoVerifyAttendanceReport,
  deleteAttendanceReport,

  getNamaHariIndo,

  addScheduleTransaction,
  deleteScheduleTransaction
};