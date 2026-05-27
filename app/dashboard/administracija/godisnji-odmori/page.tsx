"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import type { Employee } from "@/types/employee";
import type { Vacation, VacationFormData } from "@/types/vacation";
import { VACATION_TYPES, EMPTY_VACATION_FORM } from "@/types/vacation";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const BASE = `/api/${TENANT}/vacations`;
const EMP_BASE = `/api/${TENANT}/employees`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sr-Latn", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function isActiveNow(startDate: string, endDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= today && end >= today;
}

const TYPE_LABELS: Record<string, string> = {
  godisnji:  "Godišnji odmor",
  bolovanje: "Bolovanje",
  neplaceno: "Neplaćeno odsustvo",
  ostalo:    "Ostalo",
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  godisnji:  { bg: "#e8f6ee", color: "#16a34a" },
  bolovanje: { bg: "#fef3c7", color: "#d97706" },
  neplaceno: { bg: "#fef2f2", color: "#dc2626" },
  ostalo:    { bg: "var(--violet-soft)", color: "var(--violet)" },
};

function vacationToForm(v: Vacation): VacationFormData {
  return {
    employee_id: v.employee_id,
    start_date:  v.start_date,
    end_date:    v.end_date,
    type:        v.type,
    note:        v.note ?? "",
  };
}

// ─── Inline style helpers ─────────────────────────────────────────────────────

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
  transition: "border-color .15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 5,
};

const errStyle: React.CSSProperties = {
  color: "var(--red)",
  fontSize: 12,
  margin: "4px 0 0",
};

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  borderBottom: "1px solid var(--border-soft)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "13px 16px",
  fontSize: 14,
  color: "#111418",
  borderBottom: "1px solid var(--border-soft)",
  verticalAlign: "middle",
};

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 200, backdropFilter: "blur(2px)" }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: 18,
          padding: "32px 28px 24px",
          width: 380,
          zIndex: 201,
          boxShadow: "0 20px 60px rgba(16,24,40,.18)",
          textAlign: "center",
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "#fef2f2", color: "var(--red)",
          display: "grid", placeItems: "center",
          margin: "0 auto 16px",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 8 }}>Obriši evidenciju?</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
          Odmor/odsustvo za <strong>{name}</strong> će biti trajno obrisano.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 9,
              background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Odustani
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px", border: "none", borderRadius: 9,
              background: "var(--red)", color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Obriši
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Slide-over Form ─────────────────────────────────────────────────────────

interface SlideOverProps {
  open: boolean;
  editing: Vacation | null;
  onClose: () => void;
}

