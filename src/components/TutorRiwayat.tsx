import React, { useState } from "react";
import { 
  BookOpen, 
  Calendar, 
  Search, 
  Clock 
} from "lucide-react";
import { 
  Database, 
  formatRupiah, 
  formatTanggalIndo, 
  filterByDateRange
} from "../lib/db";
import DateRangeFilter, { DateRangePreset } from "./DateRangeFilter";

interface TutorRiwayatProps {
  db: Database;
  tutorId: string;
  onUpdateDb: (newDb: Database) => void;
}

export default function TutorRiwayat({
  db,
  tutorId,
  onUpdateDb
}: TutorRiwayatProps) {
  const tutor = db.tutors.find(t => t.id === tutorId)!;

  // Date filter state for past logs list
  const [rangeType, setRangeType] = useState<DateRangePreset>("semua");
  const [customStart, setCustomStart] = useState("2026-06-01");
  const [customEnd, setCustomEnd] = useState("2026-06-30");

  // Filter sessions logged by this tutor
  const tutorSessionsAll = db.sessions.filter(s => s.tutorId === tutorId);
  const filteredSessions = filterByDateRange(tutorSessionsAll, rangeType, customStart, customEnd);

  return (
    <div id="tutor-riwayat-container" className="px-2 py-4 pb-20 space-y-6">
      
      {/* Date filter for listing */}
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

      <div className="flex justify-between items-center mb-1 py-4">
        
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-2">
          <Clock size={14} className="text-slate-400" />
          Riwayat Pertemuan Mengajar ({filteredSessions.length})
        </h3>
      </div>

      {/* SESSION LOGS LISTING SCREEN */}
      <div className="space-y-2">
        {filteredSessions.map((s) => (
          <div 
            key={s.id} 
            id={`sess-card-${s.id}`}
            className="bg-white p-7 rounded-sm border border-slate-100 shadow-3xs flex flex-col gap-2 hover:border-brand-200 transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {s.id}
              </span>
              <span className="text-[10px] text-slate-400 font-bold font-mono">
                {formatTanggalIndo(s.tanggal)}
              </span>
            </div>

          {/* Mengubah div menjadi flexbox horizontal dan menyelaraskan elemen di tengah sumbu tegak */}
          <div className="flex justify-between items-center">
            {/* Menggunakan leading-none atau leading-tight agar teks lurus dengan badge */}
            <h4 className="text-xs font-extrabold text-slate-800 leading-tight truncate">
              {s.siswaNama}
            </h4>
            
            {/* Menghapus mt-2 agar posisi badge tidak turun ke bawah dan mengubah rounded menjadi rounded-md agar lebih modern */}
            <span className="inline-block text-[9px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md shrink-0">
              {s.programNama}
            </span>
          </div>
          </div>
        ))}
        {filteredSessions.length === 0 && (
          <p className="text-center py-12 text-xs text-slate-400">Belum ada riwayat mengajar tercatat dalam rentang tanggal ini.</p>
        )}
      </div>

    </div>
  );
}
