"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import { IconCaretSm, IconSortAsc, IconSortDesc, IconSort } from "@/components/ui/icons";
import { useSortableData } from "@/hooks/useSortableData";
import DatePicker from "@/components/ui/DatePicker";
import FormDropdown from "@/components/ui/FormDropdown";
import api from "@/lib/axios";
import type { Employee, EmployeeFormData, Sector, SalaryType } from "@/types/employee";
import { EMPTY_FORM } from "@/types/employee";
import type { Vacation } from "@/types/vacation";
import { VACATION_TYPES } from "@/types/vacation";
import type { ActivityLog, ActivityPage } from "@/types/activity";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const BASE = `/api/${TENANT}/employees`;
const VACATIONS_BASE = `/api/${TENANT}/vacations`;
const ACTIVITY_BASE = `/api/${TENANT}/activity-logs`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECTOR_META: Record<Sector, { label: string; color: string; bg: string }> = {
  gradiliste: { label: "Gradilište", color: "#d97706", bg: "#fdf3e3" },
  pumpa:      { label: "Pumpa",      color: "#2563eb", bg: "#eaf1ff" },
  kancelarija:{ label: "Kancelarija",color: "#7c3aed", bg: "#f1ebff" },
  ostalo:     { label: "Ostalo",     color: "#6b7280", bg: "#f3f4f6" },
};

function SectorBadge({ sector }: { sector: Sector }) {
  const m = SECTOR_META[sector] ?? SECTOR_META.ostalo;
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color: m.color,
      background: m.bg,
    }}>
      {m.label}
    </span>
  );
}

function StatusBadge({ employee }: { employee: Employee }) {
  if (employee.is_on_vacation)
    return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#d97706", background: "#fdf3e3" }}>Na odmoru</span>;
  if (employee.status === "inactive")
    return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#6b7280", background: "#f3f4f6" }}>Neaktivan</span>;
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#16a34a", background: "#e8f6ee" }}>Aktivan</span>;
}

function FilterDropdown({
  value,
  onChange,
  placeholder,
  options,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const active = value !== "";
  const currentLabel = active
    ? (options.find((o) => o.value === value)?.label ?? placeholder)
    : placeholder;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          border: `1px solid ${active || open ? "var(--violet)" : "var(--border)"}`,
          background: active ? "var(--violet-soft)" : open ? "#faf8ff" : "#fff",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 500,
          color: active || open ? "var(--violet)" : "#2a2f37",
          boxShadow: "var(--shadow-card)",
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        {icon}
        <span>{currentLabel}</span>
        <span style={{
          display: "inline-flex",
          color: active || open ? "var(--violet)" : "#9aa0a6",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform .2s",
        }}>
          <IconCaretSm />
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 8px 32px rgba(16,24,40,.1), 0 2px 8px rgba(16,24,40,.06)",
          padding: "6px",
          minWidth: 180,
          zIndex: 60,
        }}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const isHov = hoveredItem === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onMouseEnter={() => setHoveredItem(opt.value)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 9,
                  border: "none",
                  fontSize: 14,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected
                    ? "var(--violet-soft)"
                    : isHov ? "#f8f9fa" : "transparent",
                  color: isSelected ? "var(--violet)" : isHov ? "#111418" : "#374151",
                  transition: "background .1s, color .1s",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function employeeToForm(e: Employee): EmployeeFormData {
  return {
    status:              e.status,
    first_name:          e.first_name,
    last_name:           e.last_name,
    jmbg:                e.jmbg ?? "",
    address:             e.address ?? "",
    phone:               e.phone ?? "",
    email:               e.email ?? "",
    sector:              e.sector,
    position:            e.position,
    employment_date:     e.employment_date ?? "",
    contract_number:     e.contract_number ?? "",
    contract_start_date: e.contract_start_date ?? "",
    contract_end_date:   e.contract_end_date ?? "",
    salary_type:          e.salary_type,
    hourly_rate:          e.hourly_rate ?? "",
    fixed_salary:         e.fixed_salary ?? "",
    vacation_days_total:  e.vacation_days_total != null ? String(e.vacation_days_total) : "",
    is_permanent:         e.is_permanent,
  };
}

// ─── Form Input helpers ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid var(--border)",
  borderRadius: 9,
  fontSize: 14,
  color: "#111418",
  background: "#fff",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .14s",
};


const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 5,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".1em",
  textTransform: "uppercase" as React.CSSProperties["textTransform"],
  color: "var(--muted)",
  marginBottom: 12,
};


function FormField({
  label,
  children,
  error,
  span2,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  span2?: boolean;
}) {
  return (
    <div style={{ gridColumn: span2 ? "1 / -1" : undefined }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{error}</div>}
    </div>
  );
}


// ─── Employee Detail Panel ────────────────────────────────────────────────────

const DETAIL_TABS = [
  { id: "opste",    label: "Opšte" },
  { id: "ugovori",  label: "Ugovori" },
  { id: "odsustva", label: "Odsustva" },
  { id: "oprema",   label: "Oprema" },
  { id: "istorija", label: "Istorija" },
] as const;

