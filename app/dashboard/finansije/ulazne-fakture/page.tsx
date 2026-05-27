"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import type {
  IncomingInvoice, Supplier, SupplierFormData,
  InvoiceFormData,
} from "@/types/supplier";
import {
  EMPTY_SUPPLIER_FORM, EMPTY_INVOICE_FORM, invoiceToForm,
} from "@/types/supplier";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const INVOICES_BASE = `/api/${TENANT}/finansije/incoming-invoices`;
const SUPPLIERS_BASE = `/api/${TENANT}/finansije/suppliers`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sr-Latn", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RSD";
}

async function fetchDocBlob(invoiceId: number): Promise<string> {
  const r = await api.get(`${INVOICES_BASE}/${invoiceId}/document`, { responseType: "blob" });
  const blob = new Blob([r.data as BlobPart], { type: (r.headers["content-type"] as string) ?? "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<IncomingInvoice["status"], { label: string; bg: string; color: string; border: string }> = {
  placeno:   { label: "Plaćeno",   bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  neplaceno: { label: "Neplaćeno", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  delimicno: { label: "Delimično", bg: "#fff7ed", color: "#d97706", border: "#fed7aa" },
};

function StatusBadge({ status }: { status: IncomingInvoice["status"] }) {
  const s = STATUS_MAP[status];
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "#111418", color: "#fff", borderRadius: 10, padding: "11px 20px", fontSize: 14, fontWeight: 500, boxShadow: "0 8px 28px rgba(16,24,40,.22)", zIndex: 400, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      {message}
    </div>
  );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

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

// ─── Shared form styles ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid var(--border)", borderRadius: 9,
  fontSize: 14, color: "#111418", background: "#fff",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 };
const errStyle: React.CSSProperties = { color: "var(--red)", fontSize: 12, margin: "4px 0 0" };

// ─── Quick-add supplier modal ─────────────────────────────────────────────────

interface QuickAddProps {
  initialName: string;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
}

function QuickAddSupplierModal({ initialName, onClose, onSuccess }: QuickAddProps) {
  const firstRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<Pick<SupplierFormData, "name" | "pib">>({ defaultValues: { name: initialName, pib: "" } });

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 60); }, []);

  const saveMut = useMutation({
    mutationFn: (data: Pick<SupplierFormData, "name" | "pib">) =>
      api.post(SUPPLIERS_BASE, { name: data.name, pib: data.pib === "" ? null : data.pib }).then((r) => r.data as Supplier),
    onSuccess: (s: Supplier) => {
      qc.invalidateQueries({ queryKey: ["suppliers-search", TENANT] });
      qc.invalidateQueries({ queryKey: ["suppliers", TENANT] });
      onSuccess(s);
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
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>Brzo dodaj dobavljača</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>Detalje možeš dopuniti kasnije</div>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => saveMut.mutate(d))} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Naziv firme</label>
            <input
              type="text"
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
            <input type="text" placeholder="123456789" {...register("pib")} style={{ ...inputStyle, fontFamily: "'Courier New', monospace" }} onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          </div>

          {saveMut.isError && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "var(--red)", fontSize: 13 }}>Greška. Pokušajte ponovo.</div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", color: "#374151", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Odustani</button>
            <button type="submit" disabled={isSubmitting || saveMut.isPending} style={{ padding: "8px 18px", border: "none", borderRadius: 8, background: isSubmitting || saveMut.isPending ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {isSubmitting || saveMut.isPending ? "Čuvanje..." : "Dodaj"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Supplier combobox ────────────────────────────────────────────────────────

interface ComboboxProps {
  value: Supplier | null;
  onChange: (s: Supplier | null) => void;
  onRequestQuickAdd: (name: string) => void;
  hasError: boolean;
}

function SupplierCombobox({ value, onChange, onRequestQuickAdd, hasError }: ComboboxProps) {
  const [inputText, setInputText] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync external value → input text (e.g. quick-add selected supplier)
  useEffect(() => {
    setInputText(value?.name ?? "");
    if (value) setOpen(false);
  }, [value]);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(inputText), 280);
    return () => clearTimeout(t);
  }, [inputText]);

  // Compute dropdown position (fixed, avoids overflow clipping)
  useLayoutEffect(() => {
    if (open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setDropStyle({ position: "fixed", top: r.bottom + 4, left: r.left, width: r.width, zIndex: 200 });
    }
  }, [open, inputText]);

  // Click outside → close and restore text
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

  const { data: results = [], isFetching } = useQuery<Supplier[]>({
    queryKey: ["suppliers-search", TENANT, debouncedQuery],
    queryFn: ({ signal }) =>
      api.get(`${SUPPLIERS_BASE}?search=${encodeURIComponent(debouncedQuery)}`, { signal }).then((r) => r.data),
    enabled: open,
    staleTime: 15_000,
  });

  function handleInputChange(v: string) {
    setInputText(v);
    onChange(null);
    setOpen(true);
  }

  function handleSelect(s: Supplier) {
    onChange(s);
    setInputText(s.name);
    setOpen(false);
  }

  const showNoResults = open && !isFetching && inputText.length >= 2 && results.length === 0;
  const showResults   = open && results.length > 0;
  const showHint      = open && !isFetching && inputText.length < 2 && results.length === 0;

  const borderColor = hasError ? "var(--red)" : open ? "var(--green)" : value ? "var(--green)" : "var(--border)";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Počnite kucati naziv ili PIB..."
          autoComplete="off"
          style={{ ...inputStyle, borderColor, paddingRight: value ? 32 : 12 }}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setInputText(""); setOpen(false); }}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", border: "none", background: "#e5e7eb", color: "#6b7280", cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center", lineHeight: 1 }}
          >×</button>
        )}
      </div>

      {value && (
        <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          Odabran: {value.name}{value.pib ? ` · PIB: ${value.pib}` : ""}
        </div>
      )}

      {/* Dropdown portal via fixed positioning */}
      {open && (showResults || showNoResults || showHint) && (
        <div style={{ ...dropStyle, background: "#fff", border: "1.5px solid var(--green)", borderRadius: 11, boxShadow: "0 8px 28px rgba(16,24,40,.13)", overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
          {isFetching && (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>Pretraga...</div>
          )}

          {showHint && !isFetching && (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>Ukucajte najmanje 2 slova za pretragu...</div>
          )}

          {showResults && results.map((s) => (
            <button
              key={s.id} type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border-soft)", cursor: "pointer", fontFamily: "inherit", transition: "background .1s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-soft)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111418" }}>{s.name}</div>
              {s.pib && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1, fontFamily: "'Courier New', monospace" }}>PIB: {s.pib}</div>}
            </button>
          ))}

          {showNoResults && (
            <>
              <div style={{ padding: "10px 14px 6px", fontSize: 13, color: "var(--muted)" }}>Nema rezultata za &ldquo;{inputText}&rdquo;</div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setOpen(false); onRequestQuickAdd(inputText); }}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "10px 14px", background: "var(--green-soft)", border: "none", borderTop: "1px solid rgba(22,163,74,.15)", cursor: "pointer", fontFamily: "inherit", color: "var(--green)", fontSize: 13.5, fontWeight: 600, transition: "background .1s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#c6f0d8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-soft)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Dodaj &ldquo;{inputText}&rdquo; kao novog dobavljača
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Invoice slide-over ───────────────────────────────────────────────────────

