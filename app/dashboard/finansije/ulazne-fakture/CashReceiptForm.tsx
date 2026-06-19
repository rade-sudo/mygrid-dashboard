"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DatePicker from "@/components/ui/DatePicker";
import DictCombobox, { type DictOption } from "@/components/ui/DictCombobox";
import api from "@/lib/axios";
import type { WizardSupplier } from "./DocumentEntryWizard";

const TENANT       = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const SIFR_BASE    = `/api/${TENANT}/sifrarnici`;
const TODAY        = new Date().toISOString().split("T")[0];
const MERA_OPTIONS = ["kom", "m²", "m³", "m¹", "m", "kg", "t", "l", "sat", "dan", "mes", "%", "paušal"];

interface CashItem {
  sector_id:               number | null;
  sektor:                  string;
  organizational_unit_id:  number | null;
  jedinica:                string;
  expense_category_id:     number | null;
  kategorija:              string;
  kolicina:                string;
  mera:                    string;
  iznos:                   string;
}

const EMPTY_CASH_ITEM: CashItem = {
  sector_id: null, sektor: "",
  organizational_unit_id: null, jedinica: "",
  expense_category_id: null, kategorija: "",
  kolicina: "1", mera: "kom", iznos: "",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid #e2e8f0", borderRadius: 9,
  fontSize: 14, color: "#111418", background: "#fff",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};
const cmp: React.CSSProperties = {
  width: "100%", padding: "7px 8px",
  border: "1.5px solid #e2e8f0", borderRadius: 7,
  fontSize: 12.5, color: "#111418", background: "#fff",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 10.5, fontWeight: 700,
  letterSpacing: ".09em", textTransform: "uppercase" as const,
  color: "#6b7280", marginBottom: 6,
};

