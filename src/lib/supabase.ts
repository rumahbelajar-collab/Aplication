import { createClient } from "@supabase/supabase-js";
import { Database, ensureDatabaseDefaults } from "./db";
import { Tutor, Siswa } from "../types";

// Configuration from env or defaults
const metaEnv = (import.meta as any).env || {};
const SUPABASE_URL = (metaEnv.VITE_SUPABASE_URL || "https://pxtudqcutpjvdnqbhwgf.supabase.co").replace(/\/rest\/v1\/?$/, "");
const SUPABASE_ANON_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dHVkcWN1dHBqdmRucWJod2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDExMTMsImV4cCI6MjA5ODM3NzExM30.65l1hniJcmumYk3qvZZQ73d767mAE8_kvz9xZKv2COE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Local safe storage helpers to avoid circular dependency issues at load time
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("Storage access denied:", e);
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Storage access denied:", e);
  }
}

export type SyncStatus = "idle" | "syncing" | "success" | "error" | "table_missing";

export interface SyncState {
  status: SyncStatus;
  lastSynced: string | null;
  errorMessage: string | null;
}

// Callbacks list to notify UI of state changes
const listeners = new Set<(state: SyncState) => void>();

let currentSyncState: SyncState = {
  status: "idle",
  lastSynced: safeGetItem("supabase_last_synced"),
  errorMessage: null
};

export function getSyncState(): SyncState {
  return { ...currentSyncState };
}

