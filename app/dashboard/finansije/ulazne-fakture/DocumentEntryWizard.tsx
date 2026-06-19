"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import api from "@/lib/axios";
import CashReceiptForm from "./CashReceiptForm";
import WizardInvoiceForm from "./WizardInvoiceForm";
import type { IncomingInvoice } from "@/types/supplier";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

export interface WizardSupplier {
  id: number;
  name: string;
  pib: string | null;
  total_invoices_count: number;
  total_payments_count: number;
  total_debt: number;
}

interface Props {
  suppliers: WizardSupplier[];
  onClose: () => void;
  onSupplierCreated?: () => void;
  onOpenInvoiceForm?: (supplier: WizardSupplier) => void;
  onOpenPaymentModal?: (supplier: WizardSupplier) => void;
  onDocumentSaved?: () => void;
  editInvoice?: IncomingInvoice | null;
  editSupplier?: WizardSupplier | null;
  preselectedSupplier?: WizardSupplier | null;
}

function fmt(n: number): string {
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STEP_LABELS = ["Dobavljač", "Tip unosa", "Pregled"];

type EntryType = "faktura" | "gotovinska" | "uplata";

interface EntryTypeOption {
  key: EntryType;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const ENTRY_TYPES: EntryTypeOption[] = [
  {
    key: "faktura",
    label: "Ulazna faktura",
    subtitle: "Faktura sa PDV-om, stavkama i plaćanjima",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="12" y2="17" />
      </svg>
    ),
  },
  {
    key: "gotovinska",
    label: "Gotovinska",
    subtitle: "Brzi gotovinski trošak bez fakture",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
  {
    key: "uplata",
    label: "Evidencija uplate",
    subtitle: "Uplata za postojeću ili novu obavezu",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

export default function DocumentEntryWizard({ suppliers, onClose, onSupplierCreated, onOpenInvoiceForm, onOpenPaymentModal, onDocumentSaved, editInvoice, editSupplier, preselectedSupplier }: Props) {
  const isEditMode = editInvoice != null;
  const [visible,          setVisible]          = useState(false);
  const [step,             setStep]             = useState<1 | 2 | 3>(() => isEditMode ? 3 : preselectedSupplier != null ? 2 : 1);
  const [selectedSupplier, setSelectedSupplier] = useState<WizardSupplier | null>(() => isEditMode ? (editSupplier ?? null) : preselectedSupplier ?? null);
  const [selectedType,     setSelectedType]     = useState<EntryType | null>(() => isEditMode ? "faktura" : null);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [quickAdding,      setQuickAdding]      = useState(false);
  const [hoveredId,        setHoveredId]        = useState<number | "add" | null>(null);
  const [hoveredType,      setHoveredType]      = useState<EntryType | null>(null);
  const [cashSaving,       setCashSaving]       = useState(false);
  const [cashError,        setCashError]        = useState<string | null>(null);
  const [invSaving,        setInvSaving]        = useState(false);
  const [invError,         setInvError]         = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 210);
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [handleClose]);

  useEffect(() => {
    if (step === 1) setTimeout(() => searchRef.current?.focus(), 90);
  }, [step]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.trim().toLowerCase();
    return suppliers.filter((s) => s.name.toLowerCase().includes(q));
  }, [suppliers, searchQuery]);

  const showQuickAdd = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase();
    return !suppliers.some((s) => s.name.toLowerCase() === q);
  }, [suppliers, searchQuery]);

  async function handleQuickAdd() {
    if (!searchQuery.trim() || quickAdding) return;
    setQuickAdding(true);
    try {
      const res = await api.post<{ id: number; name: string; pib: string | null }>(
        `/api/${TENANT}/finansije/suppliers`,
        { name: searchQuery.trim() },
      );
      const s: WizardSupplier = {
        id: res.data.id,
        name: res.data.name,
        pib: res.data.pib,
        total_invoices_count: 0,
        total_payments_count: 0,
        total_debt: 0,
      };
      onSupplierCreated?.();
      pickSupplier(s);
    } catch {
      /* ignore */
    } finally {
      setQuickAdding(false);
    }
  }

  function pickSupplier(s: WizardSupplier) {
    setSelectedSupplier(s);
    setStep(2);
  }

  const modal = (
    <>
      <style>{`@keyframes wiz-spin{to{transform:rotate(360deg)}}`}</style>

      <div
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
          background: visible ? "rgba(0,0,0,0.50)" : "rgba(0,0,0,0)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          transition: "background .22s",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            overflow: "hidden",
            width: "100%",
            maxWidth: step === 3 && selectedType === "faktura" ? 720 : step === 3 && selectedType === "gotovinska" ? 640 : 560,
            maxHeight: "calc(100vh - 72px)",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px rgba(0,0,0,.18), 0 8px 20px rgba(0,0,0,.10)",
            transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(18px)",
            opacity: visible ? 1 : 0,
            transition: "transform .22s ease, opacity .22s ease, max-width .2s ease",
          }}
        >

          {/* ── Header ── */}
          <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--green-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em" }}>
                  {isEditMode ? "Izmjena fakture" : "Unos"}
                </h2>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>
                  {isEditMode ? `#${editInvoice?.invoice_number ?? ""}` : "Finansije · Ulazne fakture i uplate"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#64748b", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e2e8f0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Step indicator ── */}
          <div style={{ padding: "14px 28px 0", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done   = step > n;
              return (
                <React.Fragment key={n}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: done || active ? "var(--green)" : "#e5e7eb",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "background .2s",
                    }}>
                      {done ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : "#9ca3af" }}>{n}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? "#111418" : done ? "var(--green)" : "#9ca3af",
                      transition: "color .2s",
                    }}>
                      {label}
                    </span>
                  </div>
                  {n < STEP_LABELS.length && (
                    <div style={{
                      flex: 1, height: 1.5,
                      background: step > n ? "var(--green)" : "#e5e7eb",
                      borderRadius: 2, transition: "background .2s",
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── STEP 1: Supplier search ── */}
          {step === 1 && (
            <>
              <div style={{ padding: "16px 28px 12px", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  >
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Ukucaj ime firme..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    style={{
                      width: "100%", padding: "11px 14px 11px 42px",
                      border: "1.5px solid #e2e8f0", borderRadius: 10,
                      fontSize: 15, color: "#111418", background: "#f8fafc",
                      fontFamily: "inherit", outline: "none",
                      boxSizing: "border-box" as const,
                      transition: "border-color .15s, background .15s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--green)"; e.target.style.background = "#fff"; }}
                    onBlur={(e)  => { e.target.style.borderColor = "#e2e8f0";      e.target.style.background = "#f8fafc"; }}
                  />
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid #f1f5f9" }}>
                {filtered.length === 0 && !showQuickAdd && (
                  <div style={{ padding: "36px 28px", textAlign: "center" as const, color: "#9ca3af", fontSize: 14 }}>
                    Nema rezultata
                  </div>
                )}

                {filtered.map((s) => {
                  const hov = hoveredId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => pickSupplier(s)}
                      onMouseEnter={() => setHoveredId(s.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        padding: "12px 28px",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        borderBottom: "1px solid #f8fafc",
                        cursor: "pointer",
                        background: hov ? "#f9fafb" : "transparent",
                        transition: "background .1s",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111418", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 2 }}>
                          {s.total_invoices_count} f · {s.total_payments_count} u
                        </div>
                      </div>
                      {s.total_debt > 0.005 && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 14 }}>
                          -{fmt(s.total_debt)} RSD
                        </div>
                      )}
                      {hov && (
                        <div style={{ marginLeft: 10, flexShrink: 0, color: "#9ca3af" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Quick add */}
                {showQuickAdd && (
                  <div
                    onClick={handleQuickAdd}
                    onMouseEnter={() => setHoveredId("add")}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      padding: "13px 28px",
                      display: "flex", alignItems: "center", gap: 12,
                      borderTop: filtered.length > 0 ? "1px solid #f1f5f9" : "none",
                      cursor: quickAdding ? "wait" : "pointer",
                      background: hoveredId === "add" ? "#f0fdf4" : "transparent",
                      transition: "background .12s",
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: "var(--green-soft)", color: "var(--green)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {quickAdding ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ animation: "wiz-spin .7s linear infinite" }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)" }}>
                        Dodaj novog dobavljača
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                        &ldquo;{searchQuery.trim()}&rdquo;
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STEP 2: Entry type selection ── */}
          {step === 2 && (
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 8px" }}>
              <div style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                <span style={{ fontSize: 13.5, color: "#64748b" }}>
                  Odaberi tip unosa za{" "}
                  <span style={{ fontWeight: 700, color: "#111418" }}>{selectedSupplier?.name}</span>
                </span>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => { setStep(1); setSelectedType(null); }}
                    style={{ fontSize: 11.5, fontWeight: 600, color: "#94a3b8", background: "none", border: "1px solid #e2e8f0", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", padding: "2px 8px", lineHeight: 1.5, flexShrink: 0, transition: "color .12s, border-color .12s" }}
                    onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#475569"; b.style.borderColor = "#94a3b8"; }}
                    onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#94a3b8"; b.style.borderColor = "#e2e8f0"; }}
                  >
                    promeni
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {ENTRY_TYPES.map(({ key, label, subtitle, icon }) => {
                  const sel = selectedType === key;
                  const hov = hoveredType === key;
                  return (
                    <div
                      key={key}
                      onClick={() => { setSelectedType(key); setStep(3); }}
                      onMouseEnter={() => setHoveredType(key)}
                      onMouseLeave={() => setHoveredType(null)}
                      style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "16px 20px",
                        background: "#fff",
                        border: `1.5px solid ${sel || hov ? "var(--green)" : "#e5e7eb"}`,
                        borderRadius: 12,
                        cursor: "pointer",
                        boxShadow: sel || hov ? "0 4px 12px rgba(22,163,74,.10)" : "0 1px 3px rgba(0,0,0,.04)",
                        transition: "border-color .15s, box-shadow .15s",
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 11,
                        background: sel ? "var(--green-soft)" : "#f8fafc",
                        color: sel ? "var(--green)" : "#475569",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "background .15s, color .15s",
                      }}>
                        {icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111418" }}>{label}</div>
                        <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{subtitle}</div>
                      </div>
                      {sel && (
                        <div style={{ color: "var(--green)", flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3: Ulazna faktura — inline forma ── */}
          {step === 3 && selectedType === "faktura" && selectedSupplier && (
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
              <WizardInvoiceForm
                supplier={selectedSupplier}
                formId="wizard-invoice-form"
                editInvoice={editInvoice ?? null}
                onSaved={() => { onDocumentSaved?.(); onClose(); }}
                onSavingChange={setInvSaving}
                onErrorChange={setInvError}
              />
              {invError && (
                <div style={{ marginTop: 12, padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
                  {invError}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Evidencija uplate — bridge ── */}
          {step === 3 && selectedType === "uplata" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: "20px 22px", borderRadius: 14, border: `1.5px solid var(--green)`, background: "#f0fdf4", display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--green-soft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111418", marginBottom: 4 }}>Evidencija uplate</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#374151" }}>{selectedSupplier?.name}</div>
                  <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 6, lineHeight: 1.55 }}>
                    Uplata po fakturi ili opšta uplata. Možete je vezati za konkretnu fakturu.
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  Kliknite <strong style={{ color: "#111418" }}>Nova uplata</strong> da biste unijeli detalje. Dobavljač će biti automatski odabran.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Cash receipt form ── */}
          {step === 3 && selectedType === "gotovinska" && selectedSupplier && (
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
              <CashReceiptForm
                supplier={selectedSupplier}
                formId="wizard-cash-receipt"
                onSaved={() => { onDocumentSaved?.(); onClose(); }}
                onSavingChange={setCashSaving}
                onErrorChange={setCashError}
              />
              {cashError && (
                <div style={{ marginTop: 12, padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
                  {cashError}
                </div>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          <div style={{
            padding: "16px 28px 22px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: step > 1 && !isEditMode ? "space-between" : "flex-end",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}>
            {step > 1 && !isEditMode && (
              <button
                type="button"
                onClick={() => {
                  const prev = (step - 1) as 1 | 2 | 3;
                  setStep(prev);
                  if (step === 2) setSelectedType(null);
                  if (step === 3) { setCashSaving(false); setCashError(null); setInvSaving(false); setInvError(null); }
                }}
                style={{ padding: "9px 20px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e2e8f0"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
              >
                ← Nazad
              </button>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleClose}
                style={{ padding: "9px 20px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e2e8f0"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
              >
                Zatvori
              </button>

              {/* Step 3 — faktura: submit WizardInvoiceForm */}
              {step === 3 && selectedType === "faktura" && (
                <button
                  type="submit"
                  form="wizard-invoice-form"
                  disabled={invSaving}
                  style={{ padding: "9px 22px", border: "none", borderRadius: 10, background: invSaving ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: invSaving ? "wait" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, transition: "background .12s" }}
                >
                  {invSaving ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "wiz-spin .7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                      Čuvanje...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      {isEditMode ? "Sačuvaj izmjene" : "Sačuvaj fakturu"}
                    </>
                  )}
                </button>
              )}

              {/* Step 3 — uplata: handoff to NewPaymentModal */}
              {step === 3 && selectedType === "uplata" && (
                <button
                  type="button"
                  onClick={() => { if (selectedSupplier) onOpenPaymentModal?.(selectedSupplier); onClose(); }}
                  style={{ padding: "9px 22px", border: "none", borderRadius: 10, background: "var(--green)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, transition: "opacity .12s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                >
                  Nova uplata
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              )}

              {/* Step 3 — gotovinska: submit CashReceiptForm */}
              {step === 3 && selectedType === "gotovinska" && (
                <button
                  type="submit"
                  form="wizard-cash-receipt"
                  disabled={cashSaving}
                  style={{ padding: "9px 22px", border: "none", borderRadius: 10, background: cashSaving ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: cashSaving ? "wait" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, transition: "background .12s" }}
                >
                  {cashSaving ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "wiz-spin .7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                      Čuvanje...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      Sačuvaj
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