type DetailTab = (typeof DETAIL_TABS)[number]["id"];

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--border-soft)" }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", width: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#111418", fontWeight: 400 }}>{value ?? <span style={{ color: "var(--muted-2)" }}>—</span>}</span>
    </div>
  );
}

function TabPlaceholder({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 0", color: "var(--muted)", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--violet-soft)", display: "grid", placeItems: "center", color: "var(--violet)", marginBottom: 14, opacity: 0.7 }}>
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{desc}</div>
    </div>
  );
}

function FieldCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase" as const, color: "#9ca3af" }}>
        {label}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: "#111418", lineHeight: 1.4 }}>
        {value}
      </span>
    </div>
  );
}

const MISSING_VALUE = <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: 13 }}>Nije uneto</span>;

// ─── Activity timeline helpers ────────────────────────────────────────────────

function relTime(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 5) return "upravo";
  const rtf = new Intl.RelativeTimeFormat("sr-Latn", { numeric: "auto" });
  if (diffSec < 3600)  return rtf.format(-Math.floor(diffSec / 60), "minute");
  if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), "hour");
  return rtf.format(-Math.floor(diffSec / 86400), "day");
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return "Danas";
  if (same(d, yest))  return "Juče";
  return d.toLocaleDateString("sr-Latn", { day: "numeric", month: "long", year: "numeric" });
}

function groupActivityLogs(logs: ActivityLog[]): { label: string; items: ActivityLog[] }[] {
  const result: { label: string; items: ActivityLog[] }[] = [];
  const seen = new Map<string, ActivityLog[]>();
  for (const log of logs) {
    const key = getDayLabel(log.created_at);
    if (!seen.has(key)) { seen.set(key, []); result.push({ label: key, items: seen.get(key)! }); }
    seen.get(key)!.push(log);
  }
  return result;
}

const DOT_COLOR: Record<string, string> = {
  kreirao: "#16a34a",
  izmenio: "#7c3aed",
  obrisao: "#dc2626",
};

