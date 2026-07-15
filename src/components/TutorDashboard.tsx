import React, { useState } from "react";
import { 
  Users, 
  BookOpen, 
  Coins, 
  Wallet, 
  Clock, 
  PlusCircle, 
  UserCheck,
  Check,
  Calendar,
  AlertCircle,
  Megaphone,
  X,
  Info,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Award,
  BookAlert,
  HardDrive,
  BookA
} from "lucide-react";
import { 
  Database, 
  formatRupiah, 
  getTutorHonorBalance, 
  getTutorDepositBalance,
  addSessionTransaction,
  addPaymentTransaction,
  getTodayDateString,
  formatBulanTahun,
  formatTanggalIndo
} from "../lib/db";
import CustomDatePicker from "./CustomDatePicker";
import TutorRaport from "./TutorRaport";

interface TutorDashboardProps {
  db: Database;
  tutorId: string;
  onNavigateToTab: (tab: string, subTab?: string) => void;
  onUpdateDb: (newDb: Database) => void;
}

export default function TutorDashboard({
  db,
  tutorId,
  onNavigateToTab,
  onUpdateDb
}: TutorDashboardProps) {
  const tutor = db.tutors.find(t => t.id === tutorId);
  if (!tutor) return null;

  // Modals / Triggers State
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [isSopOpen, setIsSopOpen] = useState(false);
  const [isDepositFormOpen, setIsDepositFormOpen] = useState(false);
  const [isRaportOpen, setIsRaportOpen] = useState(false);

  const [showJadwalHariIni, setShowJadwalHariIni] = useState(false);
  const [showSesiTerakhir, setShowSesiTerakhir] = useState(false);

  // Form states for adding session
  const [siswaId, setSiswaId] = useState("");
  const [programId, setProgramId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form states for adding deposit (titipan)
  const [depositSiswaId, setDepositSiswaId] = useState("");
  const [depositJumlah, setDepositJumlah] = useState<number | "">(0);
  const [depositTanggal, setDepositTanggal] = useState(getTodayDateString());

  const activeStudents = db.students.filter(s => s.status === "aktif");
  const activePrograms = db.programs.filter(p => p.status === "aktif");

  // Determine active student's Program details (default choice helper)
  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSiswaId(sId);
    if (sId) {
      const studentObj = db.students.find(s => s.id === sId);
      if (studentObj && studentObj.programId) {
        setProgramId(studentObj.programId);
      } else {
        setProgramId("");
      }
    } else {
      setProgramId("");
    }
  };

  const selectedProgram = programId ? db.programs.find(p => p.id === programId) : null;

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaId || !programId) {
      alert("Harap pilih siswa dan program harian.");
      return;
    }

    // Call core transaction
    const nextDb = addSessionTransaction(db, {
      tanggal: getTodayDateString(), // Today's Context Date
      siswaId,
      tutorId,
      programId,
      catatan: `Pertemuan Mengajar Real-time (Program: ${selectedProgram?.nama})`
    });

    onUpdateDb(nextDb);

    // Show success banner
    setSuccessMessage("Riwayat pertemuan mengajar hari ini berhasil disimpan!");
    setSiswaId("");
    setProgramId("");
    setIsLogFormOpen(false);

    setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositSiswaId || !depositJumlah || Number(depositJumlah) <= 0) {
      alert("Harap lengkapi pilihan siswa dan nominal titipan yang valid.");
      return;
    }

    const nextDb = addPaymentTransaction(db, {
      tanggal: depositTanggal || getTodayDateString(),
      siswaId: depositSiswaId,
      jumlah: Number(depositJumlah),
      metode: "tutor",
      tutorId: tutorId
    });

    onUpdateDb(nextDb);

    setSuccessMessage("Uang titipan pembayaran siswa berhasil dicatat! Harap segera setor uang tersebut ke Admin.");
    setDepositSiswaId("");
    setDepositJumlah(0);
    setDepositTanggal(getTodayDateString());
    setIsDepositFormOpen(false);

    setTimeout(() => {
      setSuccessMessage("");
    }, 6000);
  };

  // Pre-fill session from schedule
  const handleQuickAddSessionFromSchedule = (sId: string, progId: string) => {
    setSiswaId(sId);
    setProgramId(progId);
    setIsLogFormOpen(true);
  };

  // Filter sessions logged by this tutor
  const tutorSessions = db.sessions.filter(s => s.tutorId === tutorId);
  const distinctStudentsCount = new Set(tutorSessions.map(s => s.siswaId)).size;
  const todaySessionsCount = tutorSessions.filter(s => s.tanggal === getTodayDateString()).length;

  // Financial metrics for this tutor
  const honorBalance = getTutorHonorBalance(db, tutorId);
  const depositBalance = getTutorDepositBalance(db, tutorId);

  // Dynamic Today's Schedules específicos with times and student names
  const getTodaySchedule = () => {
    const todayDateStr = getTodayDateString(); // Context local date is June 29, 2026
    const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const dayIndex = new Date(todayDateStr).getDay();
    const currentDayIndo = indonesianDays[dayIndex]; // "Senin"
    
    const tutorSchedules = (db.schedules || []).filter(
      s => s.tutorId === tutorId && s.hari === currentDayIndo
    );

    return tutorSchedules.map(schedule => {
      const isFinished = db.sessions.some(
        session => session.tanggal === todayDateStr &&
                   session.tutorId === tutorId &&
                   session.siswaId === schedule.siswaId &&
                   session.programId === schedule.programId
      );
      return {
        waktu: schedule.waktu,
        siswaId: schedule.siswaId,
        siswaNama: schedule.siswaNama,
        programId: schedule.programId,
        programNama: schedule.programNama,
        status: isFinished ? "Selesai" : "Belum Mengajar"
      };
    });
  };

  const todaySchedules = getTodaySchedule();

  return (
    <div id="tutor-dashboard-container" className="flex flex-col space-y-10">
      {/* Blue Header Banner */}
      <div id="dashboard-hero" className="bg-gradient-to-br from-blue-500 to-brand-500 text-white p-6 rounded-b-[32px] shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute top-[-30px] right-[-30px] w-36 h-36 bg-white/5 rounded-full" />
            <div className="flex items-center gap-2.5">
            <img src="public2.png" alt="logo" className="w-20 h-20 object-contain" referrerPolicy="no-referrer" />    
            <div>
            <h2 className="text-xl font-extrabold tracking-tight mt-0.5 font-display">Kak {tutor.nama}</h2>
            <p className="text-xs text-brand-100 mt-1 font-medium font-mono">ID Tutor: {tutor.id} | Status: Aktif</p>
            </div>
          </div>

        {/* Honor Owed Banner Box */}
        <div className="mt-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-inner flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-white uppercase tracking-wider font-bold">Saldo Honor Anda</p>
            <h1 className="text-2xl text-white font-black font-mono tracking-tight mt-0.5">{formatRupiah(honorBalance)}</h1>
          </div>
          <button
            id="tutor-view-ledger-hero-btn"
            onClick={() => onNavigateToTab("rekening")}
            className="text-[10px] font-bold text-white bg-white/15 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/25 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            Catatan Mutasi
          </button>
        </div>
      </div>

      <div className="px-2 md:px-0 pb-6 space-y-6">
          {/* 1. Main Metrics (3 Kartu Besar) */}
    <div className="grid grid-cols-3 gap-2.5">
      {/* 1. Hari Ini */}
      <div className="bg-slate-50 p-3 rounded-2xl flex flex-col justify-between min-h-[75px]">
        {/* Tulisan di Atas */}
        <p className="text-[9.5px] text-brand-400 font-black uppercase tracking-wider text-left">Hari Ini</p>
        
        {/* Baris Bawah: Ikon dan Sampingnya Angka */}
        <div className="flex items-center gap-2 mt-1.5">
          <div className="w-6 h-6 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
            {/* Masukkan ikon Hari Ini / Kalender di sini */}
            <Calendar size={13} />
          </div>
          <p className="text-3xl font-black text-brand-600 leading-none">{todaySessionsCount}</p>
        </div>
      </div>

      {/* 2. Siswa */}
      <div className="bg-slate-50 p-3 rounded-2xl flex flex-col justify-between min-h-[75px]">
        {/* Tulisan di Atas */}
        <p className="text-[9.5px] text-brand-400 font-black uppercase tracking-wider text-left">Siswa</p>
        
        <div className="flex items-center gap-2 mt-1.5">
          <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Users size={13} />
          </div>
          <p className="text-3xl font-black text-brand-500 leading-none">{distinctStudentsCount}</p>
        </div>
      </div>

      {/* 3. Uang Titipan */}
      <div className="bg-slate-50 p-3 rounded-2xl flex flex-col justify-between min-h-[75px] min-w-0">
        <p className="text-[9.5px] text-amber-400 font-black uppercase tracking-wider text-left">Titipan</p>
        
        {/* Baris Bawah: Ikon dan Sampingnya Angka (Format Rupiah) */}
        <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
          <div className="w-6 h-6 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <Wallet size={13} />
          </div>
          <p className="text-[13.5px] font-black text-amber-500 font-mono leading-none truncate flex-1">
            {formatRupiah(depositBalance)}
          </p>
        </div>
      </div>
    </div>

      {/* 1. BROADCAST PESAN ADMIN */}
      <div id="broadcast-admin" className="relative mt-4 bg-brand-50 border border-brand-200 p-3 pt-5 rounded-lg shadow-3xs">
        {/* Label Pesan Admin (Posisi Absolut) */}
        <div className="absolute -top-2 left-3 flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-lg text-[8.5px] font-extrabold uppercase tracking-wide">
          <Megaphone size={10} />
          <span>Pengumuman</span>
        </div>

        {/* Isi Pesan (Statik/Tidak Bergerak) */}
        <div className="text-[11px] font-medium text-brand-900 leading-relaxed">
          {db.broadcastMessage || "📢 PENGUMUMAN TUTOR: Mohon segera lakukan serah terima uang titipan pembayaran siswa yang diterima kepada Staf Administrasi maksimal 3 hari sejak diterima. | Harap catat riwayat pertemuan di hari bimbingan yang sama untuk ketertiban honor. | Terima kasih!"}
        </div>
      </div>

        {/* 3. QUICK CALL-TO-ACTION (CTA) BUTTONS */}

        <div className="bg-slate-50 p-4 rounded-lg">
        <p className="text-[12px] text-slate-500 font-black uppercase tracking-wider text-left mb-3">Menu</p>
          {/* Success message banner (Tetap di atas agar tidak merusak baris grid) */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 mb-3 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-fade-in">
              <Check size={14} />
              {successMessage}
            </div>
          )}

          {/* Kontainer Grid Utama: Otomatis melipat menjadi 3 kolom dan 2 baris (Total 6 menu) */}
          <div className="grid grid-cols-3 gap-2.5">
            
            {/* 1. Tambah Pertemuan */}
            <button
                id="tutor-add-session-cta"
                onClick={() => {
                setSiswaId("");
                setProgramId("");
                setIsLogFormOpen(true);
                }}
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-3xs flex flex-col items-center justify-center text-center min-h-[85px] group cursor-pointer transition-all active:scale-95 min-w-0"
            >
                <div className="flex flex-col items-center justify-center gap-3 w-full">
                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors mx-auto">
                    <PlusCircle size={20} />
                </div>
                <span className="text-[10.5px] font-black text-slate-800 leading-normal tracking-center block w-full text-center">Tambah Absensi</span>
                </div>
            </button>

                {/* 3. Catat Titipan */}
            <button
                id="tutor-add-titipan-cta"
                onClick={() => {
                setDepositSiswaId("");
                setDepositJumlah("");
                setIsDepositFormOpen(true);
                }}
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-3xs flex flex-col items-center justify-center text-center min-h-[85px] group cursor-pointer transition-all active:scale-95 min-w-0"
            >
                <div className="flex flex-col items-center justify-center gap-3 w-full">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors mx-auto">
                    <Coins size={20} />
                </div>
                <span className="text-[10.5px] font-black text-slate-800 leading-normal tracking-tight block w-full text-center">Catat Titipan</span>
                </div>
            </button>

                        
            {/* 2. SOP Tutor */}
            <a 
                href="https://drive.google.com/file/d/1ML0JSyNyMn-2GAxsaT2iRBAJQfBqsF-p/view?usp=drivesdk" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-3xs flex flex-col items-center justify-center text-center min-h-[85px] group no-underline transition-all active:scale-95 min-w-0"
            >
                <div className="flex flex-col items-center justify-center gap-3 w-full">
                <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors mx-auto">
                    <BookAlert size={20} />
                </div>
                <span className="text-[10.5px] font-black text-slate-800 tracking-tight truncate block w-full text-center">SOP Tutor</span>
                </div>
            </a>

              {/* Menu E-Raport Tryout */}
              <button
                id="tutor-raport-cta"
                onClick={() => setIsRaportOpen(true)}
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-3xs flex flex-col items-center justify-center text-center min-h-[85px] group transition-all active:scale-95 min-w-0"
              >
                <div className="flex flex-col items-center justify-center gap-3 w-full">
                  {/* Box pembungkus ikon agar ukurannya seragam dengan menu lainnya */}
                <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors mx-auto">
                    <Award size={20}/>
                  </div>
                  {/* Teks dengan formatting yang sama agar rapi */}
                  <span className="text-[10.5px] font-black text-slate-800 tracking-tight truncate block w-full text-center">
                    E-Raport
                  </span>
                </div>
              </button>

            {/* 5. Menu Drive */}
            <a 
                href="https://drive.google.com/drive/folders/1BLr6x5u5VYm97RowTLKoiffPKiQlqhCk?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-3xs flex flex-col items-center justify-center text-center min-h-[85px] group no-underline transition-all active:scale-95 min-w-0"
            >
                <div className="flex flex-col items-center justify-center gap-3 w-full">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors mx-auto">
                    <HardDrive size={20} />
                </div>
                <span className="text-[10.5px] font-black text-slate-800 tracking-tight truncate block w-full text-center">Drive</span>
                </div>
            </a>

            {/* 6. Menu Modul */}
            <a 
                href="https://drive.google.com/drive/folders/1_ZRUqCkw9rMqJja2-5bK1xanrwoRZbbJ?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-3xs flex flex-col items-center justify-center text-center min-h-[85px] group no-underline transition-all active:scale-95 min-w-0"
            >
                <div className="flex flex-col items-center justify-center gap-3 w-full">
                <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors mx-auto">
                    <BookA size={20} />
                </div>
                <span className="text-[10.5px] font-black text-slate-800 tracking-tight truncate block w-full text-center">Modul</span>
                </div>
            </a>
          </div>
        </div>

        {/* 4. TODAY'S SPECIFIC SCHEDULE */}
        <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
          {/* Header dengan aksen garis */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              <BookOpen size={14} />
              </div>
              Jadwal Hari Ini
            </h3>
            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
              {todaySchedules.length} Sesi
            </span>
          </div>

          {/* Daftar Jadwal */}
          <div className="space-y-3">
            {todaySchedules.map((item, idx) => (
              <div 
                key={idx} 
                className="group relative bg-slate-50 hover:bg-white border border-slate-100 hover:border-brand-200 p-4 rounded-2xl transition-all duration-300 flex items-center justify-between shadow-sm hover:shadow-md"
              >
                {/* Info Utama */}
                <div className="flex items-center gap-4">
                  {/* Status Bar Kecil */}
                  <div className={`w-1.5 h-12 rounded-full ${item.status === "Selesai" ? "bg-brand-500" : "bg-amber-400"}`} />
                  
                  <div className="space-y-0.5">
                    <p className="text-sm font-black text-slate-800">{item.siswaNama}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{item.programNama}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-md">
                        {item.waktu}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${item.status === "Selesai" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                {item.status !== "Selesai" && (
                  <button
                    onClick={() => handleQuickAddSessionFromSchedule(item.siswaId, item.programId)}
                    className="text-[10px] font-black uppercase text-brand-600 bg-white border border-brand-100 hover:border-brand-300 px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    Absensi
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RECENT TUTOR SESSIONS FEED */}
       <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <Clock size={14} />
              </div>
              Sesi Terakhir
            </h3>
            <button
              onClick={() => onNavigateToTab("riwayat")}
              className="text-[10px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-all"
            >
              Lihat Semua
            </button>
          </div>

          {/* Daftar Sesi */}
          <div className="space-y-1">
            {tutorSessions.length > 0 ? (
              tutorSessions.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center gap-4 group">
                  {/* Timeline Connector */}
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-brand-500 ring-4 ring-brand-50" />
                    <div className="w-0.5 h-8 bg-slate-100 mt-1" />
                  </div>

                  {/* Konten Sesi */}
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-800">{s.siswaNama}</p>
                        <p className="text-[10px] font-medium text-slate-500 bg-brand-50 px-2 py-0.5 rounded-md inline-block">
                          {s.programNama}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold font-mono text-slate-400 mt-0.5">
                        {s.tanggal.split("-").slice(1).reverse().join("/")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
                  <BookOpen size={20} />
                </div>
                <p className="text-xs text-slate-400">Belum ada riwayat sesi.</p>
              </div>
            )}
          </div>
        </div>
        </div>


      {/* ========================================================
          MODAL: TAMBAH PERTEMUAN (QUICK LOG)
          ======================================================== */}
      {isLogFormOpen && (
        <div id="quick-log-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-slide-up">
            <div className="bg-brand-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <PlusCircle size={18} />
                <h3 className="font-extrabold text-sm tracking-tight">Catat Absensi Hari Ini</h3>
              </div>
              <button
                onClick={() => setIsLogFormOpen(false)}
                className="text-white hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="p-5 space-y-4">
              {/* Read-Only Automatic Date for Tutors */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Sesi</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/70 border border-slate-200/50 rounded-xl text-slate-600">
                  <Calendar size={13} className="text-slate-400" />
                  <span className="text-xs font-semibold">{formatTanggalIndo(getTodayDateString())}</span>
                  <span className="ml-auto text-[9px] bg-slate-200/80 text-slate-500 font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Auto-Set</span>
                </div>
              </div>

              {/* Select Student */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pilih Siswa *</label>
                <select
                  required
                  value={siswaId}
                  onChange={handleStudentChange}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.nama} ({s.id})</option>
                  ))}
                </select>
              </div>

              {/* Select Daily Program */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Program Harian *</label>
                <select
                  required
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
                >
                  <option value="">-- Pilih Program Harian --</option>
                  {activePrograms.map(p => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2.5 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsLogFormOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-98"
                >
                  Simpan Pertemuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SOP TUTOR (STANDARD OPERATING PROCEDURES)
          ======================================================== */}
      {isSopOpen && (
        <div id="sop-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
            <div className="bg-brand-600 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen size={18} />
                <h3 className="font-extrabold text-sm tracking-tight">SOP & Panduan Pengajar</h3>
              </div>
              <button
                onClick={() => setIsSopOpen(false)}
                className="text-white hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-600">
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl flex gap-2 text-indigo-900">
                <Info size={16} className="shrink-0 mt-0.5 text-indigo-600" />
                <span className="font-bold">Patuhi Panduan Demi Kelancaran Administrasi & Pencairan Honor</span>
              </div>

              <div className="space-y-3.5">
                <div className="border-l-3 border-brand-500 pl-2.5">
                  <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wide">1. Kehadiran & Kedisiplinan</h4>
                  <p className="mt-0.5">Tutor wajib hadir di lokasi bimbingan tepat waktu sesuai jadwal yang disepakati. Apabila berhalangan, wajib menginfokan admin dan wali murid minimal H-1 bimbingan.</p>
                </div>

                <div className="border-l-3 border-emerald-500 pl-2.5">
                  <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wide">2. Pencatatan Real-time</h4>
                  <p className="mt-0.5">Sesi mengajar wajib dicatatkan langsung via aplikasi sesaat setelah selesai bimbingan di hari yang sama untuk keakuratan penagihan SPP siswa.</p>
                </div>

                <div className="border-l-3 border-amber-500 pl-2.5">
                  <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wide">3. Jurnal Pembelajaran Fisik</h4>
                  <p className="mt-0.5">Apabila melakukan klaim pengajuan manual di menu Laporan, Anda wajib menyertakan foto jurnal fisik yang telah ditandatangani oleh orang tua/wali murid sebagai bukti sah.</p>
                </div>

                <div className="border-l-3 border-purple-500 pl-2.5">
                  <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wide">4. Uang Titipan Pembayaran</h4>
                  <p className="mt-0.5">Seluruh uang pendaftaran atau uang bulanan siswa yang dititipkan melalui Tutor wajib diserahkan secara utuh kepada Admin Keuangan maksimal dalam waktu 3 hari setelah diterima.</p>
                </div>

                <div className="border-l-3 border-rose-500 pl-2.5">
                  <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wide">5. Etika & Profesionalisme</h4>
                  <p className="mt-0.5">Gunakan pakaian yang rapi, sopan, bersikap ramah, serta menjaga integritas lembaga. Fokus utama bimbingan adalah pemahaman konsep materi dan kenyamanan siswa belajar.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex">
              <button
                onClick={() => setIsSopOpen(false)}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer text-center"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CATAT TITIPAN UANG SISWA
          ======================================================== */}
      {isDepositFormOpen && (
        <div id="quick-deposit-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-slide-up">
            <div className="bg-amber-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins size={18} />
                <h3 className="font-extrabold text-sm tracking-tight">Catat Titipan Uang Siswa</h3>
              </div>
              <button
                onClick={() => setIsDepositFormOpen(false)}
                className="text-white hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="p-5 space-y-4">
              {/* Select Student */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pilih Siswa *</label>
                <select
                  required
                  value={depositSiswaId}
                  onChange={(e) => setDepositSiswaId(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.nama} ({s.id})</option>
                  ))}
                </select>
              </div>

              {/* Amount of payment */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jumlah Nominal Uang (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1000"
                  placeholder="Contoh: 150000"
                  value={depositJumlah}
                  onChange={(e) => setDepositJumlah(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Terima dari Siswa *</label>
                <CustomDatePicker
                  required
                  value={depositTanggal}
                  onChange={(val) => setDepositTanggal(val)}
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-[11px] text-amber-900 leading-normal flex gap-2">
                <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Setelah mencatat titipan ini, Anda wajib segera menyetorkan uang fisiknya ke Admin Keuangan agar status disetujui/diverifikasi.
                </span>
              </div>

              <div className="flex gap-2 pt-2.5 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsDepositFormOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-98"
                >
                  Simpan Titipan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRaportOpen && (
        <TutorRaport
          db={db}
          tutorId={tutorId}
          onUpdateDb={onUpdateDb}
          onClose={() => setIsRaportOpen(false)}
        />
      )}

    </div>
  );
}
