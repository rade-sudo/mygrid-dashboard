"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import type { Contract, ContractFormData } from "@/types/contract";
import { CONTRACT_TYPES, EMPTY_CONTRACT_FORM } from "@/types/contract";
import DatePicker from "@/components/ui/DatePicker";
import FormDropdown from "@/components/ui/FormDropdown";
import { IconSortAsc, IconSortDesc, IconSort } from "@/components/ui/icons";
import { useSortableData } from "@/hooks/useSortableData";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const BASE = `/api/${TENANT}/contracts`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sr-Latn", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatValue(val: string | null): string {
  if (val === null || val === "") return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RSD";
}

function contractToForm(c: Contract): ContractFormData {
  return {
    contract_date:     c.contract_date,
    contract_type:     c.contract_type,
    contracting_party: c.contracting_party,
    value:             c.value ?? "",
    note:              c.note ?? "",
  };
}

// ─── Inline style helpers ─────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid var(--border)",
  borderRadius: 9,
  fontSize: 14,
  color: "#111418",
  background: "#fff",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 5,
};

const errStyle: React.CSSProperties = {
  color: "var(--red)",
  fontSize: 12,
  margin: "4px 0 0",
};

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 200, backdropFilter: "blur(2px)" }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: 18,
          padding: "32px 28px 24px",
          width: 380,
          zIndex: 201,
          boxShadow: "0 20px 60px rgba(16,24,40,.18)",
          textAlign: "center",
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "#fef2f2", color: "var(--red)",
          display: "grid", placeItems: "center",
          margin: "0 auto 16px",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 8 }}>Obriši ugovor?</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
          Ugovor sa <strong>{name}</strong> će biti trajno obrisan.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 9,
              background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Odustani
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px", border: "none", borderRadius: 9,
              background: "var(--red)", color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Obriši
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Contract Modal ───────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  editing: Contract | null;
  onClose: () => void;
  onSaved: () => void;
}

