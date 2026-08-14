import { createClient } from "@supabase/supabase-js";
import { Database, ensureDatabaseDefaults, mergeDatabases } from "./db";
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
        if (payload.new && (payload.new as any).data) {
          const remoteDb = ensureDatabaseDefaults((payload.new as any).data);
          // Directly apply authoritative server state without merging stale local items
          safeSetItem("rumah_belajar_db_v2", JSON.stringify(remoteDb));
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
 * Delete a specific record directly from Supabase SQL table
 */
export async function deleteRecordFromSupabase(table: string, id: string | string[]): Promise<boolean> {
  try {
    const ids = Array.isArray(id) ? id : [id];
    if (ids.length === 0) return true;
    
    const tableMap: Record<string, string> = {
      "siswa": "siswa",
      "student": "siswa",
      "students": "siswa",
      "tutor": "tutor",
      "tutors": "tutor",
      "program": "program",
      "programs": "program",
      "kas": "kas",
      "pembayaran": "pembayaran",
      "payment": "pembayaran",
      "payments": "pembayaran",
      "sesi": "sesi",
      "session": "sesi",
      "sessions": "sesi",
      "laporan_kehadiran": "laporan_kehadiran",
      "attendance": "laporan_kehadiran",
      "attendanceReports": "laporan_kehadiran",
      "transaksi_siswa": "transaksi_siswa",
      "transaksi_tutor": "transaksi_tutor",
      "slip_gaji": "slip_gaji",
      "slips": "slip_gaji"
    };
    
    const targetTable = tableMap[table] || table;
    const { error } = await supabase.from(targetTable).delete().in("id", ids);
    if (error) {
      console.warn(`Supabase delete from ${targetTable} note:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`Error deleting from ${table}:`, e);
    return false;
  }
}

// Background helper to push to relational tables without blocking
async function pushRelationalTables(dbToPush: Database) {
  // 1. Delete all deletedIds explicitly from all relational tables
  if (dbToPush.deletedIds && dbToPush.deletedIds.length > 0) {
    const ids = dbToPush.deletedIds;
    try {
      await Promise.allSettled([
        supabase.from("tutor").delete().in("id", ids),
        supabase.from("siswa").delete().in("id", ids),
        supabase.from("program").delete().in("id", ids),
        supabase.from("kas").delete().in("id", ids),
        supabase.from("pembayaran").delete().in("id", ids),
        supabase.from("laporan_kehadiran").delete().in("id", ids),
        supabase.from("transaksi_tutor").delete().in("id", ids),
        supabase.from("slip_gaji").delete().in("id", ids),
        supabase.from("transaksi_siswa").delete().in("id", ids),
        supabase.from("sesi").delete().in("id", ids)
      ]);
    } catch (e) {}
  }

  try {
    if (dbToPush.tutors && dbToPush.tutors.length > 0) {
      const tutorPayload = dbToPush.tutors.map(t => ({
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
    }
  } catch (e) {}

  try {
    if (dbToPush.students && dbToPush.students.length > 0) {
      const studentPayload = dbToPush.students.map(s => ({
        id: s.id,
        nama: s.nama,
        program_id: s.programId || "",
        status: s.status || "aktif",
        telepon_orang_tua: s.teleponOrangTua || "",
        alamat: s.alamat || "",
        tanggal_daftar: s.tanggalDaftar || new Date().toISOString().slice(0, 10)
      }));
      await supabase.from("siswa").upsert(studentPayload, { onConflict: "id" });
    }
  } catch (e) {}

  try {
    if (dbToPush.programs && dbToPush.programs.length > 0) {
      const payload = dbToPush.programs.map(p => ({
        id: p.id, nama: p.nama, jenjang: p.jenjang, mapel: p.mapel,
        durasi: p.durasi, tarif_siswa: p.tarifSiswa, honor_tutor: p.honorTutor,
        status: p.status || "aktif"
      }));
      await supabase.from("program").upsert(payload, { onConflict: "id" });
    }
  } catch (e) {}

  try {
    if (dbToPush.kas && dbToPush.kas.length > 0) {
      const payload = dbToPush.kas.map(k => ({
        id: k.id, tanggal: k.tanggal, tipe: k.tipe, keterangan: k.keterangan,
        jumlah: k.jumlah, saldo_berjalan: k.saldoBerjalan
      }));
      await supabase.from("kas").upsert(payload, { onConflict: "id" });
    }
  } catch (e) {}

  try {
    if (dbToPush.payments && dbToPush.payments.length > 0) {
      const payload = dbToPush.payments.map(p => ({
        id: p.id, tanggal: p.tanggal, siswa_id: p.siswaId, siswa_nama: p.siswaNama,
        jumlah: p.jumlah, metode: p.metode, tutor_id: p.tutorId || null,
        tutor_nama: p.tutorNama || null, status_titipan: p.statusTitipan,
        tanggal_serah: p.tanggalSerah || null
      }));
      await supabase.from("pembayaran").upsert(payload, { onConflict: "id" });
    }
  } catch (e) {}

  try {
    if (dbToPush.attendanceReports && dbToPush.attendanceReports.length > 0) {
      const payload = dbToPush.attendanceReports.map(a => ({
        id: a.id, tanggal: a.tanggal, tutor_id: a.tutorId, tutor_nama: a.tutorNama,
        siswa_id: a.siswaId, siswa_nama: a.siswaNama, program_id: a.programId,
        program_nama: a.programNama, foto_jurnal: a.fotoJurnal, keterangan: a.keterangan || null,
        status: a.status || "pending", catatan_admin: a.catatanAdmin || null,
        tanggal_proses: a.tanggalProses || null
      }));
      await supabase.from("laporan_kehadiran").upsert(payload, { onConflict: "id" });
    }
  } catch (e) {}

  try {
    if (dbToPush.tutorLedger && dbToPush.tutorLedger.length > 0) {
      const payload = dbToPush.tutorLedger.map(l => ({
        id: l.id, tanggal: l.tanggal, tutor_id: l.tutorId, tipe: l.tipe,
        keterangan: l.keterangan, jumlah: l.jumlah, saldo_berjalan: l.saldoBerjalan,
        referensi_id: l.referensiId || null
      }));
      await supabase.from("transaksi_tutor").upsert(payload, { onConflict: "id" });
    }
  } catch (e) {}

  try {
    if (dbToPush.slips && dbToPush.slips.length > 0) {
      const payload = dbToPush.slips.map(s => ({
        id: s.id, tanggal: s.tanggal, tutor_id: s.tutorId, tutor_nama: s.tutorNama,
        jumlah: s.jumlah, periode: s.periode, catatan: s.catatan || null,
        potongan: s.potongan || 0, keterangan_potongan: s.keteranganPotongan || null,
        total_honor: s.totalHonor || 0
      }));
      await supabase.from("slip_gaji").upsert(payload, { onConflict: "id" });
    }
  } catch (e) {}

  try {
    if (dbToPush.studentLedger && dbToPush.studentLedger.length > 0) {
      const payload = dbToPush.studentLedger.map(l => ({
        id: l.id, tanggal: l.tanggal, siswa_id: l.siswaId, tipe: l.tipe,
        keterangan: l.keterangan, jumlah: l.jumlah, saldo_berjalan: l.saldoBerjalan,
        referensi_id: l.referensiId || null
      }));
      await supabase.from("transaksi_siswa").upsert(payload, { onConflict: "id" });
    }
  } catch (e) {}

  try {
    if (dbToPush.sessions && dbToPush.sessions.length > 0) {
      const payload = dbToPush.sessions.map(s => ({
        id: s.id, tanggal: s.tanggal, siswa_id: s.siswaId, siswa_nama: s.siswaNama,
        tutor_id: s.tutorId, tutor_nama: s.tutorNama, program_id: s.programId,
        program_nama: s.programNama, tarif_siswa_snapshot: s.tarifSiswaSnapshot,
        honor_tutor_snapshot: s.honorTutorSnapshot, catatan: s.catatan || null
      }));
      await supabase.from("sesi").upsert(payload, { onConflict: "id" });
    }
  } catch (e) {}
}

/**
 * Pushes the database state to Supabase table `rumah_belajar_db`
 */
export async function pushToSupabase(db: Database, isForce = false): Promise<boolean> {
  if (!db) return false;

  // Prevent background sync spam if table is missing
  if (currentSyncState.status === "table_missing" && !isForce) {
    console.warn("Supabase push skipped automatically because the table 'rumah_belajar_db' does not exist yet.");
    return false;
  }

  updateSyncState({ status: "syncing", errorMessage: null });

  const timeoutPromise = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      console.warn("Supabase pushToSupabase timed out after 8000ms");
      updateSyncState({ status: "error", errorMessage: "Koneksi ke Supabase lambat. Data tetap tersimpan aman di perangkat ini." });
      resolve(false);
    }, 8000);
  });

  const pushTask = (async (): Promise<boolean> => {
    try {
      const finalDbToPush = ensureDatabaseDefaults(db);

      // Save Authoritative State directly to Supabase - DO NOT resurrect deleted items
      const { error } = await supabase
        .from("rumah_belajar_db")
        .upsert({ 
          id: "main_v1", 
          data: finalDbToPush, 
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

      // Backup snapshot in Supabase as secondary safety net
      supabase
        .from("rumah_belajar_db")
        .upsert({
          id: "backup_latest",
          data: finalDbToPush,
          updated_at: new Date().toISOString()
        })
        .then(() => {}, () => {});

      // Update local storage with the authoritative finalDbToPush
      safeSetItem("rumah_belajar_db_v2", JSON.stringify(finalDbToPush));

      // Synchronize relational tables (upsert active items + delete removed items)
      await pushRelationalTables(finalDbToPush);

      const syncTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB";
      safeSetItem("supabase_last_synced", syncTime);
      updateSyncState({ 
        status: "success", 
        lastSynced: syncTime,
        errorMessage: null 
      });
      return true;
    } catch (err: any) {
      console.warn("Supabase network warning:", err);
      updateSyncState({ status: "error", errorMessage: err.message || "Koneksi ke Supabase terputus." });
      return false;
    }
  })();

  return Promise.race([pushTask, timeoutPromise]);
}

/**
 * Fallback to recover data from relational tables if JSON is damaged or empty
 */
async function pullFromRelationalTables(): Promise<Database | null> {
  try {
    const [
      tutorRes, siswaRes, progRes, kasRes, payRes, 
      sesiRes, txSiswaRes, txTutorRes, slipRes, absenRes
    ] = await Promise.allSettled([
      supabase.from("tutor").select("*"),
      supabase.from("siswa").select("*"),
      supabase.from("program").select("*"),
      supabase.from("kas").select("*"),
      supabase.from("pembayaran").select("*"),
      supabase.from("sesi").select("*"),
      supabase.from("transaksi_siswa").select("*"),
      supabase.from("transaksi_tutor").select("*"),
      supabase.from("slip_gaji").select("*"),
      supabase.from("laporan_kehadiran").select("*")
    ]);

    const tutors = (tutorRes.status === "fulfilled" && tutorRes.value.data)
      ? tutorRes.value.data.map((t: any) => ({
          id: t.id,
          nama: t.nama,
          idLogin: t.id_login || t.idLogin,
          password: t.password || "123",
          status: t.status || "aktif",
          telepon: t.telepon || "",
          alamat: t.alamat || "",
          tanggalBergabung: t.tanggal_bergabung || ""
        }))
      : [];

    const students = (siswaRes.status === "fulfilled" && siswaRes.value.data)
      ? siswaRes.value.data.map((s: any) => ({
          id: s.id,
          nama: s.nama,
          programId: s.program_id || s.programId || "",
          status: s.status || "aktif",
          teleponOrangTua: s.telepon_orang_tua || s.teleponOrangTua || "",
          alamat: s.alamat || "",
          tanggalDaftar: s.tanggal_daftar || ""
        }))
      : [];

    const programs = (progRes.status === "fulfilled" && progRes.value.data)
      ? progRes.value.data.map((p: any) => ({
          id: p.id,
          nama: p.nama,
          jenjang: p.jenjang || "SD",
          mapel: p.mapel || "",
          durasi: Number(p.durasi || 90),
          tarifSiswa: Number(p.tarif_siswa || p.tarifSiswa || 0),
          honorTutor: Number(p.honor_tutor || p.honorTutor || 0),
          status: p.status || "aktif"
        }))
      : [];

    const kas = (kasRes.status === "fulfilled" && kasRes.value.data)
      ? kasRes.value.data.map((k: any) => ({
          id: k.id,
          tanggal: k.tanggal,
          tipe: k.tipe,
          keterangan: k.keterangan,
          jumlah: Number(k.jumlah),
          saldoBerjalan: Number(k.saldo_berjalan || k.saldoBerjalan || 0)
        }))
      : [];

    const payments = (payRes.status === "fulfilled" && payRes.value.data)
      ? payRes.value.data.map((p: any) => ({
          id: p.id,
          tanggal: p.tanggal,
          siswaId: p.siswa_id || p.siswaId,
          siswaNama: p.siswa_nama || p.siswaNama,
          jumlah: Number(p.jumlah),
          metode: p.metode,
          tutorId: p.tutor_id || p.tutorId || undefined,
          tutorNama: p.tutor_nama || p.tutorNama || undefined,
          statusTitipan: p.status_titipan || p.statusTitipan,
          tanggalSerah: p.tanggal_serah || p.tanggalSerah || undefined
        }))
      : [];

    const sessions = (sesiRes.status === "fulfilled" && sesiRes.value.data)
      ? sesiRes.value.data.map((s: any) => ({
          id: s.id,
          tanggal: s.tanggal,
          siswaId: s.siswa_id || s.siswaId,
          siswaNama: s.siswa_nama || s.siswaNama,
          tutorId: s.tutor_id || s.tutorId,
          tutorNama: s.tutor_nama || s.tutorNama,
          programId: s.program_id || s.programId,
          programNama: s.program_nama || s.programNama,
          tarifSiswaSnapshot: Number(s.tarif_siswa_snapshot || s.tarifSiswaSnapshot || 0),
          honorTutorSnapshot: Number(s.honor_tutor_snapshot || s.honorTutorSnapshot || 0),
          catatan: s.catatan || undefined
        }))
      : [];

    const studentLedger = (txSiswaRes.status === "fulfilled" && txSiswaRes.value.data)
      ? txSiswaRes.value.data.map((l: any) => ({
          id: l.id,
          tanggal: l.tanggal,
          siswaId: l.siswa_id || l.siswaId,
          tipe: l.tipe,
          keterangan: l.keterangan,
          jumlah: Number(l.jumlah),
          saldoBerjalan: Number(l.saldo_berjalan || l.saldoBerjalan || 0),
          referensiId: l.referensi_id || l.referensiId || undefined
        }))
      : [];

    const tutorLedger = (txTutorRes.status === "fulfilled" && txTutorRes.value.data)
      ? txTutorRes.value.data.map((l: any) => ({
          id: l.id,
          tanggal: l.tanggal,
          tutorId: l.tutor_id || l.tutorId,
          tipe: l.tipe,
          keterangan: l.keterangan,
          jumlah: Number(l.jumlah),
          saldoBerjalan: Number(l.saldo_berjalan || l.saldoBerjalan || 0),
          referensiId: l.referensi_id || l.referensiId || undefined
        }))
      : [];

    const slips = (slipRes.status === "fulfilled" && slipRes.value.data)
      ? slipRes.value.data.map((s: any) => ({
          id: s.id,
          tanggal: s.tanggal,
          tutorId: s.tutor_id || s.tutorId,
          tutorNama: s.tutor_nama || s.tutorNama,
          jumlah: Number(s.jumlah),
          periode: s.periode,
          catatan: s.catatan || undefined,
          potongan: Number(s.potongan || 0),
          keteranganPotongan: s.keterangan_potongan || s.keteranganPotongan || undefined,
          totalHonor: Number(s.total_honor || s.totalHonor || 0)
        }))
      : [];

    const attendanceReports = (absenRes.status === "fulfilled" && absenRes.value.data)
      ? absenRes.value.data.map((a: any) => ({
          id: a.id,
          tanggal: a.tanggal,
          tutorId: a.tutor_id || a.tutorId,
          tutorNama: a.tutor_nama || a.tutorNama,
          siswaId: a.siswa_id || a.siswaId,
          siswaNama: a.siswa_nama || a.siswaNama,
          programId: a.program_id || a.programId,
          programNama: a.program_nama || a.programNama,
          fotoJurnal: a.foto_jurnal || a.fotoJurnal,
          keterangan: a.keterangan || undefined,
          status: a.status || "pending",
          catatanAdmin: a.catatan_admin || a.catatanAdmin || undefined,
          tanggalProses: a.tanggal_proses || a.tanggalProses || undefined
        }))
      : [];

    const hasAnyRelationalData = tutors.length > 0 || students.length > 0 || programs.length > 0 || sessions.length > 0 || kas.length > 0;
    if (!hasAnyRelationalData) return null;

    return ensureDatabaseDefaults({
      programs,
      students,
      tutors,
      sessions,
      studentLedger,
      payments,
      tutorLedger,
      slips,
      kas,
      attendanceReports
    });
  } catch (e) {
    console.warn("Relational tables fallback check failed:", e);
    return null;
  }
}

/**
 * Pulls the database state from Supabase table `rumah_belajar_db` and merges relational tables (tutor, siswa)
 */
export async function pullFromSupabase(): Promise<Database | null> {
  updateSyncState({ status: "syncing", errorMessage: null });

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn("Supabase pullFromSupabase timed out after 8000ms");
      updateSyncState({ status: "error", errorMessage: "Koneksi ke Supabase lambat. Menggunakan data lokal perangkat." });
      resolve(null);
    }, 8000);
  });

  const fetchPromise = (async (): Promise<Database | null> => {
    try {
      // 1. Get current local state
      let localDb: Database | null = null;
      const localRaw = safeGetItem("rumah_belajar_db_v2");
      if (localRaw) {
        try {
          localDb = ensureDatabaseDefaults(JSON.parse(localRaw));
        } catch (e) {}
      }

      // 2. Fetch main JSON state from Supabase
      const { data, error } = await supabase
        .from("rumah_belajar_db")
        .select("data")
        .eq("id", "main_v1")
        .single();

      if (error) {
        console.warn("Supabase main_v1 pull warning:", error);
        const isMissingTable = error.message?.includes("relation") || 
          error.message?.includes("does not exist") || 
          error.message?.includes("schema cache") || 
          error.message?.includes("Could not find the table");

        if (isMissingTable) {
          updateSyncState({ status: "table_missing", errorMessage: "Tabel 'rumah_belajar_db' belum terbuat di Supabase." });
          return localDb;
        }

        // Try recovering from relational tables
        const recoveredRelational = await pullFromRelationalTables();
        if (recoveredRelational && !isEmptyDatabase(recoveredRelational)) {
          const merged = localDb ? mergeDatabases(localDb, recoveredRelational) : recoveredRelational;
          safeSetItem("rumah_belajar_db_v2", JSON.stringify(merged));
          supabase.from("rumah_belajar_db").upsert({ id: "main_v1", data: merged, updated_at: new Date().toISOString() }).then(() => {});
          updateSyncState({ 
            status: "success", 
            lastSynced: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB" 
          });
          return merged;
        }

        updateSyncState({ status: "idle", errorMessage: null });
        return localDb;
      }

      if (data && data.data) {
        const remoteDb = ensureDatabaseDefaults(data.data);
        // Supabase Cloud is authoritative for pulled data - do not resurrect deleted items with old local cache
        safeSetItem("rumah_belajar_db_v2", JSON.stringify(remoteDb));
        
        updateSyncState({ 
          status: "success", 
          lastSynced: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB" 
        });
        return remoteDb;
      }

      // If remote has no data, check relational tables
      const recovered = await pullFromRelationalTables();
      if (recovered && !isEmptyDatabase(recovered)) {
        const merged = localDb ? mergeDatabases(localDb, recovered) : recovered;
        safeSetItem("rumah_belajar_db_v2", JSON.stringify(merged));
        updateSyncState({ 
          status: "success", 
          lastSynced: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB" 
        });
        return merged;
      }

      return localDb;
    } catch (err: any) {
      console.warn("Supabase network warning during pull:", err);
      updateSyncState({ status: "error", errorMessage: err.message || "Koneksi ke Supabase terputus." });
      return null;
    }
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
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
