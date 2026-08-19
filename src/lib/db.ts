import { supabase } from "./supabase";

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

  /*
   * JANGAN simpan password admin
   * di database JSON seperti versi lama.
   * Gunakan Supabase Auth.
   */

  lastUpdated?: string;
}

const DB_ID = "main_v1";

const DEFAULT_BROADCAST =
  "📢 PENGUMUMAN TUTOR: Mohon lakukan serah terima uang titipan pembayaran siswa kepada Staf Administrasi dan catat riwayat pertemuan secara tertib. Terima kasih!";

/* =========================================================
   FORMATTER
========================================================= */

export function formatRupiah(value: number): string {
  return (
    "Rp " +
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value) || 0)
  );
}

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

export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return "-";

  const parts = dateStr.split("-");

  if (parts.length !== 3) return dateStr;

  return `${parts[2].padStart(2, "0")}/${parts[1].padStart(
    2,
    "0"
  )}/${parts[0]}`;
}

export function formatBulanTahun(dateStr: string): string {
  if (!dateStr) return "-";

  const parts = dateStr.split("-");

  if (parts.length >= 2) {
    const monthIndex = Number(parts[1]) - 1;

    return `${BULAN_INDO[monthIndex] || parts[1]} ${parts[0]}`;
  }

  return dateStr;
}

export function getTodayDateString(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
    lastUpdated: new Date().toISOString()
  };
}

/* =========================================================
   NORMALIZE DATABASE
========================================================= */

export function ensureDatabaseDefaults(
  input: Partial<Database> | null | undefined
): Database {
  const data = input || {};

  return {
    programs: Array.isArray(data.programs) ? data.programs : [],
    students: Array.isArray(data.students) ? data.students : [],
    tutors: Array.isArray(data.tutors) ? data.tutors : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    studentLedger: Array.isArray(data.studentLedger)
      ? data.studentLedger
      : [],
    payments: Array.isArray(data.payments) ? data.payments : [],
    tutorLedger: Array.isArray(data.tutorLedger)
      ? data.tutorLedger
      : [],
    slips: Array.isArray(data.slips) ? data.slips : [],
    kas: Array.isArray(data.kas) ? data.kas : [],
    otherIncomes: Array.isArray(data.otherIncomes)
      ? data.otherIncomes
      : [],
    attendanceReports: Array.isArray(data.attendanceReports)
      ? data.attendanceReports
      : [],
    schedules: Array.isArray(data.schedules)
      ? data.schedules
      : [],
    raports: Array.isArray(data.raports)
      ? data.raports
      : [],
    broadcastMessage:
      data.broadcastMessage || DEFAULT_BROADCAST,
    lastUpdated:
      data.lastUpdated || new Date().toISOString()
  };
}

/* =========================================================
   SORT
========================================================= */

export function sortById<T extends { id?: string }>(
  items: T[]
): T[] {
  return [...(items || [])].sort((a, b) =>
    (a.id || "").localeCompare(
      b.id || "",
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    )
  );
}

export function sortByDateDesc<
  T extends { tanggal?: string; id?: string }
>(items: T[]): T[] {
  return [...(items || [])].sort((a, b) => {
    const dateCompare = (b.tanggal || "").localeCompare(
      a.tanggal || ""
    );

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (b.id || "").localeCompare(
      a.id || "",
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    );
  });
}

export function sortByDateAsc<
  T extends { tanggal?: string; id?: string }
>(items: T[]): T[] {
  return [...(items || [])].sort((a, b) => {
    const dateCompare = (a.tanggal || "").localeCompare(
      b.tanggal || ""
    );

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (a.id || "").localeCompare(
      b.id || "",
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    );
  });
}

/* =========================================================
   READ DATABASE FROM SUPABASE
========================================================= */

export async function getDatabase(): Promise<Database> {
  const { data, error } = await supabase
    .from("rumah_belajar_db")
    .select("data, updated_at")
    .eq("id", DB_ID)
    .maybeSingle();

  if (error) {
    console.error("Gagal mengambil database Supabase:", error);
    throw error;
  }

  if (!data) {
    return generateCleanDatabase();
  }

  return ensureDatabaseDefaults({
    ...(data.data || {}),
    lastUpdated: data.updated_at
  });
}

