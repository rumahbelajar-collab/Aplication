import React, { useState, useEffect } from "react";
import { 
  FileText, 
  History, 
  User, 
  BookOpen, 
  Trash2, 
  Edit2, 
  Cloud, 
  CheckCircle, 
  Loader2, 
  X,
  ChevronRight,
  PlusCircle,
  GraduationCap,
  Calendar,
  Sparkles,
  Award
} from "lucide-react";
import { Database } from "../lib/db";
import { RaportSiswa, RaportSubject } from "../types";

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbylAa6-SpiFtKDwdJYIfUbzXmTzWK0cglKFg2nHh34FjMwetUVj0cmi0fHUCsD-ypd-Ig/exec";
const FIXED_SUBJECTS = ['Matematika', 'PAI', 'PKN', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPAS'];

const GRADE_OPTIONS = [
  "1 (Satu)",
  "2 (Dua)",
  "3 (Tiga)",
  "4 (Empat)",
  "5 (Lima)",
  "6 (Enam)",
  "7 (Tujuh)",
  "8 (Delapan)",
  "9 (Sembilan)"
];

const CLASS_OPTIONS = [
  "Privat",
  "Semi privat",
  "Mata pelajaran",
  "Learning By game"
];

interface TutorRaportProps {
  db: Database;
  tutorId: string;
  onUpdateDb: (newDb: Database) => void;
  onClose: () => void;
}

export default function TutorRaport({
  db,
  tutorId,
  onUpdateDb,
  onClose
}: TutorRaportProps) {
  const tutor = db.tutors.find(t => t.id === tutorId);
  const tutorNameDefault = tutor ? tutor.nama : "Kak San";

  // Navigation state: "input" | "database"
  const [activeTab, setActiveTab] = useState<"input" | "database">("input");

  // Form states
  const [editIndex, setEditIndex] = useState<number>(-1); 
  const [tutorName, setTutorName] = useState(tutorNameDefault);
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("Privat");
  const [studentGrade, setStudentGrade] = useState("");
  const [tutorNotes, setTutorNotes] = useState("");
  const [subjectScores, setSubjectScores] = useState<Record<string, { to1: string; to2: string; to3: string }>>(
    () => {
      const initial: Record<string, { to1: string; to2: string; to3: string }> = {};
      FIXED_SUBJECTS.forEach(sub => {
        initial[sub] = { to1: "", to2: "", to3: "" };
      });
      return initial;
    }
  );

  // Status & Notification state
  const [isLoading, setIsLoading] = useState(false);
  const [notif, setNotif] = useState<{ message: string; type: "info" | "success" | "error" | null }>({
    message: "",
    type: null
  });

  const showNotification = (message: string, type: "info" | "success" | "error") => {
    setNotif({ message, type });
    setTimeout(() => {
      setNotif({ message: "", type: null });
    }, 3500);
  };

  // Sync to Cloud function (Google Spreadsheet App Script)
  const syncToCloud = async (payload: any) => {
    try {
      await fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload)
      });
      return true;
    } catch (e) {
      console.error("Spreadsheet Sync failed:", e);
      return false;
    }
  };

  // Submit / Save handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert("Nama siswa tidak boleh kosong!");
      return;
    }
    if (!studentGrade) {
      alert("Silakan pilih kelas siswa!");
      return;
    }

    setIsLoading(true);
    showNotification("Mengunggah data...", "info");

    const subjectsList: RaportSubject[] = [];
    let totalScore = 0;
    let scoresCount = 0;

    FIXED_SUBJECTS.forEach(sub => {
      const s = subjectScores[sub] || { to1: "", to2: "", to3: "" };
      const to1Val = parseFloat(s.to1) || 0;
      const to2Val = parseFloat(s.to2) || 0;
      const to3Val = parseFloat(s.to3) || 0;

      subjectsList.push({
        name: sub,
        to1: to1Val,
        to2: to2Val,
        to3: to3Val
      });

      totalScore += (to1Val + to2Val + to3Val);
      scoresCount += 3;
    });

    const averageVal = scoresCount > 0 ? (totalScore / scoresCount).toFixed(1) : "0.0";

    const formattedDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const raportData: RaportSiswa = {
      id: editIndex !== -1 && db.raports && db.raports[editIndex] ? db.raports[editIndex].id : `RAP-${Date.now()}`,
      tutor: tutorName,
      name: studentName,
      class: studentClass,
      grade: studentGrade,
      notes: tutorNotes,
      subjects: subjectsList,
      average: averageVal,
      date: formattedDate
    };

    const currentRaports = db.raports || [];
    let nextRaports = [...currentRaports];

    if (editIndex === -1) {
      nextRaports.unshift(raportData);
    } else {
      nextRaports[editIndex] = raportData;
    }

    const nextDb = {
      ...db,
      raports: nextRaports
    };

    const successCloud = await syncToCloud(raportData);
    onUpdateDb(nextDb);

    setIsLoading(false);
    showNotification(
      successCloud ? "Berhasil dikirim ke Spreadsheet & disimpan!" : "Disimpan lokal & cloud database!",
      "success"
    );

    handleCancelEdit();

    setTimeout(() => {
      setActiveTab("database");
    }, 600);
  };

  const handleEdit = (index: number) => {
    const list = db.raports || [];
    const item = list[index];
    if (!item) return;

    setEditIndex(index);
    setTutorName(item.tutor);
    setStudentName(item.name);
    setStudentClass(item.class);
    setStudentGrade(item.grade);
    setTutorNotes(item.notes);

    const scoresMap: Record<string, { to1: string; to2: string; to3: string }> = {};
    FIXED_SUBJECTS.forEach(sub => {
      const match = item.subjects.find(s => s.name === sub);
      scoresMap[sub] = {
        to1: match ? String(match.to1 || "") : "",
        to2: match ? String(match.to2 || "") : "",
        to3: match ? String(match.to3 || "") : ""
      };
    });
    setSubjectScores(scoresMap);

    setActiveTab("input");
    showNotification("Mode edit aktif", "info");
  };

  const handleDelete = (index: number) => {
    const list = db.raports || [];
    const item = list[index];
    if (!item) return;

    if (!window.confirm(`Hapus raport Tryout siswa "${item.name}" secara permanen?`)) {
      return;
    }

    const nextRaports = list.filter((_, idx) => idx !== index);
    const nextDb = {
      ...db,
      raports: nextRaports
    };
    onUpdateDb(nextDb);
    showNotification("Raport berhasil dihapus!", "success");
  };

  const handleCancelEdit = () => {
    setEditIndex(-1);
    setStudentName("");
    setStudentClass("Privat");
    setStudentGrade("");
    setTutorNotes("");
    setTutorName(tutorNameDefault);

    const initial: Record<string, { to1: string; to2: string; to3: string }> = {};
    FIXED_SUBJECTS.forEach(sub => {
      initial[sub] = { to1: "", to2: "", to3: "" };
    });
    setSubjectScores(initial);
  };

  const handleScoreChange = (subject: string, exam: "to1" | "to2" | "to3", value: string) => {
    setSubjectScores(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [exam]: value
      }
    }));
  };

  const listRaports = db.raports || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-scale-up">
        
        {/* Header Modal */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-inner">
              <Award size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight uppercase">E-Raport Tryout</h2>
              <p className="text-[10px] text-slate-400 font-medium">Input dan kelola raport Tryout siswa</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
          <div className="flex bg-slate-200/60 p-1 rounded-xl">
            <button 
              type="button"
              onClick={() => setActiveTab("input")}
              className={`px-4 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === "input" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText size={13} />
              Entri Data
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab("database")}
              className={`px-4 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === "database" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <History size={13} />
              Riwayat ({listRaports.length})
            </button>
          </div>

        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-slate-50/50">
          
          {/* TAB A: INPUT FORM */}
          {activeTab === "input" && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-6">

              {/* SECTION A: IDENTITAS SISWA */}
              <div className="space-y-3">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">
                  A. Identitas Siswa
                </label>
                
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Nama Tutor</label>
                    <input 
                      type="text"
                      value={tutorName}
                      onChange={(e) => setTutorName(e.target.value)}
                      required
                      placeholder="Masukkan nama tutor..."
                      className="w-full bg-slate-50/50 border border-slate-200/80 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Nama Siswa</label>
                    <input 
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      required
                      placeholder="Contoh: Hilmi P."
                      className="w-full bg-slate-50/50 border border-slate-200/80 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Program</label>
                    <select
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      required
                      className="w-full bg-slate-50/50 border border-slate-200/80 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-500"
                    >
                      {CLASS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Kelas</label>
                    <select
                      value={studentGrade}
                      onChange={(e) => setStudentGrade(e.target.value)}
                      required
                      className="w-full bg-slate-50/50 border border-slate-200/80 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-500"
                    >
                      <option value="" disabled>Pilih Kelas</option>
                      {GRADE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION B: NILAI AKADEMIK */}
              <div className="space-y-3">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">
                  B. Nilai Akademik Tryout
                </label>

                <div className="bg-white rounded-xl border border-slate-100 shadow-3xs overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Pelajaran</th>
                        <th className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">TO I</th>
                        <th className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">TO II</th>
                        <th className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">TO III</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {FIXED_SUBJECTS.map((sub) => {
                        const score = subjectScores[sub] || { to1: "", to2: "", to3: "" };
                        return (
                          <tr key={sub} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-slate-700 text-xs">{sub}</span>
                            </td>
                            <td className="p-1.5 text-center">
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                value={score.to1}
                                onChange={(e) => handleScoreChange(sub, "to1", e.target.value)}
                                placeholder="0"
                                className="w-16 bg-slate-50 border border-slate-200 rounded text-center p-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-500"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                value={score.to2}
                                onChange={(e) => handleScoreChange(sub, "to2", e.target.value)}
                                placeholder="0"
                                className="w-16 bg-slate-50 border border-slate-200 rounded text-center p-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-500"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                value={score.to3}
                                onChange={(e) => handleScoreChange(sub, "to3", e.target.value)}
                                placeholder="0"
                                className="w-16 bg-slate-50 border border-slate-200 rounded text-center p-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION C: EVALUASI HASIL BELAJAR */}
              <div className="space-y-3">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">
                  C. Evaluasi Hasil Belajar (Catatan Tutor)
                </label>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                  <textarea
                    rows={4}
                    value={tutorNotes}
                    onChange={(e) => setTutorNotes(e.target.value)}
                    placeholder="Masukkan evaluasi bimbingan, kendala siswa, atau ringkasan progres..."
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-3 text-xs font-semibold text-slate-700 resize-none focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-2">
                {editIndex !== -1 && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-3 text-xs font-black uppercase text-slate-600 bg-slate-200/80 hover:bg-slate-300 rounded-lg transition-all cursor-pointer"
                  >
                    Batal Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] py-3 text-xs font-black uppercase text-white bg-slate-900 hover:bg-black disabled:bg-slate-400 rounded-lg transition-all cursor-pointer shadow-lg shadow-slate-300 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Cloud size={14} />
                      {editIndex !== -1 ? "Perbarui & Sinkron" : "Simpan"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB B: DATABASE VIEW (RIWAYAT) */}
          {activeTab === "database" && (
            <div className="space-y-4 animate-fade-in max-w-2xl mx-auto pb-6">
              
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Daftar Raport Tercatat ({listRaports.length})
                </h3>
              </div>

              {listRaports.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-200">
                  <FileText className="mx-auto text-slate-300 mb-3" size={32} />
                  <p className="text-xs text-slate-400 font-bold">Belum ada raport tryout yang dilaporkan.</p>
                  <button 
                    type="button"
                    onClick={() => setActiveTab("input")}
                    className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-extrabold uppercase tracking-wide cursor-pointer"
                  >
                    Mulai Entri Raport
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {listRaports.map((r, i) => (
                    <div 
                      key={r.id || i}
                      className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-brand-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-100 text-brand-600 rounded-lg flex items-center justify-center font-black text-base shadow-inner">
                          {r.name ? r.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-800 text-sm leading-none">{r.name}</h3>
                            <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Kelas {r.grade}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                              {r.class}
                            </span>
                            <span className="text-[9.5px] text-slate-400 font-semibold italic">
                              Tutor: {r.tutor}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-300 font-bold font-mono mt-1">
                            {r.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-0 pt-3 md:pt-0 border-slate-50">
                        <div className="text-left md:text-right pr-2">
                          <p className="text-lg font-black font-mono text-brand-600 tracking-tighter leading-none">
                            {r.average}
                          </p>
                          <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest mt-0.5">Rata-rata</p>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button 
                            type="button"
                            onClick={() => handleEdit(i)}
                            className="w-8 h-8 bg-brand-50 text-brand-600 rounded border border-brand-100 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors cursor-pointer"
                            title="Edit Raport"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDelete(i)}
                            className="w-8 h-8 bg-rose-50 text-rose-600 rounded border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                            title="Hapus Raport"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Floating Notification */}
        {notif.message && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg text-white text-xs font-bold shadow-xl z-[100] flex items-center gap-2 border animate-slide-up ${
            notif.type === "success" 
              ? "bg-emerald-600 border-emerald-500" 
              : notif.type === "error" 
              ? "bg-rose-600 border-rose-500" 
              : "bg-slate-950 border-slate-800"
          }`}>
            <CheckCircle size={15} />
            <span>{notif.message}</span>
          </div>
        )}

      </div>
    </div>
  );
}