export function subscribeToSyncState(callback: (state: SyncState) => void): () => void {
  listeners.add(callback);
  callback(currentSyncState);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Subscribes to real-time updates from Supabase for table `rumah_belajar_db`
 */
export function subscribeToDatabaseChanges(onUpdate: (db: Database) => void): () => void {
  const channel = supabase
    .channel("realtime_db_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rumah_belajar_db",
        filter: "id=eq.main_v1"
      },
      (payload) => {
        console.log("Real-time database update received from Supabase:", payload);
        if (payload.new && (payload.new as any).data) {
          const remoteDb = (payload.new as any).data as Database;
          onUpdate(remoteDb);
        }
      }
    )
    .subscribe((status) => {
      console.log("Supabase Realtime subscription status:", status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

function updateSyncState(updates: Partial<SyncState>) {
  currentSyncState = { ...currentSyncState, ...updates };
  if (updates.lastSynced) {
    safeSetItem("supabase_last_synced", updates.lastSynced);
  }
  listeners.forEach(cb => cb(currentSyncState));
}

export function isEmptyDatabase(db: Database): boolean {
  if (!db) return true;
  return (
    (!db.students || db.students.length === 0) &&
    (!db.tutors || db.tutors.length === 0) &&
    (!db.programs || db.programs.length === 0) &&
    (!db.sessions || db.sessions.length === 0) &&
    (!db.payments || db.payments.length === 0) &&
    (!db.kas || db.kas.length === 0)
  );
}

/**
 * Pushes the database state to Supabase table `rumah_belajar_db`
 */
export async function pushToSupabase(db: Database, isForce = false): Promise<boolean> {
  if (!db) return false;

  // Prevent background sync spam if we already know the table is missing, unless forced by user click
  if (currentSyncState.status === "table_missing" && !isForce) {
    console.warn("Supabase push skipped automatically because the table 'rumah_belajar_db' does not exist yet.");
    return false;
  }

  // Safety guard: Prevent pushing an empty database over an existing non-empty database on remote
  if (isEmptyDatabase(db) && !isForce) {
    try {
      const { data: existingRemote } = await supabase
        .from("rumah_belajar_db")
        .select("data")
        .eq("id", "main_v1")
        .maybeSingle();

      if (existingRemote && existingRemote.data && !isEmptyDatabase(existingRemote.data)) {
        console.warn("Safety Guard: Blocked attempt to overwrite non-empty Supabase database with an empty local database.");
        updateSyncState({ status: "idle", errorMessage: null });
        return false;
      }
    } catch (e) {
      // Ignore check errors and proceed safely
    }
  }
  
  updateSyncState({ status: "syncing", errorMessage: null });
  
  try {
    const { error } = await supabase
      .from("rumah_belajar_db")
      .upsert({ 
        id: "main_v1", 
        data: db, 
        updated_at: new Date().toISOString() 
      }, {
        onConflict: "id"
      });

    if (error) {
      console.warn("Supabase push warning:", error);
      const isMissingTable = error.code === "P0001" || 
        error.message?.includes("relation") || 
        error.message?.includes("does not exist") || 
        error.message?.includes("schema cache") || 
        error.message?.includes("Could not find the table");

      if (isMissingTable) {
        updateSyncState({ status: "table_missing", errorMessage: "Tabel 'rumah_belajar_db' belum terbuat di Supabase." });
      } else {
        updateSyncState({ status: "error", errorMessage: error.message || "Gagal mengunggah data ke Supabase." });
      }
      return false;
    }

    // Best-effort push to relational tables 'tutor' and 'siswa' if they exist in Supabase
    if (db.tutors && db.tutors.length > 0) {
      try {
        const tutorPayload = db.tutors.map(t => ({
          id: t.id,
          nama: t.nama,
          id_login: t.idLogin,
          password: t.password || "123",
          status: t.status || "aktif",
          telepon: t.telepon || "",
          alamat: t.alamat || "",
          tanggal_bergabung: t.tanggalBergabung || new Date().toISOString().slice(0, 10)
        }));
        await supabase.from("tutor").upsert(tutorPayload, { onConflict: "id" });
      } catch (e) {
        // Ignored if table 'tutor' does not exist
      }
    }


    if (db.students && db.students.length > 0) {
      try {
        const studentPayload = db.students.map(s => ({
          id: s.id,
          nama: s.nama,
          program_id: s.programId || "",
          status: s.status || "aktif",
          telepon_orang_tua: s.teleponOrangTua || "",
          alamat: s.alamat || "",
          tanggal_daftar: s.tanggalDaftar || new Date().toISOString().slice(0, 10)
        }));
        await supabase.from("siswa").upsert(studentPayload, { onConflict: "id" });
      } catch (e) {}
    }

    if (db.programs && db.programs.length > 0) {
      try {
        const payload = db.programs.map(p => ({
          id: p.id, nama: p.nama, jenjang: p.jenjang, mapel: p.mapel,
          durasi: p.durasi, tarif_siswa: p.tarifSiswa, honor_tutor: p.honorTutor,
          status: p.status || "aktif"
        }));
        await supabase.from("program").upsert(payload, { onConflict: "id" });
      } catch (e) {}
    }

    if (db.kas && db.kas.length > 0) {
      try {
        const payload = db.kas.map(k => ({
          id: k.id, tanggal: k.tanggal, tipe: k.tipe, keterangan: k.keterangan,
          jumlah: k.jumlah, saldo_berjalan: k.saldoBerjalan
        }));
        await supabase.from("kas").upsert(payload, { onConflict: "id" });
      } catch (e) {}
    }

    if (db.payments && db.payments.length > 0) {
      try {
        const payload = db.payments.map(p => ({
          id: p.id, tanggal: p.tanggal, siswa_id: p.siswaId, siswa_nama: p.siswaNama,
          jumlah: p.jumlah, metode: p.metode, tutor_id: p.tutorId || null,
          tutor_nama: p.tutorNama || null, status_titipan: p.statusTitipan,
          tanggal_serah: p.tanggalSerah || null
        }));
        await supabase.from("pembayaran").upsert(payload, { onConflict: "id" });
      } catch (e) {}
    }



    if (db.attendanceReports && db.attendanceReports.length > 0) {
      try {
        const payload = db.attendanceReports.map(a => ({
          id: a.id, tanggal: a.tanggal, tutor_id: a.tutorId, tutor_nama: a.tutorNama,
          siswa_id: a.siswaId, siswa_nama: a.siswaNama, program_id: a.programId,
          program_nama: a.programNama, foto_jurnal: a.fotoJurnal, keterangan: a.keterangan || null,
          status: a.status || "pending", catatan_admin: a.catatanAdmin || null,
          tanggal_proses: a.tanggalProses || null
        }));
        await supabase.from("laporan_kehadiran").upsert(payload, { onConflict: "id" });
      } catch (e) {}
    }

    if (db.tutorLedger && db.tutorLedger.length > 0) {

      try {
        const payload = db.tutorLedger.map(l => ({
          id: l.id, tanggal: l.tanggal, tutor_id: l.tutorId, tipe: l.tipe,
          keterangan: l.keterangan, jumlah: l.jumlah, saldo_berjalan: l.saldoBerjalan,
          referensi_id: l.referensiId || null
        }));
        await supabase.from("transaksi_tutor").upsert(payload, { onConflict: "id" });
      } catch (e) {}
    }

    if (db.slips && db.slips.length > 0) {
      try {
        const payload = db.slips.map(s => ({
          id: s.id, tanggal: s.tanggal, tutor_id: s.tutorId, tutor_nama: s.tutorNama,
          jumlah: s.jumlah, periode: s.periode, catatan: s.catatan || null,
          potongan: s.potongan || 0, keterangan_potongan: s.keteranganPotongan || null,
          total_honor: s.totalHonor || 0
        }));
        await supabase.from("slip_gaji").upsert(payload, { onConflict: "id" });
      } catch (e) {}
    }

    if (db.studentLedger && db.studentLedger.length > 0) {

      try {
        const payload = db.studentLedger.map(l => ({
          id: l.id, tanggal: l.tanggal, siswa_id: l.siswaId, tipe: l.tipe,
          keterangan: l.keterangan, jumlah: l.jumlah, saldo_berjalan: l.saldoBerjalan,
          referensi_id: l.referensiId || null
        }));
        await supabase.from("transaksi_siswa").upsert(payload, { onConflict: "id" });
      } catch (e) {}
    }

    if (db.sessions && db.sessions.length > 0) {
      try {
        const payload = db.sessions.map(s => ({
          id: s.id, tanggal: s.tanggal, siswa_id: s.siswaId, siswa_nama: s.siswaNama,
          tutor_id: s.tutorId, tutor_nama: s.tutorNama, program_id: s.programId,
          program_nama: s.programNama, tarif_siswa_snapshot: s.tarifSiswaSnapshot,
          honor_tutor_snapshot: s.honorTutorSnapshot, catatan: s.catatan || null
        }));
        await supabase.from("sesi").upsert(payload, { onConflict: "id" });
      } catch (e) {}
    }


    updateSyncState({ 
      status: "success", 
      lastSynced: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB" 
    });
    return true;
  } catch (err: any) {
    console.warn("Supabase network warning:", err);
    updateSyncState({ status: "error", errorMessage: err.message || "Koneksi ke Supabase terputus." });
    return false;
  }
}

/**
 * Pulls the database state from Supabase table `rumah_belajar_db` and merges relational tables (tutor, siswa)
 */
export async function pullFromSupabase(): Promise<Database | null> {
  updateSyncState({ status: "syncing", errorMessage: null });
  
  try {
    let dbResult: Database | null = null;

    const { data, error } = await supabase
      .from("rumah_belajar_db")
      .select("data")
      .eq("id", "main_v1")
      .single();

    if (error) {
      console.warn("Supabase main_v1 pull warning:", error);
      if (error.code === "PGRST116") {
        updateSyncState({ status: "idle", errorMessage: "Data di Supabase masih kosong." });
      } else {
        const isMissingTable = error.message?.includes("relation") || 
          error.message?.includes("does not exist") || 
          error.message?.includes("schema cache") || 
          error.message?.includes("Could not find the table");
        if (isMissingTable) {
          updateSyncState({ status: "table_missing", errorMessage: "Tabel 'rumah_belajar_db' belum terbuat di Supabase." });
          return null;
        }
      }
    }

    if (data && data.data) {
      dbResult = ensureDatabaseDefaults(data.data);
    } else {
      // Check local storage fallback if main_v1 is empty or missing
      const localRaw = safeGetItem("rumah_belajar_db_v2");
      if (localRaw) {
        try {
          dbResult = ensureDatabaseDefaults(JSON.parse(localRaw));
        } catch (e) {}
      }
      if (!dbResult) {
        dbResult = ensureDatabaseDefaults(null);
      }
    }

    // Intelligently merge SQL records from relational tables so no records are lost
    try {
      const { data: tutorRows } = await supabase.from("tutor").select("*");
      if (tutorRows && Array.isArray(tutorRows) && tutorRows.length > 0) {
        const existingTutors = [...dbResult.tutors];
        tutorRows.forEach((r: any) => {
          const tid = r.id || r.id_login;
          if (!tid) return;
          const idx = existingTutors.findIndex(t => t.id === tid || t.idLogin.toLowerCase() === (r.id_login || "").toLowerCase());
          const existingTutor = idx >= 0 ? existingTutors[idx] : null;
          const mappedTutor: Tutor = {
            id: tid,
            nama: r.nama || existingTutor?.nama || "Tutor",
            idLogin: r.id_login || existingTutor?.idLogin || tid,
            password: (r.password && r.password !== "123") ? r.password : (existingTutor?.password || r.password || "123"),
            status: r.status === "nonaktif" ? "nonaktif" : (existingTutor?.status || "aktif"),
            telepon: r.telepon || existingTutor?.telepon || "",
            alamat: r.alamat || existingTutor?.alamat || "",
            tanggalBergabung: r.tanggal_bergabung || existingTutor?.tanggalBergabung || new Date().toISOString().slice(0, 10)
          };
          if (idx >= 0) {
            existingTutors[idx] = { ...existingTutors[idx], ...mappedTutor };
          } else {
            existingTutors.push(mappedTutor);
          }
        });
        dbResult.tutors = existingTutors;
      }
    } catch (e) {
      // Ignored if table 'tutor' doesn't exist
    }

    // Intelligently merge SQL records from 'siswa' relational table if available
    try {
      const { data: siswaRows } = await supabase.from("siswa").select("*");
      if (siswaRows && Array.isArray(siswaRows) && siswaRows.length > 0) {
        const existingStudents = [...dbResult.students];
        siswaRows.forEach((r: any) => {
          if (!r.id) return;
          const idx = existingStudents.findIndex(s => s.id === r.id);
          const mappedStudent: Siswa = {
            id: r.id,
            nama: r.nama || "Siswa",
            programId: r.program_id || "",
            status: r.status === "nonaktif" ? "nonaktif" : "aktif",
            teleponOrangTua: r.telepon_orang_tua || "",
            alamat: r.alamat || "",
            tanggalDaftar: r.tanggal_daftar || (r.created_at ? r.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10))
          };
          if (idx >= 0) {
            existingStudents[idx] = { ...existingStudents[idx], ...mappedStudent };
          } else {
            existingStudents.push(mappedStudent);
          }
        });

        dbResult.students = existingStudents;
      }
    } catch (e) {}

    // Pull other relational tables
    try {
      const { data: programRows } = await supabase.from("program").select("*");
      if (programRows && programRows.length > 0) {
        const mapped = programRows.map(r => ({
          id: r.id, nama: r.nama, jenjang: r.jenjang, mapel: r.mapel,
          durasi: Number(r.durasi), tarifSiswa: Number(r.tarif_siswa),
          honorTutor: Number(r.honor_tutor), status: r.status
        }));
        const existing = [...dbResult.programs];
        mapped.forEach(m => {
          const idx = existing.findIndex(e => e.id === m.id);
          if (idx >= 0) existing[idx] = m;
          else existing.push(m);
        });
        dbResult.programs = existing;
      }
    } catch (e) {}

    try {
      const { data: kasRows } = await supabase.from("kas").select("*");
      if (kasRows && kasRows.length > 0) {
        const mapped = kasRows.map(r => ({
          id: r.id, tanggal: r.tanggal, tipe: r.tipe, keterangan: r.keterangan,
          jumlah: Number(r.jumlah), saldoBerjalan: Number(r.saldo_berjalan)
        }));
        const existing = [...dbResult.kas];
        mapped.forEach(m => {
          const idx = existing.findIndex(e => e.id === m.id);
          if (idx >= 0) existing[idx] = m;
          else existing.push(m);
        });
        dbResult.kas = existing;
      }
    } catch (e) {}

    try {
      const { data: pRows } = await supabase.from("pembayaran").select("*");
      if (pRows && pRows.length > 0) {
        const mapped = pRows.map(r => ({
          id: r.id, tanggal: r.tanggal, siswaId: r.siswa_id, siswaNama: r.siswa_nama,
          jumlah: Number(r.jumlah), metode: r.metode, tutorId: r.tutor_id,
          tutorNama: r.tutor_nama, statusTitipan: r.status_titipan, tanggalSerah: r.tanggal_serah
        }));
        const existing = [...dbResult.payments];
        mapped.forEach(m => {
          const idx = existing.findIndex(e => e.id === m.id);
          if (idx >= 0) existing[idx] = m;
          else existing.push(m);
        });
        dbResult.payments = existing;
      }
    } catch (e) {}

    try {
      const { data: attRows } = await supabase.from("laporan_kehadiran").select("*");
      if (attRows && attRows.length > 0) {
        const mapped = attRows.map(r => ({
          id: r.id,
          tanggal: r.tanggal,
          tutorId: r.tutor_id,
          tutorNama: r.tutor_nama,
          siswaId: r.siswa_id,
          siswaNama: r.siswa_nama,
          programId: r.program_id,
          programNama: r.program_nama,
          fotoJurnal: r.foto_jurnal,
          keterangan: r.keterangan || undefined,
          status: (r.status as "pending" | "setuju" | "tolak") || "pending",
          catatanAdmin: r.catatan_admin || undefined,
          tanggalProses: r.tanggal_proses || undefined
        }));
        const existing = [...dbResult.attendanceReports];
        mapped.forEach(m => {
          const idx = existing.findIndex(e => e.id === m.id);
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], ...m };
          } else {
            existing.push(m);
          }
        });
        dbResult.attendanceReports = existing;
      }
    } catch (e) {}

    try {
      const { data: tlRows } = await supabase.from("transaksi_tutor").select("*");
      if (tlRows && tlRows.length > 0) {
        const mapped = tlRows.map(r => ({
          id: r.id, tanggal: r.tanggal, tutorId: r.tutor_id, tipe: r.tipe,
          keterangan: r.keterangan, jumlah: Number(r.jumlah),
          saldoBerjalan: Number(r.saldo_berjalan), referensiId: r.referensi_id
        }));
        const existing = [...dbResult.tutorLedger];
        mapped.forEach(m => {
          const idx = existing.findIndex(e => e.id === m.id);
          if (idx >= 0) existing[idx] = m;
          else existing.push(m);
        });
        dbResult.tutorLedger = existing;
      }
    } catch (e) {}

    try {
      const { data: sgRows } = await supabase.from("slip_gaji").select("*");
      if (sgRows && sgRows.length > 0) {
        const mapped = sgRows.map(r => ({
          id: r.id, tanggal: r.tanggal, tutorId: r.tutor_id, tutorNama: r.tutor_nama,
          jumlah: Number(r.jumlah), periode: r.periode, catatan: r.catatan,
          potongan: Number(r.potongan || 0), keteranganPotongan: r.keterangan_potongan,
          totalHonor: Number(r.total_honor || 0)
        }));
        const existing = [...dbResult.slips];
        mapped.forEach(m => {
          const idx = existing.findIndex(e => e.id === m.id);
          if (idx >= 0) existing[idx] = m;
          else existing.push(m);
        });
        dbResult.slips = existing;
      }
    } catch (e) {}

    try {
      const { data: slRows } = await supabase.from("transaksi_siswa").select("*");

      if (slRows && slRows.length > 0) {
        const mapped = slRows.map(r => ({
          id: r.id, tanggal: r.tanggal, siswaId: r.siswa_id, tipe: r.tipe,
          keterangan: r.keterangan, jumlah: Number(r.jumlah),
          saldoBerjalan: Number(r.saldo_berjalan), referensiId: r.referensi_id
        }));
        const existing = [...dbResult.studentLedger];
        mapped.forEach(m => {
          const idx = existing.findIndex(e => e.id === m.id);
          if (idx >= 0) existing[idx] = m;
          else existing.push(m);
        });
        dbResult.studentLedger = existing;
      }
    } catch (e) {}

    try {
      const { data: sessRows } = await supabase.from("sesi").select("*");
      if (sessRows && sessRows.length > 0) {
        const mapped = sessRows.map(r => ({
          id: r.id, tanggal: r.tanggal, siswaId: r.siswa_id, siswaNama: r.siswa_nama,
          tutorId: r.tutor_id, tutorNama: r.tutor_nama, programId: r.program_id,
          programNama: r.program_nama, tarifSiswaSnapshot: Number(r.tarif_siswa_snapshot),
          honorTutorSnapshot: Number(r.honor_tutor_snapshot), catatan: r.catatan
        }));
        const existing = [...dbResult.sessions];
        mapped.forEach(m => {
          const idx = existing.findIndex(e => e.id === m.id);
          if (idx >= 0) existing[idx] = m;
          else existing.push(m);
        });
        dbResult.sessions = existing;
      }
    } catch (e) {}


    updateSyncState({ 
      status: "success", 
      lastSynced: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB" 
    });
    
    return dbResult;
  } catch (err: any) {
    console.warn("Supabase network warning during pull:", err);
    updateSyncState({ status: "error", errorMessage: err.message || "Koneksi ke Supabase terputus." });
    return null;
  }
}

