"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { fmt, fmtDate } from "./DuePaymentsWidget";
import type { DueApiItem } from "./DuePaymentsWidget";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

// ─── Shared sub-components ────────────────────────────────────────────────────

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      style={{
        flexShrink: 0,
        width: 32, height: 32,
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        color: "#6b7280",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

function InfoBlock({
  label,
  value,
  emptyText = "—",
  copyable,
  isCopied,
  onCopy,
}: {
  label: string;
  value: string | null;
  emptyText?: string;
  copyable?: boolean;
  isCopied?: boolean;
  onCopy?: () => void;
}) {
  const isEmpty = !value;
  return (
    <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: isEmpty ? "#c4c9d1" : "#111418", wordBreak: "break-all" as const, fontStyle: isEmpty ? "italic" : "normal" }}>
          {value ?? emptyText}
        </div>
        {copyable && value && (
          <button
            type="button"
            onClick={onCopy}
            style={{
              flexShrink: 0,
              padding: "3px 10px",
              borderRadius: 6,
              border: isCopied ? "1px solid #86efac" : "1px solid #e5e7eb",
              background: isCopied ? "#f0fdf4" : "#fff",
              color: isCopied ? "#15803d" : "#6b7280",
              fontSize: 11.5, fontWeight: 600,
              cursor: "pointer",
              transition: "all .15s",
              whiteSpace: "nowrap" as const,
            }}
          >
            {isCopied ? "✓ Kopirano" : "Kopiraj"}
          </button>
        )}
      </div>
    </div>
  );
}

function FooterCloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      style={{
        flex: 1,
        padding: "11px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        color: "#374151",
        fontSize: 14, fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Zatvori
    </button>
  );
}

// ─── Invoice layout ───────────────────────────────────────────────────────────

function InvoiceContent({
  item,
  copiedField,
  onCopy,
  onClose,
}: {
  item: DueApiItem;
  copiedField: string | null;
  onCopy: (field: string, value: string) => void;
  onClose: () => void;
}) {
  const [docLoading, setDocLoading] = useState(false);

  const handleOpenDoc = async () => {
    if (!item.document_available || item.nav_id === null) return;
    setDocLoading(true);
    try {
      const response = await api.get(
        `/api/${TENANT}/finansije/incoming-invoices/${item.nav_id}/document`,
        { responseType: "blob" }
      );
      const blob = new Blob(
        [response.data as BlobPart],
        { type: (response.headers["content-type"] as string | undefined) ?? "application/pdf" }
      );
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      // silent fail
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <>
      {/* Red accent bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #b91c1c 0%, #ef4444 100%)", borderRadius: "18px 18px 0 0" }} />

      {/* Header */}
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 5 }}>
              Detalji za plaćanje
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              {item.invoice_number ? `Ulazna faktura br. ${item.invoice_number}` : item.subtitle}
            </div>
          </div>
          <CloseBtn onClose={onClose} />
        </div>
      </div>

      {/* Info blocks */}
      <div style={{ padding: "14px 22px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <InfoBlock label="Dobavljač" value={item.title} />
        <InfoBlock label="Adresa" value={item.address} emptyText="— nije uneto —" />
        <InfoBlock
          label="Broj računa (IBAN / Žiro)"
          value={item.bank_account}
          emptyText="— nije uneto —"
          copyable
          isCopied={copiedField === "bank_account"}
          onCopy={() => item.bank_account && onCopy("bank_account", item.bank_account)}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <InfoBlock label="Broj fakture" value={item.invoice_number} emptyText="— nije uneto —" />
          <InfoBlock
            label="Poziv na broj"
            value={item.payment_reference}
            emptyText="— nije uneto —"
            copyable
            isCopied={copiedField === "payment_reference"}
            onCopy={() => item.payment_reference && onCopy("payment_reference", item.payment_reference)}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: "6px 22px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: "rgba(254,226,226,0.5)", borderRadius: 12, padding: "14px 16px", border: "1px solid #fecaca" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 6 }}>
            Dug
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "#b91c1c", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {fmt(item.amount_due)}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>RSD za isplatu</div>
        </div>
        <div style={{ background: "#f8f9fa", borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 6 }}>
            Ukupan iznos fakture
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {fmt(item.total_amount)}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
            datum prometa {fmtDate(item.due_date)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 22px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10 }}>
        <FooterCloseBtn onClose={onClose} />
        {item.document_available ? (
          <button
            type="button"
            onClick={handleOpenDoc}
            disabled={docLoading}
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "11px",
              borderRadius: 10,
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              fontSize: 14, fontWeight: 600,
              cursor: docLoading ? "wait" : "pointer",
              opacity: docLoading ? 0.7 : 1,
              transition: "opacity .15s",
            }}
          >
            {docLoading ? "Učitava..." : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                  <path d="M14 3v5h5M9 13h6M9 17h4" />
                </svg>
                Otvori fakturu
              </>
            )}
          </button>
        ) : (
          <Link
            href="/dashboard/finansije/ulazne-fakture"
            onClick={onClose}
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "11px", borderRadius: 10,
              background: "#7c3aed", color: "#fff",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Otvori fakture
          </Link>
        )}
      </div>
    </>
  );
}

// ─── Installment layout ───────────────────────────────────────────────────────

function InstallmentContent({
  item,
  onClose,
}: {
  item: DueApiItem;
  onClose: () => void;
}) {
  const rataLabel = item.installment_number !== null && item.total_installments_count !== null
    ? `Rata ${item.installment_number}/${item.total_installments_count}`
    : "Rata";

  const subtitle = [
    "Podsetnik",
    item.title || null,
    rataLabel,
  ].filter(Boolean).join(" · ");

  return (
    <>
      {/* Green accent bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #15803d 0%, #16a34a 60%, #22c55e 100%)", borderRadius: "18px 18px 0 0" }} />

      {/* Header */}
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 5 }}>
              Detalji za plaćanje
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              {item.reminder_title ?? item.title}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              {subtitle}
            </div>
          </div>
          <CloseBtn onClose={onClose} />
        </div>
      </div>

      {/* Info blocks */}
      <div style={{ padding: "14px 22px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <InfoBlock label="Šta plaćam" value={item.reminder_title} />
        <InfoBlock label="Kome plaćam" value={item.title} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <InfoBlock label="Iznos rate" value={`${fmt(item.amount_due)} RSD`} />
          <InfoBlock label="Datum dospeća" value={fmtDate(item.due_date)} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 22px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10 }}>
        <FooterCloseBtn onClose={onClose} />
        <Link
          href="/dashboard/finansije/podsetnici"
          onClick={onClose}
          style={{
            flex: 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "11px", borderRadius: 10,
            background: "#16a34a", color: "#fff",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          Otvori podsetnik
        </Link>
      </div>
    </>
  );
}

// ─── Main modal wrapper ───────────────────────────────────────────────────────

export default function PaymentDetailsModal({ item, onClose }: { item: DueApiItem | null; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      requestAnimationFrame(() => setVisible(true));
      setCopiedField(null);
    } else {
      setVisible(false);
    }
  }, [item]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [item, handleClose]);

  const handleCopy = (field: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {});
  };

  if (!item) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          width: "100%",
          maxWidth: 488,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(14px)",
          opacity: visible ? 1 : 0,
          transition: "transform .2s ease, opacity .2s ease",
        }}
      >
        {item.type === "invoice" ? (
          <InvoiceContent
            item={item}
            copiedField={copiedField}
            onCopy={handleCopy}
            onClose={handleClose}
          />
        ) : (
          <InstallmentContent
            item={item}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}