function VacationSlideOver({ open, editing, onClose }: SlideOverProps) {
  const firstRef = useRef<HTMLSelectElement>(null);
  const qc = useQueryClient();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees", TENANT],
    queryFn: ({ signal }) => api.get(EMP_BASE, { signal }).then((r) => r.data),
    staleTime: 60_000,
    enabled: open,
  });

  const activeEmployees = employees.filter((e) => e.status === "active");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VacationFormData>({ defaultValues: EMPTY_VACATION_FORM });

  useEffect(() => {
    if (open) {
      reset(editing ? vacationToForm(editing) : EMPTY_VACATION_FORM);
      setTimeout(() => firstRef.current?.focus(), 80);
    }
  }, [open, editing, reset]);

  const startDate = watch("start_date");

  const saveMut = useMutation({
    mutationFn: (data: VacationFormData) => {
      const payload = {
        ...data,
        employee_id: Number(data.employee_id),
        note: data.note === "" ? null : data.note,
      };
      return editing
        ? api.put(`${BASE}/${editing.id}`, payload).then((r) => r.data)
        : api.post(BASE, payload).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacations", TENANT] });
      qc.invalidateQueries({ queryKey: ["employees", TENANT] });
      onClose();
    },
  });

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 100, backdropFilter: "blur(2px)" }}
      />

      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
          background: "#fff", zIndex: 101,
          display: "flex", flexDirection: "column",
          boxShadow: "-8px 0 40px rgba(16,24,40,.14)",
          animation: "slideInRight .25s cubic-bezier(.32,.72,.27,1)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 3v4M16 3v4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>
                {editing ? "Izmijeni evidenciju" : "Zakaži odmor / odsustvo"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                {editing
                  ? `${editing.employee.first_name} ${editing.employee.last_name}`
                  : "Odaberi zaposlenog i period"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 20 }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          id="vacation-form"
          onSubmit={handleSubmit((d) => saveMut.mutate(d))}
          style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Zaposleni */}
          <div>
            <label style={labelStyle}>Zaposleni</label>
            <select
              {...register("employee_id", { required: "Odaberi zaposlenog" })}
              ref={(e) => {
                register("employee_id").ref(e);
                (firstRef as React.MutableRefObject<HTMLSelectElement | null>).current = e;
              }}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            >
              <option value="">— Odaberi zaposlenog —</option>
              {activeEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.position})
                </option>
              ))}
            </select>
            {errors.employee_id && <p style={errStyle}>{errors.employee_id.message}</p>}
          </div>

          {/* Tip odsustva */}
          <div>
            <label style={labelStyle}>Tip odsustva</label>
            <select
              {...register("type", { required: "Tip odsustva je obavezan" })}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            >
              {VACATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.type && <p style={errStyle}>{errors.type.message}</p>}
          </div>

          {/* Datumi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Početni datum</label>
              <input
                type="date"
                {...register("start_date", { required: "Datum početka je obavezan" })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {errors.start_date && <p style={errStyle}>{errors.start_date.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Krajnji datum</label>
              <input
                type="date"
                {...register("end_date", {
                  required: "Datum kraja je obavezan",
                  validate: (v) =>
                    !startDate || !v || v >= startDate || "Mora biti nakon početnog datuma",
                })}
                min={startDate || undefined}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {errors.end_date && <p style={errStyle}>{errors.end_date.message}</p>}
            </div>
          </div>

          {/* Napomena */}
          <div>
            <label style={labelStyle}>
              Napomena{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcionalno)</span>
            </label>
            <textarea
              rows={4}
              placeholder="Detalji, razlog, napomene..."
              {...register("note")}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
              onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {saveMut.isError && (
            <div style={{ padding: "10px 14px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca", color: "var(--red)", fontSize: 13 }}>
              Greška pri čuvanju. Pokušajte ponovo.
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid var(--border-soft)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "9px 18px", border: "1px solid var(--border)", borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            Odustani
          </button>
          <button
            type="submit"
            form="vacation-form"
            disabled={isSubmitting || saveMut.isPending}
            style={{
              padding: "9px 22px", border: "none", borderRadius: 9,
              background: isSubmitting || saveMut.isPending ? "#a78bfa" : "var(--violet)",
              color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {isSubmitting || saveMut.isPending
              ? "Čuvanje..."
              : editing ? "Sačuvaj izmene" : "Zakaži odmor"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GodišnjiOdmoriPage() {
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Vacation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vacation | null>(null);

  const { data: vacations = [], isLoading } = useQuery<Vacation[]>({
    queryKey: ["vacations", TENANT],
    queryFn: ({ signal }) => api.get(BASE, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacations", TENANT] });
      qc.invalidateQueries({ queryKey: ["employees", TENANT] });
      setDeleteTarget(null);
    },
  });

  function openAdd() {
    setEditing(null);
    setSlideOpen(true);
  }

  function openEdit(v: Vacation) {
    setEditing(v);
    setSlideOpen(true);
  }

  const activeCount = vacations.filter((v) => isActiveNow(v.start_date, v.end_date)).length;

  return (
    <PageShell navId="adm">
      {/* Header */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>
            Administracija
          </div>
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
            Godišnji odmori i odsustva
          </h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
            Evidencija odmora i odsustva zaposlenih.
            {activeCount > 0 && (
              <span style={{
                marginLeft: 10,
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "2px 10px", borderRadius: 20,
                fontSize: 12.5, fontWeight: 600,
                background: "#e8f6ee", color: "#16a34a",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                {activeCount} {activeCount === 1 ? "aktivno" : "aktivnih"} sada
              </span>
            )}
          </p>
        </div>

        <button
          onClick={openAdd}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 18px", background: "var(--violet)", color: "#fff",
            border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", marginBottom: 6,
            whiteSpace: "nowrap",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Zakaži odmor / odsustvo
        </button>
      </div>

      {/* Table */}
      <div style={{ padding: "24px 32px 110px" }}>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>

          {isLoading ? (
            <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              Učitavanje evidencije...
            </div>
          ) : vacations.length === 0 ? (
            <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 3v4M16 3v4" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nema evidencije odmora</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>Dodajte prvi odmor klikom na dugme iznad.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    <th style={thStyle}>Zaposleni</th>
                    <th style={thStyle}>Sektor</th>
                    <th style={thStyle}>Tip odsustva</th>
                    <th style={thStyle}>Od datuma</th>
                    <th style={thStyle}>Do datuma</th>
                    <th style={thStyle}>Napomena</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {vacations.map((v) => {
                    const active = isActiveNow(v.start_date, v.end_date);
                    const typeColor = TYPE_COLORS[v.type] ?? TYPE_COLORS.ostalo;
                    return (
                      <tr
                        key={v.id}
                        style={{ transition: "background .1s", background: active ? "rgba(22,163,74,.03)" : "transparent" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = active ? "rgba(22,163,74,.06)" : "#fafafa"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = active ? "rgba(22,163,74,.03)" : "transparent"; }}
                      >
                        {/* Zaposleni */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontWeight: 600, color: "#111418", whiteSpace: "nowrap" }}>
                              {v.employee.first_name} {v.employee.last_name}
                            </div>
                            {active && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "2px 8px", borderRadius: 20,
                                fontSize: 11, fontWeight: 700,
                                background: "#e8f6ee", color: "#16a34a",
                                whiteSpace: "nowrap",
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                                Aktivno
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                            {v.employee.position}
                          </div>
                        </td>

                        {/* Sektor */}
                        <td style={{ ...tdStyle, color: "var(--muted)", fontSize: 13 }}>
                          {v.employee.sector}
                        </td>

                        {/* Tip */}
                        <td style={tdStyle}>
                          <span style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            color: typeColor.color,
                            background: typeColor.bg,
                            whiteSpace: "nowrap",
                          }}>
                            {TYPE_LABELS[v.type] ?? v.type}
                          </span>
                        </td>

                        {/* Od datuma */}
                        <td style={{ ...tdStyle, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {formatDate(v.start_date)}
                        </td>

                        {/* Do datuma */}
                        <td style={{ ...tdStyle, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {formatDate(v.end_date)}
                        </td>

                        {/* Napomena */}
                        <td style={{ ...tdStyle, color: "var(--muted)", maxWidth: 200 }}>
                          {v.note ? (
                            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v.note}>
                              {v.note}
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted-2)" }}>—</span>
                          )}
                        </td>

                        {/* Akcije */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              onClick={() => openEdit(v)}
                              title="Izmijeni"
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                border: "1px solid var(--border)", background: "#fff",
                                cursor: "pointer", display: "grid", placeItems: "center",
                                color: "var(--muted)", transition: "all .12s",
                              }}
                              onMouseEnter={(e) => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.borderColor = "var(--violet)";
                                b.style.color = "var(--violet)";
                                b.style.background = "var(--violet-soft)";
                              }}
                              onMouseLeave={(e) => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.borderColor = "var(--border)";
                                b.style.color = "var(--muted)";
                                b.style.background = "#fff";
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(v)}
                              title="Obriši"
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                border: "1px solid var(--border)", background: "#fff",
                                cursor: "pointer", display: "grid", placeItems: "center",
                                color: "var(--muted)", transition: "all .12s",
                              }}
                              onMouseEnter={(e) => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.borderColor = "#fecaca";
                                b.style.color = "var(--red)";
                                b.style.background = "#fef2f2";
                              }}
                              onMouseLeave={(e) => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.borderColor = "var(--border)";
                                b.style.color = "var(--muted)";
                                b.style.background = "#fff";
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {vacations.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", paddingLeft: 4 }}>
            Ukupno {vacations.length} {vacations.length === 1 ? "evidencija" : "evidencija"} odmora
          </div>
        )}
      </div>

      {/* Slide-over */}
      <VacationSlideOver
        open={slideOpen}
        editing={editing}
        onClose={() => setSlideOpen(false)}
      />

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          name={`${deleteTarget.employee.first_name} ${deleteTarget.employee.last_name}`}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
