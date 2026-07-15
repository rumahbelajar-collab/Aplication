import React, { useState, useRef } from "react";
import { 
  FileText, 
  Upload, 
  Check, 
  Clock, 
  X, 
  AlertCircle, 
  Camera, 
  Image as ImageIcon 
} from "lucide-react";
import { 
  Database, 
  formatTanggalIndo, 
  submitAttendanceReport,
  getDatabase,
  getTodayDateString
} from "../lib/db";
import CustomDatePicker from "./CustomDatePicker";

// Mock journal photo templates to simulate file upload instantly
const SAMPLE_JOURNALS = [
  { name: "jurnal_harian_sd_matematika.jpg", url: "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?auto=format&fit=crop&w=400&q=80" },
  { name: "catatan_jurnal_smp_ipa.png", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80" }
];

interface TutorLaporanProps {
  db: Database;
  tutorId: string;
  onUpdateDb: (newDb: Database) => void;
}

export default function TutorLaporan({ db, tutorId, onUpdateDb }: TutorLaporanProps) {
  const [siswaId, setSiswaId] = useState("");
  const [programId, setProgramId] = useState("");
  const [tanggal, setTanggal] = useState(getTodayDateString());
  const [keterangan, setKeterangan] = useState("");
  const [fotoJurnal, setFotoJurnal] = useState("");
  const [fotoName, setFotoName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeStudents = db.students.filter(s => s.status === "aktif");
  const activePrograms = db.programs.filter(p => p.status === "aktif");

  // Get past reports by this tutor
  const myReports = (db.attendanceReports || [])
    .filter(r => r.tutorId === tutorId)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id.localeCompare(a.id));

  // Handle file reading
  const processFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Harap unggah file gambar (PNG, JPG, JPEG).");
      return;
    }
    setFotoName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoJurnal(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Simulation handler
  const selectSampleJournal = (idx: number) => {
    const sample = SAMPLE_JOURNALS[idx];
    setFotoJurnal(sample.url);
    setFotoName(sample.name);
  };

  // Submit report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaId || !programId || !fotoJurnal) {
      alert("Harap lengkapi seluruh field dan unggah foto jurnal.");
      return;
    }

    const updatedDb = submitAttendanceReport(db, {
      tanggal,
      tutorId,
      siswaId,
      programId,
      fotoJurnal,
      keterangan: keterangan.trim() || undefined
    });

    onUpdateDb(updatedDb);

    // Reset Form
    setSiswaId("");
    setProgramId("");
    setKeterangan("");
    setFotoJurnal("");
    setFotoName("");
    setSuccessMsg("Laporan kehadiran berhasil diajukan! Menunggu verifikasi oleh Administrator.");
    
    setTimeout(() => {
      setSuccessMsg("");
    }, 6000);
  };

  return (
    <div id="tutor-laporan-container" className="px-2 py-4 pb-24">
      
      {/* Informative Help Banner */}
      <div className="bg-white p-4 rounded-sm flex gap-3 mb-8 text-[11.5px] leading-relaxed text-slate-500">
        <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-rose-600">Laporan Absensi Manual</p>
          <p className="mt-0.5">
            Unggah foto jurnal pembelajaran fisik sebagai bukti. Admin akan melakukan verifikasi sebelum saldo honor Anda disinkronkan.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl mb-5 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Check size={16} />
          {successMsg}
        </div>
      )}

        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 px-2">
          <FileText size={15} className="text-slate-500" />
          Form Pengajuan Absensi
        </h3>
        
      {/* SUBMIT CLAIM FORM */}
      <div className="bg-white p-5 rounded-sm shadow-3xs mb-10">

        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Mengajar *</label>
            <CustomDatePicker
              required
              value={tanggal}
              onChange={(val) => setTanggal(val)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pilih Siswa *</label>
              <select
                required
                value={siswaId}
                onChange={(e) => setSiswaId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-slate-500 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">-- Pilih --</option>
                {activeStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Program Harian *</label>
              <select
                required
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">-- Pilih --</option>
                {activePrograms.map(p => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </div>
          </div>

          {/* DRAG AND DROP UPLOAD ZONE WITH CAMERA OPTION */}
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Bukti Jurnal Belajar (Foto) *</label>
            
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] ${
                dragActive ? "border-brand-500 bg-brand-500" : "border-slate-300 hover:border-slate-400 bg-slate-50/10"
              }`}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {fotoJurnal ? (
                <div className="space-y-2 w-full flex flex-col items-center">
                  <div className="relative w-24 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-3xs">
                    <img src={fotoJurnal} alt="Preview Jurnal" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFotoJurnal("");
                        setFotoName("");
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 active:scale-90 transition-transform"
                    >
                      <X size={12} />
                    </button>z
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 truncate max-w-[200px]">{fotoName}</p>
                </div>
              ) : (
                <>
                  <Upload size={22} className="text-slate-400 mb-1" />
                  <p className="text-[10.5px] font-bold text-slate-700">Tarik gambar ke sini, atau klik untuk memilih file</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Mendukung format PNG, JPG, JPEG</p>
                </>
              )}
            </div>
            
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Catatan Keterangan Absensi</label>
            <textarea
              placeholder="Jelaskan alasan pengajuan absensi manual..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none h-16 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white p-3 font-bold text-xs rounded-lg shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FileText size={14} />
            Ajukan Laporan Absensi
          </button>
        </form>
      </div>

        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-50 pb-2 px-2">
          <Clock size={15} className="text-slate-500" />
          Status Laporan Anda ({myReports.length})
        </h3>

      {/* PAST REPORTS STATUS LISTING */}
      <div className="bg-white p-4 rounded-sm border border-slate-100 shadow-3xs">
        <div className="space-y-3">
          {myReports.map((item) => (
            <div 
              key={item.id} 
              className="border border-slate-100 bg-slate-50/40 p-3 rounded-lg flex flex-col gap-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-mono font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">
                    {item.id}
                  </span>
                  <span className="text-[9.5px] font-mono text-slate-400 block mt-1">
                    {formatTanggalIndo(item.tanggal)}
                  </span>
                </div>

                {item.status === "pending" && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={10} className="animate-pulse" />
                    Pending Verifikasi
                  </span>
                )}
                {item.status === "setuju" && (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} />
                    Disetujui Admin
                  </span>
                )}
                {item.status === "tolak" && (
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <X size={10} />
                    Ditolak Admin
                  </span>
                )}
              </div>

              <div className="text-[11px] leading-tight text-slate-700">
                {/* Menggunakan grid 2 kolom dengan jarak (gap) sebesar 2 */}
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="font-bold">Siswa:</span> {item.siswaNama}</p>
                  <p><span className="font-bold">Program:</span> {item.programNama}</p>
                </div>
                
                {item.keterangan && (
                  <p className="mt-1.5 text-[10px] text-slate-500 italic p-1.5 bg-white border border-slate-100 rounded-lg">
                    "{item.keterangan}"
                  </p>
                )}
              </div>

              {item.fotoJurnal && (
                <div className="mt-1 flex items-center gap-1.5 text-[9.5px] text-slate-500 font-medium">
                  <ImageIcon size={12} className="text-slate-400" />
                  <span>Bukti Jurnal Terlampir</span>
                  <a 
                    href={item.fotoJurnal} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-brand-600 hover:underline font-bold"
                    onClick={(e) => {
                      if(item.fotoJurnal.startsWith("data:")) {
                        // Prevent loading full base64 in a blank tab if not necessary, just view it
                        e.preventDefault();
                        alert("Preview Bukti Gambar tersedia di Admin.");
                      }
                    }}
                  >
                    (Lihat)
                  </a>
                </div>
              )}

              {/* Admin feedback notes */}
              {item.catatanAdmin && (
                <div className="mt-1.5 p-2 rounded-xl bg-white border border-slate-100 text-[10px]">
                  <span className="font-bold block text-slate-500">Catatan Admin:</span>
                  <span className="text-slate-700 italic">"{item.catatanAdmin}"</span>
                </div>
              )}
            </div>
          ))}

          {myReports.length === 0 && (
            <p className="text-center py-6 text-xs text-slate-400">Anda belum pernah mengajukan laporan manual.</p>
          )}
        </div>
      </div>

    </div>
  );
}
