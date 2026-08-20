import { createClient } from "@supabase/supabase-js";

import type { Database } from "./db";

import {
  ensureDatabaseDefaults,
  mergeDatabases,
  recalculateAllLedgers
} from "./db";

/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const metaEnv =
  (import.meta as any)?.env || {};

export const SUPABASE_URL =
  String(
    metaEnv.VITE_SUPABASE_URL ||
      "https://pxtudqcutpjvdnqbhwgf.supabase.co"
  )
    .replace(
      /\/rest\/v1\/?$/,
      ""
    )
    .replace(/\/$/, "");

export const SUPABASE_ANON_KEY =
  String(
    metaEnv.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dHVkcWN1dHBqdmRucWJod2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDExMTMsImV4cCI6MjA5ODM3NzExM30.65l1hniJcmumYk3qvZZQ73d767mAE8_kvz9xZKv2COE"
  );

if (!SUPABASE_URL) {
  console.error(
    "[Supabase] URL tidak tersedia."
  );
}

if (!SUPABASE_ANON_KEY) {
  console.error(
    "[Supabase] Anon key tidak tersedia."
  );
}

/* =========================================================
   CLIENT
========================================================= */

export const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },

      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  );

/* =========================================================
   CONSTANT
========================================================= */

const TABLE_NAME =
  "rumah_belajar_db";

const DATABASE_ID =
  "main_v1";

const LAST_SYNC_KEY =
  "supabase_last_synced";

/**
 * Lock lokal agar dua proses sync
 * pada browser yang sama tidak
 * saling menimpa.
 */
let syncLock = false;

/* =========================================================
   SYNC STATE
========================================================= */

export interface SyncState {
  status:
    | "idle"
    | "syncing"
    | "success"
    | "error";

  lastSynced:
    | string
    | null;

  errorMessage:
    | string
    | null;
}

let syncState: SyncState = {
  status: "idle",
  lastSynced: null,
  errorMessage: null
};

const syncListeners =
  new Set<
    (state: SyncState) => void
  >();

function setSyncState(
  next: Partial<SyncState>
) {
  syncState = {
    ...syncState,
    ...next
  };

  syncListeners.forEach(
    listener => {
      try {
        listener({
          ...syncState
        });
      } catch (error) {
        console.error(
          "[Supabase] Sync listener error:",
          error
        );
      }
    }
  );
}

export function subscribeToSyncState(
  listener: (
    state: SyncState
  ) => void
): () => void {
  syncListeners.add(
    listener
  );

  listener({
    ...syncState
  });

  return () => {
    syncListeners.delete(
      listener
    );
  };
}

/* =========================================================
   LOCAL SYNC TIME
========================================================= */

function setLastSynced(
  value: string
) {
  try {
    localStorage.setItem(
      LAST_SYNC_KEY,
      value
    );
  } catch {}
}

function getLastSynced():
  | string
  | null {
  try {
    return localStorage.getItem(
      LAST_SYNC_KEY
    );
  } catch {
    return null;
  }
}

/* =========================================================
   SQL SCHEMA
========================================================= */

