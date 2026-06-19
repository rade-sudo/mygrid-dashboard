"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  useForm, useFieldArray, Controller, useWatch,
  type Control, type UseFormRegister, type UseFormSetValue,
} from "react-hook-form";
import DatePicker from "@/components/ui/DatePicker";
import DictCombobox, { type DictOption } from "@/components/ui/DictCombobox";
import api from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import type { InvoiceFormData, IncomingInvoice } from "@/types/supplier";
import { EMPTY_INVOICE_FORM, EMPTY_ITEM, invoiceToForm } from "@/types/supplier";
import type { WizardSupplier } from "./DocumentEntryWizard";

const TENANT         = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const INVOICES_BASE  = `/api/${TENANT}/finansije/incoming-invoices`;
const SIFR_BASE      = `/api/${TENANT}/sifrarnici`;
const TODAY          = new Date().toISOString().split("T")[0];
const MERA_OPTIONS   = ["kom", "m²", "m³", "m¹", "m", "kg", "t", "l", "sat", "dan", "mes", "%", "paušal"];

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid var(--border)", borderRadius: 9,
  fontSize: 14, color: "#111418", background: "#fff",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};
const cmp: React.CSSProperties = {
  width: "100%", padding: "7px 8px",
  border: "1.5px solid var(--border)", borderRadius: 7,
  fontSize: 12.5, color: "#111418", background: "#fff",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5,
};
const err: React.CSSProperties = { color: "var(--red)", fontSize: 12, margin: "4px 0 0" };

// ─── Item row ─────────────────────────────────────────────────────────────────

interface WizardItemRowProps {
  index: number;
  control: Control<InvoiceFormData>;
  register: UseFormRegister<InvoiceFormData>;
  setValue: UseFormSetValue<InvoiceFormData>;
  removeItem: (i: number) => void;
  isLast: boolean;
  isEven: boolean;
  sectors: DictOption[];
  allUnits: DictOption[];
  allCategories: DictOption[];
}

