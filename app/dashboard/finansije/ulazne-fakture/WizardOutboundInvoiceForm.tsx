"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import DatePicker from "@/components/ui/DatePicker";
import api from "@/lib/axios";
import type { OutboundInvoice, OutboundInvoiceFormData } from "@/types/client";
import { EMPTY_OUTBOUND_INVOICE_FORM, EMPTY_OUTBOUND_ITEM, outboundInvoiceToForm } from "@/types/client";

const TENANT        = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const INVOICES_BASE = `/api/${TENANT}/finansije/outbound-invoices`;
const DOC_BASE      = `/api/${TENANT}/finansije/outbound-invoices`;
const MERA_OPTIONS  = ["kom", "m²", "m³", "m¹", "m", "kg", "t", "l", "sat", "dan", "mes", "%", "paušal"];
const TODAY         = new Date().toISOString().split("T")[0];

export interface WizardClient {
  id: number;
  name: string;
  pib: string | null;
}

interface Props {
  client: WizardClient;
  formId: string;
  editInvoice: OutboundInvoice | null;
  initialIsCash?: boolean;
  onSaved: () => void;
  onSavingChange: (v: boolean) => void;
  onErrorChange: (v: string | null) => void;
}

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
const lbl: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 };
const err: React.CSSProperties = { color: "var(--red)", fontSize: 12, margin: "4px 0 0" };