export const SUPABASE_SQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS public.rumah_belajar_db (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rumah_belajar_db
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
"rumah_belajar_public_select"
ON public.rumah_belajar_db;

DROP POLICY IF EXISTS
"rumah_belajar_public_insert"
ON public.rumah_belajar_db;

DROP POLICY IF EXISTS
"rumah_belajar_public_update"
ON public.rumah_belajar_db;

DROP POLICY IF EXISTS
"rumah_belajar_public_delete"
ON public.rumah_belajar_db;

CREATE POLICY
"rumah_belajar_public_select"
ON public.rumah_belajar_db
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY
"rumah_belajar_public_insert"
ON public.rumah_belajar_db
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY
"rumah_belajar_public_update"
ON public.rumah_belajar_db
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY
"rumah_belajar_public_delete"
ON public.rumah_belajar_db
FOR DELETE
TO anon, authenticated
USING (true);

ALTER TABLE public.rumah_belajar_db
REPLICA IDENTITY FULL;
`;

/* =========================================================
   READ CLOUD
========================================================= */

async function readCloudDatabase(): Promise<{
  db: Database | null;
  updatedAt: string | null;
}> {
  try {
    const {
      data,
      error
    } = await supabase
      .from(TABLE_NAME)
      .select(
        "data, updated_at"
      )
      .eq(
        "id",
        DATABASE_ID
      )
      .maybeSingle();

    if (error) {
      console.error(
        "[Supabase] Read cloud gagal:",
        error
      );

      return {
        db: null,
        updatedAt: null
      };
    }

    if (
      !data ||
      !data.data
    ) {
      return {
        db: null,
        updatedAt:
          data?.updated_at ||
          null
      };
    }

    return {
      db:
        ensureDatabaseDefaults(
          data.data
        ),
      updatedAt:
        data.updated_at ||
        null
    };
  } catch (error) {
    console.error(
      "[Supabase] Read cloud exception:",
      error
    );

    return {
      db: null,
      updatedAt: null
    };
  }
}

/* =========================================================
   PUSH LOCAL -> CLOUD
   =========================================================
   
   INI PERBAIKAN UTAMA.

   Sebelumnya:
   
   local -> upsert -> cloud

   Sekarang:

   local
      ↓
   ambil cloud TERBARU
      ↓
   merge(local, cloud)
      ↓
   deletedIds digabung
      ↓
   data terhapus disaring
      ↓
   hasil merge -> cloud
========================================================= */

export async function pushToSupabase(
  localDb: Database,
  force = false
): Promise<boolean> {
  if (syncLock) {
    console.log(
      "[Supabase] Sync sedang berjalan."
    );

    return false;
  }

  syncLock = true;

  try {
    setSyncState({
      status: "syncing",
      errorMessage: null
    });

    const local =
      ensureDatabaseDefaults(
        localDb
      );

    /**
     * Ambil cloud terbaru SEBELUM push.
     */
    const cloudResult =
      await readCloudDatabase();

    let merged: Database;

    if (cloudResult.db) {
      /**
       * INI KUNCI:
       *
       * local + cloud
       *
       * deletedIds keduanya
       * ikut digabung.
       */
      merged =
        mergeDatabases(
          local,
          cloudResult.db
        );
    } else {
      merged =
        recalculateAllLedgers(
          local
        );
    }

    /**
     * Pastikan deletedIds tetap ada.
     */
    merged.deletedIds =
      Array.from(
        new Set([
          ...(local.deletedIds ||
            []),
          ...(cloudResult.db
            ?.deletedIds || [])
        ])
      );

    /**
     * Merge ulang setelah
     * deletedIds dipastikan.
     */
    merged =
      mergeDatabases(
        merged,
        {
          ...merged,
          deletedIds:
            merged.deletedIds
        }
      );

    merged =
      recalculateAllLedgers(
        merged
      );

    const payload = {
      id: DATABASE_ID,

      data: merged,

      updated_at:
        new Date().toISOString()
    };

    const {
      error
    } = await supabase
      .from(TABLE_NAME)
      .upsert(
        payload,
        {
          onConflict:
            "id"
        }
      );

    if (error) {
      console.error(
        "[Supabase] Push gagal:",
        error
      );

      setSyncState({
        status: "error",
        errorMessage:
          error.message
      });

      return false;
    }

    /**
     * Simpan hasil MERGE ke localStorage.
     *
     * Ini penting.
     */
    try {
      localStorage.setItem(
        "rumah_belajar_db_v2",
        JSON.stringify(
          merged
        )
      );
    } catch {}

    const syncedAt =
      new Date().toISOString();

    setLastSynced(
      syncedAt
    );

    setSyncState({
      status: "success",
      lastSynced:
        syncedAt,
      errorMessage:
        null
    });

    console.log(
      "[Supabase] Push berhasil.",
      {
        deletedIds:
          merged.deletedIds
            ?.length || 0,
        students:
          merged.students
            ?.length || 0,
        tutors:
          merged.tutors
            ?.length || 0
      }
    );

    return true;
  } catch (error: any) {
    console.error(
      "[Supabase] Push exception:",
      error
    );

    setSyncState({
      status: "error",
      errorMessage:
        error?.message ||
        "Gagal mengunggah database."
    });

    return false;
  } finally {
    syncLock = false;
  }
}

/* =========================================================
   PULL CLOUD -> LOCAL
========================================================= */

export async function pullFromSupabase(): Promise<Database | null> {
  try {
    setSyncState({
      status: "syncing",
      errorMessage: null
    });

    const cloudResult =
      await readCloudDatabase();

    if (!cloudResult.db) {
      setSyncState({
        status: "idle",
        errorMessage:
          null
      });

      return null;
    }

    /**
     * Ambil database lokal.
     */
    let localDb: Database;

    try {
      const raw =
        localStorage.getItem(
          "rumah_belajar_db_v2"
        );

      localDb =
        raw
          ? ensureDatabaseDefaults(
              JSON.parse(raw)
            )
          : ensureDatabaseDefaults(
              null
            );
    } catch {
      localDb =
        ensureDatabaseDefaults(
          null
        );
    }

    /**
     * Jangan langsung:
     *
     * local = cloud
     *
     * tetapi MERGE.
     */
    const merged =
      mergeDatabases(
        localDb,
        cloudResult.db
      );

    const finalDb =
      recalculateAllLedgers(
        merged
      );

    /**
     * Simpan hasil merge.
     */
    try {
      localStorage.setItem(
        "rumah_belajar_db_v2",
        JSON.stringify(
          finalDb
        )
      );
    } catch {}

    const syncedAt =
      cloudResult.updatedAt ||
      new Date().toISOString();

    setLastSynced(
      syncedAt
    );

    setSyncState({
      status: "success",
      lastSynced:
        syncedAt,
      errorMessage:
        null
    });

    return finalDb;
  } catch (error: any) {
    console.error(
      "[Supabase] Pull exception:",
      error
    );

    setSyncState({
      status: "error",
      errorMessage:
        error?.message ||
        "Gagal mengambil database."
    });

    return null;
  }
}

/* =========================================================
   SYNC LOCAL + CLOUD
========================================================= */

export async function syncDatabase(
  localDb: Database
): Promise<Database | null> {
  if (syncLock) {
    return null;
  }

  try {
    setSyncState({
      status: "syncing",
      errorMessage:
        null
    });

    /**
     * 1. Ambil cloud.
     */
    const cloudResult =
      await readCloudDatabase();

    /**
     * 2. Merge.
     */
    const merged =
      cloudResult.db
        ? mergeDatabases(
            localDb,
            cloudResult.db
          )
        : ensureDatabaseDefaults(
            localDb
          );

    /**
     * 3. Recalculate ledger.
     */
    const finalDb =
      recalculateAllLedgers(
        merged
      );

    /**
     * 4. Simpan lokal.
     */
    try {
      localStorage.setItem(
        "rumah_belajar_db_v2",
        JSON.stringify(
          finalDb
        )
      );
    } catch {}

    /**
     * 5. Push hasil merge.
     */
    const pushed =
      await pushToSupabase(
        finalDb
      );

    if (!pushed) {
      return finalDb;
    }

    return finalDb;
  } catch (error) {
    console.error(
      "[Supabase] Sync gagal:",
      error
    );

    return null;
  }
}

/* =========================================================
   REALTIME
========================================================= */

let realtimeChannel:
  | ReturnType<
      typeof supabase.channel
    >
  | null = null;

export function subscribeToDatabaseChanges(
  callback: (
    db: Database
  ) => void
): () => void {
  if (realtimeChannel) {
    try {
      supabase.removeChannel(
        realtimeChannel
      );
    } catch {}

    realtimeChannel =
      null;
  }

  realtimeChannel =
    supabase
      .channel(
        "rumah-belajar-db-realtime"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE_NAME,
          filter:
            `id=eq.${DATABASE_ID}`
        },
        async payload => {
          try {
            const record =
              payload.new as {
                data?: Database;
                updated_at?: string;
              };

            if (
              !record?.data
            ) {
              return;
            }

            /**
             * Ambil local terbaru.
             */
            let localDb:
              | Database
              | null =
              null;

            try {
              const raw =
                localStorage.getItem(
                  "rumah_belajar_db_v2"
                );

              if (raw) {
                localDb =
                  ensureDatabaseDefaults(
                    JSON.parse(raw)
                  );
              }
            } catch {}

            /**
             * MERGE, bukan replace.
             *
             * Ini penting agar
             * data lokal dan deletedIds
             * tidak hilang.
             */
            const merged =
              mergeDatabases(
                localDb,
                ensureDatabaseDefaults(
                  record.data
                )
              );

            const finalDb =
              recalculateAllLedgers(
                merged
              );

            /**
             * Simpan hasil merge.
             */
            try {
              localStorage.setItem(
                "rumah_belajar_db_v2",
                JSON.stringify(
                  finalDb
                )
              );
            } catch {}

            const syncedAt =
              record.updated_at ||
              new Date().toISOString();

            setLastSynced(
              syncedAt
            );

            setSyncState({
              status:
                "success",
              lastSynced:
                syncedAt,
              errorMessage:
                null
            });

            /**
             * Kirim hasil ke UI.
             */
            callback(
              finalDb
            );
          } catch (error) {
            console.error(
              "[Supabase] Realtime processing error:",
              error
            );
          }
        }
      )
      .subscribe(
        status => {
          console.log(
            "[Supabase] Realtime status:",
            status
          );

          if (
            status ===
            "SUBSCRIBED"
          ) {
            console.log(
              "[Supabase] Realtime connected."
            );
          }

          if (
            status ===
              "CHANNEL_ERROR" ||
            status ===
              "TIMED_OUT" ||
            status ===
              "CLOSED"
          ) {
            console.warn(
              "[Supabase] Realtime:",
              status
            );
          }
        }
      );

  return () => {
    if (realtimeChannel) {
      try {
        supabase.removeChannel(
          realtimeChannel
        );
      } catch {}

      realtimeChannel =
        null;
    }
  };
}

/* =========================================================
   COMPATIBILITY ALIAS
========================================================= */

export const subscribeToSupabase =
  subscribeToDatabaseChanges;

/* =========================================================
   EMPTY DATABASE CHECK
========================================================= */

export function isEmptyDatabase(
  database: any
): boolean {
  if (!database) {
    return true;
  }

  const collections = [
    "tutors",
    "siswa",
    "students",
    "sessions",
    "payments",
    "attendanceReports",
    "studentLedger",
    "tutorLedger",
    "kas",
    "otherIncomes",
    "slips",
    "jadwal",
    "schedules",
    "programs"
  ];

  return collections.every(
    key => {
      const value =
        database[key];

      if (
        Array.isArray(value)
      ) {
        return (
          value.length === 0
        );
      }

      return (
        value === null ||
        value === undefined
      );
    }
  );
}

/* =========================================================
   EXPORT
========================================================= */

export {
  TABLE_NAME,
  DATABASE_ID,
  getLastSynced
};