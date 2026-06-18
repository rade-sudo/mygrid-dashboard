"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { fmt, fmtDate } from "./DuePaymentsWidget";
import type { DueApiItem } from "./DuePaymentsWidget";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible, message, isError }: { visible: boolean; message: string; isError?: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : -10}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity .2s ease, transform .2s ease",
        zIndex: 1002,
        background: isError ? "#450a0a" : "#111418",
        color: "#fff",
        padding: "10px 18px",
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        pointerEvents: "none",
        whiteSpace: "nowrap" as const,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isError ? "#fca5a5" : "#22c55e"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {isError
          ? <><path d="M18 6L6 18M6 6l12 12" /></>
          : <polyline points="20 6 9 17 4 12" />
        }
      </svg>
      {message}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function InfoBlock({ label, value, emptyText = "—" }: { label: string; value: string | null; emptyText?: string }) {
  const isEmpty = !value;
  return (
    <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: isEmpty ? "#c4c9d1" : "#111418", fontStyle: isEmpty ? "italic" : "normal" }}>
        {value ?? emptyText}
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ReceivableDetailsModal({
  item,
  onClose,
}: {
  item: DueApiItem | null;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (item) {
      requestAnimationFrame(() => setVisible(true));
      setSending(false);
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

  const showToast = (message: string, isError = false) => {
    setToast({ visible: false, message, isError });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setToast({ visible: true, message, isError }));
    });
    setTimeout(() => setToast((t) => t ? { ...t, visible: false } : null), 2800);
    setTimeout(() => setToast(null), 3100);
  };

  const handleSendOpomena = async () => {
    if (!item?.nav_id || sending) return;
    setSending(true);
    try {
      await api.post(`/api/${TENANT}/finansije/izlazne-fakture/${item.nav_id}/posalji-opomenu`);
      showToast("Opomena uspešno poslata!");
    } catch {
      showToast("Greška — opomena nije poslata.", true);
    } finally {
      setSending(false);
    }
  };

  if (!item) return null;

  return (
    <>
      {toast && <Toast visible={toast.visible} message={toast.message} isError={toast.isError} />}

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
          {/* Emerald accent bar */}
          <div style={{ height: 4, background: "linear-gradient(90deg, #065f46 0%, #059669 60%, #10b981 100%)", borderRadius: "18px 18px 0 0" }} />

          {/* Header */}
          <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 5 }}>
                  Detalji potraživanja
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {item.invoice_number ? `Izlazna faktura br. ${item.invoice_number}` : item.subtitle}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
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
            </div>
          </div>

          {/* Info blocks */}
          <div style={{ padding: "14px 22px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <InfoBlock label="Klijent" value={item.title} />
            <InfoBlock label="Broj fakture" value={item.invoice_number} emptyText="— nije uneto —" />
            <InfoBlock
              label="Datum dospeća / Valuta"
              value={item.due_date ? fmtDate(item.due_date) : null}
              emptyText="— nije uneto —"
            />
          </div>

          {/* Amount block */}
          <div style={{ padding: "4px 22px 18px" }}>
            <div
              style={{
                background: "rgba(209,250,229,0.5)",
                border: "1px solid #a7f3d0",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#059669", marginBottom: 6 }}>
                Preostalo za naplatu
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {fmt(item.amount_due)}{" "}
                <span style={{ fontSize: 15, fontWeight: 600, color: "#6b7280" }}>RSD</span>
              </div>
              {item.total_amount !== item.amount_due && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 5 }}>
                  od ukupno {fmt(item.total_amount)} RSD
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 22px 20px", borderTop: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 8 }}>
            {/* TODO: Pošalji opomenu — zakomentarisano dok se ne postavi SMTP
            <button
              type="button"
              onClick={handleSendOpomena}
              disabled={sending}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: sending ? "#d1d5db" : "#7c3aed",
                color: "#fff",
                fontSize: 14.5, fontWeight: 700,
                cursor: sending ? "wait" : "pointer",
                transition: "background .15s",
                letterSpacing: ".01em",
              }}
            >
              {sending ? "Šalje..." : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  Pošalji opomenu
                </>
              )}
            </button>
            */}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: "10px",
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
              <Link
                href="/dashboard/finansije/izlazne-fakture"
                onClick={handleClose}
                style={{
                  flex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px", borderRadius: 10,
                  background: "#059669", color: "#fff",
                  fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                  <path d="M14 3v5h5M9 13h6M9 17h4" />
                </svg>
                Otvori fakturu
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
