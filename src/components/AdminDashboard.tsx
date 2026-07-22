import React, { useState, useEffect } from "react";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins, 
  Clock, 
  PlusCircle, 
  DollarSign, 
  Receipt,
  UserCheck,
  Megaphone,
  Cloud,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Lock,
  Download,
  Upload,
  FileCode,
  Calendar,
  Search,
  CalendarCheck,
  Eye,
  EyeOff,
  Send
} from "lucide-react";
import { 
  Database, 
  formatRupiah, 
  getKasLembagaBalance,
  updateBroadcastMessageTransaction,
  safeGetItem,
  safeSetItem,
  getTodayDateString,
  formatBulanTahun,
  formatTanggalIndo
} from "../lib/db";
import {
  pullFromSupabase,
  pushToSupabase,
  subscribeToSyncState,
  SyncState,
  SUPABASE_SQL_SCHEMA
} from "../lib/supabase";

// Syntax highlighting for SQL strings (e.g. Supabase Schema Instructions)
function highlightSql(sql: string): React.ReactNode[] {
  const lines = sql.split("\n");
  return lines.map((line, lineIdx) => {
    if (line.trim().startsWith("--")) {
      return (
        <div key={lineIdx} className="text-slate-500 italic">
          {line}
        </div>
      );
    }
    
    // Keywords to highlight in blue/teal
    const keywords = /\b(CREATE TABLE|IF NOT EXISTS|PRIMARY KEY|TEXT|JSONB|NOT NULL|TIMESTAMP WITH TIME ZONE|DEFAULT|TIMEZONE|ALTER TABLE|DISABLE ROW LEVEL SECURITY|ROW LEVEL SECURITY|DISABLE)\b/gi;
    
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];
    let match;
    
    keywords.lastIndex = 0;
    while ((match = keywords.exec(line)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];
      
      if (matchIndex > lastIndex) {
        elements.push(line.substring(lastIndex, matchIndex));
      }
      
      let cls = "text-sky-400 font-bold";
      if (/\b(TEXT|JSONB|TIMESTAMP WITH TIME ZONE)\b/i.test(matchText)) {
        cls = "text-teal-400 font-semibold";
      } else if (/\b(PRIMARY KEY|NOT NULL|DEFAULT)\b/i.test(matchText)) {
        cls = "text-amber-400 font-semibold";
      }
      
      elements.push(
        <span key={matchIndex} className={cls}>
          {matchText}
        </span>
      );
      
      lastIndex = keywords.lastIndex;
    }
    
    if (lastIndex < line.length) {
      elements.push(line.substring(lastIndex));
    }
    
    return (
      <div key={lineIdx} className="min-h-[14px]">
        {elements}
      </div>
    );
  });
}

// Syntax highlighting for JSON objects (pretty-printed JSON database viewer)
function highlightJson(jsonObj: any): React.ReactNode[] {
  const jsonString = JSON.stringify(jsonObj, null, 2);
  const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
  
  const lines = jsonString.split("\n");
  return lines.map((line, lineIdx) => {
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];
    let match;
    
    tokenRegex.lastIndex = 0;
    while ((match = tokenRegex.exec(line)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];
      
      if (matchIndex > lastIndex) {
        elements.push(line.substring(lastIndex, matchIndex));
      }
      
      let cls = "text-slate-300";
      if (matchText.startsWith('"')) {
        if (matchText.endsWith(":")) {
          cls = "text-rose-400 font-semibold";
        } else {
          cls = "text-emerald-400";
        }
      } else if (/true|false/.test(matchText)) {
        cls = "text-amber-400 font-bold";
      } else if (/null/.test(matchText)) {
        cls = "text-purple-400 italic font-medium";
      } else {
        cls = "text-indigo-400 font-semibold";
      }
      
      const cleanText = matchText.endsWith(":") ? matchText.slice(0, -1) : matchText;
      elements.push(
        <span key={matchIndex} className={cls}>
          {cleanText}
        </span>
      );
      if (matchText.endsWith(":")) {
        elements.push(<span key={matchIndex + "-colon"} className="text-slate-400">:</span>);
      }
      
      lastIndex = tokenRegex.lastIndex;
    }
    
    if (lastIndex < line.length) {
      elements.push(line.substring(lastIndex));
    }
    
    return (
      <div key={lineIdx} className="min-h-[14px]">
        {elements}
      </div>
    );
  });
}