function EmployeeDetailPanel({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<DetailTab>("opste");
  const overlayRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!employee) setActiveTab("opste");
  }, [employee]);

  const { data: vacations = [] } = useQuery<Vacation[]>({
    queryKey: ["employee-vacations", employee?.id, currentYear],
    queryFn: () =>
      api.get(`${VACATIONS_BASE}?employee_id=${employee!.id}&type=godisnji&year=${currentYear}`)
        .then((r) => r.data),
    enabled: employee != null,
  });

  const { data: allVacations = [], isLoading: allVacationsLoading } = useQuery<Vacation[]>({
    queryKey: ["employee-all-vacations", employee?.id],
    queryFn: () =>
      api.get(`${VACATIONS_BASE}?employee_id=${employee!.id}`)
        .then((r) => r.data),
    enabled: employee != null,
  });

  const { data: activityPage, isLoading: activityLoading } = useQuery<ActivityPage>({
    queryKey: ["employee-activity-logs", employee?.id],
    queryFn: () =>
      api.get(`${ACTIVITY_BASE}?subject_type=Employee&subject_id=${employee!.id}&per_page=50`)
        .then((r) => r.data),
    enabled: employee != null && activeTab === "istorija",
  });
  const activityLogs: ActivityLog[] = activityPage?.data ?? [];

  if (!employee) return null;

  const usedDays = vacations.reduce((acc, v) => {
    const yearStart = new Date(`${currentYear}-01-01`);
    const yearEnd   = new Date(`${currentYear}-12-31`);
    const start = new Date(v.start_date) < yearStart ? yearStart : new Date(v.start_date);
    const end   = new Date(v.end_date)   > yearEnd   ? yearEnd   : new Date(v.end_date);
    return acc + Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  }, 0);

  const remainingDays = employee.vacation_days_total != null
    ? employee.vacation_days_total - usedDays
    : null;

  const initials = `${employee.first_name[0] ?? ""}${employee.last_name[0] ?? ""}`.toUpperCase();

  const salaryText = employee.salary_type === "satnica" && employee.hourly_rate
    ? `${parseFloat(employee.hourly_rate).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD/h`
    : employee.fixed_salary
      ? `${parseFloat(employee.fixed_salary).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`
      : null;

  const { fmtDate } = { fmtDate: (v: string | null) => v ? new Date(v).toLocaleDateString("sr-Latn", { day: "2-digit", month: "2-digit", year: "numeric" }) : null };

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const contractEndDate = employee.contract_end_date ? new Date(employee.contract_end_date) : null;
  const daysUntilExpiry = contractEndDate
    ? Math.ceil((contractEndDate.getTime() - todayDate.getTime()) / 86_400_000)
    : null;
  const contractExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const contractExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 15;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.45)", zIndex: 200, display: "flex", justifyContent: "flex-end" }}
    >
      <div style={{
        width: "min(500px, 100vw)",
        height: "100%",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(16,24,40,.12)",
        animation: "slideInRight .22s cubic-bezier(.32,.72,.27,1)",
      }}>
        {/* Close */}
        <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, display: "flex", borderRadius: 6 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Hero */}
        <div style={{ padding: "10px 24px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--violet-soft)",
              border: "2px solid rgba(124,58,237,.2)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "var(--violet)",
              letterSpacing: ".02em",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "#111418", margin: 0 }}>
                  {employee.first_name} {employee.last_name}
                </h2>
                <StatusBadge employee={employee} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, color: "var(--muted)" }}>{employee.position}</span>
                <span style={{ color: "var(--border)", fontSize: 12 }}>·</span>
                <SectorBadge sector={employee.sector} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {employee.phone ? (
                  <a href={`tel:${employee.phone}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, color: "#374151", background: "#fff", textDecoration: "none", fontFamily: "inherit" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.47 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.41a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {employee.phone}
                  </a>
                ) : null}
                {employee.email ? (
                  <a href={`mailto:${employee.email}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, color: "#374151", background: "#fff", textDecoration: "none", fontFamily: "inherit" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    {employee.email}
                  </a>
                ) : null}
                {!employee.phone && !employee.email && (
                  <span style={{ fontSize: 12.5, color: "var(--muted-2)" }}>Nema kontakt podataka</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ borderBottom: "1px solid var(--border)", flexShrink: 0, overflowX: "auto" }}>
          <div style={{ display: "flex", padding: "0 24px", gap: 0 }}>
            {DETAIL_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "12px 14px",
                    border: "none",
                    borderBottom: `2px solid ${isActive ? "var(--violet)" : "transparent"}`,
                    background: "none",
                    fontSize: 13.5,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--violet)" : "#6b7280",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "color .15s, border-color .15s",
                    whiteSpace: "nowrap",
                    marginBottom: -1,
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── Opšte ── */}
          {activeTab === "opste" && (
            <div style={{ padding: "20px 24px" }}>

              {/* No-vacation warning banner */}
              {employee.vacation_days_total != null && remainingDays !== null && remainingDays <= 0 && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "12px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  marginBottom: 16,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>
                      {remainingDays === 0 ? "Iskorišćeni svi dani odmora" : "Prekoračeni dani odmora"}
                    </div>
                    <div style={{ fontSize: 12, color: "#991b1b", marginTop: 2, lineHeight: 1.5 }}>
                      Radnik nema raspoloživih dana godišnjeg odmora za {currentYear}.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 4 }}>
                Lični podaci
              </div>
              <div style={{ marginBottom: 20 }}>
                <DataRow label="JMBG" value={employee.jmbg} />
                <DataRow label="Adresa" value={employee.address} />
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 4 }}>
                Radno mjesto
              </div>
              <div style={{ marginBottom: 20 }}>
                <DataRow label="Sektor" value={<SectorBadge sector={employee.sector} />} />
                <DataRow label="Pozicija" value={employee.position} />
                <DataRow label="Datum zaposlenja" value={fmtDate(employee.employment_date)} />
                <DataRow label="Tip ugovora" value={employee.is_permanent ? "Stalno zaposlenje" : "Ugovor o radu"} />
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 4 }}>
                Zarada
              </div>
              <div style={{ marginBottom: 20 }}>
                <DataRow label="Tip plate" value={employee.salary_type === "satnica" ? "Satnica" : "Fiksna plata"} />
                <DataRow label="Iznos" value={salaryText} />
              </div>

              {employee.vacation_days_total != null && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 4 }}>
                    Godišnji odmor {currentYear}
                  </div>
                  <div>
                    <DataRow label="Ukupno dana/god." value={`${employee.vacation_days_total} dana`} />
                    <DataRow label="Iskorišćeno" value={`${usedDays} dana`} />
                    <DataRow
                      label="Ostatak"
                      value={
                        remainingDays != null ? (
                          <span style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                            background: remainingDays > 0 ? "#e8f6ee" : remainingDays === 0 ? "#fdf3e3" : "#fef2f2",
                            color:      remainingDays > 0 ? "#16a34a" : remainingDays === 0 ? "#d97706"  : "#dc2626",
                          }}>
                            {remainingDays > 0 ? `${remainingDays} dana` : remainingDays === 0 ? "Iskorišćeno sve" : `${Math.abs(remainingDays)} dana prekoračeno`}
                          </span>
                        ) : null
                      }
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Ugovori ── */}
          {activeTab === "ugovori" && (() => {
            let expiryValue: React.ReactNode;
            if (employee.is_permanent) {
              expiryValue = <span style={{ color: "#9ca3af", fontSize: 13 }}>Nema roka (Trajno)</span>;
            } else if (!employee.contract_end_date) {
              expiryValue = MISSING_VALUE;
            } else if (contractExpired || contractExpiringSoon) {
              expiryValue = (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#dc2626" }}>
                    {fmtDate(employee.contract_end_date)}
                  </span>
                  <span className="contract-expiry-badge" style={{
                    fontSize: 11, fontWeight: 600,
                    padding: "2px 8px", borderRadius: 20,
                    background: "#fee2e2", color: "#dc2626",
                  }}>
                    {contractExpired ? "Istekao!" : "Ističe uskoro!"}
                  </span>
                </div>
              );
            } else {
              expiryValue = <span style={{ fontSize: 13.5 }}>{fmtDate(employee.contract_end_date)}</span>;
            }

            return (
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 12 }}>
                  Ugovor o radu
                </div>
                <div style={{ background: "#f8f9fb", borderRadius: 14, padding: "18px 16px", border: "1px solid #f1f1f1", marginBottom: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <FieldCell label="Tip ugovora" value={employee.is_permanent ? "Na neodređeno (Stalno)" : "Na određeno"} />
                    <FieldCell label="Broj ugovora" value={employee.contract_number || MISSING_VALUE} />
                    <FieldCell label="Datum početka" value={fmtDate(employee.contract_start_date) ?? MISSING_VALUE} />
                    <FieldCell label="Datum isteka" value={expiryValue} />
                  </div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 12 }}>
                  Finansije
                </div>
                <div style={{ background: "#f8f9fb", borderRadius: 14, padding: "18px 16px", border: "1px solid #f1f1f1" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <FieldCell label="Tip plate" value={employee.salary_type === "satnica" ? "Satnica" : "Fiksna plata"} />
                    <FieldCell label="Osnovna plata" value={salaryText ?? MISSING_VALUE} />
                    <FieldCell label="Žiro račun" value={MISSING_VALUE} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Odsustva ── */}
          {activeTab === "odsustva" && (() => {
            const total = employee.vacation_days_total ?? 0;
            const progressPct = total > 0 ? Math.min(100, Math.round((usedDays / total) * 100)) : 0;
            const fillColor = remainingDays !== null && remainingDays < 0
              ? "#dc2626"
              : progressPct >= 80 ? "#d97706"
              : "var(--violet)";

            const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
              godisnji:  { label: "Godišnji odmor",     color: "#7c3aed", bg: "#f1ebff" },
              bolovanje: { label: "Bolovanje",           color: "#d97706", bg: "#fdf3e3" },
              neplaceno: { label: "Neplaćeno odsustvo",  color: "#6b7280", bg: "#f3f4f6" },
              ostalo:    { label: "Ostalo",              color: "#6b7280", bg: "#f3f4f6" },
            };

            const sorted = [...allVacations].sort(
              (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            );

            return (
              <div style={{ padding: "20px 24px" }}>

                {/* Progress card */}
                {employee.vacation_days_total != null ? (
                  <div style={{ background: "#fff", borderRadius: 14, padding: "18px 16px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)", marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" as const, marginBottom: 14 }}>
                      Godišnji odmor — {currentYear}
                    </div>

                    {/* Bar */}
                    <div style={{ height: 10, borderRadius: 10, background: "#f1f2f5", overflow: "hidden", marginBottom: 10 }}>
                      <div style={{
                        height: "100%",
                        width: `${progressPct}%`,
                        borderRadius: 10,
                        background: fillColor,
                        transition: "width .4s ease",
                      }} />
                    </div>

                    {/* Legend row */}
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: fillColor, flexShrink: 0 }} />
                        <span style={{ color: "#374151" }}>Iskorišćeno: <strong>{usedDays}</strong> {usedDays === 1 ? "dan" : "dana"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />
                        <span style={{ color: "#374151" }}>Preostalo: <strong style={{ color: (remainingDays ?? 0) > 0 ? "#16a34a" : "#dc2626" }}>{remainingDays ?? 0}</strong> {(remainingDays ?? 0) === 1 ? "dan" : "dana"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#9ca3af", flexShrink: 0 }} />
                        <span style={{ color: "#6b7280" }}>Ukupno: <strong>{total}</strong> dana/god.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "12px 14px", background: "#f8f9fa", borderRadius: 10, border: "1px dashed var(--border)", marginBottom: 24, fontSize: 13, color: "var(--muted)", textAlign: "center" as const }}>
                    Godišnji odmor nije konfigurisan za ovog zaposlenog.
                  </div>
                )}

                {/* History */}
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" as const, marginBottom: 12 }}>
                  Istorija odsustava i bolovanja
                </div>

                {allVacationsLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ height: 60, borderRadius: 10, background: "#f1f2f5" }} />
                    ))}
                  </div>
                ) : sorted.length === 0 ? (
                  <div style={{ textAlign: "center" as const, padding: "32px 0", color: "#9ca3af", fontStyle: "italic", fontSize: 13.5 }}>
                    Nema zabeleženih odsustava za ovog zaposlenog.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sorted.map((v) => {
                      const meta = TYPE_META[v.type] ?? TYPE_META.ostalo;
                      const typeLabel = VACATION_TYPES.find((t) => t.value === v.type)?.label ?? v.type;
                      const days = Math.round((new Date(v.end_date).getTime() - new Date(v.start_date).getTime()) / 86_400_000) + 1;
                      return (
                        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "#f8f9fb", borderRadius: 11, border: "1px solid #f1f1f1" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" as const }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: meta.bg, color: meta.color }}>
                                {typeLabel}
                              </span>
                              <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 20, background: "#e8f6ee", color: "#16a34a", fontWeight: 600 }}>
                                Odobreno
                              </span>
                            </div>
                            <div style={{ fontSize: 12.5, color: "#374151" }}>
                              {fmtDate(v.start_date)} – {fmtDate(v.end_date)}
                              <span style={{ marginLeft: 8, color: "var(--muted)", fontWeight: 500 }}>({days} {days === 1 ? "dan" : "dana"})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Oprema ── */}
          {activeTab === "oprema" && (() => {
            type EquipType = "laptop" | "phone" | "car" | "key" | "tool" | "other";
            const EQ_META: Record<EquipType, { color: string; bg: string; icon: React.ReactNode }> = {
              laptop: { color: "#7c3aed", bg: "#f1ebff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="13" rx="2" /><path d="M1 21h22" /></svg> },
              phone:  { color: "#2563eb", bg: "#eaf1ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg> },
              car:    { color: "#d97706", bg: "#fdf3e3", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" /><circle cx="7.5" cy="17" r="1.5" /><circle cx="16.5" cy="17" r="1.5" /></svg> },
              key:    { color: "#16a34a", bg: "#e8f6ee", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6M15.5 7.5l3 3M19 5.93l2 2" /></svg> },
              tool:   { color: "#ea580c", bg: "#fff3ed", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg> },
              other:  { color: "#6b7280", bg: "#f3f4f6", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg> },
            };

            // Mock data — replace with API call when equipment module is built
            const equipment: { id: number; name: string; description: string; type: EquipType; assignedDate: string }[] = [
              { id: 1, name: "MacBook Pro 14\"",          description: "SN: MK1A3ZE/A · 2021",     type: "laptop", assignedDate: "2023-03-15" },
              { id: 2, name: "iPhone 13 Pro",             description: "IMEI: 353088114683910",     type: "phone",  assignedDate: "2023-03-15" },
              { id: 3, name: "Škoda Octavia · BG-123-AB", description: "Kombi vozilo, ključevi",   type: "car",    assignedDate: "2024-01-10" },
            ];

            return (
              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
                    Zadužena oprema i sredstva
                  </div>
                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "var(--violet-soft)", color: "var(--violet)", fontWeight: 600 }}>
                    {equipment.length} {equipment.length === 1 ? "stavka" : "stavki"}
                  </span>
                </div>

                {equipment.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 10 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f3f4f6", display: "grid", placeItems: "center", color: "#9ca3af" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      </svg>
                    </div>
                    <p style={{ fontSize: 13.5, color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
                      Zaposleni trenutno ne duži nikakvu opremu.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {equipment.map((item) => {
                      const meta = EQ_META[item.type];
                      return (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "#f8f9fb", borderRadius: 12, border: "1px solid #f1f1f1" }}>
                          {/* Icon circle */}
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.bg, display: "grid", placeItems: "center", color: meta.color, flexShrink: 0 }}>
                            {meta.icon}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111418", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                              {item.description}
                            </div>
                          </div>

                          {/* Date */}
                          <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0, textAlign: "right" as const }}>
                            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" as const, marginBottom: 2 }}>Zaduženo</div>
                            {fmtDate(item.assignedDate)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mock notice */}
                <div style={{ marginTop: 20, padding: "10px 12px", background: "#fdf3e3", borderRadius: 9, border: "1px dashed #fcd34d", fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  Mock podaci — modul Oprema biće povezan sa API-jem kada se implementira evidencija zaduženja.
                </div>
              </div>
            );
          })()}

          {/* ── Istorija ── */}
          {activeTab === "istorija" && (
            <div style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 18 }}>
                Hronologija aktivnosti
              </div>

              {activityLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingLeft: 26 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i}>
                      <div style={{ height: 13, borderRadius: 6, background: "#f1f2f5", width: "70%", marginBottom: 6 }} />
                      <div style={{ height: 10, borderRadius: 6, background: "#f6f7f9", width: "30%" }} />
                    </div>
                  ))}
                </div>
              ) : activityLogs.length === 0 ? (
                <div style={{ textAlign: "center" as const, padding: "36px 0", color: "#9ca3af", fontStyle: "italic", fontSize: 13.5 }}>
                  Nema zabeleženih istorijskih promjena za ovog radnika.
                </div>
              ) : (() => {
                const grouped = groupActivityLogs(activityLogs);
                const flatAll = grouped.flatMap((g) => g.items);
                return grouped.map((group) => (
                  <div key={group.label} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".07em", textTransform: "uppercase" as const, marginBottom: 10, paddingLeft: 24 }}>
                      {group.label}
                    </div>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {group.items.map((log) => {
                        const isLast = log === flatAll[flatAll.length - 1];
                        const dotColor = DOT_COLOR[log.action] ?? "#6b7280";
                        return (
                          <li key={log.id} style={{ position: "relative", paddingLeft: 26, paddingBottom: isLast ? 0 : 18 }}>
                            {!isLast && (
                              <span style={{ position: "absolute", left: 5, top: 14, width: 1.5, bottom: 0, background: "#e5e7eb", display: "block" }} />
                            )}
                            <span style={{
                              position: "absolute", left: 0, top: 5,
                              width: 11, height: 11, borderRadius: "50%",
                              background: dotColor,
                              boxShadow: `0 0 0 2.5px #fff, 0 0 0 4.5px ${dotColor}28`,
                              display: "block", zIndex: 1,
                            }} />
                            <div>
                              <p style={{ margin: 0, fontSize: 13.5, color: "#111418", lineHeight: 1.45, fontWeight: 500 }}>
                                {log.user?.name && <span style={{ fontWeight: 700 }}>{log.user.name} · </span>}
                                {log.description}
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                                {relTime(log.created_at)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ));
              })()}
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes contractPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: .45; }
        }
        .contract-expiry-badge {
          animation: contractPulse 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ─── Employee Form (Slide-over) ───────────────────────────────────────────────

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
}

function EmployeeForm({ open, onClose, employee }: EmployeeFormProps) {
  const queryClient = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const isEdit = employee !== null;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({ defaultValues: EMPTY_FORM });

  const salaryType = watch("salary_type") as SalaryType;
  const isPermanent = watch("is_permanent");

  useEffect(() => {
    if (open) {
      reset(employee ? employeeToForm(employee) : EMPTY_FORM);
    }
  }, [open, employee, reset]);

  const mutation = useMutation({
    mutationFn: (data: EmployeeFormData) =>
      isEdit
        ? api.put(`${BASE}/${employee!.id}`, data).then((r) => r.data)
        : api.post(BASE, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`${BASE}/${employee!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      onClose();
    },
  });

  const onSubmit = (data: EmployeeFormData) => mutation.mutate(data);

  const apiErrors = (mutation.error as { response?: { data?: { errors?: Record<string, string[]> } } })
    ?.response?.data?.errors;

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,17,36,.45)",
        zIndex: 200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          width: "min(540px, 100vw)",
          height: "100%",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 40px rgba(16,24,40,.12)",
          animation: "slideInRight .22s cubic-bezier(.32,.72,.27,1)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111418" }}>
              {isEdit ? "Izmijeni zaposlenog" : "Dodaj zaposlenog"}
            </div>
            {isEdit && (
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                {employee.first_name} {employee.last_name}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, display: "flex" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <form id="emp-form" onSubmit={handleSubmit(onSubmit)}>

            {/* API error */}
            {mutation.isError && !apiErrors && (
              <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13.5, color: "var(--red)", marginBottom: 20 }}>
                Greška pri čuvanju. Pokušajte ponovo.
              </div>
            )}

            {/* ── 1. Lični podaci ── */}
            <div style={sectionTitleStyle}>Lični podaci</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 28 }}>
              <FormField label="Ime *" error={errors.first_name?.message ?? apiErrors?.first_name?.[0]}>
                <input
                  {...register("first_name", { required: "Obavezno polje" })}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                />
              </FormField>
              <FormField label="Prezime *" error={errors.last_name?.message ?? apiErrors?.last_name?.[0]}>
                <input
                  {...register("last_name", { required: "Obavezno polje" })}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                />
              </FormField>
              <FormField label="JMBG" error={apiErrors?.jmbg?.[0]}>
                <input
                  {...register("jmbg")}
                  style={inputStyle}
                  maxLength={13}
                  onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                />
              </FormField>
              <FormField label="Status" error={errors.status?.message}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormDropdown
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: "active",   label: "Aktivan" },
                        { value: "inactive", label: "Neaktivan" },
                      ]}
                    />
                  )}
                />
              </FormField>
              <FormField label="Adresa" span2>
                <input
                  {...register("address")}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                />
              </FormField>
            </div>

            {/* ── 2. Kontakt ── */}
            <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 20, marginBottom: 16 }}>
              <div style={sectionTitleStyle}>Kontakt</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 28 }}>
                <FormField label="Telefon">
                  <input
                    {...register("phone")}
                    type="tel"
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                  />
                </FormField>
                <FormField label="Email" error={apiErrors?.email?.[0]}>
                  <input
                    {...register("email")}
                    type="email"
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                  />
                </FormField>
              </div>
            </div>

            {/* ── 3. Posao ── */}
            <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 20, marginBottom: 16 }}>
              <div style={sectionTitleStyle}>Posao</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 28 }}>
                <FormField label="Sektor *" error={errors.sector?.message}>
                  <Controller
                    name="sector"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <FormDropdown
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { value: "gradiliste", label: "Gradilište" },
                          { value: "pumpa",      label: "Pumpa" },
                          { value: "kancelarija",label: "Kancelarija" },
                          { value: "ostalo",     label: "Ostalo" },
                        ]}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Pozicija *" error={errors.position?.message ?? apiErrors?.position?.[0]}>
                  <input
                    {...register("position", { required: "Obavezno polje" })}
                    style={inputStyle}
                    placeholder="npr. Zidar, Računovođa..."
                    onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                  />
                </FormField>
                <FormField label="Datum zaposlenja">
                  <Controller
                    name="employment_date"
                    control={control}
                    render={({ field }) => (
                      <DatePicker value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>
              </div>
            </div>

            {/* ── 4. Ugovor o radu ── */}
            <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isPermanent ? 0 : 16 }}>
                <div style={sectionTitleStyle}>Ugovor o radu</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: isPermanent ? "var(--violet)" : "#6b7280" }}>
                    Stalno zaposlenje
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPermanent}
                    onClick={() => setValue("is_permanent", !isPermanent)}
                    style={{
                      width: 44,
                      height: 26,
                      borderRadius: 13,
                      background: isPermanent ? "var(--violet)" : "#d1d5db",
                      position: "relative",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: 3,
                      left: isPermanent ? 21 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.18s",
                      boxShadow: "0 1px 4px rgba(0,0,0,.25)",
                    }} />
                  </button>
                </div>
              </div>

              {!isPermanent && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 16 }}>
                  <FormField label="Broj ugovora" span2>
                    <input
                      {...register("contract_number")}
                      style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                    />
                  </FormField>
                  <FormField label="Datum početka" error={apiErrors?.contract_start_date?.[0]}>
                    <Controller
                      name="contract_start_date"
                      control={control}
                      render={({ field }) => (
                        <DatePicker value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FormField>
                  <FormField label="Datum isteka" error={apiErrors?.contract_end_date?.[0]}>
                    <Controller
                      name="contract_end_date"
                      control={control}
                      render={({ field }) => (
                        <DatePicker value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FormField>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--violet-soft)", borderRadius: 11, border: "1px solid rgba(124,58,237,.15)", marginTop: isPermanent ? 16 : 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", border: "1px solid rgba(124,58,237,.2)", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--violet)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--violet)", letterSpacing: ".04em", marginBottom: 5 }}>Godišnji odmor — ukupno dana</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      {...register("vacation_days_total")}
                      type="number"
                      min="0"
                      max="365"
                      step="1"
                      placeholder="npr. 20"
                      style={{ ...inputStyle, width: 90, padding: "7px 10px", fontSize: 15, fontWeight: 700, textAlign: "center", fontFamily: "var(--font-geist-mono), monospace" }}
                      onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--violet)", opacity: 0.75 }}>dana / godina</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. Plata ── */}
            <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 20, marginBottom: 16 }}>
              <div style={sectionTitleStyle}>Plata</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 28 }}>
                <FormField label="Tip plate *" error={errors.salary_type?.message}>
                  <Controller
                    name="salary_type"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <FormDropdown
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { value: "fiksna_plata", label: "Fiksna plata" },
                          { value: "satnica",      label: "Satnica" },
                        ]}
                      />
                    )}
                  />
                </FormField>
                {salaryType === "satnica" ? (
                  <FormField label="Satnica (KM/h)" error={apiErrors?.hourly_rate?.[0]}>
                    <input
                      {...register("hourly_rate")}
                      type="number"
                      step="0.01"
                      min="0"
                      style={inputStyle}
                      placeholder="0.00"
                      onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                    />
                  </FormField>
                ) : (
                  <FormField label="Fiksna plata (KM)" error={apiErrors?.fixed_salary?.[0]}>
                    <input
                      {...register("fixed_salary")}
                      type="number"
                      step="0.01"
                      min="0"
                      style={inputStyle}
                      placeholder="0.00"
                      onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                    />
                  </FormField>
                )}
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          background: "#fafafa",
        }}>
          {isEdit && (
            <button
              type="button"
              onClick={() => { if (confirm("Obrisati zaposlenog?")) deleteMutation.mutate(); }}
              disabled={deleteMutation.isPending}
              style={{
                padding: "10px 16px",
                border: "1px solid #fecaca",
                borderRadius: 10,
                background: "#fff",
                color: "var(--red)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                marginRight: "auto",
              }}
            >
              Obriši
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              border: "1px solid var(--border)",
              borderRadius: 10,
              background: "#fff",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              marginLeft: isEdit ? 0 : "auto",
            }}
          >
            Odustani
          </button>
          <button
            type="submit"
            form="emp-form"
            disabled={isSubmitting || mutation.isPending}
            style={{
              padding: "10px 22px",
              border: "none",
              borderRadius: 10,
              background: mutation.isPending ? "#a78bfa" : "var(--violet)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background .15s",
            }}
          >
            {mutation.isPending ? "Čuvanje..." : isEdit ? "Sačuvaj izmjene" : "Dodaj zaposlenog"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

type SortableEmployee = Employee & { salary_sort: number };

function SortIndicator({ isActive, direction }: { isActive: boolean; direction: "asc" | "desc" | null }) {
  if (!isActive) return <IconSort w={12} h={12} style={{ opacity: 0.3, flexShrink: 0 }} />;
  return direction === "asc"
    ? <IconSortAsc w={12} h={12} style={{ color: "var(--green)", flexShrink: 0 }} />
    : <IconSortDesc w={12} h={12} style={{ color: "var(--green)", flexShrink: 0 }} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ZaposleniPage() {
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees", search, sectorFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (sectorFilter) params.set("sector", sectorFilter);
      return api.get(`${BASE}?${params}`).then((r) => r.data);
    },
  });

  const sortableFiltered = useMemo<SortableEmployee[]>(
    () =>
      employees
        .filter((emp) => {
          if (!statusFilter) return true;
          if (statusFilter === "aktivan") return !emp.is_on_vacation && emp.status === "active";
          if (statusFilter === "na_odmoru") return emp.is_on_vacation === true;
          if (statusFilter === "neaktivan") return emp.status === "inactive";
          return true;
        })
        .map((emp) => ({
          ...emp,
          salary_sort: parseFloat(emp.salary_type === "satnica" ? (emp.hourly_rate ?? "0") : (emp.fixed_salary ?? "0")) || 0,
        })),
    [employees, statusFilter]
  );
  const { items: sortedEmployees, requestSort, sortConfig } = useSortableData<SortableEmployee>(sortableFiltered);

  const openNew = () => { setEditEmployee(null); setFormOpen(true); };
  const openEdit = (emp: Employee) => { setEditEmployee(emp); setFormOpen(true); };

  return (
    <PageShell navId="adm">
      {/* Header */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)" }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>
          Administracija / Kadrovska evidencija
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0 8px", letterSpacing: "-0.02em", color: "#111418" }}>
            Zaposleni
          </h1>
          <button
            onClick={openNew}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: "var(--violet)",
              color: "#fff",
              border: "none",
              borderRadius: 11,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Dodaj zaposlenog
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 32px 110px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Filters row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 340 }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraži po imenu..."
              style={{ ...inputStyle, paddingLeft: 38, maxWidth: "100%" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--violet)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
            />
          </div>
          <FilterDropdown
            value={sectorFilter}
            onChange={setSectorFilter}
            placeholder="Svi sektori"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h18M6 12h12M9 19h6" />
              </svg>
            }
            options={[
              { value: "", label: "Svi sektori" },
              { value: "gradiliste", label: "Gradilište" },
              { value: "pumpa", label: "Pumpa" },
              { value: "kancelarija", label: "Kancelarija" },
              { value: "ostalo", label: "Ostalo" },
            ]}
          />
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Svi statusi"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            }
            options={[
              { value: "", label: "Svi statusi" },
              { value: "aktivan",   label: "Aktivan" },
              { value: "na_odmoru", label: "Na odmoru" },
              { value: "neaktivan", label: "Neaktivan" },
            ]}
          />
        </div>

        {/* Table */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "#fff", boxShadow: "var(--shadow-card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid var(--border)" }}>
                {([
                  ["last_name",    "Ime i prezime"],
                  ["sector",       "Sektor"],
                  ["position",     "Pozicija"],
                  ["salary_sort",  "Plata"],
                  ["status",       "Status"],
                ] as const).map(([key, label]) => {
                  const isActive = sortConfig?.key === key;
                  return (
                    <th key={key}
                      style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".05em", textTransform: "uppercase", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}
                      onClick={() => requestSort(key)}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {label}
                        <SortIndicator isActive={!!isActive} direction={isActive ? sortConfig!.direction : null} />
                      </span>
                    </th>
                  );
                })}
                <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".05em", textTransform: "uppercase", whiteSpace: "nowrap" }} />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} style={{ padding: "14px 16px" }}>
                        <div style={{ height: 14, borderRadius: 6, background: "#f1f2f5", width: j === 0 ? 140 : j === 5 ? 60 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
                    {search || sectorFilter || statusFilter ? "Nema rezultata za zadatu pretragu." : "Još nema zaposlenih. Dodajte prvog zaposlenog."}
                  </td>
                </tr>
              ) : (
                sortedEmployees.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom: idx < sortedEmployees.length - 1 ? "1px solid var(--border-soft)" : "none",
                      transition: "background .1s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafbff"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                  >
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#111418" }}>
                        {emp.last_name} {emp.first_name}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <SectorBadge sector={emp.sector} />
                    </td>
                    <td style={{ padding: "13px 16px", color: "#374151" }}>{emp.position}</td>
                    <td style={{ padding: "13px 16px", color: "#374151", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {emp.salary_type === "satnica" && emp.hourly_rate
                        ? `${parseFloat(emp.hourly_rate).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD/h`
                        : emp.fixed_salary
                          ? `${parseFloat(emp.fixed_salary).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`
                          : "—"}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <StatusBadge employee={emp} />
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button onClick={() => setViewEmployee(emp)} title="Pogledaj"
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--violet)"; b.style.color = "var(--violet)"; b.style.background = "var(--violet-soft)"; }}
                          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button onClick={() => openEdit(emp)} title="Izmijeni"
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--violet)"; b.style.color = "var(--violet)"; b.style.background = "var(--violet-soft)"; }}
                          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && sortableFiltered.length > 0 && (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {sortableFiltered.length} {sortableFiltered.length === 1 ? "zaposleni" : "zaposlenih"}
            {(statusFilter || sectorFilter) && sortableFiltered.length !== employees.length
              ? ` (filtrirano od ${employees.length})`
              : ""}
          </div>
        )}
      </div>

      <EmployeeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        employee={editEmployee}
      />

      <EmployeeDetailPanel
        employee={viewEmployee}
        onClose={() => setViewEmployee(null)}
      />
    </PageShell>
  );
}
