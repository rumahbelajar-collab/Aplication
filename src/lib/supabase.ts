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
      } catch (e) {
        // Ignored if table 'siswa' does not exist
      }
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

    // Intelligently merge SQL records from 'tutor' relational table if available
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
    } catch (e) {
      // Ignored if table 'siswa' doesn't exist
    }

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

ALTER TABLE rumah_belajar_db DISABLE ROW LEVEL SECURITY;
ALTER TABLE rumah_belajar_db REPLICA IDENTITY FULL;

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

ALTER TABLE tutor DISABLE ROW LEVEL SECURITY;
ALTER TABLE tutor REPLICA IDENTITY FULL;

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

ALTER TABLE siswa DISABLE ROW LEVEL SECURITY;
ALTER TABLE siswa REPLICA IDENTITY FULL;

-- 4. Inisialisasi Record Utama 'main_v1' jika belum ada
INSERT INTO rumah_belajar_db (id, data, updated_at)
VALUES (
  'main_v1',
  '{"programs":[],"students":[],"tutors":[],"kas":[],"studentLedger":[],"tutorLedger":[],"payments":[],"slips":[],"attendanceReports":[],"sessions":[],"schedules":[],"raports":[],"broadcastMessage":"","adminPassword":"admin123"}'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 5. Aktifkan Realtime Replication untuk semua tabel di Supabase
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE rumah_belajar_db;
EXCEPTION WHEN OTHERS THEN END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tutor;
EXCEPTION WHEN OTHERS THEN END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE siswa;
EXCEPTION WHEN OTHERS THEN END $$;
`;