interface AdminDashboardProps {
  db: Database;
  onNavigateToTab: (tab: string, subTab?: string) => void;
  onOpenQuickAction: (action: "session" | "payment" | "handover" | "honor" | "absensi") => void;
  onUpdateDb?: (newDb: Database) => void;
}

export default function AdminDashboard({
  db,
  onNavigateToTab,
  onOpenQuickAction,
  onUpdateDb
}: AdminDashboardProps) {
  const [broadcastInput, setBroadcastInput] = useState(db.broadcastMessage || "");
  const [isBroadcastSaving, setIsBroadcastSaving] = useState(false);

  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    lastSynced: safeGetItem("supabase_last_synced"),
    errorMessage: null
  });
  const [isSqlExpanded, setIsSqlExpanded] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [newAdminPass, setNewAdminPass] = useState("");
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [scheduleDayFilter, setScheduleDayFilter] = useState("Semua");
  const [showAktivitasTerbaru, setShowAktivitasTerbaru] = useState(false);
  const [showJadwalAkumulatif, setShowJadwalAkumulatif] = useState(false);

  const handleChangeAdminPassword = () => {
    if (!newAdminPass.trim()) {
      alert("Sandi baru tidak boleh kosong!");
      return;
    }
    if (newAdminPass.length < 4) {
      alert("Sandi baru minimal harus 4 karakter!");
      return;
    }
    
    if (!window.confirm("Apakah Anda yakin ingin mengubah kata sandi Administrator? Perubahan ini akan segera disinkronkan ke Supabase Cloud.")) {
      return;
    }

    const nextDb = {
      ...db,
      adminPassword: newAdminPass.trim()
    };
    if (onUpdateDb) {
      onUpdateDb(nextDb);
      alert("Sandi Admin berhasil diubah dan disinkronkan ke cloud Supabase secara real-time!");
      setNewAdminPass("");
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToSyncState(state => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleForceUpload = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    const success = await pushToSupabase(db, true);
    setIsActionLoading(false);
    if (success) {
      alert("Berhasil mengunggah basis data lokal ke cloud Supabase secara paksa!");
    } else {
      alert("Gagal mengunggah basis data ke cloud Supabase. Mohon periksa koneksi atau setup tabel Anda.");
    }
  };

  const handleForceDownload = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    const cloudDb = await pullFromSupabase();
    setIsActionLoading(false);
    if (cloudDb) {
      if (onUpdateDb) {
        onUpdateDb(cloudDb);
        safeSetItem("rumah_belajar_db_v1", JSON.stringify(cloudDb));
        alert("Berhasil mengambil dan memperbarui basis data lokal dengan data cloud Supabase terbaru!");
      }
    } else {
      alert("Gagal mengunduh basis data dari cloud Supabase, atau data cloud masih kosong.");
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(db, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `RUMAH_BELAJAR_DB_BACKUP_${getTodayDateString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (typeof json !== "object" || json === null) {
          throw new Error("Format JSON tidak valid!");
        }
        if (!json.students || !json.tutors || !json.sessions || !json.payments) {
          throw new Error("Struktur database tidak valid! File harus berisi students, tutors, sessions, dan payments.");
        }

        if (!window.confirm("⚠️ PERINGATAN: Mengimpor file JSON ini akan MENIMPA semua data lokal dan cloud Anda saat ini. Apakah Anda yakin ingin melanjutkan?")) {
          return;
        }

        if (onUpdateDb) {
          onUpdateDb(json);
          safeSetItem("rumah_belajar_db_v1", JSON.stringify(json));
          
          setIsActionLoading(true);
          const success = await pushToSupabase(json, true);
          setIsActionLoading(false);
          
          if (success) {
            alert("Database berhasil dipulihkan dari file cadangan JSON dan disinkronkan ke Supabase Cloud!");
          } else {
            alert("Database berhasil dipulihkan di penyimpanan lokal, namun gagal menyinkronkan ke cloud. Periksa koneksi Anda.");
          }
        }
      } catch (err: any) {
        alert(`Gagal mengimpor file: ${err.message || "Pastikan file tersebut berformat JSON basis data yang valid."}`);
      }
    };
    reader.readAsText(file);
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateDb) return;
    setIsBroadcastSaving(true);
    
    setTimeout(() => {
      const nextDb = updateBroadcastMessageTransaction(db, broadcastInput.trim());
      onUpdateDb(nextDb);
      setIsBroadcastSaving(false);
      alert("Pesan siaran (broadcast) berhasil diperbarui secara real-time!");
    }, 400);
  };

  // Calculations
  const activeStudents = db.students.filter(s => s.status === "aktif").length;
  const activeTutors = db.tutors.filter(t => t.status === "aktif").length;
  
  // Sesi Hari Ini
  const todayStr = getTodayDateString();
  const sessionsToday = db.sessions.filter(s => s.tanggal === todayStr);

  // Balances
  const kasBalance = getKasLembagaBalance(db);

  // Financial Stats (Dynamic Current Month)
  const base = new Date(todayStr);
  const year = base.getFullYear();
  const month = base.getMonth();
  const pad = (num: number) => String(num).padStart(2, "0");
  const monthStart = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${pad(month + 1)}-${pad(lastDay)}`;

  const monthlyOtherIncomes = (db.otherIncomes || [])
    .filter(item => item.tanggal >= monthStart && item.tanggal <= monthEnd)
    .reduce((sum, item) => sum + item.nominal, 0);

  const monthlyRevenue = db.studentLedger
    .filter(tx => tx.tipe === "debit" && tx.tanggal >= monthStart && tx.tanggal <= monthEnd)
    .reduce((sum, tx) => sum + tx.jumlah, 0) + monthlyOtherIncomes;

  const monthlyTutorHonors = db.tutorLedger
    .filter(tx => tx.tipe === "kredit" && tx.tanggal >= monthStart && tx.tanggal <= monthEnd)
    .reduce((sum, tx) => sum + tx.jumlah, 0);

  // Custom expenses from Kas
  const monthlyGeneralExpenses = db.kas
    .filter(k => k.tipe === "keluar" && (!k.referensiId || !k.referensiId.startsWith("SG")) && k.tanggal >= monthStart && k.tanggal <= monthEnd)
    .reduce((sum, k) => sum + k.jumlah, 0);

  const monthlyExpense = monthlyTutorHonors + monthlyGeneralExpenses;
  const estimatedProfit = monthlyRevenue - monthlyExpense;

  // Global liabilities / assets
  const totalStudentBilled = db.studentLedger
    .filter(l => l.tipe === "debit")
    .reduce((sum, l) => sum + l.jumlah, 0);
  const totalStudentPaid = db.studentLedger
    .filter(l => l.tipe === "kredit")
    .reduce((sum, l) => sum + l.jumlah, 0);
  const totalOutstandingPiutang = totalStudentBilled - totalStudentPaid;

  const totalTutorEarned = db.tutorLedger
    .filter(l => l.tipe === "kredit")
    .reduce((sum, l) => sum + l.jumlah, 0);
  const totalTutorPaid = db.tutorLedger
    .filter(l => l.tipe === "debit")
    .reduce((sum, l) => sum + l.jumlah, 0);
  const totalOutstandingUtangHonor = totalTutorEarned - totalTutorPaid;

  const totalTitipanPending = db.payments
    .filter(p => p.metode === "tutor" && p.statusTitipan === "pending")
    .reduce((sum, p) => sum + p.jumlah, 0);

  return (
    <div id="admin-dashboard-container" className="flex flex-col space-y-6">
      {/* 1. BLUE HEADER HERO (E-Learning Dashboard Style) */}
      <div id="dashboard-hero" className="bg-gradient-to-br from-blue-500 to-brand-500 text-white p-6 rounded-b-[32px] shadow-lg mb-6 relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute top-[-30px] right-[-30px] w-36 h-36 bg-white/5 rounded-full" />
        <div className="absolute bottom-[-50px] left-[-20px] w-48 h-48 bg-white/5 rounded-full" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2.5">
            <img src="public2.png" alt="logo" className="w-20 h-20 object-contain" referrerPolicy="no-referrer" />    
            </div>
            <div>
              <p className="text-[10px] text-brand-100 uppercase tracking-wider font-semibold">Sistem Informasi</p>
              <h2 className="text-sm font-bold tracking-tight font-display">RUMAH BELAJAR</h2>
            </div>
          </div>
          <div className="bg-white/15 px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider">Admin Mode</span>
          </div>
        </div>

        {/* Big Balance Card */}
        <div className="mt-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-inner">
          <p className="text-[10.5px] text-brand-100 font-medium uppercase tracking-wider">Saldo Kas Lembaga</p>
          <div className="flex items-baseline justify-between mt-1">
            <h1 className="text-2xl font-black font-mono tracking-tight">{formatRupiah(kasBalance)}</h1>
            <button 
              id="view-kas-btn"
              onClick={() => onNavigateToTab("keuangan", "kas")}
              className="text-[10.5px] font-bold text-white bg-white/15 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/25 active:scale-95 transition-all cursor-pointer"
            >
              Buka Buku Kas
            </button>
          </div>
        </div>
      </div>

      <div className="px-2 md:px-0 pb-4 space-y-6">

        {/* 3. OPERATIONAL STATS ROWS (CARDS) */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div 
            id="stat-siswa-card"
            onClick={() => onNavigateToTab("operasional", "siswa")}
            className="bg-SLATE-50 p-3 rounded-2xl flex flex-col gap-5 cursor-pointer hover:border-brand-300 transition-all active:scale-95"
          >
            {/* Baris Atas: Tulisan */}
            <p className="text-[9.5px] text-brand-400 font-semibold uppercase tracking-wider text-left">
              Siswa Aktif
            </p>

            {/* Baris Bawah: Ikon (Kecil) sejajar dengan Angka (Besar) di kanannya */}
            <div className="flex items-center gap-3 mt-0.5">
              <div className="w-6 h-6 bg-blue-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
                <Users size={12} />
              </div>
              <p className="text-5xl font-extrabold text-brand-600 leading-none">
                {activeStudents}
              </p>
            </div>
          </div>
          {/* --- Card Tutor Aktif --- */}
          <div 
            id="stat-tutor-card"
            onClick={() => onNavigateToTab("operasional", "tutor")}
            className="bg-slate-50 p-3 rounded-2xl flex flex-col gap-5 cursor-pointer hover:border-brand-300 transition-all active:scale-95"
          >
            <p className="text-[9.5px] text-brand-400 font-semibold uppercase tracking-wider text-left">
              Tutor Aktif
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="w-6 h-6 bg-blue-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
                <UserCheck size={12} />
              </div>
              <p className="text-5xl font-extrabold text-brand-500 leading-none">
                {activeTutors}
              </p>
            </div>
          </div>

          {/* --- Card Sesi Hari Ini --- */}
          <div 
            id="stat-sesi-card"
            onClick={() => onNavigateToTab("keuangan", "rekening")}
            className="bg-slate-50 p-3 rounded-5xl flex flex-col gap-5 cursor-pointer hover:border-brand-300 transition-all active:scale-95"
          >
            <p className="text-[9.5px] text-amber-400 font-semibold uppercase tracking-wider text-left">
              Sesi Hari Ini
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="w-6 h-6 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                <BookOpen size={12} />
              </div>
              <p className="text-5xl font-extrabold text-amber-500 leading-none">
                {sessionsToday.length}
              </p>
            </div>
          </div>
        </div>

          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 ml-5">Tindakan Cepat</h3>

        {/* 2. QUICK ACTIONS ROW (GRID OF 5 - DANA Style icon buttons) */}
          <div id="quick-actions-card" className="bg-slate-50 p-4 mb-5">
            {/* Menggunakan grid 4 kolom dengan jarak antar kotak (gap-3) */}
            <div className="grid grid-cols-4 gap-2">
              
              {/* 1. Tombol Sesi Baru */}
              <button
                id="action-btn-session"
                onClick={() => onOpenQuickAction("session")}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-lg shadow-xs group cursor-pointer transition-all active:scale-95 min-h-[90px]"
              >
                <div className="w-11 h-11 bg-brand-50 group-hover:bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100/50 transition-all">
                  <PlusCircle size={20} />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold leading-tight mt-1.5 text-center">Sesi Baru</span>
              </button>

              {/* 2. Tombol Terima Bayar */}
              <button
                id="action-btn-payment"
                onClick={() => onOpenQuickAction("payment")}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-lg shadow-xs group cursor-pointer transition-all active:scale-95 min-h-[90px]"
              >
                <div className="w-11 h-11 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100/50 transition-all">
                  <Coins size={20} />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold leading-tight mt-1.5 text-center">Terima Bayar</span>
              </button>

              {/* 3. Tombol Setor Titipan */}
              <button
                id="action-btn-handover"
                onClick={() => onOpenQuickAction("handover")}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-lg shadow-xs group cursor-pointer transition-all active:scale-95 min-h-[90px]"
              >
                <div className="w-11 h-11 bg-amber-50 group-hover:bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100/50 transition-all">
                  <Wallet size={20} />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold leading-tight mt-1.5 text-center">Setor Titipan</span>
              </button>

              {/* 4. Tombol Bayar Honor */}
              <button
                id="action-btn-honor"
                onClick={() => onOpenQuickAction("honor")}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-lg shadow-xs group cursor-pointer transition-all active:scale-95 min-h-[90px]"
              >
                <div className="w-11 h-11 bg-purple-50 group-hover:bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100/50 transition-all">
                  <Receipt size={20} />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold leading-tight mt-1.5 text-center">Bayar Honor</span>
              </button>

              {/* 5. Tombol Absensi */}
              <button
                id="action-btn-absensi"
                onClick={() => onOpenQuickAction("absensi")}
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-lg shadow-xs group cursor-pointer transition-all active:scale-95 min-h-[90px]"
              >
                <div className="w-11 h-11 bg-brand-50 group-hover:bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100/50 transition-all">
                  <CalendarCheck size={20} />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold leading-tight mt-1.5 text-center">Absensi</span>
              </button>

              {/* 6. Tombol Drive */}
              <a 
                href="https://drive.google.com/drive/folders/1BLr6x5u5VYm97RowTLKoiffPKiQlqhCk?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-lg shadow-xs group cursor-pointer transition-all active:scale-95 min-h-[90px]"
              >
                <div className="w-11 h-11 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100/50 transition-all">
                  {/* Isikan komponen ikon Drive Anda di bawah ini */}
                  <Coins size={20} />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold leading-tight mt-1.5 text-center">Drive</span>
              </a>

              {/* 7. Tombol Modul */}
              <a 
                href="https://drive.google.com/drive/folders/1_ZRUqCkw9rMqJja2-5bK1xanrwoRZbbJ?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-lg shadow-xs group cursor-pointer transition-all active:scale-95 min-h-[90px]"
              >
                <div className="w-11 h-11 bg-amber-50 group-hover:bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100/50 transition-all">
                  {/* Isikan komponen ikon Modul Anda di bawah ini */}
                  <Wallet size={20} />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold leading-tight mt-1.5 text-center">Modul</span>
              </a>

              {/* 8. Tombol E-Rapor */}
              <a 
                href="https://drive.google.com/drive/folders/15AjFnEQevXIQo9Jy2B-_JDAgj8xE3Lho?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-lg shadow-xs group cursor-pointer transition-all active:scale-95 min-h-[90px]"
              >
                <div className="w-11 h-11 bg-purple-50 group-hover:bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100/50 transition-all">
                  {/* Isikan komponen ikon E-Rapor Anda di bawah ini */}
                  <Receipt size={20} />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold leading-tight mt-1.5 text-center">E-Rapor</span>
              </a>

            </div>
          </div>

        {/* ========================================================
            BROADCAST PESAN REALTIME TO TUTOR
            ======================================================== */}
            <div id="broadcast-editor-card" className="bg-gradient-to-br from-amber-50/60 to-orange-50/30 p-4.5 mb-6 rounded-lg border border-amber-200/60 shadow-3xs transition-all duration-300">
              
              {/* Header Section */}
              <div className="flex items-center justify-between mb-3 text-amber-900">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-xs">
                    <Megaphone size={14} className="animate-bounce" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wide leading-none">
                      Siarkan Pengumuman
                    </h3>
                    <span className="text-[9px] font-bold text-amber-600/80 mt-0.5">
                      Kirim notifikasi langsung ke semua tutor
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Form Section */}
              <form onSubmit={handleBroadcastSubmit}>
                {/* Mengubah sudut pembungkus menjadi rounded-lg. Efek focus-within murni mengubah warna garis, tidak menambah pendaran ring */}
                <div className="relative flex flex-col bg-white border border-slate-200 focus-within:border-amber-500 rounded-xs shadow-3xs overflow-hidden transition-all duration-200">
                  
                  {/* SOLUSI UTAMA: Ditambahkan focus:ring-0 dan focus:outline-none agar border biru bawaan browser hilang total */}
                  <textarea
                    id="broadcast-input-field"
                    placeholder="Ketik pengumuman penting baru untuk para tutor..."
                    value={broadcastInput}
                    onChange={(e) => setBroadcastInput(e.target.value)}
                    rows={4}
                    className="w-full bg-transparent px-4 pt-3.5 pb-14 text-xs font-semibold text-slate-800 placeholder-slate-400 border-0 outline-none focus:outline-none focus:ring-0 focus:border-transparent resize-none leading-relaxed"
                    required
                  />
                  
                  {/* Bottom Action Bar */}
                  <div className="absolute bottom-0 inset-x-0 bg-White pt-5 pb-2.5 px-3 flex flex-row justify-between items-center z-10 pointer-events-none">
                    
                    {/* Kiri: Info Jumlah Karakter */}
                    <span className="text-[9px] text-slate-400 font-bold font-mono pl-1 select-none">
                      {broadcastInput.length} karakter
                    </span>

                    {/* Kanan: Tombol Submit */}
                    <button
                      type="submit"
                      id="broadcast-submit-btn"
                      disabled={isBroadcastSaving}
                      className="pointer-events-auto bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-[10px] uppercase tracking-wider px-4 py-1.5 rounded-sm shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      {isBroadcastSaving ? (
                        <span>Menyimpan...</span>
                      ) : (
                        <>
                          <span>Siarkan</span>
                          <Send size={11} />
                        </>
                      )}
                    </button>

                  </div>
                </div>
              </form>
            </div>

        {/* 4. FINANCIAL WRAPPER (ESTIMATION & OUTSTANDINGS) */}
        {/* 4. FINANCIAL WRAPPER (ESTIMATION & OUTSTANDINGS) */}
        <div id="financial-card" className="bg-white p-4 rounded-lg shadow-xs border border-slate-100 mb-6">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Buku Operasional {formatBulanTahun(getTodayDateString())}</h3>
            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Bulan Ini</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">ESTIMASI REVENUE</p>
              <div className="flex items-center gap-1 mt-0.5 text-emerald-600">
                <ArrowUpRight size={14} />
                <span className="text-sm font-black font-mono leading-none">{formatRupiah(monthlyRevenue)}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">ESTIMASI BEBAN</p>
              <div className="flex items-center gap-1 mt-0.5 text-rose-600">
                <ArrowDownLeft size={14} />
                <span className="text-sm font-black font-mono leading-none">{formatRupiah(monthlyExpense)}</span>
              </div>
            </div>
          </div>

          {/* Profit Section */}
          <div className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between mb-4">
            <span className="text-[10.5px] font-bold text-slate-500">Estimasi Laba Bersih</span>
            <span className={`text-xs font-extrabold font-mono ${estimatedProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {estimatedProfit >= 0 ? "+" : ""}{formatRupiah(estimatedProfit)}
            </span>
          </div>

          {/* Book Balances */}
          <div className="space-y-2.5 pt-1">
            <div 
              id="piutang-row"
              onClick={() => onNavigateToTab("keuangan", "rekening")}
              className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50/50 p-1 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                Piutang Tagihan Siswa
              </div>
              <span className="font-bold text-slate-700 font-mono">{formatRupiah(totalOutstandingPiutang)}</span>
            </div>

            <div 
              id="utang-honor-row"
              onClick={() => onNavigateToTab("keuangan", "honor")}
              className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50/50 p-1 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Utang Honor Tutor
              </div>
              <span className="font-bold text-slate-700 font-mono">{formatRupiah(totalOutstandingUtangHonor)}</span>
            </div>

            <div 
              id="titipan-row"
              onClick={() => onNavigateToTab("keuangan", "titipan")}
              className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50/50 p-1 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Titipan di Tangan Tutor
              </div>
              <span className="font-bold text-slate-700 font-mono">{formatRupiah(totalTitipanPending)}</span>
            </div>
          </div>
        </div>

{/* ========================================================
    6. JADWAL AKUMULATIF SEMUA TUTOR (DESAIN FRESH)
    ======================================================== */}
{(() => {
  const dayOrder: Record<string, number> = {
    "Senin": 1,
    "Selasa": 2,
    "Rabu": 3,
    "Kamis": 4,
    "Jumat": 5,
    "Sabtu": 6,
    "Minggu": 7
  };

  const rawSchedules = db.schedules || [];
  const filteredSchedules = rawSchedules.filter((s) => {
    const matchesSearch = 
      s.tutorNama.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
      s.siswaNama.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
      s.programNama.toLowerCase().includes(scheduleSearch.toLowerCase());
      
    const matchesDay = scheduleDayFilter === "Semua" || s.hari.toLowerCase() === scheduleDayFilter.toLowerCase();
    
    return matchesSearch && matchesDay;
  });

  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    const dayA = dayOrder[a.hari] || 99;
    const dayB = dayOrder[b.hari] || 99;
    if (dayA !== dayB) return dayA - dayB;
    return a.waktu.localeCompare(b.waktu);
  });

  return (
    <div id="accumulative-schedule-card" className="bg-white p-4.5 rounded-lg shadow-sm border border-slate-100 mt-6">
      {/* Header Elemen */}
      <div 
        className="flex items-center justify-between cursor-pointer group select-none mb-4"
        onClick={() => setShowJadwalAkumulatif(!showJadwalAkumulatif)}
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-xl transition-colors ${showJadwalAkumulatif ? "bg-brand-50 text-brand-600" : "bg-slate-50 text-slate-400"}`}>
            <Calendar size={15} />
          </div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
            Jadwal Tutor
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-black text-brand-600 bg-brand-50/70 px-2.5 py-0.5 rounded-md">
            {rawSchedules.length} Jadwal
          </span>
          <div className="p-0.5 rounded-md group-hover:bg-slate-50 transition-colors">
            {showJadwalAkumulatif ? (
              <ChevronUp size={15} className="text-slate-400" />
            ) : (
              <ChevronDown size={15} className="text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {showJadwalAkumulatif && (
        <div className="animate-fade-in space-y-4">
          {/* Bar Pencarian & Filter Navigasi Hari */}
          <div className="flex flex-col gap-2.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama tutor, siswa, atau program harian..."
                value={scheduleSearch}
                onChange={(e) => setScheduleSearch(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 text-xs font-semibold bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:border-brand-400 placeholder-slate-400 text-slate-800 shadow-3xs transition-colors"
              />
            </div>

            {/* Navigasi Horizontal Tabs Hari */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none shrink-0">
              {["Semua", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day) => (
                <button
                  key={day}
                  onClick={() => setScheduleDayFilter(day)}
                  type="button"
                  className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all whitespace-nowrap border cursor-pointer ${
                    scheduleDayFilter === day
                      ? "bg-brand-600 text-white border-brand-600 shadow-xs"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
            {sortedSchedules.map((schedule) => (
              <div 
                key={schedule.id}
                className="p-3 bg-white border border-slate-100 rounded-xl flex flex-col gap-2.5 shadow-3xs"
              >
                {/* Baris Atas: Label Hari, ID, & Jam */}
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md">
                      {schedule.hari}
                    </span>
                    <span className="text-[9px] font-bold font-mono text-slate-400">
                      #{schedule.id}
                    </span>
                  </div>
                  <span className="text-[10px] font-black font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {schedule.waktu}
                  </span>
                </div>

                {/* Menggunakan grid 3 kolom agar posisi Tutor, Siswa, dan Program sejajar rapi dalam satu baris */}
                <div className="grid grid-cols-3 gap-5 pt-2.5 w-full min-w-0 border-t border-slate-50">
                  
                  {/* Kolom 1: Tutor */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Tutor
                    </span>
                    {/* Menghapus group-hover:text-amber-600 agar warna teks tutor tetap slate-700 yang solid */}
                    <p className="text-xs font-black text-slate-700 truncate leading-tight">
                      {schedule.tutorNama}
                    </p>
                  </div>

                  {/* Kolom 2: Siswa */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Siswa
                    </span>
                    <p className="text-xs font-extrabold text-slate-600 truncate leading-tight">
                      {schedule.siswaNama}
                    </p>
                  </div>

                  {/* Kolom 3: Program */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Program
                    </span>
                    <p className="text-[10px] font-black text-slate-600 truncate leading-tight">
                      {schedule.programNama}
                    </p>
                  </div>

                </div>
              </div>
            ))}

            {sortedSchedules.length === 0 && (
              <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs font-semibold text-slate-400 italic">
                  Tidak ada jadwal bimbingan yang cocok.
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
})()}


        {/* 5. RECENT ACTIVITIES LIST */}
<div id="recent-activities-card" className="bg-white p-4.5 rounded-lg shadow-sm border border-slate-100/80">
  {/* Header Section */}
  <div 
    className="flex items-center justify-between cursor-pointer group select-none mb-3.5"
    onClick={() => setShowAktivitasTerbaru(!showAktivitasTerbaru)}
  >
    <div className="flex items-center gap-2">
      {/* Efek badge ikon dinamis */}
      <div className={`p-1.5 rounded-xl transition-colors duration-300 ${showAktivitasTerbaru ? 'bg-brand-50 text-brand-600' : 'bg-slate-50 text-slate-400'}`}>
        <Clock size={15} className={showAktivitasTerbaru ? "animate-spin-slow" : ""} />
      </div>
      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
        Aktivitas Terbaru
      </h3>
    </div>
    
    <div className="flex items-center gap-2.5">
      <button 
        id="view-all-sess-btn"
        onClick={(e) => { e.stopPropagation(); onNavigateToTab("keuangan", "rekening"); }}
        className="text-[10px] font-black uppercase tracking-wider text-brand-600 bg-brand-50/60 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
      >
        Semua
      </button>
      <div className="p-1 rounded-md group-hover:bg-slate-50 transition-colors">
        {showAktivitasTerbaru ? (
          <ChevronUp size={15} className="text-slate-400" />
        ) : (
          <ChevronDown size={15} className="text-slate-400" />
        )}
      </div>
    </div>
  </div>

  

  {/* Content List dengan Gaya Timeline */}
  {showAktivitasTerbaru && (
    <div className="relative pl-1.5 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-[1.5px] before:bg-slate-100 transition-all duration-300">
      {db.sessions.slice(0, 4).map((s) => (
        <div 
          key={s.id} 
          id={`activity-sess-${s.id}`} 
          className="relative flex items-start gap-3.5 group/item cursor-default"
        >
          {/* Node Titik Garis Waktu */}
          <div className="relative z-10 w-2.5 h-2.5 rounded-LG bg-white border-2 border-slate-300 group-hover/item:border-brand-500 group-hover/item:scale-125 transition-all mt-1.5 shrink-0 shadow-3xs" />
          
          {/* Kotak Informasi Bergaya Kaca Bersih (Glassmorphism) */}
          <div className="flex-1 min-w-0 bg-slate-50/40 group-hover/item:bg-slate-50 border border-slate-100/50 group-hover/item:border-brand-100 p-3 rounded-xl transition-all duration-300 flex flex-col gap-1">
            <div className="flex justify-between items-start gap-2 w-full">
              <div className="flex flex-col min-w-0">
                <p className="text-xs font-black text-slate-800 leading-tight truncate">
                  {s.siswaNama}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Tutor: <span className="text-slate-600 font-bold">{s.tutorNama}</span>
                </p>
              </div>
              <span className="text-[9px] text-slate-400 font-bold bg-white border border-slate-100 px-1.5 py-0.5 rounded-md shadow-3xs whitespace-nowrap">
                {formatTanggalIndo(s.tanggal)}
              </span>
            </div>

            {/* Bagian Bawah: Label Program */}
            <div className="mt-1 flex items-center justify-between">
              <span className="inline-block text-[9px] font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                {s.programNama}
              </span>
              {/* Dekorasi ikon mini saat hover */}
              <BookOpen size={11} className="text-slate-300 group-hover/item:text-brand-400 opacity-0 group-hover/item:opacity-100 transition-all transform translate-x-1 group-hover/item:translate-x-0" />
            </div>
          </div>
        </div>
      ))}
      
      {db.sessions.length === 0 && (
        <div className="text-center py-6 flex flex-col items-center justify-center gap-1.5">
          <BookOpen size={24} className="text-slate-300" />
          <p className="text-xs font-medium text-slate-400">Belum ada riwayat pertemuan.</p>
        </div>
      )}
    </div>
  )}
</div>
      </div>
    </div>
  );
}
