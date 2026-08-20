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

export type ProgramRecord = ProgramBelajar & {
  deskripsi?: string;
};

export type TutorRecord = Tutor & {
  idLogin: string;
  status?: string;
  telepon?: string;
  alamat?: string;
};

export type KasRecord = {
  id: string;
  tanggal: string;
  tipe: string;
  keterangan: string;
  jumlah: number;
  saldoBerjalan: number;
  referensiId?: string;
};

export type OtherIncomeRecord = PemasukanLain & {
  jenis?: string;
  nominal?: number;
};

export type ScheduleRecord = JadwalTutor & {
  waktu?: string;
  hari: string;
  tutorId: string;
  siswaId: string;
  programId: string;
};

export type AttendanceRecord = {
  id: string;
  tanggal: string;
  tutorId: string;
  tutorNama: string;
  siswaId: string;
  siswaNama: string;
  programId: string;
  programNama: string;
  fotoJurnal: string;
  keterangan?: string;
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

export interface Database {
  programs: ProgramRecord[];
  students: Siswa[];
  tutors: TutorRecord[];
  sessions: RiwayatPertemuan[];
  studentLedger: TransaksiRekeningSiswa[];
  payments: PembayaranSiswa[];
  tutorLedger: TransaksiHonorTutor[];
  slips: SlipGaji[];
  kas: KasRecord[];
  otherIncomes: OtherIncomeRecord[];
  attendanceReports: AttendanceRecord[];
  schedules: ScheduleRecord[];
  raports?: RaportSiswa[];
  broadcastMessage?: string;
  adminPassword?: string;
  lastUpdated?: string;

  /**
   * ID yang pernah dihapus.
   *
   * Sangat penting untuk sinkronisasi multi-device.
   * Jangan pernah dihapus otomatis.
   */
  deletedIds?: string[];
}

/* =========================================================
   CONSTANT
========================================================= */

export const DB_STORAGE_KEY = "rumah_belajar_db_v2";

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

export function generateUniqueId(prefix: string): string {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase();

  return `${prefix}-${time}-${random}`;
}

export function formatRupiah(value: number): string {
  return (
    "Rp " +
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value) || 0)
  );
}

export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return "-";

  const parts = dateStr.split("-");

  if (parts.length !== 3) {
    return dateStr;
  }

  return `${parts[2].padStart(2, "0")}/${parts[1].padStart(
    2,
    "0"
  )}/${parts[0]}`;
}

