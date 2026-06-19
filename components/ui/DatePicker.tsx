"use client";

import { useState, useEffect } from "react";

export function fmtDate(val: string): string {
  if (!val) return "";
  const d = new Date(val + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("sr-Latn", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parseToISO(raw: string): string | null {
  const parts = raw.trim().split(".");
  if (parts.length < 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const [display, setDisplay] = useState(() => fmtDate(value));
  const [error, setError]     = useState(false);

  useEffect(() => {
    setDisplay(fmtDate(value));
    setError(false);
  }, [value]);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);

    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "." + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + "." + digits.slice(2, 4) + "." + digits.slice(4);

    setDisplay(formatted);

    if (digits.length === 0) {
      setError(false);
      onChange("");
      return;
    }
    const iso = parseToISO(formatted);
    if (iso) {
      setError(false);
      onChange(iso);
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (display.trim() === "") {
      setError(false);
      el.style.borderColor = "var(--border)";
      return;
    }
    const iso = parseToISO(display);
    if (iso) {
      setDisplay(fmtDate(iso));
      setError(false);
      onChange(iso);
      el.style.borderColor = "var(--border)";
    } else {
      setError(true);
      el.style.borderColor = "var(--red)";
    }
  }

  return (
    <input
      type="text"
      value={display}
      placeholder="DD.MM.YYYY"
      onChange={(e) => handleChange(e.target.value)}
      onFocus={(e) => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--green)"; }}
      onBlur={handleBlur}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: `1.5px solid ${error ? "var(--red)" : "var(--border)"}`,
        borderRadius: 9,
        fontSize: 14,
        color: "#111418",
        background: "#fff",
        fontFamily: "var(--font-geist-mono), monospace",
        outline: "none",
        boxSizing: "border-box" as const,
        transition: "border-color .15s",
      }}
    />
  );
}
