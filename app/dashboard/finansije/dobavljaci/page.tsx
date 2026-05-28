"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import type { Supplier, SupplierFormData } from "@/types/supplier";
import { EMPTY_SUPPLIER_FORM } from "@/types/supplier";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const BASE = `/api/${TENANT}/finansije/suppliers`;

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid var(--border)", borderRadius: 9,
  fontSize: 14, color: "#111418", background: "#fff",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12.5, fontWeight: 600,
  color: "#374151", marginBottom: 5,
};

const errStyle: React.CSSProperties = {
  color: "var(--red)", fontSize: 12, margin: "4px 0 0",
};

function supplierToForm(s: Supplier): SupplierFormData {
  return {
    name:         s.name,
    pib:          s.pib ?? "",
    maticni_broj: s.maticni_broj ?? "",
    address:      s.address ?? "",
    phone:        s.phone ?? "",
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      background: "#111418", color: "#fff", borderRadius: 10,
      padding: "11px 20px", fontSize: 14, fontWeight: 500,
      boxShadow: "0 8px 28px rgba(16,24,40,.22)",
      zIndex: 300, whiteSpace: "nowrap",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {message}
    </div>
  );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff", borderRadius: 18, padding: "32px 28px 24px",
        width: 380, zIndex: 201, boxShadow: "0 20px 60px rgba(16,24,40,.18)",
        textAlign: "center",
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fef2f2", color: "var(--red)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 8 }}>Obriši dobavljača?</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
          <strong>{name}</strong> će biti trajno obrisan zajedno sa svim podacima.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Odustani</button>
          <button onClick={onConfirm} style={{ padding: "9px 20px", border: "none", borderRadius: 9, background: "var(--red)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Obriši</button>
        </div>
      </div>
    </>
  );
}

// ─── Supplier slide-over (create + edit) ──────────────────────────────────────

interface SlideOverProps {
  open: boolean;
  editing: Supplier | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}

