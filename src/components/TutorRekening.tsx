import React, { useState } from "react";
import { 
  Download, 
  ChevronRight, 
  Wallet, 
  TrendingUp, 
  Clock, 
  Receipt,
  FileText 
} from "lucide-react";
import { 
  Database, 
  formatRupiah, 
  formatTanggalIndo, 
  getTutorHonorBalance 
} from "../lib/db";
import { downloadSlipGajiPDF } from "../lib/pdfGenerator";

interface TutorRekeningProps {
  db: Database;
  tutorId: string;
}

export default function TutorRekening({ db, tutorId }: TutorRekeningProps) {
  const [subTab, setSubTab] = useState<"mutasi" | "slips">("mutasi");
  
  const tutor = db.tutors.find(t => t.id === tutorId)!;
  const ledger = db.tutorLedger.filter(tx => tx.tutorId === tutorId);
  const slips = db.slips.filter(sl => sl.tutorId === tutorId);

  const totalEarned = ledger.filter(l => l.tipe === "kredit").reduce((sum, l) => sum + l.jumlah, 0);
  const totalPaid = ledger.filter(l => l.tipe === "debit").reduce((sum, l) => sum + l.jumlah, 0);
  const currentOwed = getTutorHonorBalance(db, tutorId);

  return (
    <div id="tutor-rekening-container" className="px-2 py-4 pb-20">
      
      {/* Financial Summary card */}
      <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-5 rounded-xl shadow-sm flex flex-col gap-1 mb-5 relative overflow-hidden">
        <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/5 rounded-full" />
        <span className="text-[9.5px] text-indigo-100 uppercase tracking-widest font-bold">Saldo Honor Anda</span>
        <h2 className="text-2xl font-black font-mono tracking-tight">{formatRupiah(currentOwed)}</h2>
        
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 bg-white p-1 rounded-lg border border-slate-100 shadow-2xs mb-5">
        <button
          id="tab-mutasi-honor"
          onClick={() => setSubTab("mutasi")}
          className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            subTab === "mutasi" ? "bg-indigo-50 text-indigo-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Mutasi Honor
        </button>
        <button
          id="tab-slips-honor"
          onClick={() => setSubTab("slips")}
          className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            subTab === "slips" ? "bg-indigo-50 text-indigo-600 font-extrabold" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Slip Gaji ({slips.length})
        </button>
      </div>

      {/* 1. MUTASI ACCOUNT TABUNAN */}
      {subTab === "mutasi" && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3 px-2">Riwayat Mutasi Honor</p>
          
          <div className="border border-slate-100 rounded-sm bg-white overflow-hidden text-[11px] shadow-3xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[8.5px] border-b border-slate-100">
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">Keterangan</th>
                  <th className="p-2.5 text-right">Debit (Penarikan)</th>
                  <th className="p-2.5 text-right">Kredit (Pendapatan)</th>
                  <th className="p-2.5 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {ledger.slice().reverse().map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="p-2.5 font-medium font-mono text-slate-500 whitespace-nowrap">{formatTanggalIndo(item.tanggal)}</td>
                    <td className="p-2.5 font-semibold text-slate-700 leading-tight">{item.keterangan}</td>
                    <td className="p-2.5 text-right font-mono font-medium text-rose-500">{item.tipe === "debit" ? formatRupiah(item.jumlah) : "-"}</td>
                    <td className="p-2.5 text-right font-mono font-medium text-emerald-600">{item.tipe === "kredit" ? formatRupiah(item.jumlah) : "-"}</td>
                    <td className="p-2.5 text-right font-mono font-semibold text-slate-600">{formatRupiah(item.saldoBerjalan)}</td>
                  </tr>
                ))}

                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs text-slate-400">Belum ada catatan mutasi tabungan honor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SALARY SLIPS TAB */}
      {subTab === "slips" && (
        <div className="space-y-3">
          {slips.map((sl) => (
            <div 
              key={sl.id} 
              id={`slip-card-${sl.id}`}
              className="bg-white p-5 rounded-lg border border-slate-100 shadow-3xs flex items-center justify-between hover:border-brand-300 transition-all"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] font-bold font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    {sl.id}
                  </span>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {sl.periode}
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-800 leading-tight mt-2">Diterima: {formatTanggalIndo(sl.tanggal)}</h4>
                <p className="text-[11px] font-black font-mono text-indigo-600 mt-1">{formatRupiah(sl.jumlah)}</p>
                {sl.potongan && sl.potongan > 0 ? (
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                    Potongan: -{formatRupiah(sl.potongan)} {sl.keteranganPotongan ? `(${sl.keteranganPotongan})` : ""}
                  </p>
                ) : null}
                {sl.catatan && (
                  <p className="text-[10px] text-slate-400 truncate mt-1">Catatan: {sl.catatan}</p>
                )}
              </div>

              <button
                id={`download-slip-btn-${sl.id}`}
                onClick={() => downloadSlipGajiPDF(sl, tutor, ledger)}
                className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all cursor-pointer border border-indigo-100 active:scale-95 shrink-0"
                title="Download PDF Slip Gaji"
              >
                <Download size={15} />
              </button>
            </div>
          ))}

          {slips.length === 0 && (
            <p className="text-center py-12 text-xs text-slate-400">Anda belum menerima Slip Gaji resmi.</p>
          )}
        </div>
      )}

    </div>
  );
}
