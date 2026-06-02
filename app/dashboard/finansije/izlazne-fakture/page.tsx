"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import DatePicker from "@/components/ui/DatePicker";
import FilterDropdown from "@/components/ui/FilterDropdown";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import type { Client } from "@/types/client";
import type { OutboundInvoice, OutboundInvoiceFormData } from "@/types/client";
import { EMPTY_OUTBOUND_ITEM, EMPTY_OUTBOUND_INVOICE_FORM, outboundInvoiceToForm } from "@/types/client";

const INVOICES_DOC_BASE = `/api/${process.env.NEXT_PUBLIC_TENANT_ID ?? "grid"}/finansije/outbound-invoices`;

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const INVOICES_BASE = `/api/${TENANT}/finansije/outbound-invoices`;
const CLIENTS_BASE  = `/api/${TENANT}/finansije/clients`;

interface PaginatedInvoices {
  data: OutboundInvoice[];
  current_page: number; last_page: number;
  total: number; per_page: number;
  from: number | null; to: number | null;
}

const STATUS_OPTIONS = [
  { value: "",        label: "Sve fakture" },
  { value: "paid",    label: "Plaćeno"     },
  { value: "unpaid",  label: "Neplaćeno"   },
  { value: "partial", label: "Delimično"   },
];

const STATUS_MAP: Record<OutboundInvoice["status"], { label: string; bg: string; color: string; border: string }> = {
  paid:    { label: "Plaćeno",   bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  unpaid:  { label: "Neplaćeno", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  partial: { label: "Delimično", bg: "#fff7ed", color: "#d97706", border: "#fed7aa" },
};

const MERA_OPTIONS = ["kom", "m²", "m³", "m¹", "m", "kg", "t", "l", "sat", "dan", "mes", "%", "paušal"];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sr-Latn", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RSD";
}

function StatusBadge({ status }: { status: OutboundInvoice["status"] }) {
  const s = STATUS_MAP[status];
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "#111418", color: "#fff", borderRadius: 10, padding: "11px 20px", fontSize: 14, fontWeight: 500, boxShadow: "0 8px 28px rgba(16,24,40,.22)", zIndex: 400, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      {message}
    </div>
  );
}