function SupplierSlideOver({ open, editing, onClose, onSaved }: SlideOverProps) {
  const firstRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<SupplierFormData>({ defaultValues: EMPTY_SUPPLIER_FORM });

  useEffect(() => {
    if (open) {
      reset(editing ? supplierToForm(editing) : EMPTY_SUPPLIER_FORM);
      setTimeout(() => firstRef.current?.focus(), 80);
    }
  }, [open, editing, reset]);

  const saveMut = useMutation({
    mutationFn: (data: SupplierFormData) => {
      const payload = {
        name:         data.name,
        pib:          data.pib          === "" ? null : data.pib,
        maticni_broj: data.maticni_broj === "" ? null : data.maticni_broj,
        address:      data.address      === "" ? null : data.address,
        phone:        data.phone        === "" ? null : data.phone,
      };
      return editing
        ? api.put(`${BASE}/${editing.id}`, payload).then((r) => r.data as Supplier)
        : api.post(BASE, payload).then((r) => r.data as Supplier);
    },
    onSuccess: (s: Supplier) => {
      qc.invalidateQueries({ queryKey: ["suppliers", TENANT] });
      onSaved(s.name);
      onClose();
    },
  });

  if (!open) return null;

  return (
    <>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 460, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(16,24,40,.14)", animation: "slideInRight .25s cubic-bezier(.32,.72,.27,1)" }}>
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>{editing ? "Izmijeni dobavljača" : "Nov dobavljač"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{editing ? editing.name : "Dodaj novog dobavljača"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 20 }}>×</button>
        </div>

        {/* Form */}
        <form id="supplier-form" onSubmit={handleSubmit((d) => saveMut.mutate(d))} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Naziv firme</label>
            <input
              type="text" placeholder="npr. TERMOKLIMA PLUS d.o.o."
              {...register("name", { required: "Naziv je obavezan" })}
              ref={(e) => { register("name").ref(e); (firstRef as React.MutableRefObject<HTMLInputElement | null>).current = e; }}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {errors.name && <p style={errStyle}>{errors.name.message}</p>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>PIB <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
              <input type="text" placeholder="123456789" {...register("pib")} style={{ ...inputStyle, fontFamily: "var(--font-geist-mono), monospace" }} onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <div>
              <label style={labelStyle}>Matični broj <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
              <input type="text" placeholder="12345678" {...register("maticni_broj")} style={{ ...inputStyle, fontFamily: "var(--font-geist-mono), monospace" }} onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Adresa <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
            <input type="text" placeholder="Ulica i broj, grad" {...register("address")} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          </div>

          <div>
            <label style={labelStyle}>Telefon <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opciono)</span></label>
            <input type="text" placeholder="+381 60 123 4567" {...register("phone")} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "var(--green)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
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
          <button type="submit" form="supplier-form" disabled={isSubmitting || saveMut.isPending} style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: isSubmitting || saveMut.isPending ? "#4ade80" : "var(--green)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isSubmitting || saveMut.isPending ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {isSubmitting || saveMut.isPending ? "Čuvanje..." : editing ? "Sačuvaj izmene" : "Dodaj dobavljača"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DobavljaciPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers", TENANT, debouncedSearch],
    queryFn: ({ signal }) =>
      api.get(`${BASE}?search=${encodeURIComponent(debouncedSearch)}`, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers", TENANT] });
      setDeleteTarget(null);
      setToast("Dobavljač je obrisan.");
    },
  });

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
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>Dobavljači</h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>Evidencija i upravljanje dobavljačima firme.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setSlideOpen(true); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--green)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 6, whiteSpace: "nowrap" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Nov dobavljač
        </button>
      </div>

      <div style={{ padding: "24px 32px 110px" }}>
        {/* Search */}
        <div style={{ marginBottom: 16, position: "relative", maxWidth: 400 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text" placeholder="Pretraži po nazivu ili PIB-u..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 38 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          {isLoading ? (
            <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Učitavanje dobavljača...</div>
          ) : suppliers.length === 0 ? (
            <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{search ? `Nema rezultata za "${search}"` : "Nema dobavljača"}</p>
              {!search && <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>Dodajte prvog dobavljača klikom na dugme iznad.</p>}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    <th style={thStyle}>Naziv firme</th>
                    <th style={thStyle}>PIB</th>
                    <th style={thStyle}>Matični broj</th>
                    <th style={thStyle}>Adresa</th>
                    <th style={thStyle}>Telefon</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} style={{ transition: "background .1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{s.name}</td>
                      <td style={{ ...tdStyle, fontFamily: "var(--font-geist-mono), monospace", fontSize: 13 }}>
                        {s.pib ?? <span style={{ color: "var(--muted-2)" }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "var(--font-geist-mono), monospace", fontSize: 13 }}>
                        {s.maticni_broj ?? <span style={{ color: "var(--muted-2)" }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, color: "var(--muted)", maxWidth: 200 }}>
                        {s.address ? <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.address}>{s.address}</span> : <span style={{ color: "var(--muted-2)" }}>—</span>}
                      </td>
                      <td style={tdStyle}>{s.phone ?? <span style={{ color: "var(--muted-2)" }}>—</span>}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button onClick={() => { setEditing(s); setSlideOpen(true); }} title="Izmijeni"
                            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--green)"; b.style.color = "var(--green)"; b.style.background = "var(--green-soft)"; }}
                            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" /></svg>
                          </button>
                          <button onClick={() => setDeleteTarget(s)} title="Obriši"
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

        {suppliers.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", paddingLeft: 4 }}>
            {suppliers.length} {suppliers.length === 1 ? "dobavljač" : suppliers.length < 5 ? "dobavljača" : "dobavljača"}
          </div>
        )}
      </div>

      <SupplierSlideOver
        open={slideOpen}
        editing={editing}
        onClose={() => setSlideOpen(false)}
        onSaved={(name) => setToast(editing ? `"${name}" uspješno ažuriran.` : `Dobavljač "${name}" dodan.`)}
      />

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </PageShell>
  );
}