function WizardItemRow({
  index, control, register, setValue, removeItem, isLast, isEven,
  sectors, allUnits, allCategories,
}: WizardItemRowProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectorId   = useWatch({ control, name: `items.${index}.sector_id` as any }) as number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unitId     = useWatch({ control, name: `items.${index}.organizational_unit_id` as any }) as number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryId = useWatch({ control, name: `items.${index}.expense_category_id` as any }) as number | null;

  const filteredUnits      = useMemo(() => sectorId != null ? allUnits.filter((u) => u.sector_id === sectorId) : [], [allUnits, sectorId]);
  const filteredCategories = useMemo(() => unitId   != null ? allCategories.filter((c) => c.organizational_unit_id === unitId) : [], [allCategories, unitId]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sv = setValue as (name: string, value: unknown) => void;

  function handleSector(opt: DictOption | null) {
    sv(`items.${index}.sector_id`, opt?.id ?? null);
    sv(`items.${index}.sektor`,    opt?.name ?? "");
    sv(`items.${index}.organizational_unit_id`, null);
    sv(`items.${index}.jedinica`,  "");
    sv(`items.${index}.expense_category_id`, null);
    sv(`items.${index}.kategorija`, "");
  }
  function handleUnit(opt: DictOption | null) {
    sv(`items.${index}.organizational_unit_id`, opt?.id ?? null);
    sv(`items.${index}.jedinica`,  opt?.name ?? "");
    sv(`items.${index}.expense_category_id`, null);
    sv(`items.${index}.kategorija`, "");
  }
  function handleCategory(opt: DictOption | null) {
    sv(`items.${index}.expense_category_id`, opt?.id ?? null);
    sv(`items.${index}.kategorija`, opt?.name ?? "");
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "88px 76px 1fr 58px 82px 92px 30px",
      gap: 6, padding: "7px 10px", alignItems: "center",
      borderBottom: !isLast ? "1px solid var(--border-soft)" : "none",
      background: isEven ? "#fff" : "#fafafa",
    }}>
      <DictCombobox selectedId={sectorId} options={sectors} placeholder="Sektor"
        createEndpoint={`${SIFR_BASE}/sektori`} createPayload={(n) => ({ name: n })}
        queryKeyToInvalidate={["dict-sektori", TENANT]} onSelect={handleSector} />
      <DictCombobox selectedId={unitId} options={filteredUnits} placeholder="Jed."
        disabled={sectorId == null}
        createEndpoint={sectorId != null ? `${SIFR_BASE}/jedinice` : undefined}
        createPayload={(n) => ({ name: n, sector_id: sectorId })}
        queryKeyToInvalidate={["dict-jedinice", TENANT]} onSelect={handleUnit} />
      <DictCombobox selectedId={categoryId} options={filteredCategories} placeholder="Kategorija / opis..."
        disabled={unitId == null}
        createEndpoint={unitId != null ? `${SIFR_BASE}/kategorije` : undefined}
        createPayload={(n) => ({ name: n, organizational_unit_id: unitId })}
        queryKeyToInvalidate={["dict-kategorije", TENANT]} onSelect={handleCategory} />
      <input type="number" step="0.001" min="0" placeholder="1"
        {...register(`items.${index}.kolicina`)}
        style={{ ...cmp, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
        onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
      <Controller name={`items.${index}.mera`} control={control}
        render={({ field: f }) => (
          <select value={f.value} onChange={(e) => f.onChange(e.target.value)} style={{ ...cmp, cursor: "pointer" }}>
            {MERA_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )} />
      <input type="number" step="0.01" min="0" placeholder="0.00"
        {...register(`items.${index}.iznos`)}
        style={{ ...cmp, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
        onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
      <button type="button" onClick={() => removeItem(index)}
        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", color: "var(--red)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 15, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ─── WizardInvoiceForm ────────────────────────────────────────────────────────

interface Props {
  supplier: WizardSupplier;
  formId: string;
  editInvoice: IncomingInvoice | null;
  onSaved: () => void;
  onSavingChange: (v: boolean) => void;
  onErrorChange: (v: string | null) => void;
}

export default function WizardInvoiceForm({ supplier, formId, editInvoice, onSaved, onSavingChange, onErrorChange }: Props) {
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError,    setFileError]    = useState("");
  const [dropHL,       setDropHL]       = useState(false);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } =
    useForm<InvoiceFormData>({ defaultValues: EMPTY_INVOICE_FORM });

  const { fields: itemFields,   append: appendItem,   remove: removeItem }    =
    useFieldArray({ control, name: "items" });

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

  const amtStr       = watch("amount_without_vat");
  const vatStr       = watch("vat_amount");
  const totalStr     = watch("total_amount");
  const vatRate      = watch("vat_rate");
  const watchedItems    = watch("items");

  useEffect(() => {
    if (editInvoice) {
      reset(invoiceToForm(editInvoice));
    } else {
      reset({ ...EMPTY_INVOICE_FORM, issue_date: TODAY });
    }
    setSelectedFile(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [supplier.id, editInvoice?.id, reset]);

  useEffect(() => {
    const base = watchedItems.reduce((s, it) => s + (parseFloat(it.iznos) || 0), 0);
    const vat  = base * (vatRate / 100);
    setValue("amount_without_vat", base.toFixed(2), { shouldDirty: false, shouldValidate: false });
    setValue("vat_amount",         vat.toFixed(2),  { shouldDirty: false, shouldValidate: false });
    setValue("total_amount",       (base + vat).toFixed(2), { shouldDirty: false, shouldValidate: false });
  }, [watchedItems, vatRate, setValue]);

  function handleFileSelect(f: File) {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(f.type)) { setFileError("Dozvoljeni formati: PDF, JPG, PNG."); setSelectedFile(null); return; }
    if (f.size > 5 * 1024 * 1024) { setFileError("Fajl je prevelik. Maksimalna veličina je 5 MB."); setSelectedFile(null); return; }
    setFileError(""); setSelectedFile(f);
  }

  async function onSubmit(data: InvoiceFormData) {
    onErrorChange(null);
    onSavingChange(true);
    try {
      const fd = new FormData();
      fd.append("supplier_id",        String(supplier.id));
      fd.append("invoice_number",     data.invoice_number);
      fd.append("issue_date",         data.issue_date);
      if (data.due_date)    fd.append("due_date",    data.due_date);
      if (data.description) fd.append("description", data.description);
      fd.append("amount_without_vat", data.amount_without_vat);
      fd.append("vat_rate",           String(data.vat_rate));
      fd.append("vat_amount",         data.vat_amount);
      fd.append("total_amount",       data.total_amount);
      fd.append("is_cash",            data.is_cash ? "1" : "0");

      data.items
        .filter((it) => it.iznos !== "" && parseFloat(it.iznos) > 0)
        .forEach((it, i) => {
          if (it.sektor)                   fd.append(`items[${i}][sektor]`,                   it.sektor);
          if (it.jedinica)                 fd.append(`items[${i}][jedinica]`,                 it.jedinica);
          if (it.kategorija)               fd.append(`items[${i}][kategorija]`,               it.kategorija);
          if (it.sector_id != null)        fd.append(`items[${i}][sector_id]`,               String(it.sector_id));
          if (it.organizational_unit_id != null) fd.append(`items[${i}][organizational_unit_id]`, String(it.organizational_unit_id));
          if (it.expense_category_id != null)    fd.append(`items[${i}][expense_category_id]`,    String(it.expense_category_id));
          fd.append(`items[${i}][kolicina]`, it.kolicina || "1");
          fd.append(`items[${i}][mera]`,     it.mera);
          fd.append(`items[${i}][iznos]`,    it.iznos);
        });

      if (selectedFile) fd.append("document", selectedFile);

      if (editInvoice) {
        (data.payments ?? []).forEach((p, i) => {
          fd.append(`payments[${i}][amount]`, p.amount);
          fd.append(`payments[${i}][payment_date]`, p.payment_date);
        });
        fd.append("_method", "PUT");
        await api.post(`${INVOICES_BASE}/${editInvoice.id}`, fd);
      } else {
        await api.post(INVOICES_BASE, fd);
      }
      onSaved();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onErrorChange(msg ?? "Greška pri čuvanju. Pokušajte ponovo.");
      onSavingChange(false);
    }
  }

  const baseDisplay  = (parseFloat(amtStr)   || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const vatDisplay   = (parseFloat(vatStr)   || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalDisplay = (parseFloat(totalStr) || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Supplier header */}
      <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#64748b", marginBottom: 3 }}>
          {editInvoice ? `Izmjena · #${editInvoice.invoice_number}` : "Ulazna faktura · Dobavljač"}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>{supplier.name}</div>
        {supplier.pib && (
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, fontFamily: "var(--font-geist-mono), monospace" }}>PIB: {supplier.pib}</div>
        )}
      </div>

      {/* Broj fakture */}
      <div>
        <label style={lbl}>Broj fakture *</label>
        <input type="text" placeholder="npr. 2024/001 ili F-0042"
          {...register("invoice_number", { required: "Broj fakture je obavezan" })}
          style={{ ...inp, fontFamily: "var(--font-geist-mono), monospace" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
        {errors.invoice_number && <p style={err}>{errors.invoice_number.message}</p>}
      </div>

      {/* Datumi */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>Datum izdavanja *</label>
          <Controller name="issue_date" control={control} rules={{ required: "Datum je obavezan" }}
            render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
          {errors.issue_date && <p style={err}>{errors.issue_date.message}</p>}
        </div>
        <div>
          <label style={lbl}>Rok plaćanja <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
          <Controller name="due_date" control={control}
            render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
        </div>
      </div>

      {/* Stavke fakture */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
            Stavke fakture
          </span>
          <button type="button" onClick={() => appendItem({ ...EMPTY_ITEM })}
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
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" as const, color: "var(--muted)", textAlign: i === 5 ? "right" as const : "left" as const }}>{h}</div>
                ))}
              </div>

              {itemFields.length === 0 && (
                <div style={{ padding: "16px", textAlign: "center" as const, color: "var(--muted)", fontSize: 13, background: "#fafafa" }}>
                  Nema stavki — kliknite &ldquo;Dodaj stavku&rdquo;
                </div>
              )}

              {itemFields.map((field, idx) => (
                <WizardItemRow
                  key={field.id} index={idx} control={control} register={register} setValue={setValue}
                  removeItem={removeItem} isLast={idx === itemFields.length - 1} isEven={idx % 2 === 0}
                  sectors={dictSectors} allUnits={dictUnits} allCategories={dictCategories}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PDV stopa */}
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
        <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--green)", opacity: 0.85 }}>Ukupno sa PDV</span>
        <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 19, fontWeight: 700, color: "var(--green)", letterSpacing: "-0.01em" }}>{totalDisplay} RSD</span>
      </div>

      {/* Opis */}
      <div>
        <label style={lbl}>Opis <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
        <textarea rows={2} placeholder="npr. Materijal — fasada, avansna faktura..."
          {...register("description")}
          style={{ ...inp, resize: "vertical", lineHeight: 1.55 }}
          onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
      </div>

      {/* Upload dokumenta */}
      <div>
        <label style={lbl}>Dokument fakture <span style={{ fontWeight: 400, color: "var(--muted)" }}>(PDF, JPG, PNG — max 5 MB, opciono)</span></label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDropHL(true); }}
          onDragLeave={() => setDropHL(false)}
          onDrop={(e) => { e.preventDefault(); setDropHL(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
          style={{
            border: `2px dashed ${selectedFile ? "var(--green)" : fileError ? "var(--red)" : dropHL ? "var(--green)" : "var(--border)"}`,
            borderRadius: 10, padding: "16px", textAlign: "center" as const, cursor: "pointer",
            transition: "border-color .15s, background .15s",
            background: selectedFile ? "var(--green-soft)" : dropHL ? "#f0fdf4" : "#fafafa",
          }}
        >
          {selectedFile ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--green)", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{selectedFile.name}</span>
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFileError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(22,163,74,.2)", color: "var(--green)", cursor: "pointer", fontSize: 13, display: "grid", placeItems: "center", lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
          ) : (
            <div>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px", display: "block" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Prevucite fajl ovde ili <span style={{ color: "var(--green)", fontWeight: 600 }}>kliknite za odabir</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 3 }}>PDF, JPG, PNG — do 5 MB</div>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
        {fileError && <p style={err}>{fileError}</p>}
      </div>
    </form>
  );
}
