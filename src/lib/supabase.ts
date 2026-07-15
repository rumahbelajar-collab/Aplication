import { createClient } from "@supabase/supabase-js";
import { Database } from "./db";

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
 * Pulls the database state from Supabase table `rumah_belajar_db`
 */
export async function pullFromSupabase(): Promise<Database | null> {
  updateSyncState({ status: "syncing", errorMessage: null });
  
  try {
    const { data, error } = await supabase
      .from("rumah_belajar_db")
      .select("data")
      .eq("id", "main_v1")
      .single();

    if (error) {
      console.warn("Supabase pull warning:", error);
      if (error.code === "PGRST116") {
        // Row not found, but table exists! This is fine, we will push our current data.
        updateSyncState({ status: "idle", errorMessage: "Data di Supabase masih kosong." });
        return null;
      }
      
      const isMissingTable = error.message?.includes("relation") || 
        error.message?.includes("does not exist") || 
        error.message?.includes("schema cache") || 
        error.message?.includes("Could not find the table");
      if (isMissingTable) {
        updateSyncState({ status: "table_missing", errorMessage: "Tabel 'rumah_belajar_db' belum terbuat di Supabase." });
      } else {
        updateSyncState({ status: "error", errorMessage: error.message || "Gagal mengambil data dari Supabase." });
      }
      return null;
    }

    if (data && data.data) {
      updateSyncState({ 
        status: "success", 
        lastSynced: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB" 
      });
      return data.data as Database;
    }
    
    updateSyncState({ status: "idle" });
    return null;
  } catch (err: any) {
    console.warn("Supabase network warning during pull:", err);
    updateSyncState({ status: "error", errorMessage: err.message || "Koneksi ke Supabase terputus." });
    return null;
  }
}

// SQL Schema code to share with user
export const SUPABASE_SQL_SCHEMA = `-- Jalankan perintah SQL ini di "SQL Editor" di Dashboard Supabase Anda:

CREATE TABLE IF NOT EXISTS rumah_belajar_db (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Matikan RLS (Row Level Security) agar Client-Side Anon Key bisa langsung membaca & menulis data
ALTER TABLE rumah_belajar_db DISABLE ROW LEVEL SECURITY;

-- Aktifkan Fitur Sinkronisasi Real-Time untuk tabel ini di Supabase
ALTER TABLE rumah_belajar_db REPLICA IDENTITY FULL;

-- Tambahkan tabel ke publikasi realtime Supabase jika belum terdaftar
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE rumah_belajar_db;
EXCEPTION
  WHEN OTHERS THEN
    -- Abaikan jika tabel sudah terdaftar dalam publikasi realtime
END $$;
`;
