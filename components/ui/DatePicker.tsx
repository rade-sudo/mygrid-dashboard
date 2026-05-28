"use client";

import { useState, useEffect, useRef } from "react";

const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"];
const DOW_SR    = ["Po","Ut","Sr","Če","Pe","Su","Ne"];

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function fmtDate(val: string): string {
  if (!val) return "";
  const d = new Date(val + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()}. ${MONTHS_SR[d.getMonth()].toLowerCase()} ${d.getFullYear()}.`;
}

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen]           = useState(false);
  const [viewMonth, setViewMonth] = useState(() => { const d = value ? new Date(value+"T00:00:00") : new Date(); return d.getMonth(); });
  const [viewYear, setViewYear]   = useState(() => { const d = value ? new Date(value+"T00:00:00") : new Date(); return d.getFullYear(); });
  const [hovDay, setHovDay]       = useState<string|null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }|null>(null);

  useEffect(() => {
    if (!open) return;
    if (value) {
      const d = new Date(value+"T00:00:00");
      if (!isNaN(d.getTime())) { setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }
    }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const left = Math.min(r.left, window.innerWidth - 288);
      if (window.innerHeight - r.bottom < 340) {
        setPos({ bottom: window.innerHeight - r.top + 4, left });
      } else {
        setPos({ top: r.bottom + 4, left });
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("scroll", onScroll, true); };
  }, [open]);

  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  const firstDow    = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const lastPrev    = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = firstDow; i > 0; i--) cells.push({ date: new Date(viewYear, viewMonth-1, lastPrev-i+1), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++)     cells.push({ date: new Date(viewYear, viewMonth, d),      inMonth: true  });
  let nx = 1; while (cells.length < 42)      cells.push({ date: new Date(viewYear, viewMonth+1, nx++), inMonth: false });

  const todayKey = localKey(new Date());

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "9px 12px",
          border: `1.5px solid ${open ? "var(--violet)" : "var(--border)"}`,
          borderRadius: 9, background: "#fff", fontSize: 14,
          color: value ? "#111418" : "var(--muted)",
          fontFamily: "inherit", cursor: "pointer", boxSizing: "border-box", transition: "border-color .14s",
        }}
      >
        <span>{fmtDate(value) || "Odaberite datum..."}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#9aa0a6", flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
      </button>

      {open && pos && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
            left: pos.left, width: 280,
            background: "#fff", border: "1px solid var(--border)", borderRadius: 16,
            boxShadow: "0 8px 32px rgba(16,24,40,.12), 0 2px 8px rgba(16,24,40,.06)",
            padding: 12, zIndex: 300,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" onClick={prevMonth}
              style={{ display: "inline-flex", padding: 6, border: "none", background: "transparent", borderRadius: 7, cursor: "pointer", color: "#6b7280", transition: "background .1s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111418" }}>{MONTHS_SR[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth}
              style={{ display: "inline-flex", padding: 6, border: "none", background: "transparent", borderRadius: 7, cursor: "pointer", color: "#6b7280", transition: "background .1s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
            {DOW_SR.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--muted)", padding: "2px 0" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map(({ date, inMonth }) => {
              const key     = localKey(date);
              const isSel   = key === value;
              const isHov   = hovDay === key && inMonth;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { onChange(key); setOpen(false); }}
                  onMouseEnter={() => setHovDay(key)}
                  onMouseLeave={() => setHovDay(null)}
                  style={{
                    padding: "5px 0", borderRadius: 7,
                    border: isToday && !isSel ? "1.5px solid var(--violet-soft)" : "1.5px solid transparent",
                    fontSize: 13, cursor: "pointer", textAlign: "center",
                    fontWeight: isSel ? 600 : 400,
                    background: isSel ? "var(--violet)" : isHov ? "#f3f4f6" : "transparent",
                    color: isSel ? "#fff" : !inMonth ? "var(--muted-2)" : isToday ? "var(--violet)" : "#111418",
                    transition: "background .1s",
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
