import React, { useState } from "react";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Phone, 
  MapPin, 
  Tag, 
  Calendar,
  Lock,
  DollarSign,
  Briefcase,
  Eye,
  EyeOff
} from "lucide-react";
import { 
  Database, 
  formatRupiah, 
  formatTanggalIndo, 
  saveDatabase,
  getStudentBalance,
  getTutorHonorBalance,
  getTutorDepositBalance,
  addScheduleTransaction,
  deleteScheduleTransaction,
  getTodayDateString
} from "../lib/db";
import { Siswa, Tutor, ProgramBelajar, JadwalTutor } from "../types";

interface AdminOperasionalProps {
  db: Database;
  onUpdateDb: (newDb: Database) => void;
  onNavigateToTab: (tab: string, subTab?: string, selectedId?: string) => void;
}

export default function AdminOperasional({
  db,
  onUpdateDb,
  onNavigateToTab
}: AdminOperasionalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"siswa" | "tutor" | "program" | "jadwal">("siswa");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals / Form toggles
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form Fields
  const [studentName, setStudentName] = useState("");
  const [studentProgram, setStudentProgram] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentAddress, setStudentAddress] = useState("");
  const [studentStatus, setStudentStatus] = useState<"aktif" | "nonaktif">("aktif");

  const [tutorName, setTutorName] = useState("");
  const [tutorLogin, setTutorLogin] = useState("");
  const [tutorPwd, setTutorPwd] = useState("");
  const [showTutorPwd, setShowTutorPwd] = useState(false);
  const [tutorPhone, setTutorPhone] = useState("");
  const [tutorAddress, setTutorAddress] = useState("");
  const [tutorStatus, setTutorStatus] = useState<"aktif" | "nonaktif">("aktif");

  const [progName, setProgName] = useState("");
  const [progLevel, setProgLevel] = useState<"SD" | "SMP" | "SMA" | "Umum">("SD");
  const [progMapel, setProgMapel] = useState("");
  const [progDuration, setProgDuration] = useState(90);
  const [progTarifSiswa, setProgTarifSiswa] = useState(120000);
  const [progHonorTutor, setProgHonorTutor] = useState(60000);
  const [progStatus, setProgStatus] = useState<"aktif" | "nonaktif">("aktif");
  const [progDesc, setProgDesc] = useState("");

  // Schedule Form Fields
  const [schedHari, setSchedHari] = useState<"Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Minggu">("Senin");
  const [schedWaktu, setSchedWaktu] = useState("13:30 - 15:00");
  const [schedTutorId, setSchedTutorId] = useState("");
  const [schedSiswaId, setSchedSiswaId] = useState("");
  const [schedProgramId, setSchedProgramId] = useState("");

  // SORTING ALPHABETICALLY A-Z
  const sortedStudents = [...db.students]
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .filter(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()));

  const sortedTutors = [...db.tutors]
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .filter(t => t.nama.toLowerCase().includes(searchQuery.toLowerCase()));

  const sortedPrograms = [...db.programs]
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .filter(p => p.nama.toLowerCase().includes(searchQuery.toLowerCase()));

  // Open Add Modals
  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsFormOpen(true);
    
    // Clear student fields
    setStudentName("");
    setStudentProgram(db.programs[0]?.id || "");
    setStudentPhone("");
    setStudentAddress("");
    setStudentStatus("aktif");

    // Clear tutor fields
    setTutorName("");
    setTutorLogin("");
    setTutorPwd("123");
    setTutorPhone("");
    setTutorAddress("");
    setTutorStatus("aktif");

    // Clear program fields
    setProgName("");
    setProgLevel("SD");
    setProgMapel("");
    setProgDuration(90);
    setProgTarifSiswa(120000);
    setProgHonorTutor(60000);
    setProgStatus("aktif");
    setProgDesc("");

    // Clear schedule fields
    setSchedHari("Senin");
    setSchedWaktu("13:30 - 15:00");
    setSchedTutorId(db.tutors.filter(t => t.status === "aktif")[0]?.id || "");
    setSchedSiswaId(db.students.filter(s => s.status === "aktif")[0]?.id || "");
    setSchedProgramId(db.programs.filter(p => p.status === "aktif")[0]?.id || "");
  };

  // Open Edit Modals
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIsFormOpen(true);

    if (activeSubTab === "siswa") {
      const s = item as Siswa;
      setStudentName(s.nama);
      setStudentProgram(s.programId);
      setStudentPhone(s.teleponOrangTua);
      setStudentAddress(s.alamat || "");
      setStudentStatus(s.status);
    } else if (activeSubTab === "tutor") {
      const t = item as Tutor;
      setTutorName(t.nama);
      setTutorLogin(t.idLogin);
      setTutorPwd(t.password || "123");
      setTutorPhone(t.telepon);
      setTutorAddress(t.alamat || "");
      setTutorStatus(t.status);
    } else if (activeSubTab === "program") {
      const p = item as ProgramBelajar;
      setProgName(p.nama);
      setProgLevel(p.jenjang);
      setProgMapel(p.mapel);
      setProgDuration(p.durasi);
      setProgTarifSiswa(p.tarifSiswa);
      setProgHonorTutor(p.honorTutor);
      setProgStatus(p.status);
      setProgDesc(p.deskripsi || "");
    } else if (activeSubTab === "jadwal") {
      const j = item as JadwalTutor;
      setSchedHari(j.hari);
      setSchedWaktu(j.waktu);
      setSchedTutorId(j.tutorId);
      setSchedSiswaId(j.siswaId);
      setSchedProgramId(j.programId);
    }
  };

  // Delete Handlers
  const handleDelete = (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini? Semua histori transaksi terkait tidak akan dihapus untuk menjaga integritas keuangan.")) {
      return;
    }

    const nextDb = { ...db };
    if (activeSubTab === "siswa") {
      nextDb.students = nextDb.students.filter(s => s.id !== id);
    } else if (activeSubTab === "tutor") {
      nextDb.tutors = nextDb.tutors.filter(t => t.id !== id);
    } else if (activeSubTab === "program") {
      nextDb.programs = nextDb.programs.filter(p => p.id !== id);
    } else if (activeSubTab === "jadwal") {
      nextDb.schedules = nextDb.schedules.filter(s => s.id !== id);
    }

    saveDatabase(nextDb);
    onUpdateDb(nextDb);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextDb = { ...db };

    if (activeSubTab === "siswa") {
      if (!studentName.trim() || !studentPhone.trim()) {
        alert("Nama dan Telepon wajib diisi.");
        return;
      }
      if (editingItem) {
        // Edit student
        nextDb.students = nextDb.students.map(s => s.id === editingItem.id ? {
          ...s,
          nama: studentName,
          programId: "",
          status: studentStatus,
          teleponOrangTua: studentPhone,
          alamat: studentAddress
        } : s);
      } else {
        // Add new student
        const maxIdNum = nextDb.students.reduce((max, s) => {
          const match = s.id.match(/^(?:S-|RBS)(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
          }
          return max;
        }, 0);
        const newId = `RBS${String(maxIdNum + 1).padStart(2, "0")}`;
        nextDb.students.push({
          id: newId,
          nama: studentName,
          programId: "",
          status: studentStatus,
          teleponOrangTua: studentPhone,
          alamat: studentAddress,
          tanggalDaftar: getTodayDateString()
        });
      }
    } 
    
    else if (activeSubTab === "tutor") {
      if (!tutorName.trim() || !tutorLogin.trim()) {
        alert("Nama dan ID Login wajib diisi.");
        return;
      }
      
      // Validate unique ID Login
      const loginCheck = nextDb.tutors.find(t => t.idLogin.toLowerCase() === tutorLogin.toLowerCase() && (!editingItem || t.id !== editingItem.id));
      if (loginCheck) {
        alert("ID Login sudah digunakan oleh Tutor lain. Silakan tentukan ID Login yang unik.");
        return;
      }

      if (editingItem) {
        // Edit tutor
        nextDb.tutors = nextDb.tutors.map(t => t.id === editingItem.id ? {
          ...t,
          nama: tutorName,
          idLogin: tutorLogin,
          password: tutorPwd,
          status: tutorStatus,
          telepon: tutorPhone,
          alamat: tutorAddress
        } : t);
      } else {
        // Add new tutor
        const maxIdNum = nextDb.tutors.reduce((max, t) => {
          const match = t.id.match(/^(?:T-|RBT)(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
          }
          return max;
        }, 0);
        const newId = `RBT${String(maxIdNum + 1).padStart(2, "0")}`;
        nextDb.tutors.push({
          id: newId,
          nama: tutorName,
          idLogin: tutorLogin,
          password: tutorPwd,
          status: tutorStatus,
          telepon: tutorPhone,
          alamat: tutorAddress,
          tanggalBergabung: getTodayDateString()
        });
      }
    } 
    
    else if (activeSubTab === "program") {
      if (!progName.trim() || !progMapel.trim()) {
        alert("Nama program dan Mata pelajaran wajib diisi.");
        return;
      }
      if (editingItem) {
        // Edit learning program
        nextDb.programs = nextDb.programs.map(p => p.id === editingItem.id ? {
          ...p,
          nama: progName,
          jenjang: progLevel,
          mapel: progMapel,
          durasi: Number(progDuration),
          tarifSiswa: Number(progTarifSiswa),
          honorTutor: Number(progHonorTutor),
          status: progStatus,
          deskripsi: progDesc
        } : p);
      } else {
        // Add new learning program
        const newId = `PB-${String(nextDb.programs.length + 1).padStart(2, "0")}`;
        nextDb.programs.push({
          id: newId,
          nama: progName,
          jenjang: progLevel,
          mapel: progMapel,
          durasi: Number(progDuration),
          tarifSiswa: Number(progTarifSiswa),
          honorTutor: Number(progHonorTutor),
          status: progStatus,
          deskripsi: progDesc
        });
      }
    } else if (activeSubTab === "jadwal") {
      if (!schedTutorId || !schedSiswaId || !schedProgramId) {
        alert("Semua data (Tutor, Siswa, dan Program) wajib dipilih.");
        return;
      }
      const tutorObj = nextDb.tutors.find(t => t.id === schedTutorId);
      const studentObj = nextDb.students.find(s => s.id === schedSiswaId);
      const programObj = nextDb.programs.find(p => p.id === schedProgramId);

      if (!tutorObj || !studentObj || !programObj) {
        alert("Data Tutor, Siswa, atau Program tidak valid.");
        return;
      }

      if (editingItem) {
        // Edit schedule
        nextDb.schedules = (nextDb.schedules || []).map(s => s.id === editingItem.id ? {
          ...s,
          hari: schedHari,
          waktu: schedWaktu,
          tutorId: tutorObj.id,
          tutorNama: tutorObj.nama,
          siswaId: studentObj.id,
          siswaNama: studentObj.nama,
          programId: programObj.id,
          programNama: programObj.nama
        } : s);
      } else {
        // Add schedule
        const newId = `JDW-${String((nextDb.schedules || []).length + 1).padStart(4, "0")}`;
        const newSchedule: JadwalTutor = {
          id: newId,
          hari: schedHari,
          waktu: schedWaktu,
          tutorId: tutorObj.id,
          tutorNama: tutorObj.nama,
          siswaId: studentObj.id,
          siswaNama: studentObj.nama,
          programId: programObj.id,
          programNama: programObj.nama
        };
        nextDb.schedules = [...(nextDb.schedules || []), newSchedule];
      }
    }

    saveDatabase(nextDb);
    onUpdateDb(nextDb);
    setIsFormOpen(false);
  };

  return (
    <div id="admin-operasional-container" className="px-2 py-4 pb-20">
      {/* Search & Add Section */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="op-search-input"
            placeholder={`Cari ${activeSubTab === "siswa" ? "siswa" : activeSubTab === "tutor" ? "tutor" : activeSubTab === "program" ? "program" : "jadwal"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20 transition-all shadow-2xs"
          />
        </div>
        <button
          id="op-add-btn"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          Tambah
        </button>
      </div>

      {/* OPERATIONAL SUBTABS */}
      <div className="grid grid-cols-4 bg-white p-1 rounded-lg border border-slate-100 shadow-2xs mb-5">
        <button
          id="subtab-siswa"
          onClick={() => { setActiveSubTab("siswa"); setSearchQuery(""); }}
          className={`flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            activeSubTab === "siswa" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Users size={14} />
          Siswa
        </button>
        <button
          id="subtab-tutor"
          onClick={() => { setActiveSubTab("tutor"); setSearchQuery(""); }}
          className={`flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            activeSubTab === "tutor" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <GraduationCap size={14} />
          Tutor
        </button>
        <button
          id="subtab-program"
          onClick={() => { setActiveSubTab("program"); setSearchQuery(""); }}
          className={`flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            activeSubTab === "program" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <BookOpen size={14} />
          Program
        </button>
        <button
          id="subtab-jadwal"
          onClick={() => { setActiveSubTab("jadwal"); setSearchQuery(""); }}
          className={`flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            activeSubTab === "jadwal" ? "bg-brand-50 text-brand-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Calendar size={14} />
          Jadwal
        </button>
      </div>

      {/* 1. SISWA SCREEN */}
      {activeSubTab === "siswa" && (
        <div className="space-y-3.5">
          {sortedStudents.map((siswa) => {
            const currentBalance = getStudentBalance(db, siswa.id);
            const activeProgram = db.programs.find(p => p.id === siswa.programId);
            
            return (
              <div 
                key={siswa.id} 
                id={`student-card-${siswa.id}`}
                className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs relative flex flex-col gap-3 group hover:border-brand-200 transition-all"
              >
                {/* ID badge & active badge */}
                <div className="flex justify-between items-center">
                  <span className="text-[9.5px] font-black font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {siswa.id}
                  </span>
                  <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    siswa.status === "aktif" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    {siswa.status}
                  </span>
                </div>

                {/* Main details */}
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{siswa.nama}</h4>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-1.5 font-medium">
                    <Phone size={12} className="text-slate-400" />
                    <span>Ortu: {siswa.teleponOrangTua}</span>
                  </div>
                  {siswa.alamat && (
                    <div className="flex items-start gap-1.5 text-slate-500 text-[11px] mt-1 font-medium">
                      <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{siswa.alamat}</span>
                    </div>
                  )}
                </div>

                {/* Balance status / quick action */}
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-50 mt-1">
                  <div>
                    <p className={`text-xs font-black font-mono ${currentBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {currentBalance > 0 ? `Tagihan: ${formatRupiah(currentBalance)}` : currentBalance < 0 ? `Lebih: ${formatRupiah(Math.abs(currentBalance))}` : "Lunas : Rp 0"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      id={`student-rekening-btn-${siswa.id}`}
                      onClick={() => onNavigateToTab("keuangan", "rekening", siswa.id)}
                      className="text-[10.5px] font-bold text-brand-600 hover:text-brand-800 bg-brand-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                    >
                      Buku Tagihan
                    </button>
                    <button
                      id={`student-edit-btn-${siswa.id}`}
                      onClick={() => handleOpenEdit(siswa)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      id={`student-delete-btn-${siswa.id}`}
                      onClick={() => handleDelete(siswa.id)}
                      className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {sortedStudents.length === 0 && (
            <p className="text-center py-8 text-xs text-slate-400">Tidak ada data siswa ditemukan.</p>
          )}
        </div>
      )}

      {/* 2. TUTOR SCREEN */}
      {activeSubTab === "tutor" && (
        <div className="space-y-3.5">
          {sortedTutors.map((tutor) => {
            const honorOwed = getTutorHonorBalance(db, tutor.id);
            const titipanOnHand = getTutorDepositBalance(db, tutor.id);
            
            return (
              <div 
                key={tutor.id} 
                id={`tutor-card-${tutor.id}`}
                className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs relative flex flex-col gap-3 hover:border-brand-200 transition-all"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9.5px] font-black font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {tutor.id}
                  </span>
                  <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    tutor.status === "aktif" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    {tutor.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{tutor.nama}</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">ID Login: <span className="font-bold text-slate-600">{tutor.idLogin}</span></p>
                  
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-2 font-medium">
                    <Phone size={12} className="text-slate-400" />
                    <span>{tutor.telepon}</span>
                  </div>
                  {tutor.alamat && (
                    <div className="flex items-start gap-1.5 text-slate-500 text-[11px] mt-1 font-medium">
                      <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{tutor.alamat}</span>
                    </div>
                  )}
                </div>

                {/* Balances summary Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Honor Terutang</span>
                    <span className="text-[11px] font-black text-indigo-600 font-mono">
                      {formatRupiah(honorOwed)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Titipan Cash</span>
                    <span className={`text-[11px] font-black font-mono ${titipanOnHand > 0 ? "text-amber-600 font-extrabold" : "text-slate-400"}`}>
                      {formatRupiah(titipanOnHand)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-50 mt-1">
                  <button
                    id={`tutor-ledger-btn-${tutor.id}`}
                    onClick={() => onNavigateToTab("keuangan", "honor", tutor.id)}
                    className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    Buku Honor
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      id={`tutor-edit-btn-${tutor.id}`}
                      onClick={() => handleOpenEdit(tutor)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      id={`tutor-delete-btn-${tutor.id}`}
                      onClick={() => handleDelete(tutor.id)}
                      className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {sortedTutors.length === 0 && (
            <p className="text-center py-8 text-xs text-slate-400">Tidak ada data tutor ditemukan.</p>
          )}
        </div>
      )}

      {/* 3. PROGRAM SCREEN */}
      {activeSubTab === "program" && (
        <div className="space-y-3.5">
          {sortedPrograms.map((program) => (
            <div 
              key={program.id} 
              id={`program-card-${program.id}`}
              className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs relative flex flex-col gap-3 hover:border-brand-200 transition-all"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] font-black font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {program.id}
                  </span>
                  <span className="text-[9px] font-bold bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                    {program.jenjang}
                  </span>
                </div>
                <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  program.status === "aktif" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                }`}>
                  {program.status}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 text-sm tracking-tight leading-snug">{program.nama}</h4>
                <p className="text-[10.5px] text-slate-400 font-medium mt-1">Mata Pelajaran: <span className="font-semibold text-slate-600">{program.mapel}</span> | Durasi: <span className="font-semibold text-slate-600">{program.durasi} menit</span></p>
              </div>

              {/* Rates Details */}
              <div className="grid grid-cols-2 gap-3.5 pt-2.5 border-t border-slate-50">
                <div>
                  <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Tarif Siswa</span>
                  <p className="text-sm font-black text-emerald-600 font-mono leading-tight mt-0.5">
                    {formatRupiah(program.tarifSiswa)}
                    <span className="text-[9px] text-slate-400 font-normal"> /sesi</span>
                  </p>
                </div>
                <div>
                  <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Honor Tutor</span>
                  <p className="text-sm font-black text-indigo-600 font-mono leading-tight mt-0.5">
                    {formatRupiah(program.honorTutor)}
                    <span className="text-[9px] text-slate-400 font-normal"> /sesi</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-1 border-t border-slate-50 pt-2.5 mt-1">
                <button
                  id={`program-edit-btn-${program.id}`}
                  onClick={() => handleOpenEdit(program)}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  id={`program-delete-btn-${program.id}`}
                  onClick={() => handleDelete(program.id)}
                  className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {sortedPrograms.length === 0 && (
            <p className="text-center py-8 text-xs text-slate-400">Tidak ada program belajar ditemukan.</p>
          )}
        </div>
      )}

      {/* 4. JADWAL SCREEN */}
      {activeSubTab === "jadwal" && (
        <div className="space-y-3.5">
          {(db.schedules || [])
            .filter(j => 
              j.tutorNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
              j.siswaNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
              j.hari.toLowerCase().includes(searchQuery.toLowerCase()) ||
              j.programNama.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((schedule) => {
              return (
                <div 
                  key={schedule.id} 
                  id={`schedule-card-${schedule.id}`}
                  className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs relative flex flex-col gap-3 hover:border-brand-200 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9.5px] font-black font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {schedule.id}
                      </span>
                      <span className="text-[9.5px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Calendar size={10} />
                        Hari {schedule.hari}
                      </span>
                    </div>
                    <span className="text-[10.5px] font-black font-mono text-slate-700 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100">
                      {schedule.waktu}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm tracking-tight leading-snug">
                      Siswa: {schedule.siswaNama}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Tutor: <span className="font-semibold text-slate-700">{schedule.tutorNama}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Program: <span className="font-medium text-slate-600">{schedule.programNama}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1 border-t border-slate-50 pt-2.5 mt-1">
                    <button
                      id={`schedule-edit-btn-${schedule.id}`}
                      onClick={() => handleOpenEdit(schedule)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      id={`schedule-delete-btn-${schedule.id}`}
                      onClick={() => handleDelete(schedule.id)}
                      className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

          {(db.schedules || []).length === 0 && (
            <p className="text-center py-8 text-xs text-slate-400">Tidak ada jadwal bimbingan belajar ditemukan.</p>
          )}
        </div>
      )}

      {/* CRUD MODAL FORM (OVERLAY) */}
      {isFormOpen && (
        <div id="op-form-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
            <div className="bg-brand-600 text-white p-4 shrink-0 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">
                {editingItem ? "Ubah" : "Tambah"} {activeSubTab === "siswa" ? "Siswa" : activeSubTab === "tutor" ? "Tutor" : activeSubTab === "program" ? "Program" : "Jadwal"}
              </h3>
              <span className="text-[9.5px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
                {editingItem ? "ID: " + editingItem.id : "BARU"}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Form Siswa */}
              {activeSubTab === "siswa" && (
                <>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Siswa *</label>
                    <input
                      type="text"
                      id="input-student-name"
                      required
                      placeholder="Masukkan nama lengkap siswa"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">No. Handphone Ortu *</label>
                    <input
                      type="text"
                      id="input-student-phone"
                      required
                      placeholder="Contoh: 0812XXXXXXXX"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Alamat Lengkap</label>
                    <textarea
                      id="input-student-address"
                      placeholder="Masukkan alamat lengkap rumah"
                      value={studentAddress}
                      onChange={(e) => setStudentAddress(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none h-16 resize-none"
                    />
                  </div>
                  {editingItem && (
                    <div>
                      <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status Keaktifan</label>
                      <select
                        id="input-student-status"
                        value={studentStatus}
                        onChange={(e) => setStudentStatus(e.target.value as "aktif" | "nonaktif")}
                        className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                      >
                        <option value="aktif">Aktif</option>
                        <option value="nonaktif">Nonaktif</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Form Tutor */}
              {activeSubTab === "tutor" && (
                <>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Tutor *</label>
                    <input
                      type="text"
                      id="input-tutor-name"
                      required
                      placeholder="Masukkan nama lengkap & gelar"
                      value={tutorName}
                      onChange={(e) => setTutorName(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">ID Login / Username *</label>
                    <input
                      type="text"
                      id="input-tutor-login"
                      required
                      placeholder="Masukkan ID login unik (huruf kecil, no spasi)"
                      value={tutorLogin}
                      onChange={(e) => setTutorLogin(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Password Aplikasi</label>
                    <div className="relative">
                      <input
                        type={showTutorPwd ? "text" : "password"}
                        id="input-tutor-pwd"
                        placeholder="Default: 123"
                        value={tutorPwd}
                        onChange={(e) => setTutorPwd(e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTutorPwd(!showTutorPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-all"
                        title={showTutorPwd ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showTutorPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">No. Handphone Tutor</label>
                    <input
                      type="text"
                      id="input-tutor-phone"
                      placeholder="Contoh: 085XXXXXXXXX"
                      value={tutorPhone}
                      onChange={(e) => setTutorPhone(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Alamat Domisili</label>
                    <textarea
                      id="input-tutor-address"
                      placeholder="Alamat domisili saat ini"
                      value={tutorAddress}
                      onChange={(e) => setTutorAddress(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none h-16 resize-none"
                    />
                  </div>
                  {editingItem && (
                    <div>
                      <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status Keaktifan</label>
                      <select
                        id="input-tutor-status"
                        value={tutorStatus}
                        onChange={(e) => setTutorStatus(e.target.value as "aktif" | "nonaktif")}
                        className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                      >
                        <option value="aktif">Aktif</option>
                        <option value="nonaktif">Nonaktif</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Form Program Belajar */}
              {activeSubTab === "program" && (
                <>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Program Belajar *</label>
                    <input
                      type="text"
                      id="input-program-name"
                      required
                      placeholder="Contoh: Matematika SD Kelas 6"
                      value={progName}
                      onChange={(e) => setProgName(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jenjang *</label>
                      <select
                        id="input-program-level"
                        value={progLevel}
                        onChange={(e) => setProgLevel(e.target.value as any)}
                        className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                      >
                        <option value="TK/RA">TK/RA</option>
                        <option value="SD/MI">SD/MI</option>
                        <option value="SMP/MTs">SMP/MTs</option>
                        <option value="Umum">Umum</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Mata Pelajaran *</label>
                      <input
                        type="text"
                        id="input-program-mapel"
                        required
                        placeholder="Contoh: Fisika"
                        value={progMapel}
                        onChange={(e) => setProgMapel(e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Durasi Belajar (Menit) *</label>
                    <input
                      type="number"
                      id="input-program-duration"
                      required
                      value={progDuration}
                      onChange={(e) => setProgDuration(Number(e.target.value))}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tarif Siswa (Sesi) *</label>
                      <input
                        type="number"
                        id="input-program-tarif"
                        required
                        value={progTarifSiswa}
                        onChange={(e) => setProgTarifSiswa(Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Honor Tutor (Sesi) *</label>
                      <input
                        type="number"
                        id="input-program-honor"
                        required
                        value={progHonorTutor}
                        onChange={(e) => setProgHonorTutor(Number(e.target.value))}
                        className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Deskripsi Singkat</label>
                    <textarea
                      id="input-program-desc"
                      placeholder="Masukkan rincian atau deskripsi singkat program"
                      value={progDesc}
                      onChange={(e) => setProgDesc(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none h-16 resize-none"
                    />
                  </div>
                  {editingItem && (
                    <div>
                      <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status Program</label>
                      <select
                        id="input-program-status"
                        value={progStatus}
                        onChange={(e) => setProgStatus(e.target.value as "aktif" | "nonaktif")}
                        className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                      >
                        <option value="aktif">Aktif</option>
                        <option value="nonaktif">Nonaktif</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Form Jadwal Belajar */}
              {activeSubTab === "jadwal" && (
                <>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Hari Bimbingan *</label>
                    <select
                      id="input-schedule-hari"
                      value={schedHari}
                      onChange={(e) => setSchedHari(e.target.value as any)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    >
                      <option value="Senin">Senin</option>
                      <option value="Selasa">Selasa</option>
                      <option value="Rabu">Rabu</option>
                      <option value="Kamis">Kamis</option>
                      <option value="Jumat">Jumat</option>
                      <option value="Sabtu">Sabtu</option>
                      <option value="Minggu">Minggu</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Waktu Sesi (Jam) *</label>
                    <input
                      type="text"
                      id="input-schedule-waktu"
                      required
                      placeholder="Contoh: 13:30 - 15:00"
                      value={schedWaktu}
                      onChange={(e) => setSchedWaktu(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pilih Tutor Pengajar *</label>
                    <select
                      id="input-schedule-tutor"
                      required
                      value={schedTutorId}
                      onChange={(e) => setSchedTutorId(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    >
                      <option value="" disabled>-- Pilih Tutor --</option>
                      {db.tutors.filter(t => t.status === "aktif").map(tutor => (
                        <option key={tutor.id} value={tutor.id}>
                          {tutor.nama} ({tutor.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pilih Siswa *</label>
                    <select
                      id="input-schedule-siswa"
                      required
                      value={schedSiswaId}
                      onChange={(e) => setSchedSiswaId(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    >
                      <option value="" disabled>-- Pilih Siswa --</option>
                      {db.students.filter(s => s.status === "aktif").map(student => (
                        <option key={student.id} value={student.id}>
                          {student.nama} ({student.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pilih Program Belajar *</label>
                    <select
                      id="input-schedule-program"
                      required
                      value={schedProgramId}
                      onChange={(e) => setSchedProgramId(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    >
                      <option value="" disabled>-- Pilih Program --</option>
                      {db.programs.filter(p => p.status === "aktif").map(prog => (
                        <option key={prog.id} value={prog.id}>
                          {prog.nama} ({prog.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Form Buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-50 sticky bottom-0 bg-white">
                <button
                  type="button"
                  id="op-form-cancel-btn"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="op-form-submit-btn"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