function fmt(n: number): string {
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── CashItemRow ──────────────────────────────────────────────────────────────

interface CashItemRowProps {
  item: CashItem;
  index: number;
  isEven: boolean;
  isLast: boolean;
  canRemove: boolean;
  sectors: DictOption[];
  allUnits: DictOption[];
  allCategories: DictOption[];
  onChange: (index: number, updates: Partial<CashItem>) => void;
  onRemove: (index: number) => void;
}

function CashItemRow({
  item, index, isEven, isLast, canRemove,
  sectors, allUnits, allCategories, onChange, onRemove,
}: CashItemRowProps) {
  const filteredUnits = useMemo(
    () => item.sector_id != null ? allUnits.filter((u) => u.sector_id === item.sector_id) : [],
    [allUnits, item.sector_id],
  );
  const filteredCategories = useMemo(
    () => item.organizational_unit_id != null
      ? allCategories.filter((c) => c.organizational_unit_id === item.organizational_unit_id)
      : [],
    [allCategories, item.organizational_unit_id],
  );

  function handleSector(opt: DictOption | null) {
    onChange(index, {
      sector_id: opt?.id ?? null, sektor: opt?.name ?? "",
      organizational_unit_id: null, jedinica: "",
      expense_category_id: null, kategorija: "",
    });
  }
  function handleUnit(opt: DictOption | null) {
    onChange(index, {
      organizational_unit_id: opt?.id ?? null, jedinica: opt?.name ?? "",
      expense_category_id: null, kategorija: "",
    });
  }
  function handleCategory(opt: DictOption | null) {
    onChange(index, {
      expense_category_id: opt?.id ?? null, kategorija: opt?.name ?? "",
    });
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 78px 1fr 42px 66px 78px 26px",
      gap: 5, padding: "7px 10px", alignItems: "center",
      background: isEven ? "#fff" : "#fafafa",
      borderBottom: !isLast ? "1px solid #f8fafc" : "none",
    }}>
      <DictCombobox selectedId={item.sector_id} options={sectors} placeholder="Sektor"
        createEndpoint={`${SIFR_BASE}/sektori`} createPayload={(n) => ({ name: n })}
        queryKeyToInvalidate={["dict-sektori", TENANT]} onSelect={handleSector} />
      <DictCombobox selectedId={item.organizational_unit_id} options={filteredUnits} placeholder="Jed."
        disabled={item.sector_id == null}
        createEndpoint={item.sector_id != null ? `${SIFR_BASE}/jedinice` : undefined}
        createPayload={(n) => ({ name: n, sector_id: item.sector_id })}
        queryKeyToInvalidate={["dict-jedinice", TENANT]} onSelect={handleUnit} />
      <DictCombobox selectedId={item.expense_category_id} options={filteredCategories} placeholder="Opis..."
        disabled={item.organizational_unit_id == null}
        createEndpoint={item.organizational_unit_id != null ? `${SIFR_BASE}/kategorije` : undefined}
        createPayload={(n) => ({ name: n, organizational_unit_id: item.organizational_unit_id })}
        queryKeyToInvalidate={["dict-kategorije", TENANT]} onSelect={handleCategory} />
      <input type="number" step="0.001" min="0" placeholder="1"
        value={item.kolicina}
        onChange={(e) => onChange(index, { kolicina: e.target.value })}
        style={{ ...cmp, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
        onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")} />
      <select value={item.mera} onChange={(e) => onChange(index, { mera: e.target.value })}
        style={{ ...cmp, cursor: "pointer" }}>
        {MERA_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <input type="number" step="0.01" min="0" placeholder="0.00"
        value={item.iznos}
        onChange={(e) => onChange(index, { iznos: e.target.value })}
        style={{ ...cmp, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
        onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")} />
      <button type="button" onClick={() => onRemove(index)} disabled={!canRemove}
        style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${canRemove ? "#fecaca" : "#e5e7eb"}`, background: canRemove ? "#fef2f2" : "#f9fafb", color: canRemove ? "#dc2626" : "#d1d5db", cursor: canRemove ? "pointer" : "not-allowed", display: "grid", placeItems: "center", fontSize: 13, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ─── CashReceiptForm ──────────────────────────────────────────────────────────

interface Props {
  supplier: WizardSupplier;
  formId: string;
  onSaved: () => void;
  onSavingChange: (v: boolean) => void;
  onErrorChange: (v: string | null) => void;
}

export default function CashReceiptForm({ supplier, formId, onSaved, onSavingChange, onErrorChange }: Props) {
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptDate,   setReceiptDate]   = useState(TODAY);
  const [items,         setItems]         = useState<CashItem[]>([{ ...EMPTY_CASH_ITEM }]);
  const [vatRate,       setVatRate]       = useState<0 | 10 | 20>(20);
  const [note,          setNote]          = useState("");

  const { data: dictSectors    = [] } = useQuery<DictOption[]>({
    queryKey: ["dict-sektori",   TENANT],
    queryFn:  () => api.get(`${SIFR_BASE}/sektori`).then((r)   => r.data as DictOption[]),
    staleTime: 60_000,
  });
  const { data: dictUnits      = [] } = useQuery<DictOption[]>({
    queryKey: ["dict-jedinice",  TENANT],
    queryFn:  () => api.get(`${SIFR_BASE}/jedinice`).then((r)  => r.data as DictOption[]),
    staleTime: 60_000,
  });
  const { data: dictCategories = [] } = useQuery<DictOption[]>({
    queryKey: ["dict-kategorije", TENANT],
    queryFn:  () => api.get(`${SIFR_BASE}/kategorije`).then((r) => r.data as DictOption[]),
    staleTime: 60_000,
  });

  const baseAmount  = items.reduce((s, it) => s + (parseFloat(it.iznos) || 0), 0);
  const vatAmount   = baseAmount * (vatRate / 100);
  const totalAmount = baseAmount + vatAmount;

  function updateItem(idx: number, updates: Partial<CashItem>) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...updates } : it));
  }

  function removeItem(idx: number) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onErrorChange(null);
    if (!receiptNumber.trim()) { onErrorChange("Broj računa je obavezan."); return; }
    if (!receiptDate)           { onErrorChange("Datum je obavezan."); return; }
    if (totalAmount <= 0)       { onErrorChange("Unesite barem jednu stavku sa iznosom."); return; }

    onSavingChange(true);
    try {
      const fd = new FormData();
      fd.append("supplier_id",        String(supplier.id));
      fd.append("invoice_number",     receiptNumber.trim());
      fd.append("issue_date",         receiptDate);
      fd.append("amount_without_vat", baseAmount.toFixed(2));
      fd.append("vat_rate",           String(vatRate));
      fd.append("vat_amount",         vatAmount.toFixed(2));
      fd.append("total_amount",       totalAmount.toFixed(2));
      fd.append("is_cash",            "1");
      if (note.trim()) fd.append("description", note.trim());

      items
        .filter((it) => parseFloat(it.iznos) > 0)
        .forEach((it, i) => {
          if (it.sektor)    fd.append(`items[${i}][sektor]`,    it.sektor);
          if (it.jedinica)  fd.append(`items[${i}][jedinica]`,  it.jedinica);
          if (it.kategorija) fd.append(`items[${i}][kategorija]`, it.kategorija);
          if (it.sector_id != null)               fd.append(`items[${i}][sector_id]`,               String(it.sector_id));
          if (it.organizational_unit_id != null)  fd.append(`items[${i}][organizational_unit_id]`,  String(it.organizational_unit_id));
          if (it.expense_category_id != null)     fd.append(`items[${i}][expense_category_id]`,     String(it.expense_category_id));
          fd.append(`items[${i}][kolicina]`, it.kolicina || "1");
          fd.append(`items[${i}][mera]`,     it.mera);
          fd.append(`items[${i}][iznos]`,    it.iznos);
        });

      await api.post(`/api/${TENANT}/finansije/incoming-invoices`, fd);
      onSaved();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onErrorChange(msg ?? "Greška pri čuvanju. Pokušajte ponovo.");
      onSavingChange(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Supplier header */}
      <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#64748b", marginBottom: 3 }}>
          Gotovinski račun · Ulazna
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>{supplier.name}</div>
      </div>

      {/* Broj + Datum */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>Broj računa *</label>
          <input type="text" value={receiptNumber} placeholder="npr. G-0001"
            onChange={(e) => setReceiptNumber(e.target.value)}
            style={inp}
            onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
            onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")} />
        </div>
        <div>
          <label style={lbl}>Datum *</label>
          <DatePicker value={receiptDate} onChange={setReceiptDate} />
        </div>
      </div>

      {/* Stavke */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={lbl}>Stavke</span>
          <button type="button"
            onClick={() => setItems((prev) => [...prev, { ...EMPTY_CASH_ITEM }])}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--green)", background: "var(--green-soft)", border: "1px solid rgba(22,163,74,.3)", borderRadius: 7, padding: "4px 11px", cursor: "pointer", fontFamily: "inherit" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Dodaj stavku
          </button>
        </div>

        <div style={{ borderRadius: 10, border: "1px solid #f1f5f9", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 78px 1fr 42px 66px 78px 26px", gap: 5, padding: "6px 10px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            {["SEKTOR", "JEDINICA", "KATEGORIJA", "KOL.", "MERA", "IZNOS", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" as const, color: "#9ca3af", textAlign: i === 5 ? "right" as const : "left" as const }}>{h}</div>
            ))}
          </div>

          {items.map((item, idx) => (
            <CashItemRow
              key={idx}
              item={item} index={idx}
              isEven={idx % 2 === 0} isLast={idx === items.length - 1}
              canRemove={items.length > 1}
              sectors={dictSectors} allUnits={dictUnits} allCategories={dictCategories}
              onChange={updateItem} onRemove={removeItem}
            />
          ))}
        </div>
      </div>

      {/* PDV stopa + PDV iznos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "14px 16px", background: "#fafafa", borderRadius: 11, border: "1px solid #f1f5f9" }}>
        <div>
          <div style={lbl}>Stopa PDV-a</div>
          <div style={{ display: "flex", gap: 6 }}>
            {([0, 10, 20] as const).map((rate) => {
              const active = vatRate === rate;
              return (
                <button key={rate} type="button" onClick={() => setVatRate(rate)}
                  style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${active ? "var(--green)" : "#e5e7eb"}`, background: active ? "var(--green)" : "#fff", color: active ? "#fff" : "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}>
                  {rate}%
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div style={lbl}>PDV (RSD)</div>
          <div style={{ padding: "8px 12px", border: "1.5px solid #f1f5f9", borderRadius: 9, fontSize: 14, fontWeight: 600, color: "#111418", background: "#f9fafb", fontFamily: "var(--font-geist-mono), monospace" }}>
            {fmt(vatAmount)}
          </div>
        </div>
      </div>

      {/* Napomena */}
      <div>
        <label style={lbl}>Napomena</label>
        <input type="text" value={note} placeholder="npr. ref. kase, lokacija..."
          onChange={(e) => setNote(e.target.value)}
          style={inp}
          onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
          onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")} />
      </div>

      {/* Ukupno */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--green-soft)", borderRadius: 11, border: "1px solid rgba(22,163,74,.2)" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--green)", opacity: 0.85 }}>Ukupno sa PDV</span>
        <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 19, fontWeight: 700, color: "var(--green)", letterSpacing: "-0.01em" }}>
          {fmt(totalAmount)} RSD
        </span>
      </div>
    </form>
  );
}
