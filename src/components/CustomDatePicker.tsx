import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

interface CustomDatePickerProps {
  id?: string;
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export default function CustomDatePicker({
  id,
  value,
  onChange,
  required = false,
  className = "",
  placeholder = "HH/BB/TTTT"
}: CustomDatePickerProps) {
  const [typedValue, setTypedValue] = useState("");

  // Update local input string state when prop changes
  useEffect(() => {
    if (value && value.includes("-")) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setTypedValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
      }
    } else {
      setTypedValue("");
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, ""); // Keep only numbers
    if (raw.length > 8) raw = raw.slice(0, 8); // Limit to DDMMYYYY (8 chars)

    // Format as DD/MM/YYYY
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    } else if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    }

    setTypedValue(formatted);

    // If it's complete, try to parse and update parent state
    if (formatted.length === 10) {
      const parts = formatted.split("/");
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];

      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);

      // Simple calendar validations
      if (
        d >= 1 && d <= 31 &&
        m >= 1 && m <= 12 &&
        y >= 1900 && y <= 2100
      ) {
        onChange(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
      }
    } else if (formatted.length === 0) {
      onChange("");
    }
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (val) {
      onChange(val);
    } else {
      onChange("");
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        id={id}
        value={typedValue}
        onChange={handleTextChange}
        placeholder={placeholder}
        required={required}
        pattern="\d{2}/\d{2}/\d{4}"
        className="w-full text-xs font-semibold p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 font-mono placeholder-slate-400"
      />
      <div className="absolute right-3 flex items-center justify-center w-5 h-5 text-slate-400 pointer-events-none">
        <Calendar size={14} />
      </div>
      {/* Invisible native date input on top of the icon area to trigger browser calendar */}
      <input
        type="date"
        value={value}
        onChange={handleNativeChange}
        className="absolute right-2 w-8 h-8 opacity-0 cursor-pointer"
        title="Pilih Tanggal"
      />
    </div>
  );
}
