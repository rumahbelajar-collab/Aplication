import React, { useState } from "react";
import { 
  FileText, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  Wallet, 
  Download, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Undo2,
  RotateCcw,
  Trash2
} from "lucide-react";
import { 
  Database, 
  formatRupiah, 
  formatTanggalIndo,
  verifyAttendanceReport,
  undoVerifyAttendanceReport,
  deleteSessionTransaction,
  deleteAttendanceReport,
  checkDuplicateSession,
  getTodayDateString,
  formatBulanTahun
} from "../lib/db";
import { 
  downloadLaporanLabaRugiPDF, 
  downloadRekapTagihanSiswaPDF, 
  downloadRekapHonorTutorPDF, 
  downloadRekapTitipanTutorPDF,
  downloadRekapAbsensiPDF,
  downloadDaftarJadwalPDF,
  downloadRekapBukuKasPDF
} from "../lib/pdfGenerator";
import DateRangeFilter, { DateRangePreset } from "./DateRangeFilter";

interface AdminLaporanProps {
  db: Database;
  onUpdateDb: (newDb: Database) => void;
  defaultMainTab?: "pdf" | "absensi" | "verifikasi";
}

export default function AdminLaporan({ db, onUpdateDb, defaultMainTab = "pdf" }: AdminLaporanProps) {
  // Main tab: "pdf" or "absensi" or "verifikasi"
  const [activeMainTab, setActiveMainTab] = useState<"pdf" | "absensi" | "verifikasi">(defaultMainTab);

  React.useEffect(() => {
    if (defaultMainTab) {
      setActiveMainTab(defaultMainTab);
    }
  }, [defaultMainTab]);

  // State for search & filter in Absensi Tab
  const [absensiSearch, setAbsensiSearch] = useState("");
  const [absensiStatusFilter, setAbsensiStatusFilter] = useState<"semua" | "pending" | "setuju" | "tolak">("semua");

  // Date range filter states for PDF generation
  const [rangeType, setRangeType] = useState<DateRangePreset>("semua");
  const [customStart, setCustomStart] = useState(() => {
    const today = getTodayDateString();
    return today.substring(0, 8) + "01";
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const today = getTodayDateString();
    const base = new Date(today);
    const year = base.getFullYear();
    const month = base.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  });

  // Claims verification states
  const [claimFilter, setClaimFilter] = useState<"semua" | "pending" | "setuju" | "tolak">("pending");
  const [adminComments, setAdminComments] = useState<Record<string, string>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<{ id: string; status: "setuju" | "tolak" } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Get period text for PDF
  const getPeriodString = () => {
    if (rangeType === "semua") return "Semua Waktu";
    if (rangeType === "custom") return `${formatTanggalIndo(customStart)} - ${formatTanggalIndo(customEnd)}`;
    if (rangeType === "hari") return `Hari Ini (${formatTanggalIndo(getTodayDateString())})`;
    if (rangeType === "minggu") return "Minggu Ini";
    if (rangeType === "bulan") return `Bulan Ini (${formatBulanTahun(getTodayDateString())})`;
    if (rangeType === "tahun") return `Tahun Ini (${new Date().getFullYear()})`;
    return "Umum";
  };

  const pText = getPeriodString();

  // Get start & end bounds based on rangeType for database filtering
  const getDateBounds = () => {
    let start = "";
    let end = "";
    const refDate = getTodayDateString(); // System base reference date
    
    if (rangeType === "hari") {
      start = refDate;
      end = refDate;
    } else if (rangeType === "minggu") {
      const base = new Date(refDate);
      const day = base.getDay();
      const diffToMonday = base.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(base);
      monday.setDate(diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const pad = (num: number) => String(num).padStart(2, "0");
      start = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      end = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
    } else if (rangeType === "bulan") {
      const base = new Date(refDate);
      const year = base.getFullYear();
      const month = base.getMonth();
      const pad = (num: number) => String(num).padStart(2, "0");
      start = `${year}-${pad(month + 1)}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      end = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
    } else if (rangeType === "tahun") {
      const base = new Date(refDate);
      start = `${base.getFullYear()}-01-01`;
      end = `${base.getFullYear()}-12-31`;
    } else if (rangeType === "custom") {
      start = customStart;
      end = customEnd;
    }
    return { start, end };
  };

  const { start: boundsStart, end: boundsEnd } = getDateBounds();

  // Claims list
  const claims = db.attendanceReports || [];
  const pendingClaims = claims.filter(c => c.status === "pending");
  const filteredClaims = claims.filter(c => {
    if (claimFilter === "semua") return true;
    return c.status === claimFilter;
  });

  // Construct unified absensi list from sessions AND non-approved reports
  interface UnifiedAbsensiItem {
    id: string;
    tanggal: string;
    tutorNama: string;
    siswaNama: string;
    programNama: string;
    status: "pending" | "setuju" | "tolak";
    keterangan?: string;
    fotoJurnal?: string;
    catatanAdmin?: string;
  }

  const unifiedAbsensiList: UnifiedAbsensiItem[] = [];

  // 1. Add all completed sessions (status = setuju)
  (db.sessions || []).forEach(s => {
    unifiedAbsensiList.push({
      id: s.id,
      tanggal: s.tanggal,
      tutorNama: s.tutorNama,
      siswaNama: s.siswaNama,
      programNama: s.programNama,
      status: "setuju",
      keterangan: s.catatan
    });
  });

  // 2. Add all pending/tolak reports
  (db.attendanceReports || []).forEach(r => {
    if (r.status !== "setuju") {
      unifiedAbsensiList.push({
        id: r.id,
        tanggal: r.tanggal,
        tutorNama: r.tutorNama,
        siswaNama: r.siswaNama,
        programNama: r.programNama,
        status: r.status,
        keterangan: r.keterangan,
        fotoJurnal: r.fotoJurnal,
        catatanAdmin: r.catatanAdmin
      });
    }
  });

  // Sort alphabetically by Tutor Name first, then Student Name, then Date
  unifiedAbsensiList.sort((a, b) => {
    const tutorComp = a.tutorNama.localeCompare(b.tutorNama);
    if (tutorComp !== 0) return tutorComp;
    const studentComp = a.siswaNama.localeCompare(b.siswaNama);
    if (studentComp !== 0) return studentComp;
    return a.tanggal.localeCompare(b.tanggal);
  });

  const filteredAbsensi = unifiedAbsensiList.filter(item => {
    // 1. Date Range
    if (boundsStart && item.tanggal < boundsStart) return false;
    if (boundsEnd && item.tanggal > boundsEnd) return false;
    
    // 2. Status
    if (absensiStatusFilter !== "semua" && item.status !== absensiStatusFilter) return false;
    
    // 3. Search text
    if (absensiSearch.trim()) {
      const searchLower = absensiSearch.toLowerCase();
      const tutorMatch = item.tutorNama.toLowerCase().includes(searchLower);
      const studentMatch = item.siswaNama.toLowerCase().includes(searchLower);
      const programMatch = item.programNama.toLowerCase().includes(searchLower);
      if (!tutorMatch && !studentMatch && !programMatch) return false;
    }
    
    return true;
  });

  // Verification handlers
  const executeVerify = (reportId: string, status: "setuju" | "tolak") => {
    const comment = adminComments[reportId]?.trim() || "";

    // Process
    const nextDb = verifyAttendanceReport(db, reportId, status, comment, getTodayDateString());
    onUpdateDb(nextDb);

    // Clear comment state
    setAdminComments(prev => {
      const next = { ...prev };
      delete next[reportId];
      return next;
    });

    setConfirmingAction(null);
    setSuccessToast(
      status === "setuju"
        ? "Klaim Kehadiran Berhasil Disetujui! Riwayat pertemuan, tagihan siswa, dan honor tutor telah diperbarui otomatis."
        : "Klaim kehadiran berhasil ditolak."
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  return (
    <div id="admin-laporan-container" className="px-4 py-4 pb-24 space-y-4">
      
      {/* THREE PRIMARY TABS (DANA STYLE RAIL) */}
      <div className="grid grid-cols-3 bg-white p-1 rounded-lg border border-slate-100 shadow-3xs shrink-0">
        <button
          id="main-tab-pdf"
          onClick={() => setActiveMainTab("pdf")}
          className={`flex items-center justify-center gap-1 py-2.5 text-[10.5px] font-bold rounded-xl cursor-pointer transition-all ${
            activeMainTab === "pdf" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <TrendingUp size={13} />
          Laporan PDF
        </button>
        <button
          id="main-tab-absensi"
          onClick={() => setActiveMainTab("absensi")}
          className={`flex items-center justify-center gap-1 py-2.5 text-[10.5px] font-bold rounded-xl cursor-pointer transition-all ${
            activeMainTab === "absensi" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Calendar size={13} />
          Rekap Absensi
        </button>
        <button
          id="main-tab-verifikasi"
          onClick={() => setActiveMainTab("verifikasi")}
          className={`flex items-center justify-center gap-1 py-2.5 text-[10.5px] font-bold rounded-xl cursor-pointer transition-all relative ${
            activeMainTab === "verifikasi" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <CheckCircle2 size={13} />
          Verifikasi Sesi
          {pendingClaims.length > 0 && (
            <span className="absolute -top-1 right-1 bg-rose-500 text-white text-[7.5px] font-bold px-1 py-0.5 rounded-full animate-bounce">
              {pendingClaims.length}
            </span>
          )}
        </button>
      </div>

      {/* SUCCESS TOAST BANNER */}
      {successToast && (
        <div className="bg-emerald-600 border border-emerald-700 text-white p-3.5 rounded-2xl text-[11px] font-bold shadow-md animate-fade-in flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 animate-pulse" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Calendar Filter - Shared between PDF & Absensi tabs */}
      {(activeMainTab === "pdf" || activeMainTab === "absensi") && (
        <DateRangeFilter
          rangeType={rangeType}
          customStart={customStart}
          customEnd={customEnd}
          onChange={(type, start, end) => {
            setRangeType(type);
            if (start) setCustomStart(start);
            if (end) setCustomEnd(end);
          }}
        />
      )}

      {/* ==========================================================
          TAB 1: PDF REPORT EXPORTS
          ========================================================== */}
      {activeMainTab === "pdf" && (
        <div className="space-y-4 animate-fade-in">
          <h4 className="text-xs font-bold text-slate-700 px-2">Pusat Ekspor Dokumen</h4>

          <div className="space-y-3.5">
            {/* Laba Rugi */}
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs hover:border-brand-300 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100/50">
                  <TrendingUp size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Laporan Laba Rugi</h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 truncate font-medium">Buku kas masuk, piutang, operasional, & honor</p>
                  <span className="inline-block mt-1 text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    {pText}
                  </span>
                </div>
              </div>
              <button
                onClick={() => downloadLaporanLabaRugiPDF(db, pText, boundsStart, boundsEnd)}
                className="p-3 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl transition-all cursor-pointer border border-brand-100 active:scale-95"
              >
                <Download size={16} />
              </button>
            </div>

            {/* Buku Kas Lembaga */}
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs hover:border-brand-300 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0 border border-teal-100/50">
                  <Wallet size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Rekapitulasi Buku Kas Lembaga</h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 truncate font-medium">Laporan rincian mutasi kas masuk, keluar, dan akumulasi saldo akhir</p>
                  <span className="inline-block mt-1 text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    {pText}
                  </span>
                </div>
              </div>
              <button
                onClick={() => downloadRekapBukuKasPDF(db, pText, boundsStart, boundsEnd)}
                className="p-3 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl transition-all cursor-pointer border border-brand-100 active:scale-95"
              >
                <Download size={16} />
              </button>
            </div>

            {/* Rekap Tagihan */}
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs hover:border-brand-300 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 bg-blue-50 text-brand-600 rounded-2xl flex items-center justify-center shrink-0 border border-brand-100/50">
                  <Users size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Rekap Tagihan Siswa</h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 truncate font-medium">Piutang berjalan per masing-masing murid aktif</p>
                  <span className="inline-block mt-1 text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    {pText}
                  </span>
                </div>
              </div>
              <button
                onClick={() => downloadRekapTagihanSiswaPDF(db.students, db, pText, boundsStart, boundsEnd)}
                className="p-3 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl transition-all cursor-pointer border border-brand-100 active:scale-95"
              >
                <Download size={16} />
              </button>
            </div>

            {/* Rekap Honor */}
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs hover:border-brand-300 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100/50">
                  <GraduationCap size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Rekap Honor Tutor</h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 truncate font-medium">Akumulasi hutang honor terutang & slip disalurkan</p>
                  <span className="inline-block mt-1 text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    {pText}
                  </span>
                </div>
              </div>
              <button
                onClick={() => downloadRekapHonorTutorPDF(db.tutors, db, pText, boundsStart, boundsEnd)}
                className="p-3 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl transition-all cursor-pointer border border-brand-100 active:scale-95"
              >
                <Download size={16} />
              </button>
            </div>

            {/* Rekap Titipan */}
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs hover:border-brand-300 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100/50">
                  <Wallet size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Rekap Titipan Tutor</h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 truncate font-medium">Histori penerimaan uang di tangan tutor (pending handover)</p>
                  <span className="inline-block mt-1 text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    {pText}
                  </span>
                </div>
              </div>
              <button
                onClick={() => downloadRekapTitipanTutorPDF(db.tutors, db, pText, boundsStart, boundsEnd)}
                className="p-3 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl transition-all cursor-pointer border border-brand-100 active:scale-95"
              >
                <Download size={16} />
              </button>
            </div>

            {/* Rekap Absensi */}
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs hover:border-brand-300 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl flex items-center justify-center shrink-0">
                  <Calendar size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Laporan Kehadiran & Absensi</h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 truncate font-medium">Rekapitulasi absensi/pertemuan tutor & murid aktif</p>
                  <span className="inline-block mt-1 text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    {pText}
                  </span>
                </div>
              </div>
              <button
                onClick={() => downloadRekapAbsensiPDF(db, pText, boundsStart, boundsEnd)}
                className="p-3 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl transition-all cursor-pointer border border-brand-100 active:scale-95"
              >
                <Download size={16} />
              </button>
            </div>

            {/* Daftar Jadwal Bimbingan */}
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs hover:border-brand-300 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100/50">
                  <Calendar size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Daftar Jadwal Bimbingan</h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 truncate font-medium">Seluruh jadwal pertemuan aktif tutor & siswa</p>
                  <span className="inline-block mt-1 text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    Semua Periode
                  </span>
                </div>
              </div>
              <button
                onClick={() => downloadDaftarJadwalPDF(db.schedules || [], db.tutors || [])}
                className="p-3 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl transition-all cursor-pointer border border-brand-100 active:scale-95"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ==========================================================
          TAB 1.5: ABSENSI LIST & MANAGEMENT (CONNECTED TO SUPABASE)
          ========================================================== */}
      {activeMainTab === "absensi" && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary Stats Box */}
          <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-3xs space-y-4">             
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/40">
              {(["semua", "setuju", "pending", "tolak"] as const).map((status) => {
                // 1. Hitung jumlah data berdasarkan status secara dinamis
                const count = unifiedAbsensiList.filter(
                  (r) =>
                    (status === "semua" || r.status === status) &&
                    (!boundsStart || r.tanggal >= boundsStart) &&
                    (!boundsEnd || r.tanggal <= boundsEnd)
                ).length;

                // 2. Tentukan label teks
                const label =
                  status === "semua" ? "Sesi" :
                  status === "setuju" ? "Setuju" :
                  status === "tolak" ? "Tolak" : "Pending";

                // 3. Tentukan warna berdasarkan status jika sedang aktif (dipilih)
                const activeColor =
                  status === "setuju" ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                  status === "pending" ? "text-amber-600 bg-amber-50 border-amber-100" :
                  status === "tolak" ? "text-rose-600 bg-rose-50 border-rose-100" :
                  "text-brand-600 bg-white border-slate-200"; // Warna default untuk "Semua"

                const isSelected = absensiStatusFilter === status;

                return (
                  <button
                    key={status}
                    onClick={() => setAbsensiStatusFilter(status)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? `${activeColor} shadow-3xs`
                        : "bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                    }`}
                  >
                    <span
                      className={`text-[9px] font-bold uppercase leading-none mb-1 ${
                        isSelected ? "" : "text-slate-400"
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`text-xs font-black font-mono ${
                        isSelected ? "" : "text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama tutor, siswa, program..."
                  value={absensiSearch}
                  onChange={(e) => setAbsensiSearch(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none placeholder:text-slate-400"
                />
              </div>  
          </div>


          {/* Absensi List (Connected to state / Supabase) */}
          <div className="space-y-3">
            {filteredAbsensi.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-3xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      {item.id}
                    </span>
                    <span className="text-[9.5px] font-bold font-mono text-slate-400">
                      {formatTanggalIndo(item.tanggal)}
                    </span>
                  </div>
                  {item.status === "pending" && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                      Pending
                    </span>
                  )}
                  {item.status === "setuju" && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Disetujui
                    </span>
                  )}
                  {item.status === "tolak" && (
                    <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                      Ditolak
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10.5px] leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100/60">
                  <div>
                    <span className="text-[8.5px] font-black text-slate-400 uppercase block leading-none mb-0.5">Tutor</span>
                    <span className="font-bold text-slate-700">{item.tutorNama}</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-black text-slate-400 uppercase block leading-none mb-0.5">Siswa</span>
                    <span className="font-bold text-slate-700">{item.siswaNama}</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-black text-slate-400 uppercase block leading-none mb-0.5">Program</span>
                    <span className="font-bold text-slate-700">{item.programNama}</span>
                  </div>
                </div>

                {item.fotoJurnal && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Bukti Jurnal:</span>
                    <div className="relative w-16 h-12 rounded overflow-hidden border border-slate-200 shrink-0 group">
                      <img src={item.fotoJurnal} alt="Jurnal" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelectedPhoto(item.fotoJurnal)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] font-bold cursor-pointer"
                      >
                        Lihat
                      </button>
                    </div>
                  </div>
                )}

                {item.catatanAdmin && (
                  <div className="p-2 bg-slate-100 rounded-lg border border-slate-200/50 text-[9.5px] text-slate-600 leading-normal">
                    <span className="font-extrabold text-slate-400 text-[8.5px] uppercase block mb-0.5">Catatan Admin</span>
                    "{item.catatanAdmin}"
                  </div>
                )}

                {/* ADMIN ACTIONS FOR ABSENSI ITEM */}
                <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
                  {item.status === "setuju" && item.id.startsWith("RP-") && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Apakah Anda yakin ingin mengurungkan verifikasi dan menghapus Sesi ${item.id}? tindakan ini juga akan menghapus transaksi keuangan siswa dan honor tutor terkait.`)) {
                          const nextDb = deleteSessionTransaction(db, item.id);
                          onUpdateDb(nextDb);
                          setSuccessToast(`Sesi ${item.id} berhasil diurungkan dan dihapus!`);
                          setTimeout(() => setSuccessToast(null), 4000);
                        }
                      }}
                      className="text-[9.5px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-rose-100"
                    >
                      <RotateCcw size={11} />
                      Hapus Sesi
                    </button>
                  )}
                  {item.status === "tolak" && item.id.startsWith("LPK-") && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Urungkan penolakan untuk Laporan ${item.id} dan kembalikan statusnya ke Pending?`)) {
                          const nextDb = undoVerifyAttendanceReport(db, item.id);
                          onUpdateDb(nextDb);
                          setSuccessToast(`Penolakan Laporan ${item.id} diurungkan. Status kembali menjadi Pending.`);
                          setTimeout(() => setSuccessToast(null), 4000);
                        }
                      }}
                      className="text-[9.5px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-amber-100"
                    >
                      <RotateCcw size={11} />
                      Urungkan Penolakan
                    </button>
                  )}
                  {item.status === "pending" && item.id.startsWith("LPK-") && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Apakah Anda yakin ingin menghapus Laporan Kehadiran ${item.id} ini secara permanen?`)) {
                          const nextDb = deleteAttendanceReport(db, item.id);
                          onUpdateDb(nextDb);
                          setSuccessToast(`Laporan Kehadiran ${item.id} berhasil dihapus.`);
                          setTimeout(() => setSuccessToast(null), 4000);
                        }
                      }}
                      className="text-[9.5px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-rose-100"
                    >
                      <Trash2 size={11} />
                      Hapus Pengajuan
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredAbsensi.length === 0 && (
              <p className="text-center py-12 text-xs text-slate-400">Tidak ada data absensi untuk kriteria ini.</p>
            )}
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 2: VERIFICATION CLAIMS PANEL
          ========================================================== */}
      {activeMainTab === "verifikasi" && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Claims List Filters */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/40">
            {["semua", "pending", "setuju", "tolak"].map((tab) => (
              <button
                key={tab}
                onClick={() => setClaimFilter(tab as any)}
                className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded-sm cursor-pointer transition-all capitalize ${
                  claimFilter === tab 
                    ? "bg-white text-brand-700 shadow-3xs" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "setuju" ? "Disetujui" : tab === "tolak" ? "Ditolak" : tab}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredClaims.map((claim) => {
              // Check for duplicate warning if report is pending
              const isDuplicate = claim.status === "pending" && checkDuplicateSession(db, {
                tanggal: claim.tanggal,
                siswaId: claim.siswaId,
                tutorId: claim.tutorId,
                programId: claim.programId
              });

              const selectedProg = db.programs.find(p => p.id === claim.programId);

              return (
                <div 
                  key={claim.id}
                  id={`claim-card-${claim.id}`}
                  className={`bg-white rounded-lg border p-4 shadow-3xs flex flex-col gap-3.5 transition-all ${
                    isDuplicate ? "border-amber-300 ring-2 ring-amber-300/15" : "border-slate-100"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9.5px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                        {claim.id}
                      </span>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 font-mono">
                        Diajukan: {formatTanggalIndo(claim.tanggal)}
                      </p>
                    </div>

                    {claim.status === "pending" && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={10} className="animate-pulse" />
                        Menunggu Verifikasi
                      </span>
                    )}
                    {claim.status === "setuju" && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        Disetujui
                      </span>
                    )}
                    {claim.status === "tolak" && (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle size={10} />
                        Ditolak
                      </span>
                    )}
                  </div>

                  {/* DUPLICATE WARNING BLOCK */}
                  {isDuplicate && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-[10px] leading-relaxed flex gap-2">
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <span className="font-extrabold block text-amber-800 uppercase tracking-wide">⚠️ Peringatan Duplikasi Data Sesi!</span>
                        Sesi mengajar yang sama (Tutor: <span className="font-bold">{claim.tutorNama}</span>, Siswa: <span className="font-bold">{claim.siswaNama}</span>) sudah terdaftar pada tanggal <span className="font-bold">{formatTanggalIndo(claim.tanggal)}</span>. Mohon tanyakan ke Tutor atau tolak jika klaim ganda.
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div className="text-xs leading-normal text-slate-700 space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <p><span className="font-bold text-slate-400 uppercase text-[9px] block">Tutor Pengajar</span> {claim.tutorNama}</p>
                    <p className="pt-1.5"><span className="font-bold text-slate-400 uppercase text-[9px] block">Siswa Bimbingan</span> {claim.siswaNama}</p>
                    <p className="pt-1.5"><span className="font-bold text-slate-400 uppercase text-[9px] block">Program Terkait</span> {claim.programNama}</p>
                    {selectedProg && (
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold italic">
                        Tarif Siswa: {formatRupiah(selectedProg.tarifSiswa)} | Honor Tutor: {formatRupiah(selectedProg.honorTutor)}
                      </p>
                    )}
                    {claim.keterangan && (
                      <div className="mt-2 text-[10px] text-slate-500 bg-white border border-slate-200/50 p-2 rounded-lg italic">
                        "{claim.keterangan}"
                      </div>
                    )}
                  </div>

                  {/* Foto Jurnal */}
                  {claim.fotoJurnal && (
                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[9px] block mb-1">Foto Bukti Jurnal Pembelajaran</span>
                      <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-3xs group">
                        <img 
                          src={claim.fotoJurnal} 
                          alt="Foto Bukti Jurnal" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(claim.fotoJurnal)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1 cursor-pointer"
                        >
                          <Eye size={12} />
                          Lihat Besar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* VERIFICATION ACTIONS FOR PENDING ITEMS */}
                  {claim.status === "pending" && (
                    <div className="space-y-3.5 border-t border-slate-50 pt-3.5">
                      {/* Note feedback write desk */}
                      <div className="flex items-start gap-2">
                        <MessageSquare size={14} className="text-slate-400 mt-1.5 shrink-0" />
                        <input
                          type="text"
                          placeholder="Catatan umpan balik (wajib jika ditolak)..."
                          value={adminComments[claim.id] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdminComments(prev => ({
                              ...prev,
                              [claim.id]: val
                            }));
                          }}
                          className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>

                      {/* Decisive Buttons */}
                      {confirmingAction && confirmingAction.id === claim.id ? (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl animate-fade-in text-center space-y-2.5">
                          <p className="text-xs font-black text-slate-800">
                            Konfirmasi {confirmingAction.status === "setuju" ? "Penyetujuan" : "Penolakan"}?
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            {confirmingAction.status === "setuju" 
                              ? "Laporan ini akan otomatis membuat transaksi keuangan, honor tutor, dan catatan riwayat bimbingan mengajar." 
                              : "Tindakan ini akan menolak klaim kehadiran yang diajukan oleh tutor pengajar."}
                          </p>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setConfirmingAction(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10.5px] px-3.5 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => executeVerify(claim.id, confirmingAction.status)}
                              className={`font-bold text-[10.5px] px-4 py-1.5 rounded-lg text-white shadow-xs active:scale-95 transition-all cursor-pointer ${
                                confirmingAction.status === "setuju" ? "bg-brand-600 hover:bg-brand-700" : "bg-rose-600 hover:bg-rose-700"
                              }`}
                            >
                              Ya, Konfirmasi
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              const comment = adminComments[claim.id]?.trim() || "";
                              if (!comment) {
                                alert("Harap tuliskan alasan penolakan pada kolom catatan.");
                                return;
                              }
                              setConfirmingAction({ id: claim.id, status: "tolak" });
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 p-2.5 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                          >
                            <ThumbsDown size={14} />
                            Tolak Klaim
                          </button>
                          <button
                            onClick={() => setConfirmingAction({ id: claim.id, status: "setuju" })}
                            className="bg-brand-600 hover:bg-brand-700 text-white p-2.5 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-transform"
                          >
                            <ThumbsUp size={14} />
                            Setujui & Sinkron
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback display for processed claims */}
                  {claim.catatanAdmin && (
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200/50 text-[10px] text-slate-700 leading-relaxed mt-1">
                      <span className="font-extrabold block text-slate-500 text-[9px] uppercase tracking-wide">Umpan Balik Admin</span>
                      "{claim.catatanAdmin}"
                    </div>
                  )}

                  {/* ACTIONS FOR PROCESSED ITEMS */}
                  {claim.status !== "pending" && (
                    <div className="flex gap-2.5 pt-3.5 border-t border-slate-50 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const actionText = claim.status === "setuju" ? "Penyetujuan" : "Penolakan";
                          if (confirm(`Urungkan ${actionText} untuk laporan ${claim.id}? Status laporan akan dikembalikan ke Pending dan seluruh pembukuan keuangan terkait (jika ada) akan diurungkan.`)) {
                            const nextDb = undoVerifyAttendanceReport(db, claim.id);
                            onUpdateDb(nextDb);
                            setSuccessToast(`Verifikasi Laporan ${claim.id} berhasil diurungkan!`);
                            setTimeout(() => setSuccessToast(null), 4000);
                          }
                        }}
                        className="flex-1 py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 font-bold text-[10.5px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                      >
                        <RotateCcw size={12} />
                        Urungkan Keputusan
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Apakah Anda yakin ingin menghapus Laporan ${claim.id} secara permanen? Sesi dan transaksi keuangan yang terhubung (jika ada) akan dihapus secara otomatis.`)) {
                            const nextDb = deleteAttendanceReport(db, claim.id);
                            onUpdateDb(nextDb);
                            setSuccessToast(`Laporan ${claim.id} berhasil dihapus permanen!`);
                            setTimeout(() => setSuccessToast(null), 4000);
                          }
                        }}
                        className="flex-1 py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold text-[10.5px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                      >
                        <Trash2 size={12} />
                        Hapus Laporan
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredClaims.length === 0 && (
              <p className="text-center py-12 text-xs text-slate-400">Tidak ada pengajuan laporan kehadiran.</p>
            )}
          </div>
        </div>
      )}

      {/* EXPANDABLE LIGHTBOX PHOTO MODAL */}
      {selectedPhoto && (
        <div 
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in"
        >
          <div className="relative max-w-full max-h-[85vh] rounded-2xl overflow-hidden bg-slate-950 shadow-2xl flex flex-col items-center">
            <img src={selectedPhoto} alt="Zoom Jurnal" className="max-w-full max-h-[80vh] object-contain" />
            <p className="text-white text-xs py-2 text-center">Klik di luar untuk menutup</p>
          </div>
        </div>
      )}

    </div>
  );
}
