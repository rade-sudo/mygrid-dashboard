"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import type { Contract, ContractFormData } from "@/types/contract";
import { CONTRACT_TYPES, EMPTY_CONTRACT_FORM } from "@/types/contract";
import DatePicker from "@/components/ui/DatePicker";
import FormDropdown from "@/components/ui/FormDropdown";
import { IconSortAsc, IconSortDesc, IconSort } from "@/components/ui/icons";
import { useSortableData } from "@/hooks/useSortableData";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const BASE = `/api/${TENANT}/contracts`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sr-Latn", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatValue(val: string | null): string {
  if (val === null || val === "") return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RSD";
}

function contractToForm(c: Contract): ContractFormData {
  return {
    contract_date:     c.contract_date,
    contract_end_date: c.contract_end_date ?? "",
    contract_type:     c.contract_type,
    contracting_party: c.contracting_party,
    value:             c.value ?? "",
    note:              c.note ?? "",
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
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 8 }}>Obriši ugovor?</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
          Ugovor sa <strong>{name}</strong> će biti trajno obrisan.
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
  editing: Contract | null;
  onClose: () => void;
  onSaved: () => void;
}

function ContractSlideOver({ open, editing, onClose, onSaved }: SlideOverProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContractFormData>({ defaultValues: EMPTY_CONTRACT_FORM });

  useEffect(() => {
    if (open) {
      reset(editing ? contractToForm(editing) : EMPTY_CONTRACT_FORM);
    }
  }, [open, editing, reset]);

  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: (data: ContractFormData) => {
      const payload = {
        ...data,
        contract_end_date: data.contract_end_date === "" ? null : data.contract_end_date,
        value: data.value === "" ? null : data.value,
        note:  data.note  === "" ? null : data.note,
      };
      return editing
        ? api.put(`${BASE}/${editing.id}`, payload).then((r) => r.data)
        : api.post(BASE, payload).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", TENANT] });
      onSaved();
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
                <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
                <path d="M9 8h6M9 12h6M9 16h4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>
                {editing ? "Izmijeni ugovor" : "Novi ugovor"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                {editing ? editing.contracting_party : "Unesi podatke o ugovoru"}
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

        {/* Form body */}
        <form
          id="contract-form"
          onSubmit={handleSubmit((d) => saveMut.mutate(d))}
          style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Datumi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Datum ugovora</label>
              <Controller
                name="contract_date"
                control={control}
                rules={{ required: "Datum je obavezan" }}
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.contract_date && <p style={errStyle}>{errors.contract_date.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>
                Datum isteka{" "}
                <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcionalno)</span>
              </label>
              <Controller
                name="contract_end_date"
                control={control}
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.contract_end_date && <p style={errStyle}>{errors.contract_end_date.message}</p>}
            </div>
          </div>

          {/* Tip ugovora */}
          <div>
            <label style={labelStyle}>Tip ugovora</label>
            <Controller
              name="contract_type"
              control={control}
              rules={{ required: "Tip ugovora je obavezan" }}
              render={({ field }) => (
                <FormDropdown
                  value={field.value}
                  onChange={field.onChange}
                  options={CONTRACT_TYPES.map((t) => ({ value: t, label: t }))}
                />
              )}
            />
            {errors.contract_type && <p style={errStyle}>{errors.contract_type.message}</p>}
          </div>

          {/* Ugovorna strana */}
          <div>
            <label style={labelStyle}>Ugovorna strana</label>
            <input
              type="text"
              placeholder="Ime osobe ili naziv firme"
              {...register("contracting_party", { required: "Ugovorna strana je obavezna" })}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.contracting_party && <p style={errStyle}>{errors.contracting_party.message}</p>}
          </div>

          {/* Vrednost */}
          <div>
            <label style={labelStyle}>
              Vrijednost (RSD){" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcionalno)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="npr. 150000"
              {...register("value", {
                validate: (v) => v === "" || !isNaN(Number(v)) || "Unesite ispravan broj",
              })}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.value && <p style={errStyle}>{errors.value.message}</p>}
          </div>

          {/* Napomena */}
          <div>
            <label style={labelStyle}>
              Napomena{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcionalno)</span>
            </label>
            <textarea
              rows={4}
              placeholder="Detalji, uslovi, napomene..."
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
            form="contract-form"
            disabled={isSubmitting || saveMut.isPending}
            style={{
              padding: "9px 22px", border: "none", borderRadius: 9,
              background: isSubmitting || saveMut.isPending ? "#a78bfa" : "var(--violet)",
              color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {isSubmitting || saveMut.isPending ? "Čuvanje..." : editing ? "Sačuvaj izmene" : "Dodaj ugovor"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Sort indicator ──────────────────────────────────────────────────────────

function SortIndicator({ isActive, direction }: { isActive: boolean; direction: "asc" | "desc" | null }) {
  if (!isActive) return <IconSort w={12} h={12} style={{ opacity: 0.3, flexShrink: 0 }} />;
  return direction === "asc"
    ? <IconSortAsc w={12} h={12} style={{ color: "var(--violet)", flexShrink: 0 }} />
    : <IconSortDesc w={12} h={12} style={{ color: "var(--violet)", flexShrink: 0 }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UgoвориPage() {
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["contracts", TENANT],
    queryFn: ({ signal }) => api.get(BASE, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", TENANT] });
      setDeleteTarget(null);
    },
  });

  const { items: sortedContracts, requestSort, sortConfig } = useSortableData<Contract>(contracts);

  function openAdd() {
    setEditing(null);
    setSlideOpen(true);
  }

  function openEdit(c: Contract) {
    setEditing(c);
    setSlideOpen(true);
  }

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

  return (
    <PageShell navId="adm">
      {/* Header */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>
            Administracija
          </div>
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
            Ugovori
          </h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
            Pregled i upravljanje ugovorima firme.
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
          Dodaj ugovor
        </button>
      </div>

      {/* Table */}
      <div style={{ padding: "24px 32px 110px" }}>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>

          {isLoading ? (
            <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              Učitavanje ugovora...
            </div>
          ) : contracts.length === 0 ? (
            <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}>
                <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
                <path d="M9 8h6M9 12h6M9 16h4" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nema ugovora</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>Dodajte prvi ugovor klikom na dugme iznad.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    {([
                      ["contract_date",    "Datum"],
                      ["contract_end_date","Datum isteka"],
                      ["contract_type",    "Tip ugovora"],
                      ["contracting_party","Ugovorna strana"],
                    ] as const).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => requestSort(key)}
                        style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {label}
                          <SortIndicator
                            isActive={sortConfig?.key === key}
                            direction={sortConfig?.key === key ? sortConfig.direction : null}
                          />
                        </span>
                      </th>
                    ))}
                    <th
                      onClick={() => requestSort("value")}
                      style={{ ...thStyle, textAlign: "right", cursor: "pointer", userSelect: "none" }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                        Vrijednost
                        <SortIndicator
                          isActive={sortConfig?.key === "value"}
                          direction={sortConfig?.key === "value" ? sortConfig.direction : null}
                        />
                      </span>
                    </th>
                    <th style={thStyle}>Napomena</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContracts.map((c) => (
                    <tr
                      key={c.id}
                      style={{ transition: "background .1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          {formatDate(c.contract_date)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {c.contract_end_date ? (
                          (() => {
                            const daysLeft = Math.ceil(
                              (new Date(c.contract_end_date).getTime() - Date.now()) / 86_400_000
                            );
                            const expired  = daysLeft < 0;
                            const expiring = !expired && daysLeft <= 30;
                            const color = expired ? "var(--red)" : expiring ? "#d97706" : "#111418";
                            const dotColor = expired ? "var(--red)" : "#d97706";
                            return (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                                color,
                                fontWeight: expired || expiring ? 600 : 400,
                              }}>
                                {(expired || expiring) && (
                                  <span style={{
                                    display: "inline-block", width: 7, height: 7,
                                    borderRadius: "50%", background: dotColor, flexShrink: 0,
                                  }} />
                                )}
                                {formatDate(c.contract_end_date)}
                              </span>
                            );
                          })()
                        ) : (
                          <span style={{ color: "var(--muted-2)" }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--violet)",
                          background: "var(--violet-soft)",
                          whiteSpace: "nowrap",
                        }}>
                          {c.contract_type}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{c.contracting_party}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {c.value
                          ? <span style={{ fontWeight: 600, color: "#111418" }}>{formatValue(c.value)}</span>
                          : <span style={{ color: "var(--muted-2)" }}>—</span>
                        }
                      </td>
                      <td style={{ ...tdStyle, color: "var(--muted)", maxWidth: 220 }}>
                        {c.note ? (
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.note}>
                            {c.note}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted-2)" }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            onClick={() => openEdit(c)}
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
                            onClick={() => setDeleteTarget(c)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {contracts.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", paddingLeft: 4 }}>
            Ukupno {contracts.length} {contracts.length === 1 ? "ugovor" : contracts.length < 5 ? "ugovora" : "ugovora"}
          </div>
        )}
      </div>

      {/* Slide-over */}
      <ContractSlideOver
        open={slideOpen}
        editing={editing}
        onClose={() => setSlideOpen(false)}
        onSaved={() => {}}
      />

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.contracting_party}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