export function formatBulanTahun(dateStr: string): string {
  if (!dateStr) return "-";

  const parts = dateStr.split("-");

  if (parts.length >= 2) {
    const monthIdx = parseInt(parts[1], 10) - 1;

    return `${
      BULAN_INDO[monthIdx] || parts[1]
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
   SAFE LOCAL STORAGE
========================================================= */

export function safeGetItem(
  key: string
): string | null {
  try {
    return localStorage.getItem(key);
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
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(
      "[DB] localStorage set gagal:",
      error
    );
  }
}

/* =========================================================
   DATABASE DEFAULT
========================================================= */

export function generateCleanDatabase(): Database {
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
    schedules: [],
    raports: [],

    broadcastMessage: DEFAULT_BROADCAST,

    adminPassword: "admin123",

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
    typeof parsed !== "object"
  ) {
    return generateCleanDatabase();
  }

  return {
    programs: Array.isArray(parsed.programs)
      ? parsed.programs
      : [],

    students: Array.isArray(parsed.students)
      ? parsed.students
      : [],

    tutors: Array.isArray(parsed.tutors)
      ? parsed.tutors
      : [],

    sessions: Array.isArray(parsed.sessions)
      ? parsed.sessions
      : [],

    studentLedger: Array.isArray(
      parsed.studentLedger
    )
      ? parsed.studentLedger
      : [],

    payments: Array.isArray(parsed.payments)
      ? parsed.payments
      : [],

    tutorLedger: Array.isArray(
      parsed.tutorLedger
    )
      ? parsed.tutorLedger
      : [],

    slips: Array.isArray(parsed.slips)
      ? parsed.slips
      : [],

    kas: Array.isArray(parsed.kas)
      ? parsed.kas
      : [],

    otherIncomes: Array.isArray(
      parsed.otherIncomes
    )
      ? parsed.otherIncomes
      : [],

    attendanceReports: Array.isArray(
      parsed.attendanceReports
    )
      ? parsed.attendanceReports
      : [],

    schedules: Array.isArray(
      parsed.schedules
    )
      ? parsed.schedules
      : [],

    raports: Array.isArray(parsed.raports)
      ? parsed.raports
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

    /**
     * PENTING:
     * deletedIds dipertahankan.
     */
    deletedIds: Array.isArray(
      parsed.deletedIds
    )
      ? Array.from(
          new Set(
            parsed.deletedIds.filter(
              (id: any) =>
                typeof id === "string" &&
                id.trim()
            )
          )
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
      safeGetItem(DB_STORAGE_KEY);

    if (raw) {
      return ensureDatabaseDefaults(
        JSON.parse(raw)
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
  const sanitized =
    ensureDatabaseDefaults(db);

  safeSetItem(
    DB_STORAGE_KEY,
    JSON.stringify(sanitized)
  );
}

export function updateDatabase(
  db: Database
): Database {
  const sanitized =
    ensureDatabaseDefaults(db);

  saveDatabase(sanitized);

  return sanitized;
}

export function getLocalDatabase(): Database {
  return getDatabase();
}

export function saveLocalDatabase(
  db: Database
): void {
  saveDatabase(db);
}

/* =========================================================
   CLEAR DATA
========================================================= */

export function clearPrototypeData(
  currentDb?: Database
): Database {
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
    schedules: [],
    raports: [],

    broadcastMessage:
      currentDb?.broadcastMessage ||
      DEFAULT_BROADCAST,

    adminPassword:
      currentDb?.adminPassword ||
      "admin123",

    lastUpdated:
      new Date().toISOString(),

    /**
     * Jangan membawa deletedIds lama
     * ketika benar-benar melakukan reset database.
     */
    deletedIds: []
  };

  saveDatabase(cleanDb);

  return cleanDb;
}

/* =========================================================
   SESSION
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
  return (
    db.sessions || []
  ).some(
    s =>
      s.tanggal === data.tanggal &&
      s.siswaId === data.siswaId &&
      s.tutorId === data.tutorId &&
      (!data.programId ||
        s.programId === data.programId)
  );
}

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
  const base =
    ensureDatabaseDefaults(db);

  const student =
    base.students.find(
      s => s.id === data.siswaId
    );

  const tutor =
    base.tutors.find(
      t => t.id === data.tutorId
    );

  const program =
    base.programs.find(
      p => p.id === data.programId
    );

  if (!student || !tutor || !program) {
    throw new Error(
      "Data siswa, tutor, atau program tidak ditemukan."
    );
  }

  if (
    checkDuplicateSession(
      base,
      data
    )
  ) {
    throw new Error(
      "Sesi untuk tutor, siswa, program, dan tanggal tersebut sudah ada."
    );
  }

  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(base)
      )
    );

  const newId =
    generateUniqueId("RP");

  nextDb.sessions = [
    {
      id: newId,
      tanggal: data.tanggal,
      siswaId: student.id,
      siswaNama: student.nama,
      tutorId: tutor.id,
      tutorNama: tutor.nama,
      programId: program.id,
      programNama: program.nama,
      tarifSiswaSnapshot:
        Number(program.tarifSiswa) || 0,
      honorTutorSnapshot:
        Number(program.honorTutor) || 0,
      catatan:
        data.catatan ||
        `Sesi pembelajaran ${program.nama}`
    },
    ...nextDb.sessions
  ];

  if (!student.programId) {
    nextDb.students =
      nextDb.students.map(
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

  nextDb.studentLedger.push({
    id: generateUniqueId("TXS"),
    tanggal: data.tanggal,
    siswaId: student.id,
    tipe: "debit",
    keterangan: `Riwayat Pertemuan [${newId}] - ${program.nama}`,
    jumlah:
      Number(program.tarifSiswa) || 0,
    saldoBerjalan: 0,
    referensiId: newId
  });

  nextDb.tutorLedger.push({
    id: generateUniqueId("TXT"),
    tanggal: data.tanggal,
    tutorId: tutor.id,
    tipe: "kredit",
    keterangan:
      `Riwayat Pertemuan [${newId}] - Siswa: ${student.nama} - ${program.nama}`,
    jumlah:
      Number(program.honorTutor) || 0,
    saldoBerjalan: 0,
    referensiId: newId
  });

  nextDb.lastUpdated =
    new Date().toISOString();

  return recalculateAllLedgers(
    nextDb
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
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const student =
    nextDb.students.find(
      s => s.id === data.siswaId
    );

  if (!student) {
    throw new Error(
      "Siswa tidak ditemukan."
    );
  }

  const tutor = data.tutorId
    ? nextDb.tutors.find(
        t => t.id === data.tutorId
      )
    : undefined;

  const payId =
    generateUniqueId("PAY");

  const newPayment: PembayaranSiswa = {
    id: payId,
    tanggal: data.tanggal,
    siswaId: student.id,
    siswaNama: student.nama,
    jumlah:
      Number(data.jumlah) || 0,
    metode: data.metode,
    tutorId: data.tutorId,
    tutorNama: tutor
      ? tutor.nama
      : undefined,
    statusTitipan:
      data.metode === "tutor"
        ? "pending"
        : "diserahkan",
    tanggalSerah:
      undefined
  };

  nextDb.payments = [
    newPayment,
    ...nextDb.payments
  ];

  if (data.metode === "admin") {
    const current =
      getStudentBalance(
        nextDb,
        student.id
      );

    nextDb.studentLedger.push({
      id: generateUniqueId(
        "TXS"
      ),
      tanggal: data.tanggal,
      siswaId: student.id,
      tipe: "kredit",
      keterangan:
        "Pembayaran langsung ke Admin",
      jumlah:
        Number(data.jumlah) || 0,
      saldoBerjalan:
        current -
        (Number(data.jumlah) || 0),
      referensiId: payId
    });

    const kas =
      getKasLembagaBalance(
        nextDb
      );

    nextDb.kas.push({
      id: generateUniqueId(
        "KAS"
      ),
      tanggal: data.tanggal,
      tipe: "masuk",
      keterangan:
        `Pembayaran Siswa [${payId}] - ${student.nama}`,
      jumlah:
        Number(data.jumlah) || 0,
      saldoBerjalan:
        kas +
        (Number(data.jumlah) || 0),
      referensiId: payId
    });
  }

  nextDb.lastUpdated =
    new Date().toISOString();

  const result =
    recalculateAllLedgers(
      nextDb
    );

  saveDatabase(result);

  return result;
}

/* =========================================================
   TUTOR DEPOSIT
========================================================= */

export function confirmTutorDepositHandover(
  db: Database,
  paymentId: string,
  tanggalSerah: string
): Database {
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const paymentIdx =
    nextDb.payments.findIndex(
      p => p.id === paymentId
    );

  if (paymentIdx === -1) {
    return db;
  }

  const payment =
    nextDb.payments[paymentIdx];

  if (
    payment.metode !== "tutor" ||
    payment.statusTitipan ===
      "diserahkan"
  ) {
    return db;
  }

  nextDb.payments[paymentIdx] = {
    ...payment,
    statusTitipan:
      "diserahkan",
    tanggalSerah
  };

  nextDb.studentLedger.push({
    id: generateUniqueId(
      "TXS"
    ),
    tanggal: tanggalSerah,
    siswaId: payment.siswaId,
    tipe: "kredit",
    keterangan:
      `Penerimaan Pembayaran via Tutor: ${payment.tutorNama}`,
    jumlah:
      Number(payment.jumlah) || 0,
    saldoBerjalan: 0,
    referensiId: payment.id
  });

  nextDb.kas.push({
    id: generateUniqueId(
      "KAS"
    ),
    tanggal: tanggalSerah,
    tipe: "masuk",
    keterangan:
      `Penerimaan Titipan Tutor [${payment.id}] - ${payment.tutorNama} (Siswa: ${payment.siswaNama})`,
    jumlah:
      Number(payment.jumlah) || 0,
    saldoBerjalan: 0,
    referensiId: payment.id
  });

  const result =
    recalculateAllLedgers(
      nextDb
    );

  saveDatabase(result);

  return result;
}

export function undoTutorDepositHandover(
  db: Database,
  paymentId: string
): Database {
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const paymentIdx =
    nextDb.payments.findIndex(
      p => p.id === paymentId
    );

  if (paymentIdx === -1) {
    return db;
  }

  const payment =
    nextDb.payments[paymentIdx];

  if (
    payment.metode !== "tutor" ||
    payment.statusTitipan !==
      "diserahkan"
  ) {
    return db;
  }

  nextDb.payments[paymentIdx] = {
    ...payment,
    statusTitipan:
      "pending",
    tanggalSerah:
      undefined
  };

  nextDb.studentLedger =
    nextDb.studentLedger.filter(
      tx =>
        tx.referensiId !==
        paymentId
    );

  nextDb.kas =
    nextDb.kas.filter(
      k =>
        k.referensiId !==
        paymentId
    );

  const result =
    recalculateAllLedgers(
      nextDb
    );

  saveDatabase(result);

  return result;
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
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const tutor =
    nextDb.tutors.find(
      t => t.id === data.tutorId
    );

  if (!tutor) {
    throw new Error(
      "Tutor tidak ditemukan."
    );
  }

  const slipId =
    generateUniqueId("SG");

  const potonganAmt =
    Number(data.potongan) || 0;

  const gross =
    Number(data.jumlah) || 0;

  const netPaid =
    Math.max(
      0,
      gross - potonganAmt
    );

  const newSlip: SlipGaji = {
    id: slipId,
    tanggal: data.tanggal,
    tutorId: tutor.id,
    tutorNama: tutor.nama,
    jumlah: netPaid,
    periode: data.periode,
    catatan:
      data.catatan ||
      "Pembayaran Honor Tutor",
    potongan: potonganAmt,
    keteranganPotongan:
      data.keteranganPotongan ||
      "",
    totalHonor: gross
  };

  nextDb.slips = [
    newSlip,
    ...nextDb.slips
  ];

  nextDb.tutorLedger.push({
    id: generateUniqueId(
      "TXT"
    ),
    tanggal: data.tanggal,
    tutorId: tutor.id,
    tipe: "debit",
    keterangan:
      potonganAmt > 0
        ? `Pembayaran Honor [${slipId}] (Potongan: ${formatRupiah(
            potonganAmt
          )}) - Periode ${data.periode}`
        : `Pembayaran Honor [${slipId}] - Periode ${data.periode}`,
    jumlah: gross,
    saldoBerjalan: 0,
    referensiId: slipId
  });

  nextDb.kas.push({
    id: generateUniqueId(
      "KAS"
    ),
    tanggal: data.tanggal,
    tipe: "keluar",
    keterangan:
      potonganAmt > 0
        ? `Pembayaran Honor Tutor [${slipId}] - ${tutor.nama} (Bersih: ${formatRupiah(
            netPaid
          )}, Potongan: ${formatRupiah(
            potonganAmt
          )})`
        : `Pembayaran Honor Tutor [${slipId}] - ${tutor.nama}`,
    jumlah: gross,
    saldoBerjalan: 0,
    referensiId: slipId
  });

  const result =
    recalculateAllLedgers(
      nextDb
    );

  saveDatabase(result);

  return result;
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
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const expId =
    generateUniqueId("EXP");

  nextDb.kas.push({
    id: generateUniqueId(
      "KAS"
    ),
    tanggal: data.tanggal,
    tipe: "keluar",
    keterangan:
      `Pengeluaran Operasional [${expId}] - ${data.keterangan}`,
    jumlah:
      Number(data.jumlah) || 0,
    saldoBerjalan: 0,
    referensiId: expId
  });

  const result =
    recalculateAllLedgers(
      nextDb
    );

  saveDatabase(result);

  return result;
}

/* =========================================================
   BALANCE
========================================================= */

export function getStudentBalance(
  db: Database,
  studentId: string
): number {
  return (
    db.studentLedger || []
  )
    .filter(
      tx =>
        tx.siswaId === studentId
    )
    .reduce(
      (sum, tx) =>
        sum +
        (tx.tipe === "debit"
          ? Number(tx.jumlah) || 0
          : -(Number(tx.jumlah) || 0)),
      0
    );
}

export function getTutorHonorBalance(
  db: Database,
  tutorId: string
): number {
  return (
    db.tutorLedger || []
  )
    .filter(
      tx =>
        tx.tutorId === tutorId
    )
    .reduce(
      (sum, tx) =>
        sum +
        (tx.tipe === "kredit"
          ? Number(tx.jumlah) || 0
          : -(Number(tx.jumlah) || 0)),
      0
    );
}

export function getTutorDepositBalance(
  db: Database,
  tutorId: string
): number {
  return (
    db.payments || []
  )
    .filter(
      p =>
        p.metode === "tutor" &&
        p.tutorId === tutorId &&
        p.statusTitipan ===
          "pending"
    )
    .reduce(
      (sum, p) =>
        sum +
        (Number(p.jumlah) || 0),
      0
    );
}

export function getKasLembagaBalance(
  db: Database
): number {
  return (
    db.kas || []
  ).reduce(
    (sum, tx) =>
      sum +
      (tx.tipe === "masuk"
        ? Number(tx.jumlah) || 0
        : -(Number(tx.jumlah) || 0)),
    0
  );
}

/* =========================================================
   DATE FILTER
========================================================= */

export function filterByDateRange<
  T extends { tanggal: string }
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
    new Date(baseDate);

  let startStr = "";
  let endStr = "";

  if (rangeType === "hari") {
    startStr = baseDate;
    endStr = baseDate;
  }

  else if (
    rangeType === "minggu"
  ) {
    const day =
      base.getDay();

    const diff =
      base.getDate() -
      day +
      (day === 0 ? -6 : 1);

    const monday =
      new Date(base);

    monday.setDate(diff);

    const sunday =
      new Date(monday);

    sunday.setDate(
      monday.getDate() + 6
    );

    const pad = (n: number) =>
      String(n).padStart(2, "0");

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

    const pad = (n: number) =>
      String(n).padStart(2, "0");

    startStr =
      `${year}-${pad(
        month + 1
      )}-01`;

    endStr =
      `${year}-${pad(
        month + 1
      )}-${pad(lastDay)}`;
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
    rangeType === "custom" &&
    customStart &&
    customEnd
  ) {
    startStr = customStart;
    endStr = customEnd;
  }

  else {
    return items;
  }

  return items.filter(
    item =>
      item.tanggal >= startStr &&
      item.tanggal <= endStr
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
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const newId =
    generateUniqueId("PML");

  nextDb.otherIncomes = [
    {
      id: newId,
      tanggal: data.tanggal,
      sumber: data.jenis,
      jumlah:
        Number(data.nominal) || 0,
      jenis: data.jenis,
      nominal:
        Number(data.nominal) || 0,
      keterangan:
        data.keterangan
    },
    ...nextDb.otherIncomes
  ];

  nextDb.kas.push({
    id: generateUniqueId(
      "KAS"
    ),
    tanggal: data.tanggal,
    tipe: "masuk",
    keterangan:
      `Pemasukan Lain [${newId}] - ${data.jenis}${
        data.keterangan
          ? " - " +
            data.keterangan
          : ""
      }`,
    jumlah:
      Number(data.nominal) || 0,
    saldoBerjalan: 0,
    referensiId: newId
  });

  const result =
    recalculateAllLedgers(
      nextDb
    );

  saveDatabase(result);

  return result;
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
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const tutor =
    nextDb.tutors.find(
      t => t.id === data.tutorId
    );

  const student =
    nextDb.students.find(
      s => s.id === data.siswaId
    );

  const program =
    nextDb.programs.find(
      p => p.id === data.programId
    );

  if (
    !tutor ||
    !student ||
    !program
  ) {
    console.error(
      "[DB] Data attendance tidak lengkap."
    );

    return db;
  }

  const newId =
    generateUniqueId("LPK");

  nextDb.attendanceReports = [
    {
      id: newId,
      tanggal: data.tanggal,
      tutorId: tutor.id,
      tutorNama: tutor.nama,
      siswaId: student.id,
      siswaNama: student.nama,
      programId: program.id,
      programNama: program.nama,
      fotoJurnal:
        data.fotoJurnal,
      keterangan:
        data.keterangan,
      status: "pending"
    },
    ...nextDb.attendanceReports
  ];

  nextDb.lastUpdated =
    new Date().toISOString();

  saveDatabase(nextDb);

  return nextDb;
}

export function verifyAttendanceReport(
  db: Database,
  reportId: string,
  status: "setuju" | "tolak",
  catatanAdmin?: string,
  tanggalProses: string =
    getTodayDateString()
): Database {
  let nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const reportIdx =
    nextDb.attendanceReports.findIndex(
      r => r.id === reportId
    );

  if (reportIdx === -1) {
    return db;
  }

  const report =
    nextDb.attendanceReports[
      reportIdx
    ];

  if (
    report.status !==
    "pending"
  ) {
    return db;
  }

  nextDb.attendanceReports[
    reportIdx
  ] = {
    ...report,
    status,
    tanggalProses,
    catatanAdmin
  };

  if (status === "setuju") {
    nextDb =
      addSessionTransaction(
        nextDb,
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
                ? " - " +
                  report.keterangan
                : ""
            }`
        }
      );
  }

  saveDatabase(nextDb);

  return nextDb;
}