/* =========================================================
   SAVE DATABASE TO SUPABASE
========================================================= */

export async function saveDatabase(
  database: Database
): Promise<Database> {
  const cleanDatabase = ensureDatabaseDefaults(database);

  const updatedAt = new Date().toISOString();

  const payload = {
    ...cleanDatabase,
    lastUpdated: updatedAt
  };

  const { data, error } = await supabase
    .from("rumah_belajar_db")
    .upsert(
      {
        id: DB_ID,
        data: payload,
        updated_at: updatedAt
      },
      {
        onConflict: "id"
      }
    )
    .select("data, updated_at")
    .single();

  if (error) {
    console.error(
      "Gagal menyimpan database ke Supabase:",
      error
    );

    throw error;
  }

  return ensureDatabaseDefaults({
    ...(data?.data || payload),
    lastUpdated: data?.updated_at || updatedAt
  });
}

/* =========================================================
   REALTIME
========================================================= */

export function subscribeDatabase(
  onChange: (database: Database) => void,
  onError?: (error: Error) => void
) {
  const channel = supabase
    .channel("rumah-belajar-database")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rumah_belajar_db",
        filter: `id=eq.${DB_ID}`
      },
      payload => {
        try {
          if (!payload.new) return;

          const row = payload.new as {
            data?: Partial<Database>;
            updated_at?: string;
          };

          const database = ensureDatabaseDefaults({
            ...(row.data || {}),
            lastUpdated: row.updated_at
          });

          onChange(database);
        } catch (error) {
          console.error(
            "Gagal memproses realtime database:",
            error
          );

          onError?.(
            error instanceof Error
              ? error
              : new Error("Realtime database error")
          );
        }
      }
    )
    .subscribe(status => {
      console.log(
        "[Supabase Realtime]",
        status
      );
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/* =========================================================
   UNIQUE ID
========================================================= */

export function generateUniqueId(
  prefix: string
): string {
  const timestamp = Date.now()
    .toString(36)
    .toUpperCase();

  const random = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  return `${prefix}-${timestamp}-${random}`;
}

/* =========================================================
   BALANCE CALCULATION
========================================================= */

export function recalculateAllLedgers(
  database: Database
): Database {
  const db = ensureDatabaseDefaults(database);

  /* STUDENT */

  const students = new Map<
    string,
    TransaksiRekeningSiswa[]
  >();

  db.studentLedger.forEach(tx => {
    if (!tx?.siswaId) return;

    if (!students.has(tx.siswaId)) {
      students.set(tx.siswaId, []);
    }

    students.get(tx.siswaId)!.push({
      ...tx
    });
  });

  const studentLedger: TransaksiRekeningSiswa[] = [];

  students.forEach(list => {
    list.sort((a, b) => {
      const date = (a.tanggal || "").localeCompare(
        b.tanggal || ""
      );

      if (date !== 0) return date;

      return (a.id || "").localeCompare(
        b.id || "",
        undefined,
        {
          numeric: true
        }
      );
    });

    let saldo = 0;

    list.forEach(tx => {
      if (tx.tipe === "debit") {
        saldo += Number(tx.jumlah) || 0;
      } else {
        saldo -= Number(tx.jumlah) || 0;
      }

      studentLedger.push({
        ...tx,
        saldoBerjalan: saldo
      });
    });
  });

  /* TUTOR */

  const tutors = new Map<
    string,
    TransaksiHonorTutor[]
  >();

  db.tutorLedger.forEach(tx => {
    if (!tx?.tutorId) return;

    if (!tutors.has(tx.tutorId)) {
      tutors.set(tx.tutorId, []);
    }

    tutors.get(tx.tutorId)!.push({
      ...tx
    });
  });

  const tutorLedger: TransaksiHonorTutor[] = [];

  tutors.forEach(list => {
    list.sort((a, b) => {
      const date = (a.tanggal || "").localeCompare(
        b.tanggal || ""
      );

      if (date !== 0) return date;

      return (a.id || "").localeCompare(
        b.id || "",
        undefined,
        {
          numeric: true
        }
      );
    });

    let saldo = 0;

    list.forEach(tx => {
      if (tx.tipe === "kredit") {
        saldo += Number(tx.jumlah) || 0;
      } else {
        saldo -= Number(tx.jumlah) || 0;
      }

      tutorLedger.push({
        ...tx,
        saldoBerjalan: saldo
      });
    });
  });

  /* KAS */

  const kas = [...db.kas].sort((a, b) => {
    const date = (a.tanggal || "").localeCompare(
      b.tanggal || ""
    );

    if (date !== 0) return date;

    return (a.id || "").localeCompare(
      b.id || "",
      undefined,
      {
        numeric: true
      }
    );
  });

  let kasSaldo = 0;

  const calculatedKas = kas.map(item => {
    if (item.tipe === "masuk") {
      kasSaldo += Number(item.jumlah) || 0;
    } else {
      kasSaldo -= Number(item.jumlah) || 0;
    }

    return {
      ...item,
      saldoBerjalan: kasSaldo
    };
  });

  return {
    ...db,
    studentLedger,
    tutorLedger,
    kas: calculatedKas
  };
}

/* =========================================================
   QUICK ACCESS
========================================================= */

export function getStudentBalance(
  db: Database,
  studentId: string
): number {
  return db.studentLedger
    .filter(tx => tx.siswaId === studentId)
    .reduce((saldo, tx) => {
      return tx.tipe === "debit"
        ? saldo + tx.jumlah
        : saldo - tx.jumlah;
    }, 0);
}

export function getTutorHonorBalance(
  db: Database,
  tutorId: string
): number {
  return db.tutorLedger
    .filter(tx => tx.tutorId === tutorId)
    .reduce((saldo, tx) => {
      return tx.tipe === "kredit"
        ? saldo + tx.jumlah
        : saldo - tx.jumlah;
    }, 0);
}

export function getTutorDepositBalance(
  db: Database,
  tutorId: string
): number {
  return db.payments
    .filter(
      p =>
        p.metode === "tutor" &&
        p.tutorId === tutorId &&
        p.statusTitipan === "pending"
    )
    .reduce(
      (total, payment) =>
        total + (Number(payment.jumlah) || 0),
      0
    );
}

export function getKasLembagaBalance(
  db: Database
): number {
  return db.kas.reduce(
    (saldo, item) =>
      item.tipe === "masuk"
        ? saldo + item.jumlah
        : saldo - item.jumlah,
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
    | "custom"
    | "semua",
  customStart?: string,
  customEnd?: string,
  baseDate: string = getTodayDateString()
): T[] {
  if (rangeType === "semua") {
    return items;
  }

  const base = new Date(`${baseDate}T00:00:00`);

  let start = "";
  let end = "";

  if (rangeType === "hari") {
    start = baseDate;
    end = baseDate;
  }

  if (rangeType === "minggu") {
    const day = base.getDay();

    const diff =
      base.getDate() -
      day +
      (day === 0 ? -6 : 1);

    const monday = new Date(base);

    monday.setDate(diff);

    const sunday = new Date(monday);

    sunday.setDate(
      monday.getDate() + 6
    );

    const format = (d: Date) =>
      `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    start = format(monday);
    end = format(sunday);
  }

  if (rangeType === "bulan") {
    const year = base.getFullYear();
    const month = base.getMonth();

    start =
      `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const lastDay = new Date(
      year,
      month + 1,
      0
    ).getDate();

    end =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(
        lastDay
      ).padStart(2, "0")}`;
  }

  if (rangeType === "tahun") {
    const year = base.getFullYear();

    start = `${year}-01-01`;
    end = `${year}-12-31`;
  }

  if (
    rangeType === "custom" &&
    customStart &&
    customEnd
  ) {
    start = customStart;
    end = customEnd;
  }

  if (!start || !end) {
    return items;
  }

  return items.filter(
    item =>
      item.tanggal >= start &&
      item.tanggal <= end
  );
}