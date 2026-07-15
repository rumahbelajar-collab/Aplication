import React, { useState, useEffect } from "react";
import { 
  Users, 
  Wallet, 
  Coins, 
  Receipt, 
  BookOpen, 
  Calendar, 
  Plus, 
  Check, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronRight,
  ChevronLeft,
  Download,
  Info,
  DollarSign,
  Minus
} from "lucide-react";
import { 
  Database, 
  formatRupiah, 
  formatTanggalIndo, 
  saveDatabase,
  getStudentBalance,
  getTutorHonorBalance,
  getTutorDepositBalance,
  getKasLembagaBalance,
  addPaymentTransaction,
  confirmTutorDepositHandover,
  payTutorHonorTransaction,
  addGeneralExpenseTransaction,
  addOtherIncomeTransaction,
  filterByDateRange,
  getTodayDateString,
  formatBulanTahun
} from "../lib/db";
import { 
  downloadRekeningBelajarPDF, 
  downloadRekeningHonorTutorPDF, 
  downloadSlipGajiPDF 
} from "../lib/pdfGenerator";
import DateRangeFilter, { DateRangePreset } from "./DateRangeFilter";
import CustomDatePicker from "./CustomDatePicker";
import { Siswa, Tutor } from "../types";

interface AdminKeuanganProps {
  db: Database;
  onUpdateDb: (newDb: Database) => void;
  selectedEntityId?: string; // If navigated from another tab with a pre-selected student/tutor
  onClearSelectedId?: () => void;
  // State from main to open modals from quick actions
  quickActionOpen?: "session" | "payment" | "handover" | "honor" | null;
  onCloseQuickAction?: () => void;
  defaultSubTab?: "siswa" | "titipan" | "honor" | "kas" | "lain";
}