export function undoVerifyAttendanceReport(
  db: Database,
  reportId: string
): Database {
  let nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const reportIdx =
    nextDb.attendanceReports.findIndex(
      r => r.id === reportId
    );

  if (reportIdx === -1) {
    return db;
  }

  const report =
    nextDb.attendanceReports[
      reportIdx
    ];

  if (
    report.status ===
    "pending"
  ) {
    return db;
  }

  const oldStatus =
    report.status;

  nextDb.attendanceReports[
    reportIdx
  ] = {
    ...report,
    status: "pending",
    tanggalProses:
      undefined,
    catatanAdmin:
      undefined
  };

  if (
    oldStatus === "setuju"
  ) {
    const session =
      nextDb.sessions.find(
        s =>
          s.tanggal ===
            report.tanggal &&
          s.siswaId ===
            report.siswaId &&
          s.tutorId ===
            report.tutorId &&
          s.programId ===
            report.programId &&
          s.catatan?.includes(
            reportId
          )
      );

    if (session) {
      nextDb =
        deleteSessionTransaction(
          nextDb,
          session.id
        );
    }
  }

  saveDatabase(nextDb);

  return nextDb;
}

/* =========================================================
   DELETE SESSION
========================================================= */

export function deleteSessionTransaction(
  db: Database,
  sessionId: string
): Database {
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const session =
    nextDb.sessions.find(
      s => s.id === sessionId
    );

  if (!session) {
    return db;
  }

  nextDb.sessions =
    nextDb.sessions.filter(
      s => s.id !== sessionId
    );

  if (session.catatan) {
    const match =
      session.catatan.match(
        /\[(LPK-[^\]]+)\]/
      );

    if (match?.[1]) {
      const reportId =
        match[1];

      const idx =
        nextDb.attendanceReports.findIndex(
          r =>
            r.id === reportId
        );

      if (idx !== -1) {
        nextDb.attendanceReports[
          idx
        ] = {
          ...nextDb
            .attendanceReports[
            idx
          ],
          status: "pending",
          tanggalProses:
            undefined,
          catatanAdmin:
            undefined
        };
      }
    }
  }

  /**
   * Hapus transaksi yang berasal
   * dari session.
   */
  nextDb.studentLedger =
    nextDb.studentLedger.filter(
      tx =>
        tx.referensiId !==
          sessionId ||
        tx.siswaId !==
          session.siswaId
    );

  nextDb.tutorLedger =
    nextDb.tutorLedger.filter(
      tx =>
        tx.referensiId !==
          sessionId ||
        tx.tutorId !==
          session.tutorId
    );

  /**
   * Catat session sebagai deleted.
   */
  nextDb.deletedIds =
    Array.from(
      new Set([
        ...(nextDb.deletedIds ||
          []),
        sessionId
      ])
    );

  const result =
    recalculateAllLedgers(
      nextDb
    );

  saveDatabase(result);

  return result;
}

