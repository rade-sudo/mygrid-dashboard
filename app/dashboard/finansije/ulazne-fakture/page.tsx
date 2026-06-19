"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import DatePicker from "@/components/ui/DatePicker";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import { useSortableData } from "@/hooks/useSortableData";
import NewPaymentModal from "./NewPaymentModal";
import DocumentEntryWizard from "./DocumentEntryWizard";
import type {
  IncomingInvoice, Supplier, SupplierFormData,
  InvoiceFormData,
} from "@/types/supplier";
import {
  EMPTY_SUPPLIER_FORM, EMPTY_INVOICE_FORM, EMPTY_ITEM, invoiceToForm,
} from "@/types/supplier";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const INVOICES_BASE   = `/api/${TENANT}/finansije/incoming-invoices`;
const SUPPLIERS_BASE  = `/api/${TENANT}/finansije/suppliers`;
const SIFRARNICI_BASE = `/api/${TENANT}/sifrarnici`;

const YEAR_START = `${new Date().getFullYear()}-01-01`;
const TODAY      = new Date().toISOString().split("T")[0];

interface PaginatedInvoices {
  data: IncomingInvoice[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

type SortableInvoice = IncomingInvoice & { supplier_name: string };

interface SupplierWithBalance {
  id: number;
  name: string;
  pib: string | null;
  total_invoices_count: number;
  total_payments_count: number;
  total_debt: number;
}

interface SupplierStats {
  supplier: { id: number; name: string; pib: string | null } | null;
  invoiced_period: { amount: number; count: number };
  paid_period: { amount: number; count: number };
  total_balance: number;
}

interface InvoiceTableRow {
  id: number;
  supplier_id: number;
  invoice_number: string;
  issue_date: string;
  amount_without_vat: number;
  vat_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: "placeno" | "neplaceno" | "delimicno";
  supplier_name: string;
  sektor: string | null;
  jedinica: string | null;
  kategorija: string | null;
}

interface PaymentTableRow {
  id: number;
  payment_date: string;
  amount: number;
  invoice_number: string;
  supplier_name: string;
}

interface SectorAnalytics {
  id: number;
  name: string;
  total_iznos: number;
  total_vat: number;
  total_items: number;
  total_units: number;
}

interface UnitAnalytics {
  id: number;
  name: string;
  sector_id: number;
  total_iznos: number;
  total_vat: number;
  total_items: number;
}

interface CategoryAnalytics {
  id: number;
  name: string;
  amount: number;
  items_count: number;
  percentage: number;
}

interface UnitKategorijePodaci {
  unit_kpis: { total_items: number; total_amount: number; total_tax: number };
  categories: CategoryAnalytics[];
}

interface CategoryItem {
  id: number;
  rb: number;
  invoice_id: number;
  invoice_number: string;
  issue_date: string;
  supplier_id: number;
  supplier_name: string;
  kolicina: number;
  mera: string;
  iznos: number;
  vat_amount: number;
  total_with_vat: number;
  napomena: string;
}

interface CategoryDetalji {
  category_info: { name: string; total_invoices: number; total_amount: number; quantities_string: string };
  kpis: { invoice_count: number; quantity_string: string; total_amount: number; total_vat: number };
  suppliers_filter: Array<{ id: number | "all"; name: string; count: number }>;
  items: CategoryItem[];
}

const INVOICE_COLS: { col: keyof InvoiceTableRow; label: string }[] = [
  { col: "issue_date",         label: "DATUM"        },
  { col: "amount_without_vat", label: "IZNOS"        },
  { col: "vat_amount",         label: "PDV"          },
  { col: "total_amount",       label: "IZNOS SA PDV" },
  { col: "sektor",             label: "SEKTOR"       },
  { col: "jedinica",           label: "JEDINICA"     },
  { col: "kategorija",         label: "KATEGORIJA"   },
  { col: "status",             label: "KNJIŽENJE"    },
];

const PAYMENT_COLS: { col: keyof PaymentTableRow; label: string }[] = [
  { col: "payment_date",   label: "DATUM"       },
  { col: "amount",         label: "IZNOS"       },
  { col: "invoice_number", label: "FAKTURA BR." },
  { col: "supplier_name",  label: "DOBAVLJAČ"   },
];

const STATUS_OPTIONS = [
  { value: "",          label: "Sve fakture" },
  { value: "placeno",   label: "Plaćeno"     },
  { value: "neplaceno", label: "Neplaćeno"   },
  { value: "delimicno", label: "Delimično"   },
];

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

function DeleteConfirm({ title, message, onConfirm, onCancel }: { title: string; message: React.ReactNode; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 18, padding: "32px 28px 24px", width: 380, zIndex: 201, boxShadow: "0 20px 60px rgba(16,24,40,.18)", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fef2f2", color: "var(--red)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
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

const compactInput: React.CSSProperties = {
  width: "100%", padding: "7px 8px",
  border: "1.5px solid var(--border)", borderRadius: 7,
  fontSize: 12.5, color: "#111418", background: "#fff",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};

const MERA_OPTIONS = ["kom", "m²", "m³", "m¹", "m", "kg", "t", "l", "sat", "dan", "mes", "%", "paušal"];

// ─── Dict types ───────────────────────────────────────────────────────────────

interface DictOption {
  id: number;
  name: string;
  sector_id?: number | null;
  sector?: { id: number; name: string } | null;
  organizational_unit_id?: number | null;
  organizational_unit?: { id: number; name: string; sector?: { id: number; name: string } | null } | null;
}

// ─── Dict combobox ────────────────────────────────────────────────────────────

interface DictComboboxProps {
  selectedId: number | null;
  options: DictOption[];
  placeholder: string;
  disabled?: boolean;
  createEndpoint?: string;
  createPayload?: (name: string) => Record<string, unknown>;
  queryKeyToInvalidate?: unknown[];
  onSelect: (item: DictOption | null) => void;
}

function DictCombobox({
  selectedId, options, placeholder, disabled, createEndpoint, createPayload, queryKeyToInvalidate, onSelect,
}: DictComboboxProps) {
  const qc = useQueryClient();
  const [query, setQuery]           = useState("");
  const [open, setOpen]             = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({
    position: "fixed", top: -9999, left: -9999, zIndex: 9000,
  });

  const selectedItem = options.find((o) => o.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (query.trim() === "") return options;
    const q = query.toLowerCase().trim();
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const showCreate =
    !disabled &&
    createEndpoint != null &&
    query.trim().length >= 1 &&
    !options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());

  useLayoutEffect(() => {
    if (open && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropStyle({
        position: "fixed",
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 210),
        zIndex: 9000,
      });
    }
  }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      const outsideWrap = wrapRef.current && !wrapRef.current.contains(t);
      const outsideDrop = !dropRef.current || !dropRef.current.contains(t);
      if (outsideWrap && outsideDrop) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  async function handleCreate() {
    if (!createEndpoint || !createPayload) return;
    setIsCreating(true);
    try {
      const res = await api.post<DictOption>(createEndpoint, createPayload(query.trim()));
      const newItem = res.data;
      if (queryKeyToInvalidate) qc.invalidateQueries({ queryKey: queryKeyToInvalidate });
      onSelect(newItem);
      setOpen(false);
      setQuery("");
    } finally {
      setIsCreating(false);
    }
  }

  const accentBorder = open ? "var(--green)" : selectedId ? "rgba(22,163,74,.35)" : "var(--border)";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={open ? query : (selectedItem?.name ?? "")}
          disabled={disabled}
          placeholder={disabled ? "—" : placeholder}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { if (!disabled) { setQuery(""); setOpen(true); } }}
          autoComplete="off"
          style={{
            ...compactInput,
            borderColor: disabled ? "var(--border-soft)" : accentBorder,
            background: disabled ? "#f9fafb" : "#fff",
            color: disabled ? "var(--muted-2)" : "#111418",
            cursor: disabled ? "not-allowed" : "text",
            paddingRight: selectedId && !disabled ? 22 : 8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        />
        {selectedId != null && !disabled && !open && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onSelect(null); setQuery(""); }}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, border: "none", background: "#e5e7eb", color: "#6b7280", cursor: "pointer", borderRadius: "50%", fontSize: 11, display: "grid", placeItems: "center", lineHeight: 1, flexShrink: 0 }}
          >×</button>
        )}
      </div>