// SQL Schema code to share with user
export const SUPABASE_SQL_SCHEMA = `-- Jalankan seluruh perintah SQL ini di "SQL Editor" di Dashboard Supabase Anda:

-- 1. Tabel Utama JSON State (Rumah Belajar DB)
CREATE TABLE IF NOT EXISTS rumah_belajar_db (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabel Relasional Tutor
CREATE TABLE IF NOT EXISTS tutor (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  id_login TEXT NOT NULL,
  password TEXT DEFAULT '123',
  status TEXT DEFAULT 'aktif',
  telepon TEXT DEFAULT '',
  alamat TEXT DEFAULT '',
  tanggal_bergabung TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabel Relasional Siswa
CREATE TABLE IF NOT EXISTS siswa (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  program_id TEXT DEFAULT '',
  status TEXT DEFAULT 'aktif',
  telepon_orang_tua TEXT DEFAULT '',
  alamat TEXT DEFAULT '',
  tanggal_daftar TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);



-- 9. Tabel Ledger Tutor
CREATE TABLE IF NOT EXISTS transaksi_tutor (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  tutor_id TEXT NOT NULL,
  tipe TEXT NOT NULL,
  keterangan TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  saldo_berjalan NUMERIC NOT NULL,
  referensi_id TEXT
);

-- 10. Tabel Slip Gaji
CREATE TABLE IF NOT EXISTS slip_gaji (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  tutor_id TEXT NOT NULL,
  tutor_nama TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  periode TEXT NOT NULL,
  catatan TEXT,
  potongan NUMERIC,
  keterangan_potongan TEXT,
  total_honor NUMERIC
);

ALTER TABLE transaksi_tutor DISABLE ROW LEVEL SECURITY;
ALTER TABLE slip_gaji DISABLE ROW LEVEL SECURITY;

ALTER TABLE transaksi_tutor REPLICA IDENTITY FULL;
ALTER TABLE slip_gaji REPLICA IDENTITY FULL;

DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE transaksi_tutor; EXCEPTION WHEN OTHERS THEN END $;
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE slip_gaji; EXCEPTION WHEN OTHERS THEN END $;


-- 11. Tabel Laporan Kehadiran (Attendance)
CREATE TABLE IF NOT EXISTS laporan_kehadiran (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  tutor_id TEXT NOT NULL,
  tutor_nama TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  siswa_nama TEXT NOT NULL,
  program_id TEXT NOT NULL,
  program_nama TEXT NOT NULL,
  foto_jurnal TEXT NOT NULL,
  keterangan TEXT,
  status TEXT DEFAULT 'pending',
  catatan_admin TEXT,
  tanggal_proses TEXT
);

ALTER TABLE laporan_kehadiran DISABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_kehadiran REPLICA IDENTITY FULL;
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE laporan_kehadiran; EXCEPTION WHEN OTHERS THEN END $;

-- 4. Tabel Relasional Program


CREATE TABLE IF NOT EXISTS program (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  jenjang TEXT NOT NULL,
  mapel TEXT NOT NULL,
  durasi NUMERIC NOT NULL,
  tarif_siswa NUMERIC NOT NULL,
  honor_tutor NUMERIC NOT NULL,
  status TEXT DEFAULT 'aktif'
);

-- 5. Tabel Transaksi Kas
CREATE TABLE IF NOT EXISTS kas (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  tipe TEXT NOT NULL,
  keterangan TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  saldo_berjalan NUMERIC NOT NULL
);

-- 6. Tabel Pembayaran Siswa
CREATE TABLE IF NOT EXISTS pembayaran (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  siswa_nama TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  metode TEXT NOT NULL,
  tutor_id TEXT,
  tutor_nama TEXT,
  status_titipan TEXT NOT NULL,
  tanggal_serah TEXT
);

-- 7. Tabel Ledger Siswa
CREATE TABLE IF NOT EXISTS transaksi_siswa (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  tipe TEXT NOT NULL,
  keterangan TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  saldo_berjalan NUMERIC NOT NULL,
  referensi_id TEXT
);

-- 8. Tabel Sesi / Pertemuan
CREATE TABLE IF NOT EXISTS sesi (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  siswa_nama TEXT NOT NULL,
  tutor_id TEXT NOT NULL,
  tutor_nama TEXT NOT NULL,
  program_id TEXT NOT NULL,
  program_nama TEXT NOT NULL,
  tarif_siswa_snapshot NUMERIC NOT NULL,
  honor_tutor_snapshot NUMERIC NOT NULL,
  catatan TEXT
);

-- Opsi RLS
ALTER TABLE rumah_belajar_db DISABLE ROW LEVEL SECURITY;
ALTER TABLE tutor DISABLE ROW LEVEL SECURITY;
ALTER TABLE siswa DISABLE ROW LEVEL SECURITY;
ALTER TABLE program DISABLE ROW LEVEL SECURITY;
ALTER TABLE kas DISABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_siswa DISABLE ROW LEVEL SECURITY;
ALTER TABLE sesi DISABLE ROW LEVEL SECURITY;

-- Set Replica Identity
ALTER TABLE rumah_belajar_db REPLICA IDENTITY FULL;
ALTER TABLE tutor REPLICA IDENTITY FULL;
ALTER TABLE siswa REPLICA IDENTITY FULL;
ALTER TABLE program REPLICA IDENTITY FULL;
ALTER TABLE kas REPLICA IDENTITY FULL;
ALTER TABLE pembayaran REPLICA IDENTITY FULL;
ALTER TABLE transaksi_siswa REPLICA IDENTITY FULL;
ALTER TABLE sesi REPLICA IDENTITY FULL;

-- Inisialisasi Record Utama
INSERT INTO rumah_belajar_db (id, data, updated_at) VALUES ('main_v1', '{"programs":[],"students":[],"tutors":[],"kas":[],"studentLedger":[],"tutorLedger":[],"payments":[],"slips":[],"attendanceReports":[],"sessions":[],"schedules":[],"raports":[],"broadcastMessage":"","adminPassword":"admin123"}'::jsonb, NOW()) ON CONFLICT (id) DO NOTHING;

-- Aktifkan Realtime
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE rumah_belajar_db; EXCEPTION WHEN OTHERS THEN END $;
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tutor; EXCEPTION WHEN OTHERS THEN END $;
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE siswa; EXCEPTION WHEN OTHERS THEN END $;
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE program; EXCEPTION WHEN OTHERS THEN END $;
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE kas; EXCEPTION WHEN OTHERS THEN END $;
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE pembayaran; EXCEPTION WHEN OTHERS THEN END $;
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE transaksi_siswa; EXCEPTION WHEN OTHERS THEN END $;
DO $ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sesi; EXCEPTION WHEN OTHERS THEN END $;

`;
