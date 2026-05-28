"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import { IconCaretSm } from "@/components/ui/icons";
import DatePicker from "@/components/ui/DatePicker";
import FormDropdown from "@/components/ui/FormDropdown";
import api from "@/lib/axios";
import type { Employee, EmployeeFormData, Sector, SalaryType } from "@/types/employee";
import { EMPTY_FORM } from "@/types/employee";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const BASE = `/api/${TENANT}/employees`;

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
    salary_type:         e.salary_type,
    hourly_rate:         e.hourly_rate ?? "",
    fixed_salary:        e.fixed_salary ?? "",
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
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({ defaultValues: EMPTY_FORM });

  const salaryType = watch("salary_type") as SalaryType;

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
              <div style={sectionTitleStyle}>Ugovor o radu</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 28 }}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ZaposleniPage() {
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees", search, sectorFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (sectorFilter) params.set("sector", sectorFilter);
      return api.get(`${BASE}?${params}`).then((r) => r.data);
    },
  });

  const filteredEmployees = employees.filter((emp) => {
    if (!statusFilter) return true;
    if (statusFilter === "aktivan") return !emp.is_on_vacation && emp.status === "active";
    if (statusFilter === "na_odmoru") return emp.is_on_vacation === true;
    if (statusFilter === "neaktivan") return emp.status === "inactive";
    return true;
  });

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
                {["Ime i prezime", "Sektor", "Pozicija", "Telefon", "Status", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--muted)",
                      letterSpacing: ".05em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
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
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
                    {search || sectorFilter || statusFilter ? "Nema rezultata za zadatu pretragu." : "Još nema zaposlenih. Dodajte prvog zaposlenog."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom: idx < filteredEmployees.length - 1 ? "1px solid var(--border-soft)" : "none",
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
                    <td style={{ padding: "13px 16px", color: "var(--muted)" }}>{emp.phone ?? "—"}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <StatusBadge employee={emp} />
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => openEdit(emp)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 12px",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          background: "#fff",
                          color: "#374151",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--violet)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--violet)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                        </svg>
                        Izmijeni
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredEmployees.length > 0 && (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {filteredEmployees.length} {filteredEmployees.length === 1 ? "zaposleni" : "zaposlenih"}
            {(statusFilter || sectorFilter) && filteredEmployees.length !== employees.length
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
    </PageShell>
  );
}
