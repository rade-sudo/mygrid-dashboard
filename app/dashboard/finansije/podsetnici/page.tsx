"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const API_URL = `/api/${TENANT}/finansije/payment-reminders`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentInstallmentData {
  id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: "unpaid" | "paid";
  paid_at: string | null;
}

interface PaymentReminder {
  id: number;
  name: string;
  title: string;
  creditor: string | null;
  total_amount: number;
  monthly_rate: number;
  paid_count: number;
  total_count: number;
  next_due_date: string | null;
  frequency: string;
  note: string | null;
  installments: PaymentInstallmentData[];
}

interface ReminderFormData {
  title: string;
  creditor: string;
  installment_amount: string;
  frequency: string;
  total_installments: string;
  first_payment_date: string;
  note: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(val: number): string {
  return val.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sr-Latn", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getDueInfo(iso: string | null): { text: string; color: string } {
  if (!iso) return { text: "—", color: "var(--muted)" };
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  const d    = fmtDate(iso);
  if (days < 0)   return { text: `Kasni ${Math.abs(days)} dan(a) (${d})`, color: "var(--red)" };
  if (days === 0) return { text: `Danas (${d})`,                            color: "var(--red)" };
  if (days <= 3)  return { text: `Za ${days} d (${d})`,                    color: "var(--red)" };
  if (days <= 7)  return { text: `Za ${days} d (${d})`,                    color: "#d97706"    };
  return { text: d, color: "var(--muted)" };
}

function getInstallmentStatus(inst: PaymentInstallmentData): { text: string; color: string } {
  if (inst.status === "paid") {
    const d = inst.paid_at ? fmtDate(inst.paid_at) : "";
    return { text: `Plaćena${d ? ` · ${d}` : ""}`, color: "var(--green)" };
  }
  const days = Math.ceil((new Date(inst.due_date).getTime() - Date.now()) / 86_400_000);
  if (days < 0)   return { text: `Kasni ${Math.abs(days)} d`, color: "var(--red)" };
  if (days === 0) return { text: "Danas",                      color: "var(--red)" };
  if (days <= 3)  return { text: `Za ${days} d`,              color: "var(--red)" };
  if (days <= 7)  return { text: `Za ${days} d`,              color: "#d97706"    };
  return { text: "Nije plaćena", color: "#9ca3af" };
}

// ─── Stat block ───────────────────────────────────────────────────────────────

function StatBlock({ label, value, valueColor }: {
  label: string; value: React.ReactNode; valueColor?: string;
}) {
  return (
    <div style={{
      background: "#f8f9fb", borderRadius: 10, padding: "12px 14px",
      border: "1px solid #ecedf0", display: "flex", flexDirection: "column", gap: 5,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "#9ca3af" }}>
        {label}
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: valueColor ?? "#111418", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>
        {value}
      </div>
    </div>
  );
}

// ─── Reminder card ────────────────────────────────────────────────────────────

function ReminderCard({ item, onDelete }: { item: PaymentReminder; onDelete: (id: number) => void }) {
  const [isExpanded, setIsExpanded]   = useState(false);
  const [pendingIds, setPendingIds]   = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (installmentId: number) =>
      api.put(`/api/${TENANT}/finansije/payment-installments/${installmentId}/toggle-status`)
        .then(r => r.data),
    onMutate: (id) => setPendingIds(prev => new Set(prev).add(id)),
    onSettled: (_, __, id) => {
      setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      queryClient.invalidateQueries({ queryKey: ["payment-reminders", TENANT] });
    },
  });

  const paidAmount  = item.monthly_rate * item.paid_count;
  const remaining   = Math.max(0, item.total_amount - paidAmount);
  const percent     = item.total_count > 0 ? Math.round((item.paid_count / item.total_count) * 100) : 100;
  const isComplete  = remaining === 0;
  const dueInfo     = getDueInfo(item.next_due_date);
  const accentColor = isComplete ? "var(--green)" : "var(--violet)";

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1px solid var(--border-soft)",
      borderTop: `4px solid ${accentColor}`,
      boxShadow: "0 2px 8px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.03)",
      overflow: "hidden",
    }}>

      {/* ── Card header ── */}
      <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
            {item.name}
          </span>
          {item.creditor && (
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>· {item.creditor}</span>
          )}
          <span style={{
            flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
            padding: "2px 9px", borderRadius: 20,
            background: isComplete ? "var(--green-soft)" : "var(--violet-soft)",
            color:      isComplete ? "var(--green)"      : "var(--violet)",
          }}>
            {isComplete ? "Završen" : "Aktivan"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            style={{ padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 7, background: "#fff", color: "#374151", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--violet)"; e.currentTarget.style.color = "var(--violet)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "#374151"; }}
          >
            Izmeni
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            style={{ padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 7, background: "#fff", color: "#374151", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#fecaca"; e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "#fef2f2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "#fff"; }}
          >
            Obriši
          </button>
        </div>
      </div>

      {/* ── Next due date ── */}
      <div style={{ padding: "0 20px 14px", fontSize: 12.5 }}>
        <span style={{ color: "var(--muted)", fontWeight: 500 }}>Sledeća rata:&nbsp;</span>
        <span style={{ fontWeight: 600, color: dueInfo.color }}>{dueInfo.text}</span>
      </div>

      {/* ── 4-col stats ── */}
      <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <StatBlock label="Ukupan iznos"  value={fmt(item.total_amount)}  valueColor="#111418" />
        <StatBlock label="Mesečna rata"  value={fmt(item.monthly_rate)}  valueColor="#d97706" />
        <StatBlock
          label="Plaćeno"
          value={
            <span>
              {item.paid_count}&nbsp;/&nbsp;{item.total_count}
              <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: isComplete ? "var(--green)" : "#9ca3af" }}>
                ({percent}%)
              </span>
            </span>
          }
          valueColor={isComplete ? "var(--green)" : "#6b7280"}
        />
        <StatBlock label="Preostali dug" value={fmt(remaining)} valueColor={remaining > 0 ? "var(--red)" : "var(--green)"} />
      </div>

      {/* ── Progress bar ── */}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ height: 5, borderRadius: 99, background: "#ecedf0", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${percent}%`, borderRadius: 99, background: isComplete ? "var(--green)" : "var(--violet)", transition: "width .4s ease" }} />
        </div>
      </div>

      {/* ── Footer — accordion trigger ── */}
      <div style={{ borderTop: "1px solid var(--border-soft)", padding: "10px 20px" }}>
        <button
          type="button"
          onClick={() => setIsExpanded(v => !v)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600,
            color: isComplete ? "var(--green)" : "var(--violet)",
            fontFamily: "inherit", padding: 0, transition: "opacity .12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.65"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          <svg
            width="9" height="10" viewBox="0 0 9 10" fill="currentColor"
            style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .2s ease" }}
          >
            <path d="M0 0l9 5-9 5V0z" />
          </svg>
          {isExpanded ? "Sakrij rate" : `Sve rate (${item.total_count})`} →
        </button>
      </div>

      {/* ── Accordion: installments table ── */}
      {isExpanded && (
        <div style={{
          borderTop: "1px solid #f1f1f1",
          maxHeight: 300,
          overflowY: "auto",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {(["RB", "Datum dospeća", "Iznos", "Status", "Akcija"] as const).map(col => (
                  <th
                    key={col}
                    style={{
                      position: "sticky", top: 0, zIndex: 1,
                      background: "rgba(255,255,255,0.97)",
                      backdropFilter: "blur(6px)",
                      padding: "9px 12px",
                      textAlign: "left",
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: ".08em", textTransform: "uppercase",
                      color: "#9ca3af",
                      borderBottom: "1px solid #f1f1f1",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.installments.map(inst => {
                const st      = getInstallmentStatus(inst);
                const isPaid  = inst.status === "paid";
                const loading = pendingIds.has(inst.id);

                return (
                  <tr
                    key={inst.id}
                    style={{
                      background: isPaid ? "rgba(240,253,244,0.45)" : "#fff",
                      borderBottom: "1px solid #f5f5f5",
                      transition: "background .2s",
                    }}
                  >
                    {/* RB */}
                    <td style={{ padding: "9px 12px", fontSize: 13, color: "#9ca3af", fontVariantNumeric: "tabular-nums", width: 40 }}>
                      {inst.installment_number}
                    </td>

                    {/* Datum dospeća */}
                    <td style={{ padding: "9px 12px", fontSize: 13, color: "#374151", fontVariantNumeric: "tabular-nums" }}>
                      {fmtDate(inst.due_date)}
                    </td>

                    {/* Iznos */}
                    <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 600, color: "#111418", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(inst.amount)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "9px 12px", fontSize: 12.5, fontWeight: 600, color: st.color, whiteSpace: "nowrap" }}>
                      {isPaid && <span style={{ marginRight: 3 }}>✓</span>}
                      {st.text}
                    </td>

                    {/* Akcija */}
                    <td style={{ padding: "9px 12px" }}>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => toggleMutation.mutate(inst.id)}
                        style={{
                          padding: "4px 12px",
                          border: isPaid ? "1px solid #e5e7eb" : "1px solid #86efac",
                          borderRadius: 6,
                          background: isPaid ? "#f9fafb" : "#f0fdf4",
                          color: isPaid ? "#6b7280" : "#15803d",
                          fontSize: 12, fontWeight: 600,
                          cursor: loading ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          opacity: loading ? 0.55 : 1,
                          transition: "all .12s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {loading ? "..." : isPaid ? "Poništi" : "Plati"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Add Reminder Modal ───────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { value: "monthly",    label: "Mesečno" },
  { value: "quarterly",  label: "Kvartalno" },
  { value: "semiannual", label: "Polugodišnje" },
  { value: "yearly",     label: "Godišnje" },
];

const LBL: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: ".07em", textTransform: "uppercase",
  color: "#64748b", marginBottom: 6,
};

const INP: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: 14, color: "#111418",
  background: "#fff", fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

function AddReminderModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReminderFormData>({
    defaultValues: {
      title: "", creditor: "", installment_amount: "",
      frequency: "monthly", total_installments: "",
      first_payment_date: "", note: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ReminderFormData) =>
      api.post(API_URL, {
        title:               data.title.trim(),
        creditor:            data.creditor.trim() || null,
        installment_amount:  parseFloat(data.installment_amount),
        frequency:           data.frequency,
        total_installments:  parseInt(data.total_installments, 10),
        first_payment_date:  data.first_payment_date,
        note:                data.note.trim() || null,
      }).then(r => r.data),
    onSuccess: () => { reset(); onSaved(); },
  });

  if (!open) return null;

  const err = (f: keyof typeof errors) => (errors[f] ? "#fca5a5" : "#e2e8f0");

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", margin: "16px", boxShadow: "0 25px 50px rgba(0,0,0,.18), 0 8px 20px rgba(0,0,0,.10)" }}>

        {/* Header */}
        <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em" }}>Novi podsetnik</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748b" }}>Unesi podatke o obavezi</p>
          </div>
          <button
            type="button" onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#64748b", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e2e8f0"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={LBL}>Naziv obaveze</label>
                <input {...register("title", { required: true })} placeholder="npr. Stambeni kredit, Telekom..." style={{ ...INP, borderColor: err("title") }} />
              </div>
              <div>
                <label style={LBL}>Primalac</label>
                <input {...register("creditor")} placeholder="npr. Raiffeisen, Poreska, MTS..." style={INP} />
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={LBL}>Iznos rate</label>
                <input {...register("installment_amount", { required: true, min: 0.01 })} type="number" step="0.01" min="0" placeholder="0.00" style={{ ...INP, borderColor: err("installment_amount") }} />
              </div>
              <div>
                <label style={LBL}>Dinamika plaćanja</label>
                <select {...register("frequency", { required: true })} style={{ ...INP, cursor: "pointer" }}>
                  {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>Ukupan broj rata</label>
                <input {...register("total_installments", { required: true, min: 1 })} type="number" min="1" placeholder="npr. 60" style={{ ...INP, borderColor: err("total_installments") }} />
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ maxWidth: 240 }}>
              <label style={LBL}>Datum dospeća prve rate</label>
              <input {...register("first_payment_date", { required: true })} type="date" style={{ ...INP, borderColor: err("first_payment_date") }} />
            </div>

            {/* Row 4 */}
            <div>
              <label style={LBL}>Napomena</label>
              <textarea {...register("note")} placeholder="opciono..." rows={3} style={{ ...INP, resize: "vertical", minHeight: 80 }} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 28px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 20px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Otkaži
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              style={{
                padding: "9px 22px", border: "none", borderRadius: 10,
                background: mutation.isPending ? "#a78bfa" : "var(--violet)",
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: mutation.isPending ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {mutation.isPending && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "prSpin .7s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              Sačuvaj podsetnik
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PodsetniciPage() {
  const [modalOpen, setModalOpen]   = useState(false);
  const [backHover, setBackHover]   = useState(false);
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery<PaymentReminder[]>({
    queryKey: ["payment-reminders", TENANT],
    queryFn: () => api.get(API_URL).then(r => r.data),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`${API_URL}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-reminders", TENANT] }),
  });

  function handleSaved() {
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["payment-reminders", TENANT] });
  }

  return (
    <PageShell navId="fin">
      <style>{`@keyframes prSpin { to { transform: rotate(360deg); } }`}</style>

      <AddReminderModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} />

      {/* Page header */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)" }}>

        {/* Back button */}
        <Link
          href="/dashboard/finansije"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: 14, textDecoration: "none",
            color: backHover ? "#111418" : "#9ca3af",
            fontSize: 13, fontWeight: 500,
            transition: "color .15s",
          }}
          onMouseEnter={() => setBackHover(true)}
          onMouseLeave={() => setBackHover(false)}
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: backHover ? "translateX(-3px)" : "none", transition: "transform .15s ease" }}
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Nazad na finansije
        </Link>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
              Podsetnici za plaćanja
            </h1>
            <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
              Evidencija rata, kredita i praćenje nadolazećih obaveza plaćanja.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--violet)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 6, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(124,58,237,.25)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Dodaj podsetnik
          </button>
        </div>
      </div>

      {/* Cards list */}
      <div style={{ padding: "24px 32px 110px", display: "flex", flexDirection: "column", gap: 16 }}>
        {isLoading ? (
          <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)", fontSize: 15 }}>Učitavanje...</div>
        ) : reminders.length === 0 ? (
          <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)", background: "#fff", borderRadius: 16, border: "1px solid var(--border-soft)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nema podsetnika</p>
            <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>Dodajte prvi podsetnik klikom na dugme iznad.</p>
          </div>
        ) : (
          reminders.map((item) => (
            <ReminderCard
              key={item.id}
              item={item}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))
        )}
      </div>
    </PageShell>
  );
}
