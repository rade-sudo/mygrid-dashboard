"use client";

import React, { useState, useEffect, useCallback } from "react";
import DatePicker from "@/components/ui/DatePicker";
import api from "@/lib/axios";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const TODAY  = new Date().toISOString().split("T")[0];

export interface UnpaidInvoice {
  id: number;
  invoice_number: string;
  remaining_amount: number;
  total_amount: number;
}

interface Props {
  supplierId: number;
  supplierName: string;
  nextPaymentNumber: number;
  unpaidInvoices: UnpaidInvoice[];
  onClose: () => void;
  onSuccess: () => void;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: ".09em",
  textTransform: "uppercase",
  color: "#6b7280",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid #e5e7eb",
  borderRadius: 9,
  fontSize: 14,
  color: "#111418",
  background: "#fff",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s",
};

function fmt(n: number): string {
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NewPaymentModal({
  supplierId,
  supplierName,
  nextPaymentNumber,
  unpaidInvoices,
  onClose,
  onSuccess,
}: Props) {
  const [visible,     setVisible]     = useState(false);
  const [invoiceId,   setInvoiceId]   = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState(TODAY);
  const [amount,      setAmount]      = useState("");
  const [description, setDescription] = useState("");
  const [note,        setNote]        = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClose]);

  function handleInvoiceChange(val: string) {
    const id = val ? parseInt(val, 10) : "";
    setInvoiceId(id);
    if (id) {
      const inv = unpaidInvoices.find((i) => i.id === id);
      if (inv) setAmount(inv.remaining_amount.toFixed(2));
    } else {
      setAmount("");
    }
  }

  async function handleSave() {
    setError(null);
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError("Iznos mora biti veći od 0.");
      return;
    }
    if (!paymentDate) {
      setError("Datum je obavezan.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/${TENANT}/finansije/uplate`, {
        supplier_id:          supplierId,
        incoming_invoice_id:  invoiceId || null,
        payment_date:         paymentDate,
        amount:               parsed,
        description:          description.trim() || null,
        note:                 note.trim() || null,
      });
      onSuccess();
      handleClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Greška pri čuvanju. Pokušajte ponovo.");
      setSaving(false);
    }
  }

  const selectedInvoice = invoiceId ? unpaidInvoices.find((i) => i.id === invoiceId) : null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1050,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        background: visible ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(4px)" : "blur(0px)",
        WebkitBackdropFilter: visible ? "blur(4px)" : "blur(0px)",
        transition: "background .2s ease, backdrop-filter .2s ease",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          overflow: "hidden",
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(14px)",
          opacity: visible ? 1 : 0,
          transition: "transform .2s ease, opacity .2s ease",
        }}
      >
        {/* Emerald accent bar */}
        <div style={{ height: 4, background: "linear-gradient(90deg, #065f46 0%, #059669 60%, #10b981 100%)", borderRadius: "18px 18px 0 0" }} />

        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#059669", marginBottom: 5 }}>
              {supplierName}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em" }}>
              Nova uplata
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280", flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Row 1: RB + DATUM */}
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>RB</label>
              <input
                type="text"
                value={nextPaymentNumber}
                disabled
                style={{ ...inputStyle, background: "#f9fafb", color: "#9ca3af", cursor: "not-allowed" }}
              />
            </div>
            <div>
              <label style={labelStyle}>DATUM *</label>
              <DatePicker value={paymentDate} onChange={setPaymentDate} />
            </div>
          </div>

          {/* Row 2: VEZA SA FAKTUROM */}
          <div>
            <label style={labelStyle}>
              VEZA SA FAKTUROM{" "}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opciono)</span>
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={invoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingRight: 32,
                  appearance: "none" as const,
                  cursor: "pointer",
                  color: invoiceId ? "#111418" : "#9ca3af",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#059669")}
                onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")}
              >
                <option value="">— Bez veze sa fakturom —</option>
                {unpaidInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} · dug {fmt(inv.remaining_amount)} RSD
                  </option>
                ))}
              </select>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            {selectedInvoice && (
              <div style={{ marginTop: 6, padding: "7px 10px", background: "#f0fdf4", borderRadius: 7, border: "1px solid #bbf7d0", fontSize: 12.5, color: "#059669", display: "flex", justifyContent: "space-between" }}>
                <span>Preostali dug</span>
                <span style={{ fontWeight: 700 }}>{fmt(selectedInvoice.remaining_amount)} RSD</span>
              </div>
            )}
          </div>

          {/* Row 3: IZNOS */}
          <div>
            <label style={labelStyle}>IZNOS *</label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={(e) => (e.target.style.borderColor = "#059669")}
                onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 600, color: "#9ca3af", pointerEvents: "none" }}>
                RSD
              </span>
            </div>
          </div>

          {/* Row 4: OPIS */}
          <div>
            <label style={labelStyle}>OPIS</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="npr. broj naloga, referenca..."
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#059669")}
              onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {/* Row 5: NAPOMENA */}
          <div>
            <label style={labelStyle}>NAPOMENA · GDE JE DOKUMENT</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. izvod 12/2024 · u koferu · kod direktora"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#059669")}
              onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {error && (
            <div style={{ padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Otkaži
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: "10px", borderRadius: 10,
              border: "1px solid #a7f3d0",
              background: saving ? "#f0fdf4" : "#d1fae5",
              color: "#065f46",
              fontSize: 14, fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              transition: "background .15s",
            }}
            onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#a7f3d0"; }}
            onMouseLeave={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#d1fae5"; }}
          >
            {saving ? "Čuvanje..." : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Sačuvaj
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
