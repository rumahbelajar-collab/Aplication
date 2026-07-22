import React, { useState, useEffect } from "react";
import { 
  Database as DatabaseIcon, 
  Play, 
  Copy, 
  Trash2, 
  RefreshCw, 
  FileCode, 
  CheckCircle, 
  AlertCircle, 
  Terminal, 
  Table, 
  Server, 
  Zap,
  Info,
  Layers,
  ArrowRight,
  Code2,
  List,
  Eraser,
  Download
} from "lucide-react";
import { supabase, SUPABASE_SQL_SCHEMA, getSyncState, SyncState, pushToSupabase, pullFromSupabase } from "../lib/supabase";
import { Database, saveDatabase, clearPrototypeData } from "../lib/db";

interface SupabaseSqlEditorProps {
  db: Database;
  onUpdateDb: (newDb: Database) => void;
}

// Preset SQL Queries
const PRESET_QUERIES = [
  {
    id: "schema_main",
    title: "1. Skema Utama rumah_belajar_db (JSONB Sync)",
    description: "Membuat tabel utama yang digunakan aplikasi untuk sinkronisasi otomatis",
    sql: SUPABASE_SQL_SCHEMA
  },
  {
    id: "create_table_siswa",
    title: "2. Tabel Relasional: Siswa (PostgreSQL)",
    description: "Membuat tabel terstruktur khusus data Siswa di Supabase",
    sql: `-- Tabel Relasional Siswa
CREATE TABLE IF NOT EXISTS public.siswa (
  id VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(250) NOT NULL,
  program_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'aktif',
  telepon_orang_tua VARCHAR(30),
  alamat TEXT,
  tanggal_daftar DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Matikan RLS agar dapat diakses tanpa token khusus
ALTER TABLE public.siswa DISABLE ROW LEVEL SECURITY;
`
  },
  {
    id: "create_table_tutor",
    title: "3. Tabel Relasional: Tutor (PostgreSQL)",
    description: "Membuat tabel terstruktur khusus data Tutor di Supabase",
    sql: `-- Tabel Relasional Tutor
CREATE TABLE IF NOT EXISTS public.tutor (
  id VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(250) NOT NULL,
  id_login VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'aktif',
  telepon VARCHAR(30),
  alamat TEXT,
  tanggal_bergabung DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Matikan RLS
ALTER TABLE public.tutor DISABLE ROW LEVEL SECURITY;
`
  },
  {
    id: "create_table_keuangan",
    title: "4. Tabel Relasional: Buku Kas Keuangan",
    description: "Membuat tabel terstruktur pencatatan transaksi kas lembaga",
    sql: `-- Tabel Kas Lembaga
CREATE TABLE IF NOT EXISTS public.kas_lembaga (
  id VARCHAR(30) PRIMARY KEY,
  tanggal DATE NOT NULL,
  tipe VARCHAR(10) CHECK (tipe IN ('masuk', 'keluar')),
  keterangan TEXT NOT NULL,
  jumlah NUMERIC(15, 2) NOT NULL DEFAULT 0,
  saldo_berjalan NUMERIC(15, 2) NOT NULL DEFAULT 0,
  referensi_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.kas_lembaga DISABLE ROW LEVEL SECURITY;
`
  },
  {
    id: "select_main_db",
    title: "5. Query SELECT: Cek Data Utama (JSONB)",
    description: "Melihat isi record tabel rumah_belajar_db yang tersimpan di Supabase",
    sql: `-- Mengambil data utama aplikasi
SELECT id, updated_at, jsonb_pretty(data) AS snapshot_data 
FROM rumah_belajar_db 
WHERE id = 'main_v1';`
  },
  {
    id: "disable_rls",
    title: "6. Matikan RLS (Row Level Security)",
    description: "Memastikan tabel dapat dibaca dan ditulis dari Public/Anon Key",
    sql: `-- Matikan RLS pada tabel rumah_belajar_db
ALTER TABLE rumah_belajar_db DISABLE ROW LEVEL SECURITY;`
  },
  {
    id: "truncate_db",
    title: "7. Reset / Truncate Data di Supabase",
    description: "Menghapus seluruh record snapshot dari Supabase",
    sql: `-- Perhatian: Perintah ini akan mengosongkan tabel rumah_belajar_db
TRUNCATE TABLE rumah_belajar_db;`
  }
];