export default function WizardOutboundInvoiceForm({
  client, formId, editInvoice, initialIsCash = false,
  onSaved, onSavingChange, onErrorChange,
}: Props) {
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError,    setFileError]    = useState("");
  const [dropHL,       setDropHL]       = useState(false);

  const defaultVals = editInvoice
    ? outboundInvoiceToForm(editInvoice)
    : { ...EMPTY_OUTBOUND_INVOICE_FORM, issue_date: TODAY, is_cash: initialIsCash };

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } =
    useForm<OutboundInvoiceFormData>({ defaultValues: defaultVals });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({ control, name: "items" });

  const amtStr       = watch("amount_without_vat");
  const vatStr       = watch("vat_amount");
  const totalStr     = watch("total_amount");
  const vatRate      = watch("vat_rate");
  const watchedItems = watch("items");

  useEffect(() => {
    if (editInvoice) {
      reset(outboundInvoiceToForm(editInvoice));
    } else {
      reset({ ...EMPTY_OUTBOUND_INVOICE_FORM, issue_date: TODAY, is_cash: initialIsCash, items: [{ ...EMPTY_OUTBOUND_ITEM }] });
    }
    setSelectedFile(null); setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [client.id, editInvoice?.id, reset, initialIsCash]);

  useEffect(() => {
    const base = watchedItems.reduce((s, it) => s + (parseFloat(it.iznos) || 0), 0);
    const vat  = base * (vatRate / 100);
    setValue("amount_without_vat", base.toFixed(2), { shouldDirty: false, shouldValidate: false });
    setValue("vat_amount",         vat.toFixed(2),  { shouldDirty: false, shouldValidate: false });
    setValue("total_amount",       (base + vat).toFixed(2), { shouldDirty: false, shouldValidate: false });
  }, [watchedItems, vatRate, setValue]);

  function handleFileSelect(f: File) {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type)) { setFileError("Dozvoljeni formati: PDF, JPG, PNG."); return; }
    if (f.size > 5 * 1024 * 1024) { setFileError("Fajl je prevelik. Max 5 MB."); return; }
    setFileError(""); setSelectedFile(f);
  }

  async function onSubmit(data: OutboundInvoiceFormData) {
    onSavingChange(true);
    onErrorChange(null);
    try {
      const effectiveIsCash = editInvoice ? (editInvoice.is_cash ?? false) : initialIsCash;

      const fd = new FormData();
      fd.append("client_id",          String(client.id));
      fd.append("invoice_number",     data.invoice_number);
      fd.append("issue_date",         data.issue_date);
      if (data.due_date)    fd.append("due_date",    data.due_date);
      if (data.description) fd.append("description", data.description);
      fd.append("amount_without_vat", data.amount_without_vat);
      fd.append("vat_rate",           String(data.vat_rate));
      fd.append("vat_amount",         data.vat_amount);
      fd.append("total_amount",       data.total_amount);
      fd.append("is_cash",            effectiveIsCash ? "1" : "0");

      if (editInvoice && !effectiveIsCash) {
        (editInvoice.payments ?? []).forEach((p, i) => {
          fd.append(`payments[${i}][amount]`,       p.amount);
          fd.append(`payments[${i}][payment_date]`, p.payment_date);
        });
      }

      data.items
        .filter((it) => it.iznos !== "" && parseFloat(it.iznos) > 0)
        .forEach((it, i) => {
          if (it.sektor)     fd.append(`items[${i}][sektor]`,     it.sektor);
          if (it.jedinica)   fd.append(`items[${i}][jedinica]`,   it.jedinica);
          if (it.kategorija) fd.append(`items[${i}][kategorija]`, it.kategorija);
          fd.append(`items[${i}][kolicina]`, it.kolicina || "1");
          fd.append(`items[${i}][mera]`,     it.mera);
          fd.append(`items[${i}][iznos]`,    it.iznos);
        });

      if (selectedFile) fd.append("document", selectedFile);

      if (editInvoice) {
        fd.append("_method", "PUT");
        await api.post(`${INVOICES_BASE}/${editInvoice.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post(INVOICES_BASE, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      onSaved();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onErrorChange(msg ?? "Greška pri čuvanju. Pokušajte ponovo.");
      onSavingChange(false);
    }
  }

  const baseDisplay  = (parseFloat(amtStr)   || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const vatDisplay   = (parseFloat(vatStr)    || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalDisplay = (parseFloat(totalStr)  || 0).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Client header */}
      <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#64748b", marginBottom: 3 }}>
          {editInvoice ? `Izmjena · #${editInvoice.invoice_number}` : initialIsCash ? "Gotovinski račun · Klijent" : "Izlazna faktura · Klijent"}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>{client.name}</div>
        {client.pib && (
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, fontFamily: "var(--font-geist-mono), monospace" }}>PIB: {client.pib}</div>
        )}
      </div>

      {/* Broj fakture */}
      <div>
        <label style={lbl}>Broj fakture *</label>
        <input type="text" placeholder="npr. IF-2024/001"
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

      {/* Stavke */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
            Stavke fakture
          </span>
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
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" as const, color: "var(--muted)", textAlign: i === 5 ? "right" as const : "left" as const }}>{h}</div>
                ))}
              </div>

              {itemFields.length === 0 && (
                <div style={{ padding: "16px", textAlign: "center" as const, color: "var(--muted)", fontSize: 13, background: "#fafafa" }}>
                  Nema stavki — kliknite &ldquo;Dodaj stavku&rdquo;
                </div>
              )}

              {itemFields.map((field, idx) => (
                <div key={field.id} style={{
                  display: "grid", gridTemplateColumns: "88px 76px 1fr 58px 82px 92px 30px",
                  gap: 6, padding: "7px 10px", alignItems: "center",
                  borderBottom: idx < itemFields.length - 1 ? "1px solid var(--border-soft)" : "none",
                  background: idx % 2 === 0 ? "#fff" : "#fafafa",
                }}>
                  <input type="text" placeholder="Sektor"
                    {...register(`items.${idx}.sektor`)} style={cmp}
                    onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                    onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
                  <input type="text" placeholder="Jed."
                    {...register(`items.${idx}.jedinica`)} style={cmp}
                    onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                    onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
                  <input type="text" placeholder="Kategorija / opis..."
                    {...register(`items.${idx}.kategorija`)} style={cmp}
                    onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                    onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
                  <input type="number" step="0.001" min="0" placeholder="1"
                    {...register(`items.${idx}.kolicina`)}
                    style={{ ...cmp, textAlign: "right" as const, fontFamily: "var(--font-geist-mono), monospace" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                    onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
                  <Controller name={`items.${idx}.mera`} control={control}
                    render={({ field: f }) => (
                      <select value={f.value} onChange={(e) => f.onChange(e.target.value)} style={{ ...cmp, cursor: "pointer" }}>
                        {MERA_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    )} />
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    {...register(`items.${idx}.iznos`)}
                    style={{ ...cmp, textAlign: "right" as const, fontFamily: "var(--font-geist-mono), monospace" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                    onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
                  <button type="button" onClick={() => removeItem(idx)}
                    style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", color: "var(--red)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 15, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PDV stopa + totali */}
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
        <textarea rows={2} placeholder="Napomena uz fakturu..."
          {...register("description")}
          style={{ ...inp, resize: "vertical", lineHeight: 1.55 }}
          onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
      </div>

      {/* Upload dokumenta */}
      <div>
        <label style={lbl}>Dokument fakture <span style={{ fontWeight: 400, color: "var(--muted)" }}>(PDF, JPG, PNG — max 5 MB, opciono)</span></label>

        {editInvoice?.document_path && !selectedFile && (
          <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--green-soft)", borderRadius: 9, border: "1px solid rgba(22,163,74,.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /></svg>
            <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 500, flex: 1 }}>Dokument već priložen</span>
            <button type="button"
              onClick={() => api.get(`${DOC_BASE}/${editInvoice.id}/document`, { responseType: "blob" }).then((r) => { const url = URL.createObjectURL(r.data as Blob); window.open(url, "_blank"); })}
              style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>
              Otvori
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

        {selectedFile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--green-soft)", borderRadius: 9, border: "1px solid rgba(22,163,74,.25)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /></svg>
            <span style={{ fontSize: 13, color: "var(--green)", flex: 1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{selectedFile.name}</span>
            <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDropHL(true); }}
            onDragLeave={() => setDropHL(false)}
            onDrop={(e) => { e.preventDefault(); setDropHL(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
            style={{ border: `2px dashed ${dropHL ? "var(--green)" : "var(--border)"}`, borderRadius: 11, padding: "20px 16px", textAlign: "center" as const, cursor: "pointer", background: dropHL ? "var(--green-soft)" : "#fafafa", transition: "border-color .15s" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px", display: "block", color: "var(--muted)" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Prevucite fajl ovde ili <span style={{ color: "var(--green)", fontWeight: 600 }}>kliknite za odabir</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 3 }}>PDF, JPG, PNG — do 5 MB</div>
          </div>
        )}
        {fileError && <p style={err}>{fileError}</p>}
      </div>
    </form>
  );
}
