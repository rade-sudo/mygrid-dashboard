"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import type { Bank, BankFormData } from "@/types/bank";
import { EMPTY_BANK_FORM } from "@/types/bank";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const BASE = `/api/${TENANT}/banks`;

function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RSD";
}

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

// ─── Bank card ────────────────────────────────────────────────────────────────

function BankCard({ bank }: { bank: Bank }) {
  const balance = parseFloat(bank.current_balance);
  const isPositive = balance >= 0;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: "24px",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        transition: "box-shadow .15s, border-color .15s, transform .12s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "0 6px 24px rgba(22,163,74,.12), 0 1px 4px rgba(16,24,40,.06)";
        el.style.borderColor = "var(--green)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "var(--shadow-card)";
        el.style.borderColor = "var(--border)";
        el.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--green-soft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M3 10h18" />
          </svg>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
          padding: "3px 9px", borderRadius: 20,
          background: isPositive ? "var(--green-soft)" : "#fef2f2",
          color: isPositive ? "var(--green)" : "var(--red)",
        }}>
          {isPositive ? "Aktivno" : "Minus"}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#111418", marginBottom: 8, letterSpacing: "-0.01em" }}>
          {bank.name}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
          Trenutno stanje
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: isPositive ? "#111418" : "var(--red)", letterSpacing: "-0.02em", lineHeight: 1 }}>
          {formatCurrency(bank.current_balance)}
        </div>
        {bank.starting_balance !== bank.current_balance && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Početno: {formatCurrency(bank.starting_balance)}
          </div>
        )}
      </div>

      <div style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--green)" }}>
        Pogledaj transakcije
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

// ─── Bank slide-over ─────────────────────────────────────────────────────────

function BankSlideOver({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Bank | null;
  onClose: () => void;
}) {
  const firstRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<BankFormData>({ defaultValues: EMPTY_BANK_FORM });

  useEffect(() => {
    if (open) {
      reset(editing
        ? { name: editing.name, starting_balance: editing.starting_balance }
        : EMPTY_BANK_FORM
      );
      setTimeout(() => firstRef.current?.focus(), 80);
    }
  }, [open, editing, reset]);

  const saveMut = useMutation({
    mutationFn: (data: BankFormData) =>
      editing
        ? api.put(`${BASE}/${editing.id}`, data).then((r) => r.data)
        : api.post(BASE, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banks", TENANT] });
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
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 440, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(16,24,40,.14)", animation: "slideInRight .25s cubic-bezier(.32,.72,.27,1)" }}>
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>
                {editing ? "Izmijeni banku" : "Nova banka"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                {editing ? editing.name : "Dodaj novi bankovni račun"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 20 }}>×</button>
        </div>

        {/* Form */}
        <form id="bank-form" onSubmit={handleSubmit((d) => saveMut.mutate(d))} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Naziv banke / računa</label>
            <input
              type="text"
              placeholder="npr. Raiffeisen Bank, Petty Cash..."
              {...register("name", { required: "Naziv je obavezan" })}
              ref={(e) => {
                register("name").ref(e);
                (firstRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
              }}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.name && <p style={errStyle}>{errors.name.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Početno stanje (RSD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("starting_balance", {
                required: "Početno stanje je obavezno",
                validate: (v) => !isNaN(Number(v)) || "Unesite ispravan broj",
              })}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.starting_balance && <p style={errStyle}>{errors.starting_balance.message}</p>}
            {editing && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "5px 0 0" }}>
                Izmjena početnog stanja automatski preračunava trenutno stanje.
              </p>
            )}
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
            form="bank-form"
            disabled={isSubmitting || saveMut.isPending}
            style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: isSubmitting || saveMut.isPending ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {isSubmitting || saveMut.isPending ? "Čuvanje..." : editing ? "Sačuvaj izmene" : "Dodaj banku"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankePage() {
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);

  const { data: banks = [], isLoading } = useQuery<Bank[]>({
    queryKey: ["banks", TENANT],
    queryFn: ({ signal }) => api.get(BASE, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const totalBalance = banks.reduce((sum, b) => sum + parseFloat(b.current_balance), 0);

  function openAdd() { setEditing(null); setSlideOpen(true); }

  return (
    <PageShell navId="fin">
      {/* Header */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Finansije</div>
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
            Bankarski izvodi
          </h1>
          {banks.length > 0 && (
            <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
              Ukupno na svim računima:{" "}
              <strong style={{ color: "#111418" }}>
                {totalBalance.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
              </strong>
            </p>
          )}
          {banks.length === 0 && !isLoading && (
            <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>Dodajte bankovne račune firme.</p>
          )}
        </div>
        <button
          onClick={openAdd}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--green)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 6, whiteSpace: "nowrap" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nova banka
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px 110px" }}>
        {isLoading ? (
          <div style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", padding: "56px 0" }}>
            Učitavanje banaka...
          </div>
        ) : banks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 0", color: "var(--muted)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}>
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M3 10h18" />
            </svg>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nema bankovnih računa</p>
            <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>Dodajte prvi račun klikom na dugme iznad.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 360px))", gap: 16 }}>
            {banks.map((bank) => (
              <Link key={bank.id} href={`/dashboard/finansije/banke/${bank.id}`} style={{ textDecoration: "none", display: "block" }}>
                <BankCard bank={bank} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <BankSlideOver open={slideOpen} editing={editing} onClose={() => setSlideOpen(false)} />
    </PageShell>
  );
}
