"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import DatePicker from "@/components/ui/DatePicker";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import type { Bank, BankTransaction, TransactionFormData } from "@/types/bank";
import { EMPTY_TRANSACTION_FORM } from "@/types/bank";
import { IconSortAsc, IconSortDesc, IconSort } from "@/components/ui/icons";
import { useSortableData } from "@/hooks/useSortableData";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RSD";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sr-Latn", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function transactionToForm(t: BankTransaction): TransactionFormData {
  return {
    date:        t.date,
    type:        t.type,
    amount:      t.amount,
    description: t.description ?? "",
    reference:   t.reference ?? "",
  };
}

// ─── Inline styles ────────────────────────────────────────────────────────────

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

// ─── Sort indicator ──────────────────────────────────────────────────────────

function SortIndicator({ isActive, direction }: {
  isActive: boolean;
  direction: "asc" | "desc" | null;
}) {
  if (!isActive) {
    return <IconSort w={12} h={12} style={{ opacity: 0.3, flexShrink: 0 }} />;
  }
  return direction === "asc"
    ? <IconSortAsc w={12} h={12} style={{ color: "var(--green)", flexShrink: 0 }} />
    : <IconSortDesc w={12} h={12} style={{ color: "var(--green)", flexShrink: 0 }} />;
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", borderRadius: 18, padding: "32px 28px 24px", width: 360, zIndex: 201, boxShadow: "0 20px 60px rgba(16,24,40,.18)", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fef2f2", color: "var(--red)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 8 }}>Obriši transakciju?</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
          Transakcija će biti trajno obrisana i stanje banke će biti ažurirano.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            Odustani
          </button>
          <button onClick={onConfirm} style={{ padding: "9px 20px", border: "none", borderRadius: 9, background: "var(--red)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Obriši
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Transaction slide-over ───────────────────────────────────────────────────

function TransactionSlideOver({
  open,
  bankId,
  editing,
  onClose,
}: {
  open: boolean;
  bankId: number;
  editing: BankTransaction | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({ defaultValues: EMPTY_TRANSACTION_FORM });

  const selectedType = watch("type");

  useEffect(() => {
    if (open) {
      reset(editing ? transactionToForm(editing) : EMPTY_TRANSACTION_FORM);
    }
  }, [open, editing, reset]);

  const saveMut = useMutation({
    mutationFn: (data: TransactionFormData) => {
      const payload = {
        ...data,
        description: data.description === "" ? null : data.description,
        reference:   data.reference   === "" ? null : data.reference,
      };
      return editing
        ? api.put(`/api/${TENANT}/banks/${bankId}/transactions/${editing.id}`, payload).then((r) => r.data)
        : api.post(`/api/${TENANT}/banks/${bankId}/transactions`, payload).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", bankId] });
      qc.invalidateQueries({ queryKey: ["bank", bankId] });
      qc.invalidateQueries({ queryKey: ["finance-stats", TENANT] });
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
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(16,24,40,.14)", animation: "slideInRight .25s cubic-bezier(.32,.72,.27,1)" }}>
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l3-8 4 16 3-8h4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>
                {editing ? "Izmijeni transakciju" : "Nova transakcija"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                {editing ? formatDate(editing.date) : "Unesi podatke o transakciji"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 20 }}>×</button>
        </div>

        {/* Form */}
        <form id="transaction-form" onSubmit={handleSubmit((d) => saveMut.mutate(d))} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Tip — segmented control */}
          <div>
            <label style={labelStyle}>Tip transakcije</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["priliv", "odliv"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue("type", t)}
                  style={{
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `2px solid ${selectedType === t ? (t === "priliv" ? "var(--green)" : "var(--red)") : "var(--border)"}`,
                    background: selectedType === t ? (t === "priliv" ? "var(--green-soft)" : "#fef2f2") : "#fff",
                    color: selectedType === t ? (t === "priliv" ? "var(--green)" : "var(--red)") : "var(--muted)",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  {t === "priliv" ? "↑ Priliv" : "↓ Odliv"}
                </button>
              ))}
            </div>
            <input type="hidden" {...register("type", { required: true })} />
          </div>

          {/* Datum */}
          <div>
            <label style={labelStyle}>Datum</label>
            <Controller
              name="date"
              control={control}
              rules={{ required: "Datum je obavezan" }}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.date && <p style={errStyle}>{errors.date.message}</p>}
          </div>

          {/* Iznos */}
          <div>
            <label style={labelStyle}>Iznos (RSD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register("amount", {
                required: "Iznos je obavezan",
                validate: (v) => parseFloat(v) > 0 || "Iznos mora biti veći od 0",
              })}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.amount && <p style={errStyle}>{errors.amount.message}</p>}
          </div>

          {/* Opis */}
          <div>
            <label style={labelStyle}>
              Opis / Uplatioc–Primalac{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcionalno)</span>
            </label>
            <input
              type="text"
              placeholder="npr. Plaćanje dobavljača, Uplata klijenta..."
              {...register("description")}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Referenca */}
          <div>
            <label style={labelStyle}>
              Broj izvoda / Referenca{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcionalno)</span>
            </label>
            <input
              type="text"
              placeholder="npr. IZ-2026-001"
              {...register("reference")}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
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
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", border: "1px solid var(--border)", borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            Odustani
          </button>
          <button
            type="submit"
            form="transaction-form"
            disabled={isSubmitting || saveMut.isPending}
            style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: isSubmitting || saveMut.isPending ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {isSubmitting || saveMut.isPending ? "Čuvanje..." : editing ? "Sačuvaj izmene" : "Dodaj transakciju"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bankId = parseInt(resolvedParams.id, 10);
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<BankTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankTransaction | null>(null);

  const { data: bank, isLoading: bankLoading } = useQuery<Bank>({
    queryKey: ["bank", bankId],
    queryFn: ({ signal }) => api.get(`/api/${TENANT}/banks/${bankId}`, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery<BankTransaction[]>({
    queryKey: ["transactions", bankId],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/banks/${bankId}/transactions`, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/${TENANT}/banks/${bankId}/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", bankId] });
      qc.invalidateQueries({ queryKey: ["bank", bankId] });
      qc.invalidateQueries({ queryKey: ["finance-stats", TENANT] });
      setDeleteTarget(null);
    },
  });

  const { items: sortedTransactions, requestSort, sortConfig } = useSortableData<BankTransaction>(transactions);

  function openAdd() { setEditing(null); setSlideOpen(true); }
  function openEdit(t: BankTransaction) { setEditing(t); setSlideOpen(true); }

  const balance = bank ? parseFloat(bank.current_balance) : 0;
  const isPositive = balance >= 0;

  return (
    <PageShell navId="fin">
      {/* Header */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>
            <Link href="/dashboard/finansije/banke" style={{ color: "var(--muted)", textDecoration: "none" }}>
              Bankarski izvodi
            </Link>
            <span style={{ opacity: 0.5 }}>›</span>
            <span>{bankLoading ? "..." : bank?.name ?? "Banka"}</span>
          </div>
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
            {bankLoading ? "Učitavanje..." : bank?.name ?? "—"}
          </h1>
          {bank && (
            <p style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: isPositive ? "var(--green)" : "var(--red)" }}>
              {formatCurrency(bank.current_balance)}
            </p>
          )}
        </div>

        <button
          onClick={openAdd}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--green)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 6, whiteSpace: "nowrap" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nova transakcija
        </button>
      </div>

      {/* Table */}
      <div style={{ padding: "24px 32px 110px" }}>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          {txLoading ? (
            <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Učitavanje transakcija...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}>
                <path d="M3 12h4l3-8 4 16 3-8h4" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nema transakcija</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>Dodajte prvu transakciju klikom na dugme iznad.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("date")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Datum
                        <SortIndicator isActive={sortConfig?.key === "date"} direction={sortConfig && sortConfig.key === "date" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("type")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Tip
                        <SortIndicator isActive={sortConfig?.key === "type"} direction={sortConfig && sortConfig.key === "type" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("amount")}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        Iznos
                        <SortIndicator isActive={sortConfig?.key === "amount"} direction={sortConfig && sortConfig.key === "amount" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("description")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Opis
                        <SortIndicator isActive={sortConfig?.key === "description"} direction={sortConfig && sortConfig.key === "description" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("reference")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Referenca
                        <SortIndicator isActive={sortConfig?.key === "reference"} direction={sortConfig && sortConfig.key === "reference" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((t) => {
                    const isPriliv = t.type === "priliv";
                    return (
                      <tr key={t.id} style={{ transition: "background .1s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                      >
                        <td style={{ ...tdStyle, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {formatDate(t.date)}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: isPriliv ? "var(--green-soft)" : "#fef2f2",
                            color: isPriliv ? "var(--green)" : "var(--red)",
                          }}>
                            {isPriliv ? "↑" : "↓"} {isPriliv ? "Priliv" : "Odliv"}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, whiteSpace: "nowrap", color: isPriliv ? "var(--green)" : "var(--red)" }}>
                          {isPriliv ? "+" : "−"}{formatCurrency(t.amount)}
                        </td>
                        <td style={{ ...tdStyle, color: t.description ? "#111418" : "var(--muted-2)", maxWidth: 220 }}>
                          {t.description ? (
                            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.description}>
                              {t.description}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ ...tdStyle, color: t.reference ? "#111418" : "var(--muted-2)", fontFamily: "monospace", fontSize: 13 }}>
                          {t.reference ?? "—"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button onClick={() => openEdit(t)} title="Izmijeni"
                              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--green)"; b.style.color = "var(--green)"; b.style.background = "var(--green-soft)"; }}
                              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                              </svg>
                            </button>
                            <button onClick={() => setDeleteTarget(t)} title="Obriši"
                              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "#fecaca"; b.style.color = "var(--red)"; b.style.background = "#fef2f2"; }}
                              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
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

        {transactions.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", paddingLeft: 4 }}>
            {transactions.length} transakcija ukupno
          </div>
        )}
      </div>

      <TransactionSlideOver
        open={slideOpen}
        bankId={bankId}
        editing={editing}
        onClose={() => setSlideOpen(false)}
      />

      {deleteTarget && (
        <DeleteConfirm
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
