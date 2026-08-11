import React, { useState } from "react";
import { Cloud, CheckCircle, AlertCircle, RefreshCw, X, Database as DbIcon } from "lucide-react";
import { SyncState } from "../lib/supabase";
import { Database } from "../lib/db";

interface CloudStatusBadgeProps {
  syncState: SyncState;
  db: Database | null;
  onRetrySync?: () => void;
  className?: string;
  variant?: "floating" | "inline";
}

export default function CloudStatusBadge({
  syncState,
  db,
  onRetrySync,
  className = "",
  variant = "inline"
}: CloudStatusBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  let badgeBg = "bg-slate-900/90 text-white border-slate-700/80";
  let dotColor = "bg-slate-400";
  let statusText = "Tersimpan Lokal";
  let icon = <Cloud size={12} className="text-slate-300" />;

  if (syncState.status === "syncing") {
    badgeBg = "bg-amber-500/95 text-white border-amber-400/90 shadow-amber-500/20";
    dotColor = "bg-white animate-ping";
    statusText = "Menyimpan...";
    icon = <RefreshCw size={12} className="animate-spin text-white" />;
  } else if (syncState.status === "success") {
    badgeBg = "bg-emerald-600/95 text-white border-emerald-500/90 shadow-emerald-600/20";
    dotColor = "bg-emerald-200 animate-pulse";
    statusText = "Tersimpan";
    icon = <CheckCircle size={12} className="text-emerald-200" />;
  } else if (syncState.status === "error") {
    badgeBg = "bg-rose-600/95 text-white border-rose-500/90 shadow-rose-600/20";
    dotColor = "bg-white animate-bounce";
    statusText = "Gagal Menyimpan (Offline)";
    icon = <AlertCircle size={12} className="text-white" />;
  } else if (syncState.status === "table_missing") {
    badgeBg = "bg-rose-700/95 text-white border-rose-600/90 shadow-rose-700/20";
    dotColor = "bg-amber-300 animate-pulse";
    statusText = "Tabel Cloud Belum Ada";
    icon = <AlertCircle size={12} className="text-amber-300" />;
  }

  const isFloating = variant === "floating";

  return (
    <div className={`relative inline-flex items-center ${isFloating ? "fixed bottom-4 right-4 z-50" : ""} ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (onRetrySync && (syncState.status === "error" || syncState.status === "idle" || syncState.status === "table_missing")) {
            onRetrySync();
          } else {
            setShowTooltip(!showTooltip);
          }
        }}
        className={`px-3 py-1.5 rounded-full border text-[10.5px] font-extrabold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer ${badgeBg}`}
        title="Klik untuk detail status penyimpanan cloud Supabase"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        {icon}
        <span>{statusText}</span>
        {syncState.lastSynced && syncState.status === "success" && (
          <span className="text-[9px] font-mono opacity-80 border-l border-white/20 pl-1.5 ml-0.5">
            {syncState.lastSynced}
          </span>
        )}
      </button>

      {/* Popover Tooltip / Detail Card */}
      {showTooltip && (
        <div className={`absolute ${isFloating ? "right-0 bottom-full mb-3" : "left-0 top-full mt-2"} w-72 bg-slate-900 text-slate-100 p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-[11px] z-50 animate-fade-in`}>
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Cloud size={14} className="text-brand-400" />
              Status Storage Utama
            </span>
            <button 
              type="button"
              onClick={() => setShowTooltip(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-1.5 text-[10px] text-slate-300 mb-3 leading-relaxed">
            <p className="pt-1">
              {syncState.status === "success" 
                ? "Semua data aplikasi berhasil tersimpan di Cloud. Pastikan data terupload dengan benar."
                : syncState.status === "syncing"
                ? "Sedang mengirim perubahan terbaru ke cluster Cloud..."
                : syncState.status === "error"
                ? "Koneksi pengiriman Cloud terputus. Data saat ini disimpan sementara di local storage anda."
                : "Aplikasi menggunakan cache lokal sebagai cadangan."}
            </p>
            {syncState.lastSynced && (
              <p className="text-[9.5px] text-slate-400 font-mono">
                Terakhir Sinkron: <span className="text-slate-200">{syncState.lastSynced}</span>
              </p>
            )}
          </div>

          {syncState.errorMessage && (
            <div className="text-[9.5px] text-rose-300 bg-rose-950/80 p-2 rounded-xl border border-rose-800/80 mb-3 font-mono leading-normal">
              Error: {syncState.errorMessage}
            </div>
          )}

          {onRetrySync && (
            <button
              type="button"
              onClick={() => {
                setShowTooltip(false);
                onRetrySync();
              }}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 rounded-xl text-[10.5px] flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
            >
              <RefreshCw size={12} />
              Sinkronkan ke Cloud Sekarang
            </button>
          )}
        </div>
      )}
    </div>
  );
}