interface InvoiceSlideOverProps {
  open: boolean;
  editing: IncomingInvoice | null;
  onClose: () => void;
  onSaved: () => void;
}

function InvoiceSlideOver({ open, editing, onClose, onSaved }: InvoiceSlideOverProps) {
  const firstRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierError, setSupplierError] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddInitialName, setQuickAddInitialName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [dropHighlight, setDropHighlight] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } =
    useForm<InvoiceFormData>({ defaultValues: EMPTY_INVOICE_FORM });

  const { fields, append, remove } = useFieldArray({ control, name: "payments" });

  const amtStr         = watch("amount_without_vat");
  const vatStr         = watch("vat_amount");
  const totalStr       = watch("total_amount");
  const isCash         = watch("is_cash");
  const watchedPayments = watch("payments");

  const paidSum   = watchedPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const remaining = (parseFloat(totalStr) || 0) - paidSum;

  // Auto-calculate total
  useEffect(() => {
    const amt = parseFloat(amtStr) || 0;
    const vat = parseFloat(vatStr) || 0;
    setValue("total_amount", (amt + vat).toFixed(2), { shouldDirty: false, shouldValidate: false });
  }, [amtStr, vatStr, setValue]);

  // Reset on open
  useEffect(() => {
    if (open) {
      reset(editing ? invoiceToForm(editing) : EMPTY_INVOICE_FORM);
      setSelectedSupplier(editing?.supplier ?? null);
      setSupplierError(false);
      setQuickAddOpen(false);
      setSelectedFile(null);
      setFileError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => firstRef.current?.focus(), 80);
    }
  }, [open, editing, reset]);

  function handleFileSelect(f: File) {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(f.type)) {
      setFileError("Dozvoljeni formati: PDF, JPG, PNG.");
      setSelectedFile(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("Fajl je prevelik. Maksimalna veličina je 5 MB.");
      setSelectedFile(null);
      return;
    }
    setFileError("");
    setSelectedFile(f);
  }

  async function openExistingDoc() {
    if (!editing?.id) return;
    try {
      const url = await fetchDocBlob(editing.id);
      window.open(url, "_blank");
    } catch { /* ignore */ }
  }

  const saveMut = useMutation({
    mutationFn: (data: InvoiceFormData) => {
      const fd = new FormData();
      fd.append("supplier_id", String(selectedSupplier!.id));
      fd.append("invoice_number", data.invoice_number);
      fd.append("issue_date", data.issue_date);
      if (data.due_date !== "") fd.append("due_date", data.due_date);
      if (data.description !== "") fd.append("description", data.description);
      fd.append("amount_without_vat", data.amount_without_vat);
      fd.append("vat_amount", data.vat_amount);
      fd.append("total_amount", data.total_amount);
      fd.append("is_cash", data.is_cash ? "1" : "0");
      if (!data.is_cash) {
        data.payments
          .filter(p => p.amount !== "" && p.payment_date !== "")
          .forEach((p, i) => {
            fd.append(`payments[${i}][amount]`, p.amount);
            fd.append(`payments[${i}][payment_date]`, p.payment_date);
          });
      }
      if (selectedFile) fd.append("document", selectedFile);

      if (editing) {
        fd.append("_method", "PUT");
        return api.post(`${INVOICES_BASE}/${editing.id}`, fd).then((r) => r.data);
      }
      return api.post(INVOICES_BASE, fd).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incoming-invoices", TENANT] });
      onSaved();
      onClose();
    },
  });

  function onSubmit(data: InvoiceFormData) {
    if (!selectedSupplier) { setSupplierError(true); return; }
    saveMut.mutate(data);
  }

  function autoPdv20() {
    const amt = parseFloat(amtStr) || 0;
    setValue("vat_amount", (amt * 0.2).toFixed(2));
  }

  if (!open) return null;

  const totalDisplay = (parseFloat(totalStr) || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      <div
        onClick={() => { if (!quickAddOpen) onClose(); }}
        style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 100, backdropFilter: "blur(2px)" }}
      />

      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 580, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(16,24,40,.14)", animation: "slideInRight .25s cubic-bezier(.32,.72,.27,1)" }}>
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>{editing ? "Izmijeni fakturu" : "Nova ulazna faktura"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{editing ? `#${editing.invoice_number}` : "Unesite podatke o primljenoj fakturi"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 20 }}>×</button>
        </div>

        {/* Form */}
        <form
          id="invoice-form"
          onSubmit={handleSubmit(onSubmit)}
          style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}
        >
          {/* Supplier combobox */}
          <div>
            <label style={labelStyle}>Dobavljač</label>
            <SupplierCombobox
              value={selectedSupplier}
              onChange={(s) => { setSelectedSupplier(s); if (s) setSupplierError(false); }}
              onRequestQuickAdd={(name) => { setQuickAddInitialName(name); setQuickAddOpen(true); }}
              hasError={supplierError}
            />
            {supplierError && <p style={errStyle}>Dobavljač je obavezan</p>}
          </div>

          {/* Invoice number */}
          <div>
            <label style={labelStyle}>Broj fakture</label>
            <input
              type="text" placeholder="npr. 2024/001 ili F-0042"
              {...register("invoice_number", { required: "Broj fakture je obavezan" })}
              ref={(e) => { register("invoice_number").ref(e); (firstRef as React.MutableRefObject<HTMLInputElement | null>).current = e; }}
              style={{ ...inputStyle, fontFamily: "'Courier New', monospace" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.invoice_number && <p style={errStyle}>{errors.invoice_number.message}</p>}
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Datum izdavanja</label>
              <input type="date" {...register("issue_date", { required: "Datum je obavezan" })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {errors.issue_date && <p style={errStyle}>{errors.issue_date.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Rok plaćanja <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
              <input type="date" {...register("due_date")}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          </div>

          {/* Amounts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Osnovica (bez PDV)</label>
              <input
                type="number" step="0.01" min="0" placeholder="0.00"
                {...register("amount_without_vat", { required: "Osnovica je obavezna", min: { value: 0, message: "Mora biti ≥ 0" } })}
                style={{ ...inputStyle, fontFamily: "'Courier New', monospace" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {errors.amount_without_vat && <p style={errStyle}>{errors.amount_without_vat.message}</p>}
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>PDV</label>
                <button
                  type="button" onClick={autoPdv20}
                  style={{ fontSize: 11, background: "transparent", border: "1px solid rgba(22,163,74,.4)", color: "var(--green)", padding: "2px 8px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, transition: "background .12s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-soft)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >PDV 20%</button>
              </div>
              <input
                type="number" step="0.01" min="0" placeholder="0.00"
                {...register("vat_amount", { required: "PDV je obavezan", min: { value: 0, message: "Mora biti ≥ 0" } })}
                style={{ ...inputStyle, fontFamily: "'Courier New', monospace" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {errors.vat_amount && <p style={errStyle}>{errors.vat_amount.message}</p>}
            </div>
          </div>

          {/* Total (computed display) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--green-soft)", borderRadius: 11, border: "1px solid rgba(22,163,74,.2)" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--green)", opacity: 0.85 }}>Ukupno sa PDV</span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 19, fontWeight: 700, color: "var(--green)", letterSpacing: "-0.01em" }}>
              {totalDisplay} RSD
            </span>
          </div>

          {/* Payment section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", background: "#fafafa", borderRadius: 11, border: "1px solid var(--border-soft)" }}>

            {/* Cash checkbox */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                {...register("is_cash")}
                style={{ width: 17, height: 17, accentColor: "var(--green)", cursor: "pointer", flexShrink: 0 }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111418" }}>Gotovinsko plaćanje</span>
              {isCash && (
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: "var(--green-soft)", color: "var(--green)", border: "1px solid rgba(22,163,74,.25)" }}>
                  Plaćeno u celosti
                </span>
              )}
            </label>

            {/* Payments list — hidden when cash */}
            {!isCash && (
              <>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Istorija uplata</span>
                  <button
                    type="button"
                    onClick={() => append({ amount: "", payment_date: "" })}
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--green)", background: "var(--green-soft)", border: "1px solid rgba(22,163,74,.3)", borderRadius: 7, padding: "4px 11px", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    Dodaj uplatu
                  </button>
                </div>

                {/* Empty state */}
                {fields.length === 0 && (
                  <div style={{ padding: "14px", textAlign: "center", color: "var(--muted)", fontSize: 13, background: "#fff", borderRadius: 9, border: "1px dashed var(--border)" }}>
                    Nema evidentiranih uplata
                  </div>
                )}

                {/* Payment rows */}
                {fields.map((field, index) => (
                  <div key={field.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 30px", gap: 8, alignItems: "start" }}>
                    <div>
                      {index === 0 && <div style={{ ...labelStyle, marginBottom: 4 }}>Iznos (RSD)</div>}
                      <input
                        type="number" step="0.01" min="0.01" placeholder="0.00"
                        {...register(`payments.${index}.amount`, { required: true })}
                        style={{ ...inputStyle, fontFamily: "'Courier New', monospace" }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                      />
                    </div>
                    <div>
                      {index === 0 && <div style={{ ...labelStyle, marginBottom: 4 }}>Datum uplate</div>}
                      <input
                        type="date"
                        {...register(`payments.${index}.payment_date`, { required: true })}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                      />
                    </div>
                    <div style={{ paddingTop: index === 0 ? 21 : 0 }}>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        style={{ width: 30, height: 36, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "var(--red)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 17 }}
                      >×</button>
                    </div>
                  </div>
                ))}

                {/* Live sum */}
                {fields.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", background: "#fff", borderRadius: 9, border: "1px solid var(--border-soft)", fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: "var(--green)" }}>
                      Uplaćeno: {paidSum.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
                    </span>
                    <span style={{ fontWeight: 600, color: remaining > 0.005 ? "var(--amber)" : "var(--green)" }}>
                      {remaining > 0.005
                        ? `Preostalo: ${remaining.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`
                        : "Faktura podmirena ✓"}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Opis <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
            <textarea
              rows={3} placeholder="npr. Materijal — fasada, avansna faktura..."
              {...register("description")}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Document upload */}
          <div>
            <label style={labelStyle}>
              Dokument fakture{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(PDF, JPG, PNG — max 5 MB, opciono)</span>
            </label>

            {/* Existing document indicator */}
            {editing?.document_path && !selectedFile && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 8, background: "var(--green-soft)", border: "1px solid rgba(22,163,74,.2)", borderRadius: 9, fontSize: 13 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <span style={{ flex: 1, color: "#374151", fontWeight: 500 }}>Dokument već priložen</span>
                <button
                  type="button"
                  onClick={openExistingDoc}
                  style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 6px", fontFamily: "inherit", textDecoration: "underline" }}
                >
                  Otvori →
                </button>
              </div>
            )}

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDropHighlight(true); }}
              onDragLeave={() => setDropHighlight(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDropHighlight(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileSelect(f);
              }}
              style={{
                border: `2px dashed ${selectedFile ? "var(--green)" : fileError ? "var(--red)" : dropHighlight ? "var(--green)" : "var(--border)"}`,
                borderRadius: 10,
                padding: "18px 16px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color .15s, background .15s",
                background: selectedFile ? "var(--green-soft)" : dropHighlight ? "#f0fdf4" : "#fafafa",
              }}
            >
              {selectedFile ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--green)", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setFileError("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(22,163,74,.2)", color: "var(--green)", cursor: "pointer", fontSize: 13, display: "grid", placeItems: "center", lineHeight: 1, flexShrink: 0 }}
                  >×</button>
                </div>
              ) : (
                <div>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px", display: "block" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Prevucite fajl ovde ili <span style={{ color: "var(--green)", fontWeight: 600 }}>kliknite za odabir</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 3 }}>
                    {editing?.document_path ? "Odaberite novi fajl da biste zamenili postojeći" : "PDF, JPG, PNG — do 5 MB"}
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />

            {fileError && <p style={errStyle}>{fileError}</p>}
          </div>

          {saveMut.isError && (
            <div style={{ padding: "10px 14px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca", color: "var(--red)", fontSize: 13 }}>
              Greška pri čuvanju. Pokušajte ponovo.
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid var(--border-soft)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", border: "1px solid var(--border)", borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Odustani</button>
          <button type="submit" form="invoice-form" disabled={isSubmitting || saveMut.isPending} style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: isSubmitting || saveMut.isPending ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {isSubmitting || saveMut.isPending ? "Čuvanje..." : editing ? "Sačuvaj izmene" : "Dodaj fakturu"}
          </button>
        </div>
      </div>

      {/* Quick-add supplier modal (above slide-over) */}
      {quickAddOpen && (
        <QuickAddSupplierModal
          initialName={quickAddInitialName}
          onClose={() => setQuickAddOpen(false)}
          onSuccess={(supplier) => {
            setSelectedSupplier(supplier);
            setSupplierError(false);
            setQuickAddOpen(false);
          }}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UlazneFakturePage() {
  const qc = useQueryClient();
  const [invoiceSlide, setInvoiceSlide] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<IncomingInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IncomingInvoice | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openingDocId, setOpeningDocId] = useState<number | null>(null);

  const { data: invoices = [], isLoading } = useQuery<IncomingInvoice[]>({
    queryKey: ["incoming-invoices", TENANT],
    queryFn: ({ signal }) => api.get(INVOICES_BASE, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`${INVOICES_BASE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incoming-invoices", TENANT] });
      setDeleteTarget(null);
      setToast("Faktura je obrisana.");
    },
  });

  async function openDocument(inv: IncomingInvoice) {
    setOpeningDocId(inv.id);
    try {
      const url = await fetchDocBlob(inv.id);
      window.open(url, "_blank");
    } catch {
      setToast("Greška pri otvaranju dokumenta.");
    } finally {
      setOpeningDocId(null);
    }
  }

  function openAdd() { setEditingInvoice(null); setInvoiceSlide(true); }
  function openEdit(inv: IncomingInvoice) { setEditingInvoice(inv); setInvoiceSlide(true); }

  const thStyle: React.CSSProperties = {
    padding: "10px 16px", textAlign: "left",
    fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em",
    textTransform: "uppercase", color: "var(--muted)",
    borderBottom: "1px solid var(--border-soft)", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "13px 16px", fontSize: 14, color: "#111418",
    borderBottom: "1px solid var(--border-soft)", verticalAlign: "middle",
  };

  return (
    <PageShell navId="fin">
      {/* Header */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Finansije</div>
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>Ulazne fakture</h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>Evidencija primljenih faktura i troškova od dobavljača.</p>
        </div>
        <button
          onClick={openAdd}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--green)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 6, whiteSpace: "nowrap" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Nova faktura
        </button>
      </div>

      {/* Table */}
      <div style={{ padding: "24px 32px 110px" }}>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          {isLoading ? (
            <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Učitavanje faktura...</div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nema ulaznih faktura</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>Dodajte prvu fakturu klikom na dugme iznad.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    <th style={thStyle}>Broj fakture</th>
                    <th style={thStyle}>Dobavljač</th>
                    <th style={thStyle}>Datum izdavanja</th>
                    <th style={thStyle}>Valuta</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Ukupan iznos</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} style={{ transition: "background .1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 600, color: "#374151" }}>{inv.invoice_number}</span>
                          {inv.document_path && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{inv.supplier?.name ?? <span style={{ color: "var(--muted-2)" }}>—</span>}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{formatDate(inv.issue_date)}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                        {inv.due_date ? (
                          (() => {
                            const daysLeft = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86_400_000);
                            const overdue = daysLeft < 0 && inv.status === "neplaceno";
                            const urgent  = daysLeft >= 0 && daysLeft <= 7 && inv.status === "neplaceno";
                            return (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: overdue ? "#dc2626" : urgent ? "#d97706" : "#111418", fontWeight: overdue || urgent ? 600 : 400 }}>
                                {(overdue || urgent) && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: overdue ? "#dc2626" : "#d97706", flexShrink: 0 }} />}
                                {formatDate(inv.due_date)}
                              </span>
                            );
                          })()
                        ) : <span style={{ color: "var(--muted-2)" }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14.5 }}>{formatCurrency(inv.total_amount)}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}><StatusBadge status={inv.status} /></td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          {/* Document button */}
                          {inv.document_path && (
                            <button
                              onClick={() => openDocument(inv)}
                              disabled={openingDocId === inv.id}
                              title="Otvori dokument"
                              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: openingDocId === inv.id ? "wait" : "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s", opacity: openingDocId === inv.id ? 0.55 : 1 }}
                              onMouseEnter={(e) => { if (openingDocId === inv.id) return; const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(22,163,74,.4)"; b.style.color = "var(--green)"; b.style.background = "var(--green-soft)"; }}
                              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" />
                              </svg>
                            </button>
                          )}
                          <button onClick={() => openEdit(inv)} title="Izmijeni"
                            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--green)"; b.style.color = "var(--green)"; b.style.background = "var(--green-soft)"; }}
                            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" /></svg>
                          </button>
                          <button onClick={() => setDeleteTarget(inv)} title="Obriši"
                            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "#fecaca"; b.style.color = "var(--red)"; b.style.background = "#fef2f2"; }}
                            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}
                          >
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

        {invoices.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", paddingLeft: 4 }}>
            {invoices.length} {invoices.length === 1 ? "faktura" : invoices.length < 5 ? "fakture" : "faktura"}
          </div>
        )}
      </div>

      <InvoiceSlideOver
        open={invoiceSlide}
        editing={editingInvoice}
        onClose={() => setInvoiceSlide(false)}
        onSaved={() => setToast(editingInvoice ? "Faktura ažurirana." : "Faktura uspješno dodana.")}
      />

      {deleteTarget && (
        <DeleteConfirm
          number={deleteTarget.invoice_number}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </PageShell>
  );
}