export default function SupabaseSqlEditor({ db, onUpdateDb }: SupabaseSqlEditorProps) {
  const [sqlQuery, setSqlQuery] = useState<string>(PRESET_QUERIES[0].sql);
  const [selectedPreset, setSelectedPreset] = useState<string>("schema_main");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    status: "success" | "error" | "info";
    message: string;
    data?: any[];
    executionTimeMs?: number;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(getSyncState());
  const [tablesList, setTablesList] = useState<{ name: string; count: number | string }[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Check connection status & tables list on load
  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  const checkSupabaseConnection = async () => {
    setIsLoadingTables(true);
    try {
      // Test table `rumah_belajar_db`
      const { data, error, count } = await supabase
        .from("rumah_belajar_db")
        .select("id, updated_at", { count: "exact" })
        .limit(5);

      if (error) {
        setTablesList([
          { name: "rumah_belajar_db", count: "Tabel Belum Terbuat / RLS Aktif" }
        ]);
      } else {
        setTablesList([
          { name: "rumah_belajar_db", count: count ?? (data ? data.length : 0) }
        ]);
      }
    } catch (e: any) {
      console.warn("Connection test error:", e);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const item = PRESET_QUERIES.find(q => q.id === presetId);
    if (item) {
      setSqlQuery(item.sql);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteQuery = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    const startTime = performance.now();

    try {
      const trimmed = sqlQuery.trim();

      // Detect query type
      if (trimmed.toUpperCase().startsWith("SELECT")) {
        // Parse table name if simple
        let tableName = "rumah_belajar_db";
        const fromMatch = trimmed.match(/FROM\s+([a-zA-Z0-9_.]+)/i);
        if (fromMatch && fromMatch[1]) {
          tableName = fromMatch[1].replace("public.", "");
        }

        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .limit(100);

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        if (error) {
          setExecutionResult({
            status: "error",
            message: `Gagal mengeksekusi SELECT pada tabel '${tableName}': ${error.message} (Kode: ${error.code})`,
            executionTimeMs: duration
          });
        } else {
          setExecutionResult({
            status: "success",
            message: `Query berhasil dieksekusi. Ditemukan ${data?.length || 0} baris data pada tabel '${tableName}'.`,
            data: data || [],
            executionTimeMs: duration
          });
        }
      } else if (trimmed.toUpperCase().startsWith("TRUNCATE")) {
        let tableName = "rumah_belajar_db";
        const tableMatch = trimmed.match(/TRUNCATE\s+(?:TABLE\s+)?([a-zA-Z0-9_.]+)/i);
        if (tableMatch && tableMatch[1]) {
          tableName = tableMatch[1].replace("public.", "");
        }

        const { error } = await supabase
          .from(tableName)
          .delete()
          .neq("id", "___non_existent_id___");

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        if (error) {
          setExecutionResult({
            status: "error",
            message: `Perintah TRUNCATE pada tabel '${tableName}' melalui Supabase Client gagal: ${error.message}. Silakan jalankan script SQL ini langsung di Dashboard Supabase SQL Editor.`,
            executionTimeMs: duration
          });
        } else {
          setExecutionResult({
            status: "success",
            message: `Tabel '${tableName}' berhasil dikosongkan.`,
            executionTimeMs: duration
          });
          checkSupabaseConnection();
        }
      } else {
        // DDL or DML queries like CREATE TABLE, ALTER TABLE, DO $$
        // Direct DDL SQL via JS Client usually requires Postgres RPC or SQL Editor on Supabase Dashboard
        // We will attempt to invoke an 'exec_sql' RPC if configured, otherwise guide user clearly
        const { data, error } = await supabase.rpc("exec_sql", { query_string: trimmed });

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        if (error) {
          // RPC not configured or DDL restricted from REST
          setExecutionResult({
            status: "info",
            message: `Perintah DDL (seperti CREATE/ALTER TABLE) membutuhkan akses SQL Editor resmi Supabase Dashboard. Silakan klik tombol 'Salin SQL' dan tempel di Dashboard Supabase > SQL Editor Anda.`,
            executionTimeMs: duration
          });
        } else {
          setExecutionResult({
            status: "success",
            message: `Script SQL berhasil dieksekusi melalui Supabase RPC API!`,
            data: Array.isArray(data) ? data : undefined,
            executionTimeMs: duration
          });
          checkSupabaseConnection();
        }
      }
    } catch (err: any) {
      const endTime = performance.now();
      setExecutionResult({
        status: "error",
        message: err?.message || "Terjadi kesalahan koneksi saat mengirim query ke Supabase.",
        executionTimeMs: Math.round(endTime - startTime)
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearPrototypeDataLocal = () => {
    if (window.confirm("Apakah Anda yakin ingin mengosongkan SELURUH data prototipe/dummy dari aplikasi dan penyimpanan lokal? Tindakan ini tidak dapat dibatalkan.")) {
      const emptyDb = clearPrototypeData(db);
      onUpdateDb(emptyDb);
      alert("Seluruh data prototipe telah berhasil dibersihkan! Aplikasi kini dalam kondisi data kosong / bersih.");
    }
  };

  const handleForceSyncPush = async () => {
    setIsExecuting(true);
    const ok = await pushToSupabase(db, true);
    setIsExecuting(false);
    if (ok) {
      alert("Data berhasil diunggah dan disinkronkan ke Supabase!");
      checkSupabaseConnection();
    } else {
      alert("Gagal melakukan unggah data ke Supabase. Pastikan tabel 'rumah_belajar_db' sudah dibuat menggunakan SQL Editor.");
    }
  };

  const handleForceSyncPull = async () => {
    setIsExecuting(true);
    const remoteDb = await pullFromSupabase();
    setIsExecuting(false);
    if (remoteDb) {
      onUpdateDb(remoteDb);
      saveDatabase(remoteDb);
      alert("Berhasil mengunduh dan menerapkan data terbaru dari Supabase!");
    } else {
      alert("Tidak dapat mengambil data dari Supabase atau data di Supabase masih kosong.");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
            <Terminal size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Supabase SQL Console & Database Editor</h2>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
                PostgreSQL Live
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Jalankan query SQL, kelola skema tabel, dan bersihkan data prototipe langsung di Supabase Cloud.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleClearPrototypeDataLocal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95"
            title="Kosongkan seluruh data prototipe dummy"
          >
            <Trash2 size={14} />
            Kosongkan Data Prototipe
          </button>

          <button
            onClick={checkSupabaseConnection}
            disabled={isLoadingTables}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95"
          >
            <RefreshCw size={14} className={isLoadingTables ? "animate-spin" : ""} />
            Cek Koneksi
          </button>
        </div>
      </div>

      {/* STATUS & TABLE INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Supabase Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              tablesList.length > 0 && typeof tablesList[0]?.count === "number" 
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                : "bg-amber-50 text-amber-600 border border-amber-100"
            }`}>
              <Server size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Database Cloud</p>
              <h4 className="text-xs font-black text-slate-800 mt-0.5 flex items-center gap-1.5">
                {tablesList.length > 0 && typeof tablesList[0]?.count === "number" ? (
                  <>
                    <CheckCircle size={14} className="text-emerald-500" />
                    Terhubung (Online)
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-amber-500" />
                    Tabel Belum Terbuat
                  </>
                )}
              </h4>
            </div>
          </div>
          <button
            onClick={handleForceSyncPush}
            disabled={isExecuting}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10.5px] font-bold border border-emerald-200 transition-all cursor-pointer"
          >
            Unggah DB
          </button>
        </div>

        {/* Local vs Cloud Sync */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center">
              <DatabaseIcon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Record Snapshot Lokal</p>
              <h4 className="text-xs font-black text-slate-800 mt-0.5">
                {db.students.length} Siswa | {db.tutors.length} Tutor | {db.sessions.length} Sesi
              </h4>
            </div>
          </div>
          <button
            onClick={handleForceSyncPull}
            disabled={isExecuting}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10.5px] font-bold border border-indigo-200 transition-all cursor-pointer"
          >
            Tarik DB
          </button>
        </div>

        {/* Database Engine Info */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engine Supabase</p>
              <h4 className="text-xs font-black text-slate-800 mt-0.5">PostgreSQL 15.1 + Realtime</h4>
            </div>
          </div>
          <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
            pxtudqcut...
          </span>
        </div>

      </div>

      {/* MAIN SQL EDITOR SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: PRESET SELECTOR & HELP */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Code2 size={16} className="text-emerald-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Template Query SQL</h3>
            </div>

            <div className="space-y-2">
              {PRESET_QUERIES.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer border ${
                    selectedPreset === preset.id
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-xs font-bold"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/60 text-slate-700"
                  }`}
                >
                  <p className="text-xs font-bold leading-snug">{preset.title}</p>
                  <p className="text-[10px] text-slate-400 font-normal mt-1 line-clamp-2">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Guidelines info card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-300 p-4 rounded-3xl border border-slate-700 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400">
              <Info size={16} />
              <h4 className="text-xs font-extrabold uppercase tracking-wider">Panduan SQL Editor</h4>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300 font-medium">
              Aplikasi ini terhubung langsung ke Supabase API. Anda dapat mengeksekusi perintah <span className="text-emerald-400 font-mono font-bold">SELECT</span> untuk melihat data, atau menyalin script DDL (<span className="text-sky-300 font-mono font-bold">CREATE TABLE</span>) untuk di-run di SQL Editor Supabase.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: EDITOR & CONSOLE RESULTS */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* EDITOR CARD */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            
            {/* Editor Toolbar */}
            <div className="bg-slate-950 px-5 py-3 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 font-semibold ml-2">query_console.sql</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSqlQuery("")}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <Eraser size={13} />
                  Bersihkan
                </button>

                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <Copy size={13} />
                  {copied ? "Tersalin!" : "Salin SQL"}
                </button>

                <button
                  onClick={handleExecuteQuery}
                  disabled={isExecuting || !sqlQuery.trim()}
                  className="flex items-center gap-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-1.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Play size={14} className={isExecuting ? "animate-spin" : "fill-white"} />
                  {isExecuting ? "Mengeksekusi..." : "Jalankan Query"}
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="p-4 relative bg-slate-900">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="Tuliskan query SQL di sini (misal: SELECT * FROM rumah_belajar_db;)..."
                rows={12}
                className="w-full bg-transparent font-mono text-xs text-emerald-400 placeholder-slate-600 focus:outline-none resize-none leading-relaxed tracking-wide"
                spellCheck={false}
              />
            </div>

            {/* Bottom info banner */}
            <div className="bg-slate-950/80 px-5 py-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
              <span>Shift + Enter untuk baris baru</span>
              <span>Lines: {sqlQuery.split("\n").length} | Chars: {sqlQuery.length}</span>
            </div>

          </div>

          {/* EXECUTION RESULTS PANEL */}
          {executionResult && (
            <div className={`p-5 rounded-3xl border shadow-sm animate-slide-up space-y-3 ${
              executionResult.status === "success" 
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-900"
                : executionResult.status === "error"
                ? "bg-rose-950/20 border-rose-500/30 text-rose-900"
                : "bg-sky-950/20 border-sky-500/30 text-sky-900"
            }`}>
              
              <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
                <div className="flex items-center gap-2">
                  {executionResult.status === "success" ? (
                    <CheckCircle className="text-emerald-500" size={18} />
                  ) : executionResult.status === "error" ? (
                    <AlertCircle className="text-rose-500" size={18} />
                  ) : (
                    <Info className="text-sky-500" size={18} />
                  )}
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Hasil Eksekusi Query
                  </h4>
                </div>

                {executionResult.executionTimeMs !== undefined && (
                  <span className="text-[10px] font-mono font-bold bg-white/80 px-2.5 py-1 rounded-full text-slate-600 border border-slate-200">
                    Waktu: {executionResult.executionTimeMs} ms
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold leading-relaxed text-slate-700">
                {executionResult.message}
              </p>

              {/* DATA TABLE RESULT VIEW */}
              {executionResult.data && executionResult.data.length > 0 && (
                <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Preview Data Returned ({executionResult.data.length} items)</span>
                    <button 
                      onClick={() => {
                        const jsonStr = JSON.stringify(executionResult.data, null, 2);
                        const blob = new Blob([jsonStr], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "query_result.json";
                        a.click();
                      }}
                      className="text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download size={12} />
                      Export JSON
                    </button>
                  </div>

                  <div className="max-h-80 overflow-auto p-3">
                    <pre className="text-[11px] font-mono text-slate-800 whitespace-pre-wrap break-all leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {JSON.stringify(executionResult.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