export default function AdminKeuangan({
  db,
  onUpdateDb,
  selectedEntityId,
  onClearSelectedId,
  quickActionOpen,
  onCloseQuickAction,
  defaultSubTab
}: AdminKeuanganProps) {
  const [activeSubTab, setActiveSubTab] = useState<"siswa" | "titipan" | "honor" | "kas" | "lain">("siswa");

  // Sync activeSubTab when defaultSubTab changes
  useEffect(() => {
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  // Date Range State
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

  // Selected Student/Tutor details ledger sub-view
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);

  // Forms Modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isHonorModalOpen, setIsHonorModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Form Fields
  // Student payment form
  const [paySiswaId, setPaySiswaId] = useState("");
  const [payJumlah, setPayJumlah] = useState(120000);
  const [payMetode, setPayMetode] = useState<"admin" | "tutor">("admin");
  const [payTutorId, setPayTutorId] = useState("");
  const [payTanggal, setPayTanggal] = useState(getTodayDateString());

  // Tutor honor payment form
  const [honorTutorId, setHonorTutorId] = useState("");
  const [honorJumlah, setHonorJumlah] = useState(150000);
  const [honorPeriode, setHonorPeriode] = useState(formatBulanTahun(getTodayDateString()));
  const [honorTanggal, setHonorTanggal] = useState(getTodayDateString());
  const [honorCatatan, setHonorCatatan] = useState("");
  const [honorPotongan, setHonorPotongan] = useState(0);
  const [honorKeteranganPotongan, setHonorKeteranganPotongan] = useState("");

  // General expense form
  const [expenseKeterangan, setExpenseKeterangan] = useState("");
  const [expenseJumlah, setExpenseJumlah] = useState(50000);
  const [expenseTanggal, setExpenseTanggal] = useState(getTodayDateString());

  // Other income form state
  const [isOtherIncomeModalOpen, setIsOtherIncomeModalOpen] = useState(false);
  const [otherIncomeTanggal, setOtherIncomeTanggal] = useState(getTodayDateString());
  const [otherIncomeJenis, setOtherIncomeJenis] = useState("Modul Belajar");
  const [otherIncomeNominal, setOtherIncomeNominal] = useState(75000);
  const [otherIncomeKeterangan, setOtherIncomeKeterangan] = useState("");

  // Handover confirmation state
  const [confirmingHandoverId, setConfirmingHandoverId] = useState<string | null>(null);

  // Handle deep-linking from Operasional Tab
  useEffect(() => {
    if (selectedEntityId) {
      // Check if it's a student
      const s = db.students.find(x => x.id === selectedEntityId);
      if (s) {
        setActiveSubTab("siswa");
        setSelectedStudent(s);
        setSelectedTutor(null);
        setPaySiswaId(s.id);
      } else {
        // Check if it's a tutor
        const t = db.tutors.find(x => x.id === selectedEntityId);
        if (t) {
          setActiveSubTab("honor");
          setSelectedTutor(t);
          setSelectedStudent(null);
          setHonorTutorId(t.id);
        }
      }
      if (onClearSelectedId) onClearSelectedId();
    }
  }, [selectedEntityId]);

  // Handle Quick Actions triggered from Dashboard
  useEffect(() => {
    if (quickActionOpen) {
      if (quickActionOpen === "payment") {
        setPaySiswaId(db.students[0]?.id || "");
        setPayTutorId(db.tutors[0]?.id || "");
        setPayTanggal(getTodayDateString());
        setPayJumlah(120000);
        setIsPayModalOpen(true);
      } else if (quickActionOpen === "honor") {
        setHonorTutorId(db.tutors[0]?.id || "");
        setHonorTanggal(getTodayDateString());
        setHonorJumlah(150000);
        setHonorPeriode(formatBulanTahun(getTodayDateString()));
        setHonorCatatan("");
        setIsHonorModalOpen(true);
      } else if (quickActionOpen === "handover") {
        setActiveSubTab("titipan");
      }
      if (onCloseQuickAction) onCloseQuickAction();
    }
  }, [quickActionOpen]);

  // Submit Student Payment
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySiswaId || payJumlah <= 0) {
      alert("Siswa dan Jumlah Pembayaran harus valid.");
      return;
    }

    if (payMetode === "tutor" && !payTutorId) {
      alert("Harap tentukan Tutor penerima titipan.");
      return;
    }

    const nextDb = addPaymentTransaction(db, {
      tanggal: payTanggal,
      siswaId: paySiswaId,
      jumlah: Number(payJumlah),
      metode: payMetode,
      tutorId: payMetode === "tutor" ? payTutorId : undefined
    });

    onUpdateDb(nextDb);
    setIsPayModalOpen(false);
    
    // Refresh currently selected student ledger context if open
    if (selectedStudent && selectedStudent.id === paySiswaId) {
      setSelectedStudent(nextDb.students.find(s => s.id === paySiswaId) || null);
    }
    
    alert("Pembayaran berhasil dicatat.");
  };

  // Submit Tutor Honor Payout
  const handleHonorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!honorTutorId || honorJumlah <= 0) {
      alert("Tutor dan Jumlah Honor harus valid.");
      return;
    }

    const currentOwed = getTutorHonorBalance(db, honorTutorId);
    if (honorJumlah > currentOwed) {
      if (!window.confirm(`Jumlah pembayaran (${formatRupiah(honorJumlah)}) melebihi saldo terutang tutor (${formatRupiah(currentOwed)}). Tetap lanjutkan?`)) {
        return;
      }
    }

    const deduction = Number(honorPotongan || 0);
    if (deduction > honorJumlah) {
      alert("Jumlah potongan tidak boleh melebihi jumlah honor yang dibayarkan.");
      return;
    }

    const nextDb = payTutorHonorTransaction(db, {
      tanggal: honorTanggal,
      tutorId: honorTutorId,
      jumlah: Number(honorJumlah),
      periode: honorPeriode,
      catatan: honorCatatan,
      potongan: deduction,
      keteranganPotongan: honorKeteranganPotongan
    });

    onUpdateDb(nextDb);
    setIsHonorModalOpen(false);
    setHonorPotongan(0);
    setHonorKeteranganPotongan("");

    // Refresh currently selected tutor ledger context if open
    if (selectedTutor && selectedTutor.id === honorTutorId) {
      setSelectedTutor(nextDb.tutors.find(t => t.id === honorTutorId) || null);
    }

    // Auto-download PDF Slip Gaji
    const latestSlip = nextDb.slips[0]; // Slips is prepended
    const tutorObj = nextDb.tutors.find(t => t.id === honorTutorId)!;
    const ledger = nextDb.tutorLedger.filter(l => l.tutorId === honorTutorId);
    downloadSlipGajiPDF(latestSlip, tutorObj, ledger);

    alert("Pembayaran honor berhasil dicatat. Slip Gaji PDF otomatis diunduh.");
  };

  // Submit General Expense (Miscellaneous Outflows)
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseKeterangan.trim() || expenseJumlah <= 0) {
      alert("Keterangan dan Jumlah pengeluaran harus valid.");
      return;
    }

    const nextDb = addGeneralExpenseTransaction(db, {
      tanggal: expenseTanggal,
      keterangan: expenseKeterangan,
      jumlah: Number(expenseJumlah)
    });

    onUpdateDb(nextDb);
    setIsExpenseModalOpen(false);
    alert("Pengeluaran operasional berhasil dicatat.");
  };

  // Submit Other Income (Pemasukan Lain)
  const handleOtherIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherIncomeJenis.trim() || otherIncomeNominal <= 0) {
      alert("Jenis pemasukan dan Nominal harus valid.");
      return;
    }

    const nextDb = addOtherIncomeTransaction(db, {
      tanggal: otherIncomeTanggal,
      jenis: otherIncomeJenis,
      nominal: Number(otherIncomeNominal),
      keterangan: otherIncomeKeterangan.trim() || undefined
    });

    onUpdateDb(nextDb);
    setIsOtherIncomeModalOpen(false);
    setOtherIncomeKeterangan("");
    alert("Pemasukan lain-lain berhasil dicatat dan masuk ke Kas Lembaga.");
  };

  // Handover Titipan Tutor to Admin
  const handleHandoverConfirm = (paymentId: string) => {
    const payItem = db.payments.find(p => p.id === paymentId);
    if (!payItem) return;

    const todayStr = getTodayDateString();
    const nextDb = confirmTutorDepositHandover(db, paymentId, todayStr);
    onUpdateDb(nextDb);
    setConfirmingHandoverId(null);
  };

  return (
    <div id="admin-keuangan-container" className="px-2 py-4 pb-20">
      
      {/* CENTRAL DATE RANGE FILTER */}
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

      {/* FINANCE SUBTABS */}
      <div className="grid grid-cols-4 bg-white p-1 rounded-lg border border-slate-100 shadow-2xs mb-5 shrink-0">
        <button
          id="tab-keu-rekening"
          onClick={() => { setActiveSubTab("siswa"); setSelectedStudent(null); }}
          className={`py-2 text-[9.5px] font-bold rounded-lg cursor-pointer transition-all ${
            activeSubTab === "siswa" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Tagihan (SPP)
        </button>
        <button
          id="tab-keu-titipan"
          onClick={() => { setActiveSubTab("titipan"); }}
          className={`py-2 text-[9.5px] font-bold rounded-lg cursor-pointer transition-all ${
            activeSubTab === "titipan" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Titipan
        </button>
        <button
          id="tab-keu-honor"
          onClick={() => { setActiveSubTab("honor"); setSelectedTutor(null); }}
          className={`py-2 text-[9.5px] font-bold rounded-lg cursor-pointer transition-all ${
            activeSubTab === "honor" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Honor
        </button>
        <button
          id="tab-keu-kas"
          onClick={() => { setActiveSubTab("kas"); }}
          className={`py-2 text-[9.5px] font-bold rounded-lg cursor-pointer transition-all ${
            activeSubTab === "kas" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Buku Kas
        </button>
      </div>

      {/* ==============================================
          1. REKENING SISWA SUB-TAB
          ============================================== */}
      {activeSubTab === "siswa" && (
        <div className="space-y-4">
          {!selectedStudent ? (
            // Student account summaries list
            <div className="space-y-2.5">
              <div className="flex justify-between items-center mb-5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Rekening Tagihan Siswa (SPP)</span>
                <button
                  id="keu-pay-siswa-btn"
                  onClick={() => setIsPayModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100 hover:bg-brand-100 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  Catat Pembayaran
                </button>
              </div>

              {db.students.map((student) => {
                const balance = getStudentBalance(db, student.id);
                const prog = db.programs.find(p => p.id === student.programId);
                
                return (
                  <div
                    key={student.id}
                    id={`keu-student-card-${student.id}`}
                    onClick={() => {
                      setSelectedStudent(student);
                      setPaySiswaId(student.id);
                    }}
                    className="bg-white p-5 rounded-lg border border-slate-100 shadow-3xs flex items-center justify-between hover:border-brand-300 transition-all cursor-pointer active:scale-98"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">{student.id}</p>
                      <h4 className="text-sm font-extrabold text-slate-800 truncate tracking-tight">{student.nama}</h4>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Sisa Tagihan</p>
                        <p className={`text-xs font-black font-mono mt-0.5 ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {balance > 0 ? `-${formatRupiah(balance)}` : balance < 0 ? `+${formatRupiah(Math.abs(balance))}` : "Rp 0"}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 mt-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // DETAILED PASSBOOK VIEW (BUKU TABUNGAN)
            <div id="student-ledger-view" className="space-y-4 animate-slide-up">
              {/* Back to list */}
              <button
                id="back-to-students-btn"
                onClick={() => setSelectedStudent(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 cursor-pointer"
              >
                <ChevronLeft size={16} />
                Kembali ke Daftar Tagihan
              </button>

              {/* Student Header Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-extrabold text-base text-slate-800 tracking-tight">{selectedStudent.nama}</h3>
                  <span className="text-[9px] font-bold font-mono bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full">{selectedStudent.id}</span>
                </div>

                {/* Ledger calculation for selected ranges */}
                {(() => {
                  const studentLedgerAll = db.studentLedger.filter(l => l.siswaId === selectedStudent.id);
                  const filteredLedger = filterByDateRange(studentLedgerAll, rangeType, customStart, customEnd);
                  
                  const debit = filteredLedger.filter(l => l.tipe === "debit").reduce((sum, l) => sum + l.jumlah, 0);
                  const credit = filteredLedger.filter(l => l.tipe === "kredit").reduce((sum, l) => sum + l.jumlah, 0);
                  const currentBalance = studentLedgerAll.length > 0 ? studentLedgerAll[studentLedgerAll.length - 1].saldoBerjalan : 0;
                  const activeProg = db.programs.find(p => p.id === selectedStudent.programId);

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Tagihan</span>
                          <span className="font-bold text-rose-500 font-mono text-xs">{formatRupiah(debit)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Pembayaran</span>
                          <span className="font-bold text-emerald-500 font-mono text-xs">{formatRupiah(credit)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 mt-1">
                        <div>
                          <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider block">Sisa tagihan saat ini</span>
                          <span className={`text-base font-extrabold font-mono ${currentBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {currentBalance > 0 ? `Kurang: ${formatRupiah(currentBalance)}` : currentBalance < 0 ? `Lebih: ${formatRupiah(Math.abs(currentBalance))}` : "Lunas : Rp 0"}
                          </span>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            id="pdf-rekening-download-btn"
                            onClick={() => downloadRekeningBelajarPDF(selectedStudent, activeProg!, filteredLedger, rangeType === "semua" ? "Semua Waktu" : rangeType === "custom" ? `${formatTanggalIndo(customStart)} - ${formatTanggalIndo(customEnd)}` : rangeType.toUpperCase())}
                            className="p-2 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl cursor-pointer border border-brand-100 active:scale-95 transition-all flex items-center gap-1 font-bold text-xs"
                          >
                            <Download size={14} />
                            PDF
                          </button>
                          <button
                            id="quick-pay-student-btn"
                            onClick={() => {
                              setPaySiswaId(selectedStudent.id);
                              setIsPayModalOpen(true);
                            }}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all text-xs font-bold"
                          >
                            Bayar
                          </button>
                        </div>
                      </div>

                      {/* Chronological Table ledger */}
                      <div className="mt-4">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Riwayat Mutasi Tagihan</p>
                        <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
                                <th className="p-2.5">Tanggal</th>
                                <th className="p-2.5">Keterangan</th>
                                <th className="p-2.5 text-right">Tagihan</th>
                                <th className="p-2.5 text-right">Bayar</th>
                                <th className="p-2.5 text-right">Kurang</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLedger.slice().reverse().map((item) => (
                                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                  <td className="p-2.5 text-[10px] font-medium font-mono text-slate-500 whitespace-nowrap">{formatTanggalIndo(item.tanggal)}</td>
                                  <td className="p-2.5 font-semibold text-slate-700 leading-tight">{item.keterangan}</td>
                                  <td className="p-2.5 text-right font-mono font-medium text-rose-600">{item.tipe === "debit" ? formatRupiah(item.jumlah) : "-"}</td>
                                  <td className="p-2.5 text-right font-mono font-medium text-emerald-600">{item.tipe === "kredit" ? formatRupiah(item.jumlah) : "-"}</td>
                                  <td className="p-2.5 text-right font-mono font-semibold text-slate-600">{formatRupiah(item.saldoBerjalan)}</td>
                                </tr>
                              ))}
                              
                              {filteredLedger.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="p-6 text-center text-xs text-slate-400">Belum ada mutasi rekening untuk rentang tanggal ini.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==============================================
          2. TITIPAN TUTOR SUB-TAB
          ============================================== */}
      {activeSubTab === "titipan" && (
        <div className="space-y-8">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5 px-2">Status Saldo Titipan Tutor</h3>
          <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs">
            
            <div className="space-y-3">
              {db.tutors.map((tutor) => {
                const pendingDeposit = getTutorDepositBalance(db, tutor.id);
                
                return (
                  <div key={tutor.id} id={`titipan-tutor-row-${tutor.id}`} className="flex items-center justify-between pb-3 last:pb-0 border-b border-slate-50 last:border-0">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-700">{tutor.nama}</h4>
                      <p className="text-[10px] text-slate-400">ID Tutor: {tutor.id}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Saldo di Tangan</p>
                      <p className={`text-xs font-black font-mono ${pendingDeposit > 0 ? "text-amber-600 font-extrabold" : "text-slate-400"}`}>
                        {formatRupiah(pendingDeposit)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending payments to be confirmed / handed over to Admin */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-2">Verifikasi Setoran Pembayaran</h3>
            <div className="space-y-3">
              {/* Filter payments with method 'tutor' */}
              {(() => {
                const tutorPayments = db.payments.filter(p => p.metode === "tutor");
                const filteredPayments = filterByDateRange(tutorPayments, rangeType, customStart, customEnd);

                return (
                  <>
                    {filteredPayments.map((p) => (
                      <div 
                        key={p.id} 
                        id={`pending-payment-card-${p.id}`}
                        className="bg-white p-5 rounded-lg border border-slate-100 shadow-3xs flex flex-col gap-2 relative"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] font-bold font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                            {p.id}
                          </span>
                          <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            p.statusTitipan === "diserahkan" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50/70 text-rose-600"
                          }`}>
                            {p.statusTitipan === "diserahkan" ? "Diterima Kas" : "Di Tangan Tutor"}
                          </span>
                        </div>

                        <div>
                          <p className="text-[11px] text-slate-500 font-medium">Siswa: <span className="font-extrabold text-slate-700">{p.siswaNama}</span></p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Tutor Penerima: <span className="font-extrabold text-slate-700">{p.tutorNama}</span></p>
                          <p className="text-[11px] text-slate-400 mt-1 font-medium font-mono">Tgl Titip: {formatTanggalIndo(p.tanggal)}</p>
                          {p.tanggalSerah && (
                            <p className="text-[11px] text-slate-400 font-medium font-mono">Tgl Setor: {formatTanggalIndo(p.tanggalSerah)}</p>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-50 mt-1">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Jumlah Uang</span>
                            <p className="text-xs font-black text-slate-800 font-mono leading-tight">{formatRupiah(p.jumlah)}</p>
                          </div>

                          {p.statusTitipan === "pending" && (
                            confirmingHandoverId === p.id ? (
                              <div className="flex flex-col gap-1.5 items-end bg-amber-50/75 p-2 rounded-xl border border-amber-100 max-w-[200px] animate-fade-in">
                                <span className="text-[9px] font-bold text-amber-900 text-right">Konfirmasi terima dana?</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => setConfirmingHandoverId(null)}
                                    className="text-[9.5px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg active:scale-95 transition-all cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    onClick={() => handleHandoverConfirm(p.id)}
                                    className="text-[9.5px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-lg active:scale-95 transition-all cursor-pointer"
                                  >
                                    Ya, Setuju
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                id={`confirm-handover-btn-${p.id}`}
                                onClick={() => setConfirmingHandoverId(p.id)}
                                className="flex items-center gap-1 text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
                              >
                                <Check size={12} />
                                Konfirmasi Terima
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredPayments.length === 0 && (
                      <p className="text-center py-8 text-xs text-slate-400">Tidak ada transaksi titipan tutor pada periode ini.</p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================
          3. HONOR & SLIP GAJI SUB-TAB
          ============================================== */}
      {activeSubTab === "honor" && (
        <div className="space-y-4">
          {!selectedTutor ? (
            // Tutor list and honor owed summaries
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Rekening Honor Tutor</span>
                <button
                  id="keu-pay-honor-btn"
                  onClick={() => setIsHonorModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  Bayar Honor
                </button>
              </div>

              {db.tutors.map((tutor) => {
                const balance = getTutorHonorBalance(db, tutor.id);
                return (
                  <div
                    key={tutor.id}
                    id={`keu-tutor-card-${tutor.id}`}
                    onClick={() => {
                      setSelectedTutor(tutor);
                      setHonorTutorId(tutor.id);
                    }}
                    className="bg-white p-5 rounded-lg border border-slate-100 shadow-3xs flex items-center justify-between hover:border-brand-300 transition-all cursor-pointer active:scale-98"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">{tutor.id}</p>
                      <h4 className="text-sm font-extrabold text-slate-800 truncate tracking-tight">{tutor.nama}</h4>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Sisa Honor</p>
                        <p className={`text-xs font-black font-mono mt-0.5 text-indigo-600`}>
                          {formatRupiah(balance)}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 mt-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // DETAILED TUTOR HONOR ACCOUNT MUTATIONS
            <div id="tutor-honor-ledger-view" className="space-y-4 animate-slide-up">
              {/* Back button */}
              <button
                id="back-to-tutors-btn"
                onClick={() => setSelectedTutor(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 cursor-pointer"
              >
                <ChevronLeft size={16} />
                Kembali ke Daftar Honor
              </button>

              {/* Tutor Header Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-extrabold text-base text-slate-800 tracking-tight">{selectedTutor.nama}</h3>
                  <span className="text-[9px] font-bold font-mono bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full">{selectedTutor.id}</span>
                </div>

                {/* Ledger calculation */}
                {(() => {
                  const tutorLedgerAll = db.tutorLedger.filter(l => l.tutorId === selectedTutor.id);
                  const filteredLedger = filterByDateRange(tutorLedgerAll, rangeType, customStart, customEnd);

                  const earned = filteredLedger.filter(l => l.tipe === "kredit").reduce((sum, l) => sum + l.jumlah, 0);
                  const paid = filteredLedger.filter(l => l.tipe === "debit").reduce((sum, l) => sum + l.jumlah, 0);
                  const currentBalance = tutorLedgerAll.length > 0 ? tutorLedgerAll[tutorLedgerAll.length - 1].saldoBerjalan : 0;

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Honor</span>
                          <span className="font-bold text-rose-500 font-mono text-xs">{formatRupiah(earned)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Honor terbayar</span>
                          <span className="font-bold text-emerald-500 font-mono text-xs">{formatRupiah(paid)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 mt-1">
                        <div>
                          <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider block">Sisa Honor</span>
                          <span className="text-base font-extrabold font-mono text-indigo-600">
                            {formatRupiah(currentBalance)}
                          </span>
                        </div>

                        <div className="flex gap-1">
                          <button
                            id="pdf-tutor-ledger-btn"
                            onClick={() => downloadRekeningHonorTutorPDF(selectedTutor, filteredLedger, rangeType === "semua" ? "Semua Waktu" : rangeType === "custom" ? `${formatTanggalIndo(customStart)} - ${formatTanggalIndo(customEnd)}` : rangeType.toUpperCase())}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl cursor-pointer border border-indigo-100 active:scale-95 transition-all flex items-center gap-1 font-bold text-xs"
                          >
                            <Download size={14} />
                            PDF
                          </button>
                          <button
                            id="quick-pay-honor-btn"
                            onClick={() => {
                              setHonorTutorId(selectedTutor.id);
                              setIsHonorModalOpen(true);
                            }}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all text-xs font-bold"
                          >
                            Bayar Gaji
                          </button>
                        </div>
                      </div>

                      {/* Chronological Table ledger */}
                      <div className="mt-4">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Riwayat Mutasi Honor</p>
                        <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
                                <th className="p-2.5">Tanggal</th>
                                <th className="p-2.5">Keterangan</th>
                                <th className="p-2.5 text-right">Tarik Honor</th>
                                <th className="p-2.5 text-right">Honor Masuk</th>
                                <th className="p-2.5 text-right">Sisa Honor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLedger.slice().reverse().map((item) => (
                                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                  <td className="p-2.5 text-[10px] font-medium font-mono text-slate-500 whitespace-nowrap">{formatTanggalIndo(item.tanggal)}</td>
                                  <td className="p-2.5 font-semibold text-slate-700 leading-tight">{item.keterangan}</td>
                                  <td className="p-2.5 text-right font-mono font-medium text-rose-600">{item.tipe === "debit" ? formatRupiah(item.jumlah) : "-"}</td>
                                  <td className="p-2.5 text-right font-mono font-medium text-indigo-600">{item.tipe === "kredit" ? formatRupiah(item.jumlah) : "-"}</td>
                                  <td className="p-2.5 text-right font-mono font-semibold text-slate-600">{formatRupiah(item.saldoBerjalan)}</td>
                                </tr>
                              ))}

                              {filteredLedger.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="p-6 text-center text-xs text-slate-400">Belum ada mutasi honor untuk rentang tanggal ini.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==============================================
          4. BUKU KAS LEMBAGA SUB-TAB
          ============================================== */}
      {activeSubTab === "kas" && (
        <div className="space-y-4">
<div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 rounded-lg shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
  <p className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold">Total Kas Lembaga Saat Ini</p>
  <h2 className="text-2xl font-black font-mono tracking-tight">{formatRupiah(getKasLembagaBalance(db))}</h2>
  
  {/* Kontainer untuk membungkus kedua tombol agar berjejer ke samping secara rapi */}
  <div className="flex flex-wrap items-center gap-2 mt-3.5">
    
    {/* 1. Tombol Catat Pengeluaran Operasional */}
    <button
      id="record-misc-expense-btn"
      onClick={() => setIsExpenseModalOpen(true)}
      className="flex items-center justify-center gap-1 text-[10.5px] font-black bg-white text-emerald-800 hover:bg-emerald-50 px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 flex-1 sm:flex-initial"
    >
      <Minus size={14} className="stroke-[3]" />
      <span>Catat Pengeluaran Operasional</span>
    </button>
    
    {/* 2. Tombol Catat Pemasukan Lain */}
    <button
      onClick={() => setIsOtherIncomeModalOpen(true)}
      className="flex items-center justify-center gap-1 text-[10.5px] font-black bg-white text-emerald-800 hover:bg-emerald-50 px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 flex-1 sm:flex-initial"
    >
      <Plus size={14} className="stroke-[3]" />
      <span>Catat Pemasukan Lain</span>
    </button>

  </div>
</div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Arus Buku Kas Lembaga</h3>
            
            <div className="border border-slate-100 rounded-lg bg-white overflow-hidden text-xs shadow-3xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3 text-right">Inflow(+)</th>
                    <th className="p-3 text-right">Outflow(-)</th>
                    <th className="p-3 text-right">Saldo Kas</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredKas = filterByDateRange(db.kas, rangeType, customStart, customEnd);
                    return (
                      <>
                        {filteredKas.slice().reverse().map((item) => (
                          <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="p-3 text-[10px] font-medium font-mono text-slate-500 whitespace-nowrap">{formatTanggalIndo(item.tanggal)}</td>
                            <td className="p-3 font-semibold text-slate-700 leading-tight">{item.keterangan}</td>
                            <td className="p-3 text-right font-mono font-medium text-emerald-600">{item.tipe === "masuk" ? formatRupiah(item.jumlah) : "-"}</td>
                            <td className="p-3 text-right font-mono font-medium text-rose-600">{item.tipe === "keluar" ? formatRupiah(item.jumlah) : "-"}</td>
                            <td className="p-3 text-right font-mono font-semibold text-slate-600">{formatRupiah(item.saldoBerjalan)}</td>
                          </tr>
                        ))}

                        {filteredKas.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-xs text-slate-400">Belum ada pencatatan kas pada periode ini.</td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALS & FORMS
          ======================================================== */}
      
      {/* 1. STUDENT PAYMENT MODAL */}
      {isPayModalOpen && (
        <div id="payment-form-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-slide-up">
            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">Terima Pembayaran Siswa</h3>
              <Coins size={18} />
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Siswa Pembayar *</label>
                <select
                  id="select-pay-siswa"
                  value={paySiswaId}
                  onChange={(e) => setPaySiswaId(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  {db.students.map((s) => (
                    <option key={s.id} value={s.id}>{s.nama} ({s.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jumlah Uang (Rupiah) *</label>
                <input
                  type="number"
                  id="input-pay-jumlah"
                  required
                  value={payJumlah}
                  onChange={(e) => setPayJumlah(Number(e.target.value))}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Menerima Lewat Jalur *</label>
                <select
                  id="select-pay-metode"
                  value={payMetode}
                  onChange={(e) => setPayMetode(e.target.value as any)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="admin">Langsung ke Admin</option>
                  <option value="tutor">Dititipkan Lewat Tutor</option>
                </select>
              </div>

              {payMetode === "tutor" && (
                <div className="animate-slide-up">
                  <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pilih Tutor Penerima *</label>
                  <select
                    id="select-pay-tutor"
                    value={payTutorId}
                    onChange={(e) => setPayTutorId(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">-- Pilih Tutor --</option>
                    {db.tutors.filter(t => t.status === "aktif").map((t) => (
                      <option key={t.id} value={t.id}>{t.nama}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-amber-600 mt-1 flex items-start gap-1">
                    <Info size={12} className="shrink-0 mt-0.5" />
                    Uang terlebih dahulu tercatat sebagai Saldo Titipan Tutor, belum masuk Kas Lembaga.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Transaksi</label>
                <CustomDatePicker
                  id="input-pay-tanggal"
                  value={payTanggal}
                  onChange={(val) => setPayTanggal(val)}
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  id="pay-cancel-btn"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="pay-submit-btn"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Simpan Bayar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. TUTOR HONOR DISBURSEMENT MODAL */}
      {isHonorModalOpen && (
        <div id="honor-form-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-slide-up">
            <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">Bayar Gaji / Honor Tutor</h3>
              <Receipt size={18} />
            </div>

            <form onSubmit={handleHonorSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Penerima Honor (Tutor) *</label>
                <select
                  id="select-honor-tutor"
                  value={honorTutorId}
                  onChange={(e) => {
                    setHonorTutorId(e.target.value);
                    const bal = getTutorHonorBalance(db, e.target.value);
                    setHonorJumlah(bal > 0 ? bal : 150000);
                  }}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  {db.tutors.map((t) => (
                    <option key={t.id} value={t.id}>{t.nama} (Saldo: {formatRupiah(getTutorHonorBalance(db, t.id))})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jumlah Honor yang Dibayarkan *</label>
                <input
                  type="number"
                  id="input-honor-jumlah"
                  required
                  value={honorJumlah}
                  onChange={(e) => setHonorJumlah(Number(e.target.value))}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <label className="block text-[10.5px] text-rose-500 font-bold uppercase tracking-wider mb-1">Potongan Honor (Rp)</label>
                  <input
                    type="number"
                    id="input-honor-potongan"
                    min="0"
                    placeholder="0"
                    value={honorPotongan || ""}
                    onChange={(e) => setHonorPotongan(Number(e.target.value))}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 font-mono text-amber-900"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Alasan Potongan</label>
                  <input
                    type="text"
                    id="input-honor-alasan-potongan"
                    placeholder="Contoh: Kas, Tabungan"
                    value={honorKeteranganPotongan}
                    onChange={(e) => setHonorKeteranganPotongan(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Live Preview of Net Honor */}
              {honorPotongan > 0 && (
                <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3 text-xs flex justify-between items-center text-amber-900">
                  <div className="font-bold">Honor Bersih (Take Home Pay):</div>
                  <div className="font-black text-sm font-mono text-amber-800">
                    {formatRupiah(Math.max(0, honorJumlah - honorPotongan))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Periode Gaji *</label>
                  <input
                    type="text"
                    id="input-honor-periode"
                    required
                    placeholder="Contoh: Juni 2026"
                    value={honorPeriode}
                    onChange={(e) => setHonorPeriode(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Bayar</label>
                  <CustomDatePicker
                    id="input-honor-tanggal"
                    value={honorTanggal}
                    onChange={(val) => setHonorTanggal(val)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Catatan Tambahan</label>
                <textarea
                  id="input-honor-catatan"
                  placeholder="Contoh: Pembayaran honor 12 sesi mengajar"
                  value={honorCatatan}
                  onChange={(e) => setHonorCatatan(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  id="honor-cancel-btn"
                  onClick={() => setIsHonorModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="honor-submit-btn"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Bayar & Unduh PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. GENERAL EXPENSE (OPERASIONAL OUTFLOW) MODAL */}
      {isExpenseModalOpen && (
        <div id="expense-form-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-slide-up">
            <div className="bg-rose-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">Catat Pengeluaran Operasional</h3>
              <ArrowDownLeft size={18} />
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Keterangan Pengeluaran *</label>
                <input
                  type="text"
                  id="input-expense-desc"
                  required
                  placeholder="Contoh: Pembelian Spidol & Kertas HVS"
                  value={expenseKeterangan}
                  onChange={(e) => setExpenseKeterangan(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jumlah Pengeluaran (Rupiah) *</label>
                <input
                  type="number"
                  id="input-expense-jumlah"
                  required
                  value={expenseJumlah}
                  onChange={(e) => setExpenseJumlah(Number(e.target.value))}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Pengeluaran</label>
                <CustomDatePicker
                  id="input-expense-tanggal"
                  value={expenseTanggal}
                  onChange={(val) => setExpenseTanggal(val)}
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  id="expense-cancel-btn"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="expense-submit-btn"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. OTHER INCOME (PEMASUKAN LAIN) RECORDING MODAL */}
      {isOtherIncomeModalOpen && (
        <div id="other-income-form-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-slide-up">
            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">Catat Pemasukan Lain-Lain</h3>
              <ArrowUpRight size={18} />
            </div>

            <form onSubmit={handleOtherIncomeSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jenis Pemasukan *</label>
                <select
                  required
                  value={otherIncomeJenis}
                  onChange={(e) => setOtherIncomeJenis(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="Uang Pendaftaran">Uang Pendaftaran (Siswa Baru)</option>
                  <option value="Modul Belajar">Modul & Buku Belajar</option>
                  <option value="Seragam Lembaga">Pembelian Seragam</option>
                  <option value="Donasi / Sponsor">Donasi / Sponsorship</option>
                  <option value="Pemasukan Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jumlah Uang (Rupiah) *</label>
                <input
                  type="number"
                  required
                  value={otherIncomeNominal}
                  onChange={(e) => setOtherIncomeNominal(Number(e.target.value))}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Transaksi</label>
                <CustomDatePicker
                  value={otherIncomeTanggal}
                  onChange={(val) => setOtherIncomeTanggal(val)}
                />
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Keterangan / Catatan Tambahan (Opsional)</label>
                <textarea
                  placeholder="Contoh: Pembelian buku modul matematika oleh murid RBS01"
                  value={otherIncomeKeterangan}
                  onChange={(e) => setOtherIncomeKeterangan(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsOtherIncomeModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Simpan Pemasukan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