      {open && (
        <div ref={dropRef} style={{ ...dropStyle, background: "#fff", border: "1.5px solid rgba(22,163,74,.4)", borderRadius: 10, boxShadow: "0 8px 28px rgba(16,24,40,.15)", maxHeight: 240, overflowY: "auto" }}>
          {filtered.length === 0 && !showCreate && (
            <div style={{ padding: "9px 12px", fontSize: 12.5, color: "var(--muted)" }}>
              {query.length === 0 ? "Nema opcija" : `Nema rezultata za "${query}"`}
            </div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(opt); setOpen(false); setQuery(""); }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "7px 12px",
                background: opt.id === selectedId ? "var(--green-soft)" : "transparent",
                border: "none", borderBottom: "1px solid var(--border-soft)",
                cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
              }}
              onMouseEnter={(e) => { if (opt.id !== selectedId) (e.currentTarget as HTMLButtonElement).style.background = "var(--green-soft)"; }}
              onMouseLeave={(e) => { if (opt.id !== selectedId) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div style={{ fontWeight: opt.id === selectedId ? 700 : 600, color: opt.id === selectedId ? "var(--green)" : "#111418", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {opt.name}
              </div>
              {opt.sector?.name && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{opt.sector.name}</div>
              )}
              {opt.organizational_unit && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                  {opt.organizational_unit.name}{opt.organizational_unit.sector?.name ? ` · ${opt.organizational_unit.sector.name}` : ""}
                </div>
              )}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              disabled={isCreating}
              style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%",
                padding: "8px 12px", background: "var(--green-soft)",
                border: "none", borderTop: filtered.length > 0 ? "1px solid rgba(22,163,74,.15)" : "none",
                cursor: isCreating ? "not-allowed" : "pointer", fontFamily: "inherit",
                color: "var(--green)", fontSize: 12.5, fontWeight: 600,
              }}
              onMouseEnter={(e) => { if (!isCreating) (e.currentTarget as HTMLButtonElement).style.background = "#c6f0d8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-soft)"; }}
            >
              {isCreating ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin .7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              )}
              {isCreating ? "Kreiranje..." : `Dodaj "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Invoice item row ─────────────────────────────────────────────────────────

interface ItemRowProps {
  index: number;
  control: Control<InvoiceFormData>;
  register: UseFormRegister<InvoiceFormData>;
  setValue: UseFormSetValue<InvoiceFormData>;
  removeItem: (index: number) => void;
  isLast: boolean;
  isEven: boolean;
  sectors: DictOption[];
  allUnits: DictOption[];
  allCategories: DictOption[];
}

function ItemRow({
  index, control, register, setValue, removeItem, isLast, isEven,
  sectors, allUnits, allCategories,
}: ItemRowProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectorId   = useWatch({ control, name: `items.${index}.sector_id` as any }) as number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unitId     = useWatch({ control, name: `items.${index}.organizational_unit_id` as any }) as number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryId = useWatch({ control, name: `items.${index}.expense_category_id` as any }) as number | null;

  const filteredUnits = useMemo(
    () => sectorId != null ? allUnits.filter((u) => u.sector_id === sectorId) : [],
    [allUnits, sectorId]
  );
  const filteredCategories = useMemo(
    () => unitId != null ? allCategories.filter((c) => c.organizational_unit_id === unitId) : [],
    [allCategories, unitId]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sv = setValue as (name: string, value: unknown) => void;

  function handleSectorSelect(opt: DictOption | null) {
    sv(`items.${index}.sector_id`, opt?.id ?? null);
    sv(`items.${index}.sektor`, opt?.name ?? "");
    sv(`items.${index}.organizational_unit_id`, null);
    sv(`items.${index}.jedinica`, "");
    sv(`items.${index}.expense_category_id`, null);
    sv(`items.${index}.kategorija`, "");
  }
  function handleUnitSelect(opt: DictOption | null) {
    sv(`items.${index}.organizational_unit_id`, opt?.id ?? null);
    sv(`items.${index}.jedinica`, opt?.name ?? "");
    sv(`items.${index}.expense_category_id`, null);
    sv(`items.${index}.kategorija`, "");
  }
  function handleCategorySelect(opt: DictOption | null) {
    sv(`items.${index}.expense_category_id`, opt?.id ?? null);
    sv(`items.${index}.kategorija`, opt?.name ?? "");
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "88px 76px 1fr 58px 82px 92px 30px",
        gap: 6,
        padding: "7px 10px",
        alignItems: "center",
        borderBottom: !isLast ? "1px solid var(--border-soft)" : "none",
        background: isEven ? "#fff" : "#fafafa",
      }}
    >
      <DictCombobox
        selectedId={sectorId}
        options={sectors}
        placeholder="Sektor"
        createEndpoint={`${SIFRARNICI_BASE}/sektori`}
        createPayload={(name) => ({ name })}
        queryKeyToInvalidate={["dict-sektori", TENANT]}
        onSelect={handleSectorSelect}
      />
      <DictCombobox
        selectedId={unitId}
        options={filteredUnits}
        placeholder="Jed."
        disabled={sectorId == null}
        createEndpoint={sectorId != null ? `${SIFRARNICI_BASE}/jedinice` : undefined}
        createPayload={(name) => ({ name, sector_id: sectorId })}
        queryKeyToInvalidate={["dict-jedinice", TENANT]}
        onSelect={handleUnitSelect}
      />
      <DictCombobox
        selectedId={categoryId}
        options={filteredCategories}
        placeholder="Kategorija / opis..."
        disabled={unitId == null}
        createEndpoint={unitId != null ? `${SIFRARNICI_BASE}/kategorije` : undefined}
        createPayload={(name) => ({ name, organizational_unit_id: unitId })}
        queryKeyToInvalidate={["dict-kategorije", TENANT]}
        onSelect={handleCategorySelect}
      />
      <input
        type="number" step="0.001" min="0" placeholder="1"
        {...register(`items.${index}.kolicina`)}
        style={{ ...compactInput, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      <Controller
        name={`items.${index}.mera`}
        control={control}
        render={({ field: f }) => (
          <select value={f.value} onChange={(e) => f.onChange(e.target.value)} style={{ ...compactInput, cursor: "pointer" }}>
            {MERA_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      />
      <input
        type="number" step="0.01" min="0" placeholder="0.00"
        {...register(`items.${index}.iznos`)}
        style={{ ...compactInput, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      <button
        type="button"
        onClick={() => removeItem(index)}
        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", color: "var(--red)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 15, flexShrink: 0 }}
      >×</button>
    </div>
  );
}

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
            <input type="text" placeholder="123456789" {...register("pib")} style={{ ...inputStyle, fontFamily: "var(--font-geist-mono), monospace" }} onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
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

// ─── Supplier edit modal ──────────────────────────────────────────────────────

function SupplierEditModal({
  supplier, onClose, onSuccess,
}: {
  supplier: SupplierWithBalance;
  onClose: () => void;
  onSuccess: (name: string, pib: string | null) => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<{ name: string; pib: string }>({ defaultValues: { name: supplier.name, pib: supplier.pib ?? "" } });

  const saveMut = useMutation({
    mutationFn: (data: { name: string; pib: string }) =>
      api.put<Supplier>(`${SUPPLIERS_BASE}/${supplier.id}`, { name: data.name, pib: data.pib || null }).then((r) => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["suppliers-with-balance", TENANT] });
      qc.invalidateQueries({ queryKey: ["supplier-stats", TENANT] });
      onSuccess(updated.name, updated.pib ?? null);
    },
  });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.28)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 18, padding: "28px 26px 22px", width: 380, zIndex: 301, boxShadow: "0 24px 64px rgba(16,24,40,.22)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>Izmijeni dobavljača</div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 18, color: "var(--muted)", display: "grid", placeItems: "center", fontFamily: "inherit" }}>×</button>
        </div>
        <form onSubmit={handleSubmit((d) => saveMut.mutate(d))} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Naziv firme</label>
            <input type="text" {...register("name", { required: "Naziv je obavezan" })} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            {errors.name && <p style={errStyle}>{errors.name.message}</p>}
          </div>
          <div>
            <label style={labelStyle}>PIB <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
            <input type="text" placeholder="123456789" {...register("pib")}
              style={{ ...inputStyle, fontFamily: "var(--font-geist-mono), monospace" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          </div>
          {saveMut.isError && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "var(--red)", fontSize: 13 }}>Greška. Pokušajte ponovo.</div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", color: "#374151", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Odustani</button>
            <button type="submit" disabled={isSubmitting || saveMut.isPending}
              style={{ padding: "8px 18px", border: "none", borderRadius: 8, background: isSubmitting || saveMut.isPending ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saveMut.isPending ? "Čuvanje..." : "Sačuvaj"}
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
              {s.pib && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1, fontFamily: "var(--font-geist-mono), monospace" }}>PIB: {s.pib}</div>}
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
  initialSupplier?: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}

function InvoiceSlideOver({ open, editing, initialSupplier, onClose, onSaved }: InvoiceSlideOverProps) {
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

  const { fields: itemFields, append: appendItem, remove: removeItem } =
    useFieldArray({ control, name: "items" });

  const { data: dictSectors    = [] } = useQuery<DictOption[]>({
    queryKey: ["dict-sektori", TENANT],
    queryFn: () => api.get(`${SIFRARNICI_BASE}/sektori`).then((r) => r.data as DictOption[]),
    enabled: open,
    staleTime: 60_000,
  });
  const { data: dictUnits      = [] } = useQuery<DictOption[]>({
    queryKey: ["dict-jedinice", TENANT],
    queryFn: () => api.get(`${SIFRARNICI_BASE}/jedinice`).then((r) => r.data as DictOption[]),
    enabled: open,
    staleTime: 60_000,
  });
  const { data: dictCategories = [] } = useQuery<DictOption[]>({
    queryKey: ["dict-kategorije", TENANT],
    queryFn: () => api.get(`${SIFRARNICI_BASE}/kategorije`).then((r) => r.data as DictOption[]),
    enabled: open,
    staleTime: 60_000,
  });

  const totalStr        = watch("total_amount");
  const amtStr          = watch("amount_without_vat");
  const vatStr          = watch("vat_amount");
  const vatRate         = watch("vat_rate");
  const watchedItems    = watch("items");

  // Recompute amounts from items + vat_rate in real time
  useEffect(() => {
    const base = watchedItems.reduce((s, item) => s + (parseFloat(item.iznos) || 0), 0);
    const vat  = base * (vatRate / 100);
    setValue("amount_without_vat", base.toFixed(2), { shouldDirty: false, shouldValidate: false });
    setValue("vat_amount",         vat.toFixed(2),  { shouldDirty: false, shouldValidate: false });
    setValue("total_amount",       (base + vat).toFixed(2), { shouldDirty: false, shouldValidate: false });
  }, [watchedItems, vatRate, setValue]);

  // Reset on open
  useEffect(() => {
    if (open) {
      reset(editing ? invoiceToForm(editing) : EMPTY_INVOICE_FORM);
      setSelectedSupplier(editing?.supplier ?? initialSupplier ?? null);
      setSupplierError(false);
      setQuickAddOpen(false);
      setSelectedFile(null);
      setFileError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => firstRef.current?.focus(), 80);
    }
  }, [open, editing, reset, initialSupplier]);

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
      fd.append("vat_rate", String(data.vat_rate));
      fd.append("vat_amount", data.vat_amount);
      fd.append("total_amount", data.total_amount);
      fd.append("is_cash", data.is_cash ? "1" : "0");

      data.items
        .filter(item => item.iznos !== "" && parseFloat(item.iznos) > 0)
        .forEach((item, i) => {
          if (item.sektor)    fd.append(`items[${i}][sektor]`, item.sektor);
          if (item.jedinica)  fd.append(`items[${i}][jedinica]`, item.jedinica);
          if (item.kategorija) fd.append(`items[${i}][kategorija]`, item.kategorija);
          if (item.sector_id != null)               fd.append(`items[${i}][sector_id]`, String(item.sector_id));
          if (item.organizational_unit_id != null)  fd.append(`items[${i}][organizational_unit_id]`, String(item.organizational_unit_id));
          if (item.expense_category_id != null)     fd.append(`items[${i}][expense_category_id]`, String(item.expense_category_id));
          fd.append(`items[${i}][kolicina]`, item.kolicina || "1");
          fd.append(`items[${i}][mera]`, item.mera);
          fd.append(`items[${i}][iznos]`, item.iznos);
        });

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

  if (!open) return null;

  const baseDisplay  = (parseFloat(amtStr) || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const vatDisplay   = (parseFloat(vatStr) || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalDisplay = (parseFloat(totalStr) || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div
        onClick={() => { if (!quickAddOpen) onClose(); }}
        style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 100, backdropFilter: "blur(2px)" }}
      />

      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 620, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(16,24,40,.14)", animation: "slideInRight .25s cubic-bezier(.32,.72,.27,1)" }}>
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
              style={{ ...inputStyle, fontFamily: "var(--font-geist-mono), monospace" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.invoice_number && <p style={errStyle}>{errors.invoice_number.message}</p>}
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Datum izdavanja</label>
              <Controller
                name="issue_date"
                control={control}
                rules={{ required: "Datum je obavezan" }}
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.issue_date && <p style={errStyle}>{errors.issue_date.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Rok plaćanja <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
              <Controller
                name="due_date"
                control={control}
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          {/* ─── STAVKE FAKTURE ──────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted)" }}>
                Stavke fakture
              </span>
              <button
                type="button"
                onClick={() => appendItem({ ...EMPTY_ITEM })}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--green)", background: "var(--green-soft)", border: "1px solid rgba(22,163,74,.3)", borderRadius: 7, padding: "4px 11px", cursor: "pointer", fontFamily: "inherit" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Dodaj stavku
              </button>
            </div>

            {/* Items table */}
            <div style={{ borderRadius: 11, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 590 }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "88px 76px 1fr 58px 82px 92px 30px",
                    gap: 6,
                    padding: "7px 10px",
                    background: "rgba(248,250,255,0.80)",
                    borderBottom: "1px solid var(--border-soft)",
                  }}>
                    {["SEKTOR", "JEDINICA", "KATEGORIJA", "KOL.", "MERA", "IZNOS (RSD)", ""].map((h, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted)", textAlign: i === 5 ? "right" : "left" }}>
                        {h}
                      </div>
                    ))}
                  </div>

                  {/* Empty state */}
                  {itemFields.length === 0 && (
                    <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: 13, background: "#fafafa" }}>
                      Nema stavki — kliknite &ldquo;Dodaj stavku&rdquo;
                    </div>
                  )}

                  {/* Item rows */}
                  {itemFields.map((field, index) => (
                    <ItemRow
                      key={field.id}
                      index={index}
                      control={control}
                      register={register}
                      setValue={setValue}
                      removeItem={removeItem}
                      isLast={index === itemFields.length - 1}
                      isEven={index % 2 === 0}
                      sectors={dictSectors}
                      allUnits={dictUnits}
                      allCategories={dictCategories}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── PDV stopa + kalkulacija ─────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", background: "#fafafa", borderRadius: 11, border: "1px solid var(--border-soft)" }}>
            {/* PDV rate capsule buttons */}
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Stopa PDV-a</div>
              <div style={{ display: "flex", gap: 6 }}>
                {([0, 10, 20] as const).map((rate) => {
                  const active = vatRate === rate;
                  return (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setValue("vat_rate", rate, { shouldDirty: true })}
                      style={{
                        padding: "6px 18px",
                        borderRadius: 20,
                        border: `1.5px solid ${active ? "var(--green)" : "var(--border)"}`,
                        background: active ? "var(--green)" : "#fff",
                        color: active ? "#fff" : "#374151",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all .12s",
                      }}
                    >{rate}%</button>
                  );
                })}
              </div>
            </div>

            {/* Computed amounts grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>Osnovica (bez PDV)</div>
                <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 15, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em" }}>
                  {baseDisplay} RSD
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>PDV ({vatRate}%)</div>
                <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 15, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em" }}>
                  {vatDisplay} RSD
                </div>
              </div>
            </div>
          </div>

          {/* Total display */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--green-soft)", borderRadius: 11, border: "1px solid rgba(22,163,74,.2)" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--green)", opacity: 0.85 }}>Ukupno sa PDV</span>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 19, fontWeight: 700, color: "var(--green)", letterSpacing: "-0.01em" }}>
              {totalDisplay} RSD
            </span>
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
                borderRadius: 10, padding: "18px 16px", textAlign: "center", cursor: "pointer",
                transition: "border-color .15s, background .15s",
                background: selectedFile ? "var(--green-soft)" : dropHighlight ? "#f0fdf4" : "#fafafa",
              }}
            >
              {selectedFile ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--green)", maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile.name}</span>
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

// ─── Supplier slide-over ─────────────────────────────────────────────────────

interface SupplierSlideOverProps {
  supplierName: string | null;
  invoices: IncomingInvoice[];
  onClose: () => void;
}

function SupplierSlideOver({ supplierName, invoices, onClose }: SupplierSlideOverProps) {
  if (!supplierName) return null;

  const supplierInvoices = invoices.filter((inv) => inv.supplier?.name === supplierName);

  const totalAmount = supplierInvoices.reduce((acc, inv) => acc + parseFloat(inv.total_amount), 0);

  const unpaidAmount = supplierInvoices.reduce((acc, inv) => {
    if (inv.status === "placeno") return acc;
    const paid = (inv.payments ?? []).reduce((s, p) => s + parseFloat(p.amount), 0);
    return acc + Math.max(0, parseFloat(inv.total_amount) - paid);
  }, 0);

  const invoiceCount = supplierInvoices.length;
  const unpaidCount = supplierInvoices.filter((inv) => inv.status !== "placeno").length;

  return (
    <>
      <style>{`@keyframes supplierSlideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 460,
          background: "#fff", zIndex: 91, display: "flex", flexDirection: "column",
          boxShadow: "-12px 0 48px rgba(16,24,40,.16)",
          animation: "supplierSlideIn .25s cubic-bezier(.32,.72,.27,1)",
        }}
      >
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--green)", marginBottom: 4 }}>Dobavljač</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111418", letterSpacing: "-0.01em", lineHeight: 1.25 }}>{supplierName}</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 20, flexShrink: 0, marginTop: 2 }}
          >×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "16px", borderRadius: 14, border: "1px solid rgba(22,163,74,.18)", background: "var(--green-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--green)", opacity: 0.8, marginBottom: 6 }}>Ukupan iznos</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                {totalAmount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
              </div>
              <div style={{ fontSize: 12, color: "var(--green)", opacity: 0.7, marginTop: 4 }}>
                {invoiceCount} {invoiceCount === 1 ? "faktura" : invoiceCount < 5 ? "fakture" : "faktura"}
              </div>
            </div>

            <div style={{ padding: "16px", borderRadius: 14, border: `1px solid ${unpaidAmount > 0 ? "#fecaca" : "rgba(22,163,74,.18)"}`, background: unpaidAmount > 0 ? "#fef2f2" : "var(--green-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: unpaidAmount > 0 ? "var(--red)" : "var(--green)", opacity: 0.8, marginBottom: 6 }}>Za plaćanje</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: unpaidAmount > 0 ? "var(--red)" : "var(--green)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                {unpaidAmount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
              </div>
              <div style={{ fontSize: 12, color: unpaidAmount > 0 ? "var(--red)" : "var(--green)", opacity: 0.7, marginTop: 4 }}>
                {unpaidCount === 0 ? "Sve izmireno" : `${unpaidCount} neplaćenih`}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Istorija faktura</div>
            {supplierInvoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}>Nema faktura za ovog dobavljača</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {supplierInvoices.map((inv) => (
                  <div
                    key={inv.id}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UlazneFakturePage() {
  const qc = useQueryClient();

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardEditInvoice, setWizardEditInvoice] = useState<IncomingInvoice | null>(null);
  const [wizardPreselectedSupplier, setWizardPreselectedSupplier] = useState<SupplierWithBalance | null>(null);

  // Invoice slide-over
  const [invoiceSlide,           setInvoiceSlide]           = useState(false);
  const [editingInvoice,         setEditingInvoice]         = useState<IncomingInvoice | null>(null);
  const [invoiceInitialSupplier, setInvoiceInitialSupplier] = useState<Supplier | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [backHover, setBackHover] = useState(false);

  // Master-detail
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithBalance | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"dobavljaci" | "sektor">("dobavljaci");
  const [viewFilter, setViewFilter] = useState<"all" | "invoice" | "receipt">("all");

  // Sector drill-down
  const [selectedSector, setSelectedSector]   = useState<SectorAnalytics | null>(null);
  const [selectedUnit, setSelectedUnit]       = useState<UnitAnalytics | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryAnalytics | null>(null);
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<number | "all">("all");
  const [sectorSearch, setSectorSearch]       = useState("");

  // Right panel — supplier actions
  const [editingSupplier, setEditingSupplier]   = useState<SupplierWithBalance | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierWithBalance | null>(null);

  // Period filter
  const [periodMode, setPeriodMode] = useState<"ytd" | "custom">("ytd");
  const [dateFrom, setDateFrom]     = useState(YEAR_START);
  const [dateTo, setDateTo]         = useState(TODAY);
  const [globalDatePreset, setGlobalDatePreset] = useState<"ovaj_mesec" | "prosli_mesec" | "ova_godina" | "sve">("ova_godina");

  const { data: suppliersWithBalance = [], isLoading: sidebarLoading } = useQuery<SupplierWithBalance[]>({
    queryKey: ["suppliers-with-balance", TENANT, viewFilter],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/dobavljaci/sa-saldom`, { signal, params: { document_type: viewFilter } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const statsId = selectedSupplier?.id ?? "all";
  const { data: stats, isLoading: statsLoading } = useQuery<SupplierStats>({
    queryKey: ["supplier-stats", TENANT, statsId, dateFrom, dateTo, viewFilter],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/dobavljaci/${statsId}/statistika`, {
        signal, params: { date_from: dateFrom, date_to: dateTo, document_type: viewFilter },
      }).then((r) => r.data),
    staleTime: 30_000,
  });

  const [contentTab, setContentTab] = useState<"fakture" | "uplate">("fakture");

  const { data: invoiceRows = [], isLoading: invoicesLoading } = useQuery<InvoiceTableRow[]>({
    queryKey: ["supplier-invoices", TENANT, statsId, dateFrom, dateTo, viewFilter],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/dobavljaci/${statsId}/fakture`, {
        signal, params: { date_from: dateFrom, date_to: dateTo, document_type: viewFilter },
      }).then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: paymentRows = [], isLoading: paymentsLoading } = useQuery<PaymentTableRow[]>({
    queryKey: ["supplier-payments", TENANT, statsId, dateFrom, dateTo, viewFilter],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/dobavljaci/${statsId}/uplate`, {
        signal, params: { date_from: dateFrom, date_to: dateTo, document_type: viewFilter },
      }).then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: sektoriData = [], isLoading: sektoriLoading } = useQuery<SectorAnalytics[]>({
    queryKey: ["sektori-analitika", TENANT, dateFrom, dateTo, viewFilter],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/sektori-analitika`, {
        signal, params: { date_from: dateFrom, date_to: dateTo, document_type: viewFilter },
      }).then((r) => r.data),
    enabled: activeTab === "sektor",
    staleTime: 30_000,
  });

  const { data: jediniceData = [], isLoading: jediniceLoading } = useQuery<UnitAnalytics[]>({
    queryKey: ["jedinice-analitika", TENANT, selectedSector?.id, dateFrom, dateTo, viewFilter],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/sektori/${selectedSector!.id}/jedinice`, {
        signal, params: { date_from: dateFrom, date_to: dateTo, document_type: viewFilter },
      }).then((r) => r.data),
    enabled: activeTab === "sektor" && selectedSector !== null,
    staleTime: 30_000,
  });

  const { data: unitKategorije, isLoading: unitKatLoading } = useQuery<UnitKategorijePodaci>({
    queryKey: ["unit-kategorije", TENANT, selectedUnit?.id, dateFrom, dateTo, viewFilter],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/jedinice/${selectedUnit!.id}/kategorije-analitika`, {
        signal, params: { date_from: dateFrom, date_to: dateTo, document_type: viewFilter },
      }).then((r) => r.data),
    enabled: activeTab === "sektor" && selectedUnit !== null,
    staleTime: 30_000,
  });

  const { data: catDetalji, isLoading: catDetLoading } = useQuery<CategoryDetalji>({
    queryKey: ["category-detalji", TENANT, selectedUnit?.id, selectedCategory?.id, dateFrom, dateTo, viewFilter],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/jedinice/${selectedUnit!.id}/kategorije/${selectedCategory!.id}/detalji`, {
        signal, params: { date_from: dateFrom, date_to: dateTo, document_type: viewFilter },
      }).then((r) => r.data),
    enabled: activeTab === "sektor" && selectedUnit !== null && selectedCategory !== null,
    staleTime: 30_000,
  });

  const { items: sortedInvoices, requestSort: reqSortInvoice, sortConfig: sortCfgInvoice } = useSortableData<InvoiceTableRow>(invoiceRows);
  const { items: sortedPayments, requestSort: reqSortPayment, sortConfig: sortCfgPayment } = useSortableData<PaymentTableRow>(paymentRows);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const unpaidInvoices = useMemo(
    () => invoiceRows
      .filter((r) => r.status !== "placeno")
      .map((r) => ({ id: r.id, invoice_number: r.invoice_number, remaining_amount: r.remaining_amount, total_amount: r.total_amount })),
    [invoiceRows],
  );
  const nextPaymentNumber = (selectedSupplier?.total_payments_count ?? paymentRows.length) + 1;

  const deleteSupplierMut = useMutation({
    mutationFn: (id: number) => api.delete(`${SUPPLIERS_BASE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers-with-balance", TENANT] });
      setSelectedSupplier(null);
      setDeletingSupplier(null);
      setToast("Dobavljač obrisan.");
    },
  });

  const filteredSuppliers = useMemo(() => {
    if (!sidebarSearch.trim()) return suppliersWithBalance;
    const q = sidebarSearch.trim().toLowerCase();
    return suppliersWithBalance.filter((s) => s.name.toLowerCase().includes(q));
  }, [suppliersWithBalance, sidebarSearch]);

  const filteredSektori = useMemo(() => {
    if (!sectorSearch.trim()) return sektoriData;
    const q = sectorSearch.trim().toLowerCase();
    return sektoriData.filter((s) => s.name.toLowerCase().includes(q));
  }, [sektoriData, sectorSearch]);

  const filteredCatItems = useMemo(() => {
    if (!catDetalji) return [];
    if (selectedSupplierFilter === "all") return catDetalji.items;
    return catDetalji.items.filter((i) => i.supplier_id === selectedSupplierFilter);
  }, [catDetalji, selectedSupplierFilter]);

  function openAdd() { setEditingInvoice(null); setInvoiceSlide(true); }

  function applyGlobalPreset(preset: "ovaj_mesec" | "prosli_mesec" | "ova_godina" | "sve") {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = now.getMonth();
    const fmt = (yr: number, mo: number, d: number) =>
      `${yr}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (preset === "ovaj_mesec") {
      setDateFrom(fmt(y, m + 1, 1));
      setDateTo(fmt(y, m + 1, new Date(y, m + 1, 0).getDate()));
    } else if (preset === "prosli_mesec") {
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      setDateFrom(fmt(py, pm + 1, 1));
      setDateTo(fmt(py, pm + 1, new Date(py, pm + 1, 0).getDate()));
    } else if (preset === "ova_godina") {
      setDateFrom(`${y}-01-01`);
      setDateTo(now.toISOString().split("T")[0]);
    } else {
      setDateFrom("");
      setDateTo("");
    }
    setGlobalDatePreset(preset);
  }

  async function handleEditInvoice(row: InvoiceTableRow) {
    try {
      const full = await api.get<IncomingInvoice>(`${INVOICES_BASE}/${row.id}`).then((r) => r.data);
      setWizardEditInvoice(full);
      setWizardOpen(true);
    } catch { /* ignore */ }
  }

  return (
    <PageShell navId="fin">

      {/* ── Page header ──────────────────────────────────────────── */}
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
            <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>Ulazne fakture</h1>
            <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>Evidencija primljenih faktura i troškova od dobavljača.</p>
          </div>
          <button
            onClick={() => { setWizardPreselectedSupplier(null); setWizardOpen(true); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--green)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 6, whiteSpace: "nowrap", transition: "opacity .12s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Unos
          </button>
        </div>
      </div>

      {/* ── Prikaz filter ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-8 py-3 border-b border-gray-100 bg-white">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest shrink-0">Prikaz:</span>
        {([
          { value: "all" as const, label: "Sve", icon: null },
          { value: "invoice" as const, label: "Fakture", icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          )},
          { value: "receipt" as const, label: "Gotovinski računi", icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
          )},
        ]).map(({ value, label, icon }) => {
          const active = viewFilter === value;
          return (
            <button
              key={value}
              onClick={() => setViewFilter(value)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                active
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Master-detail split ───────────────────────────────────── */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 260px)" }}>

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <div style={{
          width: activeTab === "sektor" ? (selectedSector ? 430 : 215) : 280,
          flexShrink: 0, borderRight: "1px solid var(--border-soft)",
          display: "flex", flexDirection: "column", background: "#fff",
          transition: "width .2s ease", overflow: "hidden",
        }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-soft)", background: "#fafafa", flexShrink: 0 }}>
            {(["dobavljaci", "sektor"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "10px 0",
                  fontSize: 12.5, fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? "var(--green)" : "var(--muted)",
                  background: "transparent", border: "none",
                  borderBottom: `2px solid ${activeTab === tab ? "var(--green)" : "transparent"}`,
                  cursor: "pointer", fontFamily: "inherit", transition: "color .15s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab === "dobavljaci" ? "Dobavljači" : "Sektor"}
              </button>
            ))}
          </div>

          {/* ── Dobavljači tab ── */}
          {activeTab === "dobavljaci" && (
            <>
              {/* Search */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-soft)", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Pretraži dobavljače..."
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px 7px 28px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12.5, color: "#111418", background: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const, transition: "border-color .15s" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              </div>

              {/* List */}
              <div style={{ overflowY: "auto" }}>
                {/* "Svi dobavljači" item */}
                <div
                  onClick={() => setSelectedSupplier(null)}
                  style={{
                    padding: "12px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border-soft)",
                    background: selectedSupplier === null ? "#f9fafb" : "#fff",
                    borderLeft: `3px solid ${selectedSupplier === null ? "#f59e0b" : "transparent"}`,
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "background .1s",
                  }}
                  onMouseEnter={(e) => { if (selectedSupplier !== null) (e.currentTarget as HTMLDivElement).style.background = "#fafafa"; }}
                  onMouseLeave={(e) => { if (selectedSupplier !== null) (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111418" }}>Svi dobavljači</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                      {sidebarLoading ? "—" : `${suppliersWithBalance.length} dobavljača`}
                    </div>
                  </div>
                </div>

                {/* Supplier rows */}
                {sidebarLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-soft)", borderLeft: "3px solid transparent" }}>
                      <div style={{ height: 13, width: "65%", background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
                      <div style={{ height: 11, width: "40%", background: "#f3f4f6", borderRadius: 5 }} />
                    </div>
                  ))
            ) : (
              filteredSuppliers.map((supplier) => {
                const isActive = selectedSupplier?.id === supplier.id;
                return (
                  <div
                    key={supplier.id}
                    onClick={() => setSelectedSupplier(supplier)}
                    style={{
                      padding: "12px 14px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border-soft)",
                      background: isActive ? "#f9fafb" : "#fff",
                      borderLeft: `3px solid ${isActive ? "#f59e0b" : "transparent"}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      gap: 8, transition: "background .1s",
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#fafafa"; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111418", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {supplier.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                        {supplier.total_invoices_count} fakt. · {supplier.total_payments_count} upl.
                      </div>
                    </div>
                    {supplier.total_debt > 0.005 && (
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#dc2626", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {supplier.total_debt.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                );
              })
            )}

                {!sidebarLoading && filteredSuppliers.length === 0 && sidebarSearch.trim() !== "" && (
                  <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                    Nema rezultata za &ldquo;{sidebarSearch}&rdquo;
                  </div>
                )}

                {!sidebarLoading && suppliersWithBalance.length === 0 && (
                  <div style={{ padding: "32px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>Još nema faktura</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted-2)" }}>Dodajte prvu fakturu klikom na &ldquo;Nova faktura&rdquo;</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Sektor tab ── */}
          {activeTab === "sektor" && (
            <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
              {/* Sector column */}
              <div style={{ width: 215, flexShrink: 0, borderRight: selectedSector ? "1px solid var(--border-soft)" : "none", display: "flex", flexDirection: "column", overflowY: "auto" }}>
                <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-soft)", flexShrink: 0 }}>
                  <div style={{ position: "relative" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Pretraži sektore..."
                      value={sectorSearch}
                      onChange={(e) => setSectorSearch(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px 7px 28px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12.5, color: "#111418", background: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const, transition: "border-color .15s" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                  </div>
                </div>
                {sektoriLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ padding: "11px 14px", borderBottom: "1px solid var(--border-soft)", borderLeft: "3px solid transparent" }}>
                      <div style={{ height: 12, width: "70%", background: "#f3f4f6", borderRadius: 5, marginBottom: 5 }} />
                      <div style={{ height: 10, width: "40%", background: "#f3f4f6", borderRadius: 4 }} />
                    </div>
                  ))
                ) : filteredSektori.length === 0 ? (
                  <div style={{ padding: "24px 14px", textAlign: "center" as const, color: "var(--muted)", fontSize: 12.5 }}>
                    {sectorSearch.trim() ? `Nema rezultata za "${sectorSearch}"` : "Nema sektora"}
                  </div>
                ) : (
                  filteredSektori.map((sector) => {
                    const isActive = selectedSector?.id === sector.id;
                    return (
                      <div
                        key={sector.id}
                        onClick={() => { setSelectedSector(sector); setSelectedUnit(null); setSelectedCategory(null); }}
                        style={{
                          padding: "11px 12px 11px 14px", borderBottom: "1px solid var(--border-soft)",
                          background: isActive ? "#f9fafb" : "#fff",
                          borderLeft: `3px solid ${isActive ? "var(--green)" : "transparent"}`,
                          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, transition: "background .1s",
                        }}
                        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#fafafa"; }}
                        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}
                      >
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111418", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {sector.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: sector.total_iznos > 0 ? "#6b7280" : "#d1d5db", whiteSpace: "nowrap" }}>
                            {sector.total_iznos > 0 ? sector.total_iznos.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                          </span>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Units column */}
              {selectedSector && (
                <div style={{ width: 215, flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
                  <div style={{ padding: "8px 12px 8px 14px", borderBottom: "1px solid var(--border-soft)", background: "#fafafa", flexShrink: 0 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 2 }}>
                      SEKTOR
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111418", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedSector.name}
                    </div>
                  </div>
                  {jediniceLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ padding: "11px 14px", borderBottom: "1px solid var(--border-soft)" }}>
                        <div style={{ height: 12, width: "70%", background: "#f3f4f6", borderRadius: 5, marginBottom: 5 }} />
                        <div style={{ height: 10, width: "40%", background: "#f3f4f6", borderRadius: 4 }} />
                      </div>
                    ))
                  ) : jediniceData.length === 0 ? (
                    <div style={{ padding: "24px 12px", textAlign: "center" as const, color: "var(--muted)", fontSize: 12 }}>
                      Nema jedinica za ovaj sektor
                    </div>
                  ) : (
                    jediniceData.map((unit) => {
                      const isActive = selectedUnit?.id === unit.id;
                      return (
                        <div
                          key={unit.id}
                          onClick={() => { setSelectedUnit(isActive ? null : unit); setSelectedCategory(null); }}
                          style={{
                            padding: "11px 12px 11px 14px", borderBottom: "1px solid var(--border-soft)",
                            background: isActive ? "#f0fdf4" : "#fff",
                            borderLeft: `3px solid ${isActive ? "var(--green)" : "transparent"}`,
                            cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, transition: "background .1s",
                          }}
                          onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#fafafa"; }}
                          onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}
                        >
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111418", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {unit.name}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: unit.total_iznos > 0 ? "#6b7280" : "#d1d5db", whiteSpace: "nowrap" }}>
                              {unit.total_iznos > 0 ? unit.total_iznos.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                            </span>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Main content ──────────────────────────────────────────── */}
        <div style={{ flex: 1, background: "#f8fafc", minWidth: 0, overflowY: "auto" }}>

          {/* ── Sektor panel ── */}
          {activeTab === "sektor" && (
            <div style={{ padding: "28px 32px 80px" }}>
              {!selectedSector ? (
                /* ── Empty: no sector selected ── */
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 200px)" }}>
                  <div style={{ textAlign: "center" as const }}>
                    <div style={{ width: 60, height: 60, borderRadius: 16, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Izaberite sektor</div>
                    <div style={{ fontSize: 14, color: "#94a3b8" }}>Kliknite na sektor sa lijeve strane da vidite troškove.</div>
                  </div>
                </div>
              ) : selectedUnit && selectedCategory ? (
                /* ── Category detail ── */
                <>
                  {/* Breadcrumb + header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: "#9ca3af", marginBottom: 8, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" as const }}>
                        <span>{selectedSector.name}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        <span>{selectedUnit.name}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        <span style={{ color: "#374151", fontWeight: 600 }}>{selectedCategory.name}</span>
                      </div>
                      <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
                        {selectedCategory.name}
                      </h2>
                      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 5 }}>
                        {catDetalji ? (
                          <>
                            {catDetalji.kpis.invoice_count} {catDetalji.kpis.invoice_count === 1 ? "faktura" : catDetalji.kpis.invoice_count < 5 ? "fakture" : "faktura"}{" · ukupno "}
                            <span style={{ fontWeight: 600, color: "#6b7280" }}>
                              {catDetalji.kpis.total_amount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
                            </span>
                            {catDetalji.kpis.quantity_string ? (
                              <> · <span style={{ fontWeight: 600, color: "#16a34a" }}>{catDetalji.kpis.quantity_string}</span></>
                            ) : null}
                          </>
                        ) : "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      style={{ flexShrink: 0, marginTop: 4, padding: "7px 14px", fontSize: 13, fontWeight: 500, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", transition: "background .15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                      Nazad
                    </button>
                  </div>

                  {/* 4 KPI cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 22, marginBottom: 24 }}>
                    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.05)", padding: "16px 18px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>FAKTURA</div>
                      {catDetLoading ? <div style={{ height: 30, width: "40%", background: "#f3f4f6", borderRadius: 6 }} /> : (
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                          {catDetalji?.kpis.invoice_count ?? 0}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#d1d5db", marginTop: 6 }}>broj</div>
                    </div>
                    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.05)", padding: "16px 18px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>KOLIČINA</div>
                      {catDetLoading ? <div style={{ height: 30, width: "70%", background: "#f3f4f6", borderRadius: 6 }} /> : (
                        <div style={{ fontSize: 17, fontWeight: 800, color: "#16a34a", letterSpacing: "-0.01em", fontFamily: "var(--font-geist-mono), monospace", lineHeight: 1.35 }}>
                          {catDetalji?.kpis.quantity_string || "—"}
                        </div>
                      )}
                    </div>
                    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.05)", padding: "16px 18px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>IZNOS</div>
                      {catDetLoading ? <div style={{ height: 30, width: "70%", background: "#f3f4f6", borderRadius: 6 }} /> : (
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                          {(catDetalji?.kpis.total_amount ?? 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>RSD</div>
                    </div>
                    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.05)", padding: "16px 18px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>PDV</div>
                      {catDetLoading ? <div style={{ height: 30, width: "60%", background: "#f3f4f6", borderRadius: 6 }} /> : (
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                          {(catDetalji?.kpis.total_vat ?? 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>RSD</div>
                    </div>
                  </div>

                  {/* Supplier filter */}
                  {catDetalji && catDetalji.suppliers_filter.length > 1 && (
                    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#b0b7c3", marginBottom: 10 }}>
                        Filter po dobavljaču
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                        {catDetalji.suppliers_filter.map((s) => {
                          const isActive = selectedSupplierFilter === s.id;
                          return (
                            <button
                              key={String(s.id)}
                              onClick={() => setSelectedSupplierFilter(s.id)}
                              style={{
                                padding: "6px 12px", fontSize: 13, fontWeight: isActive ? 600 : 400,
                                border: `1px solid ${isActive ? "#10b981" : "#e5e7eb"}`,
                                borderRadius: 8, background: "#fff",
                                color: isActive ? "#065f46" : "#6b7280",
                                cursor: "pointer", fontFamily: "inherit",
                                boxShadow: isActive ? "0 1px 4px rgba(16,185,129,.15)" : "none",
                                transition: "all .15s",
                              }}
                            >
                              {s.name} ({s.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Items table */}
                  <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["DATUM", "RB", "DOBAVLJAČ", "KOLIČINA", "IZNOS", "PDV", "UKUPNO", "NAPOMENA"].map((col) => (
                            <th key={col} style={{ padding: "10px 14px", textAlign: "left" as const, fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#9ca3af", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" as const }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {catDetLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i}>
                              {Array.from({ length: 8 }).map((__, j) => (
                                <td key={j} style={{ padding: "13px 14px", borderBottom: "1px solid #f9fafb" }}>
                                  <div style={{ height: 12, background: "#f3f4f6", borderRadius: 4, width: j === 2 ? "70%" : "55%" }} />
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : filteredCatItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ padding: "32px", textAlign: "center" as const, color: "#9ca3af", fontSize: 14 }}>
                              Nema stavki za izabrani filter.
                            </td>
                          </tr>
                        ) : (
                          filteredCatItems.map((item, idx) => (
                            <tr
                              key={item.id}
                              style={{ background: "#fff" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fff"; }}
                            >
                              <td style={{ padding: "11px 14px", fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" as const, borderBottom: "1px solid #f9fafb", fontFamily: "var(--font-geist-mono), monospace" }}>
                                {formatDate(item.issue_date)}
                              </td>
                              <td style={{ padding: "11px 14px", fontSize: 13, color: "#b0b7c3", borderBottom: "1px solid #f9fafb", fontFamily: "var(--font-geist-mono), monospace" }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#111418", borderBottom: "1px solid #f9fafb" }}>
                                {item.supplier_name}
                              </td>
                              <td style={{ padding: "11px 14px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" as const, borderBottom: "1px solid #f9fafb", fontFamily: "var(--font-geist-mono), monospace" }}>
                                {item.kolicina.toLocaleString("sr-Latn", { maximumFractionDigits: 3 })} {item.mera}
                              </td>
                              <td style={{ padding: "11px 14px", fontSize: 13, color: "#374151", borderBottom: "1px solid #f9fafb", fontFamily: "var(--font-geist-mono), monospace", textAlign: "right" as const }}>
                                {item.iznos.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: "11px 14px", fontSize: 13, color: "#2563eb", borderBottom: "1px solid #f9fafb", fontFamily: "var(--font-geist-mono), monospace", textAlign: "right" as const }}>
                                {item.vat_amount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#111418", borderBottom: "1px solid #f9fafb", fontFamily: "var(--font-geist-mono), monospace", textAlign: "right" as const, background: "#f8fafc" }}>
                                {item.total_with_vat.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: "11px 14px", fontSize: 12, color: "#9ca3af", borderBottom: "1px solid #f9fafb", maxWidth: 130, overflow: "hidden" as const, textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                                {item.napomena || "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : selectedUnit ? (
                /* ── Unit dashboard ── */
                <>
                  {/* Breadcrumb + header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: "#9ca3af", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>{selectedSector.name}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        <span style={{ color: "#6b7280", fontWeight: 600 }}>{selectedUnit.name}</span>
                      </div>
                      <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
                        {selectedUnit.name}
                      </h2>
                      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 5 }}>
                        Jedinica · {unitKategorije?.categories.length ?? "—"} kategorija · klikni za fakture
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedUnit(null); setSelectedCategory(null); }}
                      style={{ flexShrink: 0, marginTop: 4, padding: "7px 14px", fontSize: 13, fontWeight: 500, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", transition: "background .15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                      Sektor
                    </button>
                  </div>

                  {/* KPI cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 22, marginBottom: 28 }}>
                    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.06)", padding: "18px 20px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>UKUPNO STAVKI</div>
                      {unitKatLoading ? (
                        <div style={{ height: 32, width: "50%", background: "#f3f4f6", borderRadius: 6 }} />
                      ) : (
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                          {unitKategorije?.unit_kpis.total_items ?? 0}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#d1d5db", marginTop: 6 }}>broj</div>
                    </div>
                    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.06)", padding: "18px 20px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>IZNOS</div>
                      {unitKatLoading ? (
                        <div style={{ height: 32, width: "70%", background: "#f3f4f6", borderRadius: 6 }} />
                      ) : (
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                          {(unitKategorije?.unit_kpis.total_amount ?? 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>RSD</div>
                    </div>
                    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.06)", padding: "18px 20px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>PDV</div>
                      {unitKatLoading ? (
                        <div style={{ height: 32, width: "60%", background: "#f3f4f6", borderRadius: 6 }} />
                      ) : (
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                          {(unitKategorije?.unit_kpis.total_tax ?? 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>RSD</div>
                    </div>
                  </div>

                  {/* Categories section */}
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#b0b7c3", borderBottom: "1px solid #f1f5f9", paddingBottom: 10, marginBottom: 16 }}>
                    Kategorije · klikni za fakture
                  </div>

                  {unitKatLoading ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "18px 20px" }}>
                          <div style={{ height: 14, width: "60%", background: "#f3f4f6", borderRadius: 5, marginBottom: 12 }} />
                          <div style={{ height: 22, width: "80%", background: "#f3f4f6", borderRadius: 5, marginBottom: 10 }} />
                          <div style={{ height: 10, width: "40%", background: "#f3f4f6", borderRadius: 4 }} />
                        </div>
                      ))}
                    </div>
                  ) : !unitKategorije || unitKategorije.categories.length === 0 ? (
                    <div style={{ border: "2px dashed #e5e7eb", borderRadius: 12, padding: "40px 32px", textAlign: "center" as const, color: "#9ca3af" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Nema kategorija</div>
                      <div style={{ fontSize: 13 }}>Dodaj kategorije troškova za ovu organizacionu jedinicu.</div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                      {unitKategorije.categories.map((cat) => (
                        <div
                          key={cat.id}
                          onClick={() => { setSelectedCategory(cat); setSelectedSupplierFilter("all"); }}
                          style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "18px 20px", cursor: "pointer", transition: "border-color .15s, box-shadow .15s" }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.borderColor = "#10b981";
                            el.style.boxShadow = "0 4px 14px rgba(16,185,129,.13)";
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.borderColor = "#e5e7eb";
                            el.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#111418", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{cat.name}</div>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace", marginBottom: 12 }}>
                            {cat.amount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", marginLeft: 4, fontFamily: "inherit" }}>RSD</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>
                              {cat.items_count} {cat.items_count === 1 ? "stavka" : cat.items_count < 5 ? "stavke" : "stavki"}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", fontFamily: "var(--font-geist-mono), monospace" }}>
                              {cat.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* ── Sector selected, no unit ── */
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 6 }}>
                    {selectedSector.name}
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
                    {selectedSector.name}
                  </h2>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 5, marginBottom: 22 }}>
                    Sektor · {selectedSector.total_units} {selectedSector.total_units === 1 ? "jedinica" : selectedSector.total_units < 5 ? "jedinice" : "jedinica"} · {selectedSector.total_items} stavki
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                    <div style={{ background: "#fff", borderRadius: 14, borderTop: "2px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: "18px 20px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>JEDINICA</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#9ca3af", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>{selectedSector.total_units}</div>
                      <div style={{ fontSize: 12, color: "#d1d5db", marginTop: 6 }}>broj</div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 14, borderTop: "2px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: "18px 20px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>IZNOS</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                        {selectedSector.total_iznos.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>RSD</div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 14, borderTop: "2px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: "18px 20px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>PDV</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#93c5fd", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                        {selectedSector.total_vat.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>RSD</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 20, border: "2px dashed #d1d5db", borderRadius: 16, background: "#f8fafc", padding: "60px 40px", textAlign: "center" as const }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Izaberi jedinicu sa leve strane</div>
                    <div style={{ fontSize: 13.5, color: "#9ca3af", lineHeight: 1.7 }}>
                      Klikni jedinicu (npr. Ruža vetrova) u stablu sektora da otvoriš njene kategorije i fakture.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Dobavljači panel ── */}
          <div style={{ padding: "28px 32px 80px", display: activeTab === "dobavljaci" ? undefined : "none" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 6 }}>
                {selectedSupplier ? "Dobavljač" : "Pregled"}
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
                {selectedSupplier ? selectedSupplier.name : "Svi dobavljači"}
              </h2>
              {selectedSupplier?.pib && (
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 5, fontFamily: "var(--font-geist-mono), monospace" }}>
                  PIB: {selectedSupplier.pib}
                </div>
              )}
            </div>
            {selectedSupplier && (
              <div style={{ display: "flex", gap: 8, flexShrink: 0, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setEditingSupplier(selectedSupplier)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s, background .15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#9ca3af"; (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
                >
                  Izmeni
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSupplier(selectedSupplier)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "color .15s, border-color .15s, background .15s" }}
                  onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "var(--red)"; b.style.borderColor = "#fecaca"; b.style.background = "#fef2f2"; }}
                  onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#374151"; b.style.borderColor = "#e5e7eb"; b.style.background = "#f9fafb"; }}
                >
                  Obriši
                </button>
              </div>
            )}
          </div>

          {/* Period filter: global layout for "Svi dobavljači", compact for concrete supplier */}
          {selectedSupplier === null ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between shadow-sm" style={{ marginTop: 22, marginBottom: 8 }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">OD</span>
                <div style={{ width: 148 }}>
                  <DatePicker value={dateFrom} onChange={setDateFrom} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">DO</span>
                <div style={{ width: 148 }}>
                  <DatePicker value={dateTo} onChange={setDateTo} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {([
                  { key: "ovaj_mesec"  as const, label: "Ovaj mesec"   },
                  { key: "prosli_mesec" as const, label: "Prošli mesec" },
                  { key: "ova_godina"  as const, label: "Ova godina"   },
                  { key: "sve"         as const, label: "Sve"          },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyGlobalPreset(key)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                      globalDatePreset === key
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: "#f1f5f9", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginTop: 22, flexWrap: "wrap" as const }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "#94a3b8", flexShrink: 0 }}>
                PERIOD
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPeriodMode("ytd"); setDateFrom(YEAR_START); setDateTo(TODAY); }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 focus:outline-none ${
                    periodMode === "ytd"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Od početka godine
                </button>
                <button
                  onClick={() => setPeriodMode("custom")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 focus:outline-none ${
                    periodMode === "custom"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Prilagođeno
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
                <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>OD</span>
                <div style={{ width: 148, opacity: periodMode === "ytd" ? 0.55 : 1, pointerEvents: periodMode === "ytd" ? "none" : "auto" }}>
                  <DatePicker value={dateFrom} onChange={setDateFrom} />
                </div>
                <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>DO</span>
                <div style={{ width: 148, opacity: periodMode === "ytd" ? 0.55 : 1, pointerEvents: periodMode === "ytd" ? "none" : "auto" }}>
                  <DatePicker value={dateTo} onChange={setDateTo} />
                </div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" as const }}>
                {formatDate(dateFrom)} – {formatDate(dateTo)}
              </div>
            </div>
          )}

          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 20 }}>

            {/* Fakture - period */}
            <div style={{ background: "#fff", borderRadius: 14, borderTop: "2px solid #b45309", boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: "18px 20px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>
                FAKTURE (PERIOD)
              </div>
              {statsLoading ? (
                <div style={{ height: 28, width: "60%", background: "#f3f4f6", borderRadius: 6 }} />
              ) : (
                <div style={{ fontSize: 24, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                  {(stats?.invoiced_period.amount ?? 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
                {statsLoading ? "—" : `${stats?.invoiced_period.count ?? 0} fakt.`}
              </div>
            </div>

            {/* Plaćeno - period */}
            <div style={{ background: "#fff", borderRadius: 14, borderTop: "2px solid #059669", boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: "18px 20px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>
                PLAĆENO (PERIOD)
              </div>
              {statsLoading ? (
                <div style={{ height: 28, width: "60%", background: "#f3f4f6", borderRadius: 6 }} />
              ) : (
                <div style={{ fontSize: 24, fontWeight: 800, color: "#059669", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                  {(stats?.paid_period.amount ?? 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
                {statsLoading ? "—" : `${stats?.paid_period.count ?? 0} upl.`}
              </div>
            </div>

            {/* Saldo - ukupan */}
            <div style={{ background: "#fff", borderRadius: 14, borderTop: "2px solid #b91c1c", boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: "18px 20px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 10 }}>
                SALDO (UKUPAN)
              </div>
              {statsLoading ? (
                <div style={{ height: 28, width: "60%", background: "#f3f4f6", borderRadius: 6 }} />
              ) : (
                <div style={{ fontSize: 24, fontWeight: 800, color: "#b91c1c", letterSpacing: "-0.02em", fontFamily: "var(--font-geist-mono), monospace" }}>
                  {(stats?.total_balance ?? 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
                {statsLoading ? "—" : "duguješ"}
              </div>
            </div>

          </div>

          {/* ── Tab bar ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 28, borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", gap: 28 }}>
              {([
                { key: "fakture" as const, label: "Fakture", count: invoiceRows.length },
                { key: "uplate"  as const, label: "Uplate",  count: paymentRows.length },
              ]).map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setContentTab(key)}
                  style={{
                    background: "none", border: "none",
                    borderBottom: `2px solid ${contentTab === key ? "#d97706" : "transparent"}`,
                    paddingBottom: 10, paddingTop: 2,
                    fontSize: 14,
                    fontWeight: contentTab === key ? 700 : 500,
                    color: contentTab === key ? "#111418" : "#9ca3af",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "color .12s, border-color .12s",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {label}{" "}
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: contentTab === key ? "#b45309" : "#d1d5db", marginLeft: 2 }}>
                    ({count})
                  </span>
                </button>
              ))}
            </div>
            {selectedSupplier && (contentTab === "fakture" ? (
              <button
                type="button"
                onClick={() => { setWizardPreselectedSupplier(selectedSupplier); setWizardOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent px-4 py-2 text-[13px] font-semibold cursor-pointer transition-colors mb-0.5"
                style={{ fontFamily: "inherit" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nova faktura
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background .12s", marginBottom: 2 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#d1fae5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ecfdf5"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nova uplata
              </button>
            ))}
          </div>

          {/* ── Invoice table ── */}
          {contentTab === "fakture" && (
            <div style={{ marginTop: 16, overflowX: "auto", borderRadius: 14, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 40 }}>
              {invoicesLoading ? (
                <div style={{ padding: "40px 24px", textAlign: "center" as const, color: "var(--muted)", fontSize: 14 }}>
                  Učitava se...
                </div>
              ) : sortedInvoices.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" as const, color: "var(--muted)", fontSize: 13 }}>
                  Nema faktura za izabrani period
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "9px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", borderBottom: "1px solid #f1f5f9", width: 36 }}>
                        RB
                      </th>
                      {INVOICE_COLS.map(({ col, label }) => {
                        const isActive = sortCfgInvoice?.key === col;
                        return (
                          <th
                            key={col}
                            onClick={() => reqSortInvoice(col)}
                            style={{ padding: "9px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: isActive ? "#6b7280" : "#9ca3af", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" as const, cursor: "pointer", userSelect: "none" as const }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                              {label}
                              {isActive ? (
                                sortCfgInvoice?.direction === "asc"
                                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                              )}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInvoices.map((row, idx) => (
                      <tr
                        key={row.id}
                        onClick={() => handleEditInvoice(row)}
                        style={{ borderBottom: "1px solid #f8fafc", transition: "background .1s", cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#f0fdf4"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                      >
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" as const }}>
                          {formatDate(row.issue_date)}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#374151", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" as const }}>
                          {row.amount_without_vat.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#374151", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" as const }}>
                          {row.vat_amount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#92400e", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" as const }}>
                          {row.total_amount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {row.sektor
                            ? <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 5, fontSize: 11.5, fontWeight: 600, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>{row.sektor}</span>
                            : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {row.jedinica
                            ? <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 5, fontSize: 11.5, fontWeight: 600, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>{row.jedinica}</span>
                            : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {row.kategorija
                            ? <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 5, fontSize: 11.5, fontWeight: 600, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>{row.kategorija}</span>
                            : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            display: "inline-block", padding: "2px 8px", borderRadius: 5, fontSize: 11.5, fontWeight: 600,
                            ...(row.status === "neplaceno"
                              ? { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }
                              : row.status === "delimicno"
                                ? { background: "#fff7ed", border: "1px solid #fed7aa", color: "#d97706" }
                                : { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" }),
                          }}>
                            {row.status === "neplaceno" ? "Čeka" : row.status === "delimicno" ? "Djelimično" : "Plaćeno"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Payments table ── */}
          {contentTab === "uplate" && (
            <div style={{ marginTop: 16, overflowX: "auto", borderRadius: 14, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 40 }}>
              {paymentsLoading ? (
                <div style={{ padding: "40px 24px", textAlign: "center" as const, color: "var(--muted)", fontSize: 14 }}>
                  Učitava se...
                </div>
              ) : sortedPayments.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" as const, color: "var(--muted)", fontSize: 13 }}>
                  Nema uplata za izabrani period
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "9px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#9ca3af", borderBottom: "1px solid #f1f5f9", width: 36 }}>
                        RB
                      </th>
                      {PAYMENT_COLS.map(({ col, label }) => {
                        const isActive = sortCfgPayment?.key === col;
                        return (
                          <th
                            key={col}
                            onClick={() => reqSortPayment(col)}
                            style={{ padding: "9px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: isActive ? "#6b7280" : "#9ca3af", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" as const, cursor: "pointer", userSelect: "none" as const }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                              {label}
                              {isActive ? (
                                sortCfgPayment?.direction === "asc"
                                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                              )}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPayments.map((row, idx) => (
                      <tr
                        key={row.id}
                        style={{ borderBottom: "1px solid #f8fafc", transition: "background .1s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                      >
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" as const }}>
                          {formatDate(row.payment_date)}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#059669", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" as const }}>
                          {row.amount.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#374151", fontFamily: "var(--font-geist-mono), monospace", fontSize: 12.5 }}>
                          {row.invoice_number}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#374151" }}>
                          {row.supplier_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          </div>

        </div>
      </div>

      {/* Document entry wizard */}
      {wizardOpen && (
        <DocumentEntryWizard
          suppliers={suppliersWithBalance}
          onClose={() => { setWizardOpen(false); setWizardEditInvoice(null); setWizardPreselectedSupplier(null); }}
          onSupplierCreated={() => qc.invalidateQueries({ queryKey: ["suppliers-with-balance", TENANT] })}
          onOpenInvoiceForm={(ws) => {
            setInvoiceInitialSupplier({ id: ws.id, name: ws.name, pib: ws.pib, maticni_broj: null, address: null, phone: null, created_at: "", updated_at: "" });
            setEditingInvoice(null);
            setInvoiceSlide(true);
          }}
          onOpenPaymentModal={(ws) => {
            setSelectedSupplier({ id: ws.id, name: ws.name, pib: ws.pib, total_invoices_count: ws.total_invoices_count, total_payments_count: ws.total_payments_count, total_debt: ws.total_debt });
            setPaymentModalOpen(true);
          }}
          onDocumentSaved={() => {
            qc.invalidateQueries({ queryKey: ["suppliers-with-balance", TENANT] });
            qc.invalidateQueries({ queryKey: ["supplier-invoices", TENANT] });
            qc.invalidateQueries({ queryKey: ["supplier-stats", TENANT] });
            setToast(wizardEditInvoice ? "Faktura ažurirana." : "Gotovinski račun sačuvan.");
          }}
          editInvoice={wizardEditInvoice}
          editSupplier={
            wizardEditInvoice
              ? (suppliersWithBalance.find((s) => s.id === wizardEditInvoice.supplier_id) ?? {
                  id: wizardEditInvoice.supplier_id,
                  name: wizardEditInvoice.supplier?.name ?? "",
                  pib: wizardEditInvoice.supplier?.pib ?? null,
                  total_invoices_count: 0,
                  total_payments_count: 0,
                  total_debt: 0,
                })
              : null
          }
          preselectedSupplier={wizardPreselectedSupplier}
        />
      )}

      {/* New payment modal */}
      {paymentModalOpen && selectedSupplier && (
        <NewPaymentModal
          supplierId={selectedSupplier.id}
          supplierName={selectedSupplier.name}
          nextPaymentNumber={nextPaymentNumber}
          unpaidInvoices={unpaidInvoices}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["supplier-stats",    TENANT] });
            qc.invalidateQueries({ queryKey: ["supplier-invoices", TENANT] });
            qc.invalidateQueries({ queryKey: ["supplier-payments", TENANT] });
            qc.invalidateQueries({ queryKey: ["suppliers-with-balance", TENANT] });
            setToast("Uplata evidentirana.");
          }}
        />
      )}

      {/* Supplier edit modal */}
      {editingSupplier && (
        <SupplierEditModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSuccess={(name, pib) => {
            setSelectedSupplier((prev) => (prev ? { ...prev, name, pib } : null));
            setEditingSupplier(null);
            setToast("Dobavljač ažuriran.");
          }}
        />
      )}

      {/* Supplier delete confirm */}
      {deletingSupplier && (
        <DeleteConfirm
          title="Obriši dobavljača?"
          message={<>Dobavljač <strong>{deletingSupplier.name}</strong> će biti trajno obrisan.</>}
          onConfirm={() => deleteSupplierMut.mutate(deletingSupplier.id)}
          onCancel={() => setDeletingSupplier(null)}
        />
      )}

      {/* Invoice slide-over */}
      <InvoiceSlideOver
        open={invoiceSlide}
        editing={editingInvoice}
        initialSupplier={invoiceInitialSupplier}
        onClose={() => { setInvoiceSlide(false); setInvoiceInitialSupplier(null); }}
        onSaved={() => {
          setToast(editingInvoice ? "Faktura ažurirana." : "Faktura uspješno dodana.");
          qc.invalidateQueries({ queryKey: ["suppliers-with-balance", TENANT] });
          qc.invalidateQueries({ queryKey: ["supplier-stats", TENANT] });
          qc.invalidateQueries({ queryKey: ["supplier-invoices", TENANT] });
        }}
      />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </PageShell>
  );
}