function DeleteConfirm({ number: num, onConfirm, onCancel }: { number: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 18, padding: "32px 28px 24px", width: 380, zIndex: 201, boxShadow: "0 20px 60px rgba(16,24,40,.18)", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fef2f2", color: "var(--red)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 8 }}>Obriši fakturu?</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>Faktura <strong>#{num}</strong> će biti trajno obrisana.</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Odustani</button>
          <button onClick={onConfirm} style={{ padding: "9px 20px", border: "none", borderRadius: 9, background: "var(--red)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Obriši</button>
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 9, fontSize: 14, color: "#111418", background: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color .15s" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 };
const errStyle: React.CSSProperties = { color: "var(--red)", fontSize: 12, margin: "4px 0 0" };
const compactInput: React.CSSProperties = { width: "100%", padding: "7px 8px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 12.5, color: "#111418", background: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color .15s" };

// ─── Quick-add client modal ───────────────────────────────────────────────────

interface QuickAddClientProps {
  initialName: string;
  onClose: () => void;
  onSuccess: (client: Client) => void;
}

function QuickAddClientModal({ initialName, onClose, onSuccess }: QuickAddClientProps) {
  const firstRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<{ name: string; pib: string }>({ defaultValues: { name: initialName, pib: "" } });

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 60); }, []);

  const saveMut = useMutation({
    mutationFn: (data: { name: string; pib: string }) =>
      api.post(CLIENTS_BASE, { name: data.name, pib: data.pib === "" ? null : data.pib }).then((r) => r.data as Client),
    onSuccess: (c: Client) => {
      qc.invalidateQueries({ queryKey: ["clients-search", TENANT] });
      qc.invalidateQueries({ queryKey: ["clients", TENANT] });
      onSuccess(c);
    },
  });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.28)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 18, padding: "28px 26px 22px", width: 360, zIndex: 301, boxShadow: "0 24px 64px rgba(16,24,40,.22)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>Brzo dodaj klijenta</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>Detalje možeš dopuniti kasnije</div>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => saveMut.mutate(d))} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Naziv firme</label>
            <input type="text"
              {...register("name", { required: "Naziv je obavezan" })}
              ref={(e) => { register("name").ref(e); (firstRef as React.MutableRefObject<HTMLInputElement | null>).current = e; }}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.name && <p style={errStyle}>{errors.name.message}</p>}
          </div>
          <div>
            <label style={labelStyle}>PIB <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
            <input type="text" placeholder="123456789" {...register("pib")}
              style={{ ...inputStyle, fontFamily: "var(--font-geist-mono), monospace" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {saveMut.isError && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "var(--red)", fontSize: 13 }}>Greška. Pokušajte ponovo.</div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", color: "#374151", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Odustani</button>
            <button type="submit" disabled={isSubmitting || saveMut.isPending}
              style={{ padding: "8px 18px", border: "none", borderRadius: 8, background: isSubmitting || saveMut.isPending ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {isSubmitting || saveMut.isPending ? "Čuvanje..." : "Dodaj"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Client Combobox ──────────────────────────────────────────────────────────

interface ComboboxProps {
  value: Client | null;
  onChange: (c: Client | null) => void;
  onRequestQuickAdd: (name: string) => void;
  hasError: boolean;
}

function ClientCombobox({ value, onChange, onRequestQuickAdd, hasError }: ComboboxProps) {
  const [inputText, setInputText] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputText(value?.name ?? ""); if (value) setOpen(false); }, [value]);
  useEffect(() => { const t = setTimeout(() => setDebouncedQuery(inputText), 280); return () => clearTimeout(t); }, [inputText]);

  useLayoutEffect(() => {
    if (open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setDropStyle({ position: "fixed", top: r.bottom + 4, left: r.left, width: r.width, zIndex: 200 });
    }
  }, [open, inputText]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInputText(value?.name ?? "");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [value]);

  const { data: results = [], isFetching } = useQuery<Client[]>({
    queryKey: ["clients-search", TENANT, debouncedQuery],
    queryFn: ({ signal }) =>
      api.get(`${CLIENTS_BASE}?all=1&search=${encodeURIComponent(debouncedQuery)}`, { signal }).then((r) => r.data),
    enabled: open,
    staleTime: 15_000,
  });

  const borderColor = hasError ? "var(--red)" : open ? "var(--green)" : value ? "var(--green)" : "var(--border)";
  const showResults   = open && results.length > 0;
  const showNoResults = open && !isFetching && inputText.length >= 2 && results.length === 0;
  const showHint      = open && !isFetching && inputText.length < 2 && results.length === 0;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input type="text" value={inputText}
          onChange={(e) => { setInputText(e.target.value); onChange(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Počnite kucati naziv ili PIB..."
          autoComplete="off"
          style={{ ...inputStyle, borderColor, paddingRight: value ? 32 : 12 }}
        />
        {value && (
          <button type="button" onClick={() => { onChange(null); setInputText(""); setOpen(false); }}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", border: "none", background: "#e5e7eb", color: "#6b7280", cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center", lineHeight: 1 }}>×</button>
        )}
      </div>
      {value && (
        <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          Odabran: {value.name}{value.pib ? ` · PIB: ${value.pib}` : ""}
        </div>
      )}
      {open && (showResults || showNoResults || showHint) && (
        <div style={{ ...dropStyle, background: "#fff", border: "1.5px solid var(--green)", borderRadius: 11, boxShadow: "0 8px 28px rgba(16,24,40,.13)", overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
          {isFetching && <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>Pretraga...</div>}
          {showHint && !isFetching && <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>Ukucajte najmanje 2 slova za pretragu...</div>}
          {showResults && results.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(c); setInputText(c.name); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border-soft)", cursor: "pointer", fontFamily: "inherit", transition: "background .1s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-soft)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111418" }}>{c.name}</div>
              {c.pib && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1, fontFamily: "var(--font-geist-mono), monospace" }}>PIB: {c.pib}</div>}
            </button>
          ))}
          {showNoResults && (
            <>
              <div style={{ padding: "10px 14px 6px", fontSize: 13, color: "var(--muted)" }}>
                Nema rezultata za &ldquo;{inputText}&rdquo;
              </div>
              <button type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setOpen(false); onRequestQuickAdd(inputText); }}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "10px 14px", background: "var(--green-soft)", border: "none", borderTop: "1px solid rgba(22,163,74,.15)", cursor: "pointer", fontFamily: "inherit", color: "var(--green)", fontSize: 13.5, fontWeight: 600, transition: "background .1s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#c6f0d8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-soft)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Dodaj &ldquo;{inputText}&rdquo; kao novog klijenta
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Client panel slide-over (mini-dashboard) ─────────────────────────────────

interface ClientPanelProps { clientName: string | null; invoices: OutboundInvoice[]; onClose: () => void; }

function ClientPanel({ clientName, invoices, onClose }: ClientPanelProps) {
  if (!clientName) return null;
  const clientInvoices = invoices.filter((inv) => inv.client?.name === clientName);
  const totalAmount    = clientInvoices.reduce((acc, inv) => acc + parseFloat(inv.total_amount), 0);
  const debtAmount = clientInvoices
    .filter((inv) => inv.status !== "paid")
    .reduce((acc, inv) => {
      const paid = (inv.payments ?? []).reduce((s, p) => s + parseFloat(p.amount), 0);
      return acc + Math.max(0, parseFloat(inv.total_amount) - paid);
    }, 0);
  const unpaidCount = clientInvoices.filter((inv) => inv.status !== "paid").length;

  return (
    <>
      <style>{`@keyframes clientPanelIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 460, background: "#fff", zIndex: 91, display: "flex", flexDirection: "column", boxShadow: "-12px 0 48px rgba(16,24,40,.16)", animation: "clientPanelIn .25s cubic-bezier(.32,.72,.27,1)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--green)", marginBottom: 4 }}>Klijent</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em", lineHeight: 1.25 }}>{clientName}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 20, flexShrink: 0, marginTop: 2 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "16px", borderRadius: 14, border: "1px solid rgba(22,163,74,.18)", background: "var(--green-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--green)", opacity: 0.8, marginBottom: 6 }}>Ukupno fakturisano</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                {totalAmount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
              </div>
              <div style={{ fontSize: 12, color: "var(--green)", opacity: 0.7, marginTop: 4 }}>
                {clientInvoices.length} {clientInvoices.length === 1 ? "faktura" : clientInvoices.length < 5 ? "fakture" : "faktura"}
              </div>
            </div>

            <div style={{ padding: "16px", borderRadius: 14, border: `1px solid ${debtAmount > 0 ? "#fecaca" : "rgba(22,163,74,.18)"}`, background: debtAmount > 0 ? "#fef2f2" : "var(--green-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: debtAmount > 0 ? "var(--red)" : "var(--green)", opacity: 0.8, marginBottom: 6 }}>Trenutni dug</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: debtAmount > 0 ? "var(--red)" : "var(--green)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                {debtAmount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
              </div>
              <div style={{ fontSize: 12, color: debtAmount > 0 ? "var(--red)" : "var(--green)", opacity: 0.7, marginTop: 4 }}>
                {unpaidCount === 0 ? "Sve izmireno" : `${unpaidCount} neplaćenih`}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Istorija faktura</div>
            {clientInvoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}>Nema faktura za ovog klijenta</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {clientInvoices.map((inv) => (
                  <div key={inv.id}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 11, border: "1px solid var(--border-soft)", background: "#fafafa", transition: "background .1s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f1f5f9"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#fafafa"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111418", fontFamily: "var(--font-geist-mono), monospace" }}>{inv.invoice_number}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{formatDate(inv.issue_date)}</div>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111418", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", marginRight: 8 }}>
                      {formatCurrency(inv.total_amount)}
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Invoice slide-over (create + edit) ──────────────────────────────────────

interface InvoiceSlideOverProps {
  open: boolean; editing: OutboundInvoice | null;
  onClose: () => void; onSaved: () => void;
}

function InvoiceSlideOver({ open, editing, onClose, onSaved }: InvoiceSlideOverProps) {
  const firstRef    = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientError, setClientError] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddInitialName, setQuickAddInitialName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [dropHighlight, setDropHighlight] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } =
    useForm<OutboundInvoiceFormData>({ defaultValues: EMPTY_OUTBOUND_INVOICE_FORM });

  const { fields: itemFields, append: appendItem, remove: removeItem } =
    useFieldArray({ control, name: "items" });

  const { fields: paymentFields, append: appendPayment, remove: removePayment } =
    useFieldArray({ control, name: "payments" });

  const amtStr        = watch("amount_without_vat");
  const vatStr        = watch("vat_amount");
  const totalStr      = watch("total_amount");
  const vatRate       = watch("vat_rate");
  const isCash        = watch("is_cash");
  const watchedItems    = watch("items");
  const watchedPayments = watch("payments");

  useEffect(() => {
    const base = watchedItems.reduce((s, item) => s + (parseFloat(item.iznos) || 0), 0);
    const vat  = base * (vatRate / 100);
    setValue("amount_without_vat", base.toFixed(2),         { shouldDirty: false, shouldValidate: false });
    setValue("vat_amount",         vat.toFixed(2),          { shouldDirty: false, shouldValidate: false });
    setValue("total_amount",       (base + vat).toFixed(2), { shouldDirty: false, shouldValidate: false });
  }, [watchedItems, vatRate, setValue]);

  useEffect(() => {
    if (open) {
      reset(editing ? outboundInvoiceToForm(editing) : EMPTY_OUTBOUND_INVOICE_FORM);
      setSelectedClient(editing?.client ?? null);
      setClientError(false);
      setSelectedFile(null);
      setFileError("");
      setTimeout(() => firstRef.current?.focus(), 80);
    }
  }, [open, editing, reset]);

  const paidSum = watchedPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setFileError("Fajl je prevelik (max 5 MB)"); return; }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) { setFileError("Dozvoljeni formati: PDF, JPG, PNG"); return; }
    setFileError("");
    setSelectedFile(file);
  }

  const saveMut = useMutation({
    mutationFn: (data: OutboundInvoiceFormData) => {
      const fd = new FormData();
      fd.append("client_id",          String(selectedClient!.id));
      fd.append("invoice_number",     data.invoice_number);
      fd.append("issue_date",         data.issue_date);
      if (data.due_date) fd.append("due_date", data.due_date);
      if (data.description) fd.append("description", data.description);
      fd.append("amount_without_vat", data.amount_without_vat);
      fd.append("vat_rate",           String(data.vat_rate));
      fd.append("vat_amount",         data.vat_amount);
      fd.append("total_amount",       data.total_amount);
      fd.append("is_cash",            data.is_cash ? "1" : "0");

      if (!data.is_cash) {
        data.payments
          .filter((p) => p.amount !== "" && p.payment_date !== "")
          .forEach((p, i) => {
            fd.append(`payments[${i}][amount]`,       p.amount);
            fd.append(`payments[${i}][payment_date]`, p.payment_date);
          });
      }

      data.items
        .filter((item) => item.iznos !== "" && parseFloat(item.iznos) > 0)
        .forEach((item, i) => {
          fd.append(`items[${i}][sektor]`,     item.sektor);
          fd.append(`items[${i}][jedinica]`,   item.jedinica);
          fd.append(`items[${i}][kategorija]`, item.kategorija);
          fd.append(`items[${i}][kolicina]`,   item.kolicina);
          fd.append(`items[${i}][mera]`,       item.mera);
          fd.append(`items[${i}][iznos]`,      item.iznos);
        });

      if (selectedFile) fd.append("document", selectedFile);

      const config = { headers: { "Content-Type": "multipart/form-data" } };
      if (editing) {
        fd.append("_method", "PUT");
        return api.post(`${INVOICES_BASE}/${editing.id}`, fd, config).then((r) => r.data);
      }
      return api.post(INVOICES_BASE, fd, config).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outbound-invoices", TENANT] });
      onSaved();
      onClose();
    },
  });

  function onSubmit(data: OutboundInvoiceFormData) {
    if (!selectedClient) { setClientError(true); return; }
    saveMut.mutate(data);
  }

  if (!open) return null;

  const baseDisplay  = (parseFloat(amtStr)   || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const vatDisplay   = (parseFloat(vatStr)   || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalDisplay = (parseFloat(totalStr) || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fo = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = "var(--green)");
  const fb = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = "var(--border)");

  return (
    <>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div onClick={() => { if (!quickAddOpen) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 620, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(16,24,40,.14)", animation: "slideInRight .25s cubic-bezier(.32,.72,.27,1)" }}>

        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>{editing ? "Izmijeni fakturu" : "Nova izlazna faktura"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{editing ? `#${editing.invoice_number}` : "Unesite podatke o izdatoj fakturi"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 20 }}>×</button>
        </div>

        {/* Form */}
        <form id="outbound-invoice-form" onSubmit={handleSubmit(onSubmit)}
          style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Klijent */}
          <div>
            <label style={labelStyle}>Klijent</label>
            <ClientCombobox
              value={selectedClient}
              onChange={(c) => { setSelectedClient(c); if (c) setClientError(false); }}
              onRequestQuickAdd={(name) => { setQuickAddInitialName(name); setQuickAddOpen(true); }}
              hasError={clientError}
            />
            {clientError && <p style={errStyle}>Klijent je obavezan</p>}
          </div>

          {/* Broj fakture */}
          <div>
            <label style={labelStyle}>Broj fakture</label>
            <input type="text" placeholder="npr. 2024/001 ili IF-0042"
              {...register("invoice_number", { required: "Broj fakture je obavezan" })}
              ref={(e) => { register("invoice_number").ref(e); (firstRef as React.MutableRefObject<HTMLInputElement | null>).current = e; }}
              style={{ ...inputStyle, fontFamily: "var(--font-geist-mono), monospace" }}
              onFocus={fo} onBlur={fb}
            />
            {errors.invoice_number && <p style={errStyle}>{errors.invoice_number.message}</p>}
          </div>

          {/* Datumi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Datum izdavanja</label>
              <Controller name="issue_date" control={control} rules={{ required: "Datum je obavezan" }}
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
              {errors.issue_date && <p style={errStyle}>{errors.issue_date.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Rok plaćanja <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
              <Controller name="due_date" control={control}
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
            </div>
          </div>

          {/* ─── STAVKE ─── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted)" }}>Stavke fakture</span>
              <button type="button" onClick={() => appendItem({ ...EMPTY_OUTBOUND_ITEM })}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--green)", background: "var(--green-soft)", border: "1px solid rgba(22,163,74,.3)", borderRadius: 7, padding: "4px 11px", cursor: "pointer", fontFamily: "inherit" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Dodaj stavku
              </button>
            </div>

            <div style={{ borderRadius: 11, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 590 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "88px 76px 1fr 58px 82px 92px 30px", gap: 6, padding: "7px 10px", background: "rgba(248,250,255,0.80)", borderBottom: "1px solid var(--border-soft)" }}>
                    {["SEKTOR", "JEDINICA", "KATEGORIJA", "KOL.", "MERA", "IZNOS (RSD)", ""].map((h, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted)", textAlign: i === 5 ? "right" : "left" }}>{h}</div>
                    ))}
                  </div>

                  {itemFields.length === 0 && (
                    <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: 13, background: "#fafafa" }}>
                      Nema stavki — kliknite &ldquo;Dodaj stavku&rdquo;
                    </div>
                  )}

                  {itemFields.map((field, index) => (
                    <div key={field.id} style={{ display: "grid", gridTemplateColumns: "88px 76px 1fr 58px 82px 92px 30px", gap: 6, padding: "7px 10px", alignItems: "center", borderBottom: index < itemFields.length - 1 ? "1px solid var(--border-soft)" : "none", background: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <input type="text" placeholder="Sektor" {...register(`items.${index}.sektor`)} style={compactInput}
                        onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                      <input type="text" placeholder="Jedinica" {...register(`items.${index}.jedinica`)} style={compactInput}
                        onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                      <input type="text" placeholder="Kategorija / opis..." {...register(`items.${index}.kategorija`)} style={compactInput}
                        onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                      <input type="number" step="0.001" min="0" placeholder="1" {...register(`items.${index}.kolicina`)}
                        style={{ ...compactInput, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                      <Controller name={`items.${index}.mera`} control={control}
                        render={({ field: f }) => (
                          <select value={f.value} onChange={(e) => f.onChange(e.target.value)} style={{ ...compactInput, cursor: "pointer" }}>
                            {MERA_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        )} />
                      <input type="number" step="0.01" min="0" placeholder="0.00" {...register(`items.${index}.iznos`)}
                        style={{ ...compactInput, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                      <button type="button" onClick={() => removeItem(index)}
                        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", color: "var(--red)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 15, flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── PDV + kalkulacija ─── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", background: "#fafafa", borderRadius: 11, border: "1px solid var(--border-soft)" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Stopa PDV-a</div>
              <div style={{ display: "flex", gap: 6 }}>
                {([0, 10, 20] as const).map((rate) => {
                  const active = vatRate === rate;
                  return (
                    <button key={rate} type="button" onClick={() => setValue("vat_rate", rate, { shouldDirty: true })}
                      style={{ padding: "6px 18px", borderRadius: 20, border: `1.5px solid ${active ? "var(--green)" : "var(--border)"}`, background: active ? "var(--green)" : "#fff", color: active ? "#fff" : "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}>
                      {rate}%
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>Osnovica (bez PDV)</div>
                <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 15, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em" }}>{baseDisplay} RSD</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>PDV ({vatRate}%)</div>
                <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 15, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em" }}>{vatDisplay} RSD</div>
              </div>
            </div>
          </div>

          {/* Ukupno */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--green-soft)", borderRadius: 11, border: "1px solid rgba(22,163,74,.2)" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--green)", opacity: 0.85 }}>Ukupno sa PDV</span>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 19, fontWeight: 700, color: "var(--green)", letterSpacing: "-0.01em" }}>{totalDisplay} RSD</span>
          </div>

          {/* Gotovinsko plaćanje + uplata */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", background: "#fafafa", borderRadius: 11, border: "1px solid var(--border-soft)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" {...register("is_cash")}
                style={{ width: 17, height: 17, accentColor: "var(--green)", cursor: "pointer", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111418" }}>Gotovinsko plaćanje</span>
              {isCash && (
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: "var(--green-soft)", color: "var(--green)", border: "1px solid rgba(22,163,74,.25)" }}>
                  Plaćeno u celosti
                </span>
              )}
            </label>

            {!isCash && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Istorija uplata</span>
                  <button type="button"
                    onClick={() => appendPayment({ amount: "", payment_date: "" })}
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--green)", background: "var(--green-soft)", border: "1px solid rgba(22,163,74,.3)", borderRadius: 7, padding: "4px 11px", cursor: "pointer", fontFamily: "inherit" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    Dodaj uplatu
                  </button>
                </div>

                {paymentFields.length === 0 && (
                  <div style={{ padding: "14px", textAlign: "center", color: "var(--muted)", fontSize: 13, background: "#fff", borderRadius: 9, border: "1px dashed var(--border)" }}>
                    Nema evidentiranih uplata
                  </div>
                )}

                {paymentFields.map((field, index) => (
                  <div key={field.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 30px", gap: 8, alignItems: "start" }}>
                    <div>
                      {index === 0 && <div style={{ ...labelStyle, marginBottom: 4 }}>Iznos (RSD)</div>}
                      <input type="number" step="0.01" min="0.01" placeholder="0.00"
                        {...register(`payments.${index}.amount`, { required: true })}
                        style={{ ...inputStyle, fontFamily: "var(--font-geist-mono), monospace" }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                      />
                    </div>
                    <div>
                      {index === 0 && <div style={{ ...labelStyle, marginBottom: 4 }}>Datum uplate</div>}
                      <Controller name={`payments.${index}.payment_date`} control={control} rules={{ required: true }}
                        render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
                    </div>
                    <div style={{ paddingTop: index === 0 ? 24 : 0 }}>
                      <button type="button" onClick={() => removePayment(index)}
                        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", color: "var(--red)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 15 }}>×</button>
                    </div>
                  </div>
                ))}

                {paymentFields.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", background: "#fff", borderRadius: 9, border: "1px solid var(--border-soft)", fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: "var(--green)" }}>
                      Uplaćeno: {paidSum.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
                    </span>
                    {parseFloat(totalStr) > 0 && (
                      <span style={{ color: paidSum >= parseFloat(totalStr) ? "var(--green)" : "var(--muted)", fontWeight: 600 }}>
                        Ostatak: {Math.max(0, parseFloat(totalStr) - paidSum).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Opis */}
          <div>
            <label style={labelStyle}>Opis <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
            <textarea rows={3} placeholder="Napomena uz fakturu..."
              {...register("description")}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Dokument fakture */}
          <div>
            <label style={labelStyle}>
              Dokument fakture{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(PDF, JPG, PNG — max 5 MB, opciono)</span>
            </label>

            {editing?.document_path && !selectedFile && (
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--green-soft)", borderRadius: 9, border: "1px solid rgba(22,163,74,.2)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /></svg>
                <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 500, flex: 1 }}>Dokument već priložen</span>
                <button type="button"
                  onClick={() => api.get(`${INVOICES_DOC_BASE}/${editing.id}/document`, { responseType: "blob" }).then((r) => { const url = URL.createObjectURL(r.data); window.open(url, "_blank"); })}
                  style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>
                  Otvori
                </button>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

            {selectedFile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--green-soft)", borderRadius: 9, border: "1px solid rgba(22,163,74,.25)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /></svg>
                <span style={{ fontSize: 13, color: "var(--green)", flex: 1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile.name}</span>
                <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDropHighlight(true); }}
                onDragLeave={() => setDropHighlight(false)}
                onDrop={(e) => { e.preventDefault(); setDropHighlight(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                style={{ border: `2px dashed ${dropHighlight ? "var(--green)" : "var(--border)"}`, borderRadius: 11, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: dropHighlight ? "var(--green-soft)" : "#fafafa", transition: "border-color .15s, background .15s" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px", display: "block", color: "var(--muted)" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
                  Prevucite fajl ovde ili <span style={{ color: "var(--green)", fontWeight: 600 }}>kliknite za odabir</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 4 }}>PDF, JPG, PNG — do 5 MB</div>
              </div>
            )}
            {fileError && <p style={errStyle}>{fileError}</p>}
          </div>

          {saveMut.isError && (
            <div style={{ padding: "10px 14px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca", color: "var(--red)", fontSize: 13 }}>
              Greška pri čuvanju. Pokušajte ponovo.
            </div>
          )}
        </form>

        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid var(--border-soft)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", border: "1px solid var(--border)", borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Odustani</button>
          <button type="submit" form="outbound-invoice-form" disabled={isSubmitting || saveMut.isPending}
            style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: isSubmitting || saveMut.isPending ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {isSubmitting || saveMut.isPending ? "Čuvanje..." : editing ? "Sačuvaj izmene" : "Dodaj fakturu"}
          </button>
        </div>
      </div>

      {quickAddOpen && (
        <QuickAddClientModal
          initialName={quickAddInitialName}
          onClose={() => setQuickAddOpen(false)}
          onSuccess={(client) => {
            setSelectedClient(client);
            setClientError(false);
            setQuickAddOpen(false);
          }}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IzlazneFakturePage() {
  const qc = useQueryClient();
  const [invoiceSlide, setInvoiceSlide] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<OutboundInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OutboundInvoice | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [clientPanelName, setClientPanelName] = useState<string | null>(null);

  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage]                       = useState(1);
  const [statusFilter, setStatusFilter]       = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: paginatedData, isLoading } = useQuery<PaginatedInvoices>({
    queryKey: ["outbound-invoices", TENANT, debouncedSearch, page, statusFilter],
    queryFn: ({ signal }) =>
      api.get(INVOICES_BASE, { signal, params: { ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(statusFilter ? { status: statusFilter } : {}), page, per_page: 15 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const invoices = paginatedData?.data ?? [];
  const total    = paginatedData?.total ?? 0;
  const lastPage = paginatedData?.last_page ?? 1;

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`${INVOICES_BASE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outbound-invoices", TENANT] });
      setDeleteTarget(null);
      setToast("Faktura je obrisana.");
    },
  });

  const thStyle: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border-soft)", whiteSpace: "nowrap" };
  const tdStyle: React.CSSProperties = { padding: "13px 16px", fontSize: 14, color: "#111418", borderBottom: "1px solid var(--border-soft)", verticalAlign: "middle" };

  return (
    <PageShell navId="fin">
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Finansije</div>
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>Izlazne fakture</h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>Kreiranje i praćenje izlaznih faktura i prihoda.</p>
        </div>
        <button onClick={() => { setEditingInvoice(null); setInvoiceSlide(true); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--green)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 6, whiteSpace: "nowrap" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Nova faktura
        </button>
      </div>

      <div style={{ padding: "24px 32px 110px" }}>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Pretraga po broju fakture ili klijentu..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 38px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13.5, color: "#111418", background: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <FilterDropdown value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}
            placeholder="Sve fakture" color="green" options={STATUS_OPTIONS}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>}
          />
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          {isLoading ? (
            <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Učitavanje faktura...</div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{debouncedSearch ? `Nema rezultata za "${debouncedSearch}"` : "Nema izlaznih faktura"}</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>{debouncedSearch ? "Promijenite ili obrišite pretragu." : "Dodajte prvu fakturu klikom na dugme iznad."}</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    <th style={thStyle}>Broj fakture</th>
                    <th style={thStyle}>Klijent</th>
                    <th style={thStyle}>Datum izdavanja</th>
                    <th style={thStyle}>Rok plaćanja</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Ukupan iznos</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, fontWeight: 600, color: "#374151" }}>{inv.invoice_number}</span>
                      </td>
                      <td style={tdStyle}>
                        {inv.client ? (
                          <button onClick={() => setClientPanelName(inv.client.name)}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "var(--green)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.textDecoration = "underline"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.textDecoration = "none"; }}>
                            {inv.client.name}
                          </button>
                        ) : <span style={{ color: "var(--muted-2)" }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{formatDate(inv.issue_date)}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        {inv.due_date ? (() => {
                          const daysLeft = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86_400_000);
                          const overdue  = daysLeft < 0  && inv.status === "unpaid";
                          const urgent   = daysLeft >= 0 && daysLeft <= 7 && inv.status === "unpaid";
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: overdue ? "#dc2626" : urgent ? "#d97706" : "#111418", fontWeight: overdue || urgent ? 600 : 400 }}>
                              {(overdue || urgent) && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: overdue ? "#dc2626" : "#d97706", flexShrink: 0 }} />}
                              {formatDate(inv.due_date)}
                            </span>
                          );
                        })() : <span style={{ color: "var(--muted-2)" }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14.5 }}>{formatCurrency(inv.total_amount)}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}><StatusBadge status={inv.status} /></td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button onClick={() => { setEditingInvoice(inv); setInvoiceSlide(true); }} title="Izmijeni"
                            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--green)"; b.style.color = "var(--green)"; b.style.background = "var(--green-soft)"; }}
                            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" /></svg>
                          </button>
                          <button onClick={() => setDeleteTarget(inv)} title="Obriši"
                            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "#fecaca"; b.style.color = "var(--red)"; b.style.background = "#fef2f2"; }}
                            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
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

        {total > 0 && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--muted)", paddingLeft: 4 }}>
              {debouncedSearch
                ? `${total} ${total === 1 ? "rezultat" : "rezultata"} za "${debouncedSearch}"`
                : `${total} ${total === 1 ? "faktura" : total < 5 ? "fakture" : "faktura"}`}
            </span>
            {lastPage > 1 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                  style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", color: page === 1 ? "var(--muted-2)" : "#374151", fontSize: 13, fontWeight: 500, cursor: page === 1 ? "default" : "pointer", fontFamily: "inherit" }}>← Prethodna</button>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", padding: "0 8px" }}>{page} / {lastPage}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= lastPage}
                  style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", color: page >= lastPage ? "var(--muted-2)" : "#374151", fontSize: 13, fontWeight: 500, cursor: page >= lastPage ? "default" : "pointer", fontFamily: "inherit" }}>Sledeća →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {clientPanelName && (
        <ClientPanel clientName={clientPanelName} invoices={invoices} onClose={() => setClientPanelName(null)} />
      )}

      <InvoiceSlideOver open={invoiceSlide} editing={editingInvoice}
        onClose={() => setInvoiceSlide(false)}
        onSaved={() => setToast(editingInvoice ? "Faktura ažurirana." : "Faktura uspješno dodana.")}
      />

      {deleteTarget && (
        <DeleteConfirm number={deleteTarget.invoice_number}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </PageShell>
  );
}