function ContractModal({ open, editing, onClose, onSaved }: ModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContractFormData>({ defaultValues: EMPTY_CONTRACT_FORM });

  const [selectedFile,  setSelectedFile]  = useState<File | null>(null);
  const [fileError,     setFileError]     = useState("");
  const [dropHighlight, setDropHighlight] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      reset(editing ? contractToForm(editing) : EMPTY_CONTRACT_FORM);
      setSelectedFile(null);
      setFileError("");
    }
  }, [open, editing, reset]);

  function handleFileSelect(f: File) {
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(f.type)) {
      setFileError("Dozvoljeni formati: PDF, JPG, PNG");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("Maksimalna veličina fajla je 5 MB");
      return;
    }
    setFileError("");
    setSelectedFile(f);
  }

  async function openExistingDoc() {
    if (!editing?.document_path) return;
    const r = await api.get(`${BASE}/${editing.id}/document`, { responseType: "blob" });
    const blob = new Blob([r.data as BlobPart], { type: (r.headers["content-type"] as string) ?? "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    window.open(url, "_blank");
  }

  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: (data: ContractFormData) => {
      const fd = new FormData();
      fd.append("contract_date",     data.contract_date);
      fd.append("contract_type",     data.contract_type);
      fd.append("contracting_party", data.contracting_party);
      if (data.value !== "") fd.append("value", data.value);
      if (data.note  !== "") fd.append("note",  data.note);
      if (selectedFile) fd.append("document", selectedFile);
      if (editing) fd.append("_method", "PUT");
      return editing
        ? api.post(`${BASE}/${editing.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data)
        : api.post(BASE, fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", TENANT] });
      onSaved();
      onClose();
    },
  });

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(.97); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 100, backdropFilter: "blur(2px)" }}
      />

      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(520px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 48px)",
          background: "#fff",
          borderRadius: 20,
          zIndex: 101,
          boxShadow: "0 24px 64px rgba(16,24,40,.18)",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn .2s cubic-bezier(.32,.72,.27,1)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border-soft)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "var(--violet-soft)", color: "var(--violet)",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
                <path d="M9 8h6M9 12h6M9 16h4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111418", lineHeight: 1.2 }}>
                {editing ? "Izmijeni ugovor" : "Novi ugovor"}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                {editing ? editing.contracting_party : "Unesi podatke o ugovoru"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              cursor: "pointer", display: "grid", placeItems: "center",
              color: "var(--muted)", fontSize: 20, lineHeight: 1, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Form body */}
        <form
          id="contract-form"
          onSubmit={handleSubmit((d) => saveMut.mutate(d))}
          style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Datum ugovora + Tip ugovora */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Datum ugovora</label>
              <Controller
                name="contract_date"
                control={control}
                rules={{ required: "Datum je obavezan" }}
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.contract_date && <p style={errStyle}>{errors.contract_date.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Tip ugovora</label>
              <Controller
                name="contract_type"
                control={control}
                rules={{ required: "Tip ugovora je obavezan" }}
                render={({ field }) => (
                  <FormDropdown
                    value={field.value}
                    onChange={field.onChange}
                    options={CONTRACT_TYPES.map((t) => ({ value: t, label: t }))}
                  />
                )}
              />
              {errors.contract_type && <p style={errStyle}>{errors.contract_type.message}</p>}
            </div>
          </div>

          {/* Ugovorna strana */}
          <div>
            <label style={labelStyle}>Ugovorna strana</label>
            <input
              type="text"
              placeholder="Ime osobe ili naziv firme"
              {...register("contracting_party", { required: "Ugovorna strana je obavezna" })}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.contracting_party && <p style={errStyle}>{errors.contracting_party.message}</p>}
          </div>

          {/* Vrijednost */}
          <div>
            <label style={labelStyle}>
              Vrijednost (RSD){" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcionalno)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="npr. 150000"
              {...register("value", {
                validate: (v) => v === "" || !isNaN(Number(v)) || "Unesite ispravan broj",
              })}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.value && <p style={errStyle}>{errors.value.message}</p>}
          </div>

          {/* Napomena */}
          <div>
            <label style={labelStyle}>
              Napomena{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcionalno)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Detalji, uslovi, napomene..."
              {...register("note")}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
              onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Dokument */}
          <div>
            <label style={labelStyle}>
              Dokument ugovora{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(PDF, JPG, PNG — max 5 MB, opcionalno)</span>
            </label>

            {editing?.document_path && !selectedFile && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", marginBottom: 8,
                background: "var(--violet-soft)", border: "1px solid rgba(124,58,237,.2)",
                borderRadius: 9, fontSize: 13,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <span style={{ flex: 1, color: "#374151", fontWeight: 500 }}>Dokument već priložen</span>
                <button
                  type="button"
                  onClick={openExistingDoc}
                  style={{ fontSize: 12, fontWeight: 600, color: "var(--violet)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 6px", fontFamily: "inherit", textDecoration: "underline" }}
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
                border: `2px dashed ${selectedFile ? "var(--violet)" : fileError ? "var(--red)" : dropHighlight ? "var(--violet)" : "var(--border)"}`,
                borderRadius: 10, padding: "18px 16px", textAlign: "center", cursor: "pointer",
                transition: "border-color .15s, background .15s",
                background: selectedFile ? "var(--violet-soft)" : dropHighlight ? "#f5f0ff" : "#fafafa",
              }}
            >
              {selectedFile ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--violet)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setFileError("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(124,58,237,.2)", color: "var(--violet)", cursor: "pointer", fontSize: 13, display: "grid", placeItems: "center", lineHeight: 1, flexShrink: 0 }}
                  >×</button>
                </div>
              ) : (
                <div>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px", display: "block" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Prevucite fajl ovde ili <span style={{ color: "var(--violet)", fontWeight: 600 }}>kliknite za odabir</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 3 }}>
                    {editing?.document_path ? "Odaberite novi fajl da biste zamijenili postojeći" : "PDF, JPG, PNG — do 5 MB"}
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
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
        <div style={{
          padding: "14px 24px 20px",
          borderTop: "1px solid var(--border-soft)",
          display: "flex", gap: 10, justifyContent: "flex-end",
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 18px", border: "1px solid var(--border)", borderRadius: 9,
              background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Odustani
          </button>
          <button
            type="submit"
            form="contract-form"
            disabled={isSubmitting || saveMut.isPending}
            style={{
              padding: "9px 22px", border: "none", borderRadius: 9,
              background: isSubmitting || saveMut.isPending ? "#a78bfa" : "var(--violet)",
              color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {isSubmitting || saveMut.isPending ? "Čuvanje..." : editing ? "Sačuvaj izmjene" : "Dodaj ugovor"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Sort indicator ──────────────────────────────────────────────────────────

function SortIndicator({ isActive, direction }: { isActive: boolean; direction: "asc" | "desc" | null }) {
  if (!isActive) return <IconSort w={12} h={12} style={{ opacity: 0.3, flexShrink: 0 }} />;
  return direction === "asc"
    ? <IconSortAsc w={12} h={12} style={{ color: "var(--violet)", flexShrink: 0 }} />
    : <IconSortDesc w={12} h={12} style={{ color: "var(--violet)", flexShrink: 0 }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UgoвориPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["contracts", TENANT],
    queryFn: ({ signal }) => api.get(BASE, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", TENANT] });
      setDeleteTarget(null);
    },
  });

  const { items: sortedContracts, requestSort, sortConfig } = useSortableData<Contract>(contracts);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(c: Contract) {
    setEditing(c);
    setModalOpen(true);
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 16px",
    textAlign: "left",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    color: "var(--muted)",
    borderBottom: "1px solid var(--border-soft)",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "13px 16px",
    fontSize: 14,
    color: "#111418",
    borderBottom: "1px solid var(--border-soft)",
    verticalAlign: "middle",
  };

  return (
    <PageShell navId="adm">
      {/* Header */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>
            Administracija
          </div>
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
            Ugovori
          </h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
            Pregled i upravljanje ugovorima firme.
          </p>
        </div>

        <button
          onClick={openAdd}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 18px", background: "var(--violet)", color: "#fff",
            border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", marginBottom: 6,
            whiteSpace: "nowrap",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Dodaj ugovor
        </button>
      </div>

      {/* Table */}
      <div style={{ padding: "24px 32px 110px" }}>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>

          {isLoading ? (
            <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              Učitavanje ugovora...
            </div>
          ) : contracts.length === 0 ? (
            <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}>
                <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
                <path d="M9 8h6M9 12h6M9 16h4" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nema ugovora</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>Dodajte prvi ugovor klikom na dugme iznad.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    {([
                      ["contract_date",    "Datum"],
                      ["contract_type",    "Tip ugovora"],
                      ["contracting_party","Ugovorna strana"],
                    ] as const).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => requestSort(key)}
                        style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {label}
                          <SortIndicator
                            isActive={sortConfig?.key === key}
                            direction={sortConfig?.key === key ? sortConfig.direction : null}
                          />
                        </span>
                      </th>
                    ))}
                    <th
                      onClick={() => requestSort("value")}
                      style={{ ...thStyle, textAlign: "right", cursor: "pointer", userSelect: "none" }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                        Vrijednost
                        <SortIndicator
                          isActive={sortConfig?.key === "value"}
                          direction={sortConfig?.key === "value" ? sortConfig.direction : null}
                        />
                      </span>
                    </th>
                    <th style={thStyle}>Napomena</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContracts.map((c) => (
                    <tr
                      key={c.id}
                      style={{ transition: "background .1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          {formatDate(c.contract_date)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--violet)",
                          background: "var(--violet-soft)",
                          whiteSpace: "nowrap",
                        }}>
                          {c.contract_type}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{c.contracting_party}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {c.value
                          ? <span style={{ fontWeight: 600, color: "#111418" }}>{formatValue(c.value)}</span>
                          : <span style={{ color: "var(--muted-2)" }}>—</span>
                        }
                      </td>
                      <td style={{ ...tdStyle, color: "var(--muted)", maxWidth: 220 }}>
                        {c.note ? (
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.note}>
                            {c.note}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted-2)" }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          {c.document_path && (
                            <button
                              onClick={async () => {
                                const r = await api.get(`${BASE}/${c.id}/document`, { responseType: "blob" });
                                const blob = new Blob([r.data as BlobPart], { type: (r.headers["content-type"] as string) ?? "application/octet-stream" });
                                const url = URL.createObjectURL(blob);
                                setTimeout(() => URL.revokeObjectURL(url), 60_000);
                                window.open(url, "_blank");
                              }}
                              title="Pogledaj dokument"
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                border: "1px solid var(--border)", background: "#fff",
                                cursor: "pointer", display: "grid", placeItems: "center",
                                color: "var(--muted)", transition: "all .12s",
                              }}
                              onMouseEnter={(e) => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.borderColor = "rgba(124,58,237,.4)";
                                b.style.color = "var(--violet)";
                                b.style.background = "var(--violet-soft)";
                              }}
                              onMouseLeave={(e) => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.borderColor = "var(--border)";
                                b.style.color = "var(--muted)";
                                b.style.background = "#fff";
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(c)}
                            title="Izmijeni"
                            style={{
                              width: 32, height: 32, borderRadius: 8,
                              border: "1px solid var(--border)", background: "#fff",
                              cursor: "pointer", display: "grid", placeItems: "center",
                              color: "var(--muted)", transition: "all .12s",
                            }}
                            onMouseEnter={(e) => {
                              const b = e.currentTarget as HTMLButtonElement;
                              b.style.borderColor = "var(--violet)";
                              b.style.color = "var(--violet)";
                              b.style.background = "var(--violet-soft)";
                            }}
                            onMouseLeave={(e) => {
                              const b = e.currentTarget as HTMLButtonElement;
                              b.style.borderColor = "var(--border)";
                              b.style.color = "var(--muted)";
                              b.style.background = "#fff";
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            title="Obriši"
                            style={{
                              width: 32, height: 32, borderRadius: 8,
                              border: "1px solid var(--border)", background: "#fff",
                              cursor: "pointer", display: "grid", placeItems: "center",
                              color: "var(--muted)", transition: "all .12s",
                            }}
                            onMouseEnter={(e) => {
                              const b = e.currentTarget as HTMLButtonElement;
                              b.style.borderColor = "#fecaca";
                              b.style.color = "var(--red)";
                              b.style.background = "#fef2f2";
                            }}
                            onMouseLeave={(e) => {
                              const b = e.currentTarget as HTMLButtonElement;
                              b.style.borderColor = "var(--border)";
                              b.style.color = "var(--muted)";
                              b.style.background = "#fff";
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4h6v2" />
                            </svg>
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

        {contracts.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", paddingLeft: 4 }}>
            Ukupno {contracts.length} {contracts.length === 1 ? "ugovor" : contracts.length < 5 ? "ugovora" : "ugovora"}
          </div>
        )}
      </div>

      {/* Modal */}
      <ContractModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {}}
      />

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.contracting_party}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
