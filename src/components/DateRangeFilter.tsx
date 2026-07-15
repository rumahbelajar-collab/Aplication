import React, { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import CustomDatePicker from "./CustomDatePicker";

export type DateRangePreset = "hari" | "minggu" | "bulan" | "tahun" | "custom" | "semua";

interface DateRangeFilterProps {
  rangeType: DateRangePreset;
  customStart: string;
  customEnd: string;
  onChange: (rangeType: DateRangePreset, start: string, end: string) => void;
}

export default function DateRangeFilter({
  rangeType,
  customStart,
  customEnd,
  onChange
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { value: "semua", label: "Semua Waktu" },
    { value: "hari", label: "Hari Ini" },
    { value: "minggu", label: "Minggu Ini" },
    { value: "bulan", label: "Bulan Ini" },
    { value: "tahun", label: "Tahun Ini" },
    { value: "custom", label: "Rentang Kustom" }
  ];

  const handlePresetChange = (type: DateRangePreset) => {
    if (type === "custom") {
      onChange("custom", customStart, customEnd);
    } else {
      onChange(type, "", "");
    }
    setIsOpen(false);
  };

  return (
    <div id="date-range-filter-container" className="bg-white p-3 rounded-lg shadow-xs border border-slate-100 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <Calendar size={15} className="text-brand-500" />
          <span className="font-medium">Filter Tanggal:</span>
        </div>
        
        <div className="relative">
          <button
            id="preset-toggle-btn"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            {presets.find(p => p.value === rangeType)?.label || "Pilih"}
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {isOpen && (
            <div id="preset-dropdown" className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-lg z-50 overflow-hidden animate-slide-up">
              {presets.map((p) => (
                <button
                  key={p.value}
                  id={`preset-btn-${p.value}`}
                  onClick={() => handlePresetChange(p.value as DateRangePreset)}
                  className={`w-full text-left px-4 py-2.5 text-xs font-medium border-slate-50 last:border-0 hover:bg-brand-50 transition-colors cursor-pointer ${
                    rangeType === p.value ? "text-brand-600 bg-brand-50" : "text-slate-600"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {rangeType === "custom" && (
        <div id="custom-date-inputs" className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 animate-slide-up">
          <div>
            <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Mulai</label>
            <CustomDatePicker
              id="custom-start-input"
              value={customStart}
              onChange={(val) => onChange("custom", val, customEnd)}
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Hingga</label>
            <CustomDatePicker
              id="custom-end-input"
              value={customEnd}
              onChange={(val) => onChange("custom", customStart, val)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