/* =========================================================
   DELETE ATTENDANCE
========================================================= */

export function deleteAttendanceReport(
  db: Database,
  reportId: string
): Database {
  let nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const report =
    nextDb.attendanceReports.find(
      r => r.id === reportId
    );

  if (!report) {
    return db;
  }

  if (
    report.status ===
    "setuju"
  ) {
    const session =
      nextDb.sessions.find(
        s =>
          s.tanggal ===
            report.tanggal &&
          s.siswaId ===
            report.siswaId &&
          s.tutorId ===
            report.tutorId &&
          s.programId ===
            report.programId &&
          s.catatan?.includes(
            reportId
          )
      );

    if (session) {
      nextDb =
        deleteSessionTransaction(
          nextDb,
          session.id
        );
    }
  }

  nextDb.attendanceReports =
    nextDb.attendanceReports.filter(
      r => r.id !== reportId
    );

  nextDb.deletedIds =
    Array.from(
      new Set([
        ...(nextDb.deletedIds ||
          []),
        reportId
      ])
    );

  nextDb.lastUpdated =
    new Date().toISOString();

  saveDatabase(nextDb);

  return nextDb;
}

/* =========================================================
   MERGE HELPERS
========================================================= */

function mergeArrayById<
  T extends { id: string }
>(
  local: T[] = [],
  remote: T[] = []
): T[] {
  const map =
    new Map<string, T>();

  for (const item of local) {
    if (item?.id) {
      map.set(item.id, item);
    }
  }

  for (const item of remote) {
    if (!item?.id) continue;

    const previous =
      map.get(item.id);

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

function mergeSessions(
  local: RiwayatPertemuan[],
  remote: RiwayatPertemuan[]
): RiwayatPertemuan[] {
  const result =
    mergeArrayById(
      local,
      remote
    );

  const seen =
    new Set<string>();

  return result.filter(
    item => {
      const key =
        `${item.tanggal}|${item.tutorId}|${item.siswaId}|${item.programId}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

function mergeAttendance(
  local: AttendanceRecord[],
  remote: AttendanceRecord[]
): AttendanceRecord[] {
  const map =
    new Map<
      string,
      AttendanceRecord
    >();

  for (const item of local) {
    if (item?.id) {
      map.set(
        item.id,
        item
      );
    }
  }

  for (const item of remote) {
    if (!item?.id) continue;

    map.set(
      item.id,
      {
        ...(map.get(item.id) ||
          {}),
        ...item
      }
    );
  }

  const result =
    Array.from(
      map.values()
    );

  const seen =
    new Set<string>();

  return result.filter(
    item => {
      const key =
        `${item.tanggal}|${item.tutorId}|${item.siswaId}|${item.programId}`;

      if (
        item.status ===
          "pending" &&
        seen.has(key)
      ) {
        return false;
      }

      if (
        item.status ===
        "pending"
      ) {
        seen.add(key);
      }

      return true;
    }
  );
}

/* =========================================================
   CRITICAL MERGE
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
   * =======================================================
   * PENTING:
   *
   * deletedIds dari LOCAL + REMOTE digabung.
   *
   * Tidak boleh salah satu sisi menghilangkan tombstone.
   * =======================================================
   */
  const deletedIds =
    Array.from(
      new Set([
        ...(local.deletedIds ||
          []),
        ...(remote.deletedIds ||
          [])
      ])
    );

  const deleted =
    new Set(deletedIds);

  const filterDeleted = <
    T extends { id: string }
  >(
    items: T[]
  ): T[] =>
    items.filter(
      item =>
        item?.id &&
        !deleted.has(item.id)
    );

  const merged: Database = {
    ...local,
    ...remote,

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

    studentLedger:
      filterDeleted(
        mergeArrayById(
          local.studentLedger,
          remote.studentLedger
        )
      ),

    payments:
      filterDeleted(
        mergeArrayById(
          local.payments,
          remote.payments
        )
      ),

    tutorLedger:
      filterDeleted(
        mergeArrayById(
          local.tutorLedger,
          remote.tutorLedger
        )
      ),

    slips:
      filterDeleted(
        mergeArrayById(
          local.slips,
          remote.slips
        )
      ),

    kas:
      filterDeleted(
        mergeArrayById(
          local.kas,
          remote.kas
        )
      ),

    otherIncomes:
      filterDeleted(
        mergeArrayById(
          local.otherIncomes,
          remote.otherIncomes
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
          local.raports || [],
          remote.raports || []
        )
      ),

    broadcastMessage:
      remote.broadcastMessage ||
      local.broadcastMessage ||
      DEFAULT_BROADCAST,

    adminPassword:
      remote.adminPassword ||
      local.adminPassword ||
      "admin123",

    /**
     * Tombstone dipertahankan.
     */
    deletedIds,

    lastUpdated:
      new Date().toISOString()
  };

  return recalculateAllLedgers(
    merged
  );
}

/* =========================================================
   LEDGER REBUILD
========================================================= */

export function recalculateAllLedgers(
  input: Database
): Database {
  const db =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(input)
      )
    );

  const rebuild = <
    T extends {
      tanggal: string;
      id: string;
    }
  >(
    items: T[],
    apply: (
      item: T,
      running: number
    ) => number
  ): T[] => {
    const indexed =
      items.map(
        (item, index) => ({
          item,
          index
        })
      );

    indexed.sort(
      (a, b) =>
        a.item.tanggal.localeCompare(
          b.item.tanggal
        ) ||
        a.index - b.index
    );

    let running = 0;

    for (
      const entry of indexed
    ) {
      running =
        apply(
          entry.item,
          running
        );

      (
        entry.item as any
      ).saldoBerjalan =
        running;
    }

    return indexed
      .sort(
        (a, b) =>
          a.index - b.index
      )
      .map(
        x => x.item
      );
  };

  db.studentLedger =
    rebuild(
      db.studentLedger,
      (tx, running) =>
        running +
        (tx.tipe ===
        "debit"
          ? Number(tx.jumlah) ||
            0
          : -(
              Number(
                tx.jumlah
              ) || 0
            ))
    );

  db.tutorLedger =
    rebuild(
      db.tutorLedger,
      (tx, running) =>
        running +
        (tx.tipe ===
        "kredit"
          ? Number(tx.jumlah) ||
            0
          : -(
              Number(
                tx.jumlah
              ) || 0
            ))
    );

  db.kas =
    rebuild(
      db.kas,
      (tx, running) =>
        running +
        (tx.tipe ===
        "masuk"
          ? Number(tx.jumlah) ||
            0
          : -(
              Number(
                tx.jumlah
              ) || 0
            ))
    );

  db.lastUpdated =
    new Date().toISOString();

  return db;
}

/* =========================================================
   DELETE FROM DATABASE
========================================================= */

export function deleteFromDatabase(
  db: Database,
  collection: keyof Database,
  id: string
): Database {
  const next =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const current =
    (next as any)[
      collection
    ];

  if (!Array.isArray(current)) {
    return next;
  }

  /**
   * Hapus dari database lokal.
   */
  (next as any)[
    collection
  ] = current.filter(
    (item: any) =>
      item?.id !== id
  );

  /**
   * =======================================================
   * CRITICAL:
   * Tandai ID sebagai deleted.
   *
   * Ini yang mencegah device lain
   * menghidupkan kembali data.
   * =======================================================
   */
  next.deletedIds =
    Array.from(
      new Set([
        ...(next.deletedIds ||
          []),
        id
      ])
    );

  next.lastUpdated =
    new Date().toISOString();

  saveDatabase(next);

  return next;
}

/* =========================================================
   SUPABASE DELETE HELPER
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
      siswa: "siswa",
      tutor: "tutor",
      program: "program",
      jadwal: "jadwal",
      laporan_kehadiran:
        "laporan_kehadiran"
    };

    const target =
      allowed[table] ||
      table;

    const { error } =
      await supabase
        .from(target)
        .delete()
        .eq("id", id);

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
    new Date(dateStr);

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
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  const tutor =
    nextDb.tutors.find(
      t => t.id === data.tutorId
    );

  const student =
    nextDb.students.find(
      s => s.id === data.siswaId
    );

  const program =
    nextDb.programs.find(
      p => p.id === data.programId
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

  const newId =
    generateUniqueId("JDW");

  const newSchedule:
    ScheduleRecord = {
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

  nextDb.schedules = [
    ...nextDb.schedules,
    newSchedule
  ];

  nextDb.lastUpdated =
    new Date().toISOString();

  saveDatabase(nextDb);

  return nextDb;
}

export function deleteScheduleTransaction(
  db: Database,
  scheduleId: string
): Database {
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  nextDb.schedules =
    nextDb.schedules.filter(
      s =>
        s.id !== scheduleId
    );

  nextDb.deletedIds =
    Array.from(
      new Set([
        ...(nextDb.deletedIds ||
          []),
        scheduleId
      ])
    );

  nextDb.lastUpdated =
    new Date().toISOString();

  saveDatabase(nextDb);

  return nextDb;
}

/* =========================================================
   BROADCAST
========================================================= */

export function updateBroadcastMessageTransaction(
  db: Database,
  message: string
): Database {
  const nextDb =
    ensureDatabaseDefaults(
      JSON.parse(
        JSON.stringify(db)
      )
    );

  nextDb.broadcastMessage =
    message;

  nextDb.lastUpdated =
    new Date().toISOString();

  saveDatabase(nextDb);

  return nextDb;
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