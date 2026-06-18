"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import { IconSortAsc, IconSortDesc, IconSort } from "@/components/ui/icons";
import { useSortableData } from "@/hooks/useSortableData";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParentRef { id: number; name: string }

interface DictItem {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  sector_id?: number | null;
  sector?: ParentRef | null;
  organizational_unit_id?: number | null;
  organizational_unit?: (ParentRef & { sector?: ParentRef | null }) | null;
}

type SortableDictItem = DictItem & { parent_name: string };

type ParentKey = "sector_id" | "organizational_unit_id";
type TabId     = "sektori" | "jedinice" | "kategorije";

interface TabConfig {
  id:             TabId;
  label:          string;
  endpoint:       string;
  addLabel:       string;
  entityLabel:    string;
  parentEndpoint?: string;
  parentLabel?:    string;
  parentKey?:      ParentKey;
  parentColumn?:   string;
}

const TABS: TabConfig[] = [
  {
    id:          "sektori",
    label:       "Sektori",
    endpoint:    `/api/${TENANT}/sifrarnici/sektori`,
    addLabel:    "Dodaj sektor",
    entityLabel: "sektor",
  },
  {
    id:             "jedinice",
    label:          "Organizacione jedinice",
    endpoint:       `/api/${TENANT}/sifrarnici/jedinice`,
    addLabel:       "Dodaj jedinicu",
    entityLabel:    "jedinicu",
    parentEndpoint: `/api/${TENANT}/sifrarnici/sektori`,
    parentLabel:    "Sektor",
    parentKey:      "sector_id",
    parentColumn:   "Pripada Sektoru",
  },
  {
    id:             "kategorije",
    label:          "Kategorije troškova",
    endpoint:       `/api/${TENANT}/sifrarnici/kategorije`,
    addLabel:       "Dodaj kategoriju",
    entityLabel:    "kategoriju",
    parentEndpoint: `/api/${TENANT}/sifrarnici/jedinice`,
    parentLabel:    "Organizaciona jedinica",
    parentKey:      "organizational_unit_id",
    parentColumn:   "Pripada Jedinici",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sr-Latn", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ─── Inline styles ────────────────────────────────────────────────────────────

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

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid var(--border)",
  borderRadius: 9,
  fontSize: 14,
  color: "#111418",
  background: "#fff",
  fontFamily: "inherit",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a8f98' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
};

// ─── SortIndicator ────────────────────────────────────────────────────────────

function SortIndicator({ isActive, direction }: { isActive: boolean; direction: "asc" | "desc" | null }) {
  if (!isActive) return <IconSort w={12} h={12} style={{ opacity: 0.3, flexShrink: 0 }} />;
  return direction === "asc"
    ? <IconSortAsc w={12} h={12} style={{ color: "var(--violet)", flexShrink: 0 }} />
    : <IconSortDesc w={12} h={12} style={{ color: "var(--violet)", flexShrink: 0 }} />;
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 18, padding: "32px 28px 24px", width: 380, zIndex: 201, boxShadow: "0 20px 60px rgba(16,24,40,.18)", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fef2f2", color: "var(--red)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 8 }}>Obriši stavku?</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
          Stavka <strong>{name}</strong> će biti trajno obrisana.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Odustani</button>
          <button onClick={onConfirm} style={{ padding: "9px 20px", border: "none", borderRadius: 9, background: "var(--red)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Obriši</button>
        </div>
      </div>
    </>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface ItemFormData { name: string; parent_id: string }

interface ItemModalProps {
  open:            boolean;
  editing:         DictItem | null;
  entityLabel:     string;
  endpoint:        string;
  parentEndpoint?: string;
  parentLabel?:    string;
  parentKey?:      ParentKey;
  onClose:         () => void;
  onSaved:         () => void;
}

function ItemModal({
  open, editing, entityLabel, endpoint,
  parentEndpoint, parentLabel, parentKey,
  onClose, onSaved,
}: ItemModalProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ItemFormData>({
    defaultValues: { name: "", parent_id: "" },
  });
  const [apiError, setApiError] = useState("");

  const { data: parentOptions = [] } = useQuery<DictItem[]>({
    queryKey: ["dict-parent", parentEndpoint],
    queryFn: ({ signal }) => api.get(parentEndpoint!, { signal }).then((r) => r.data),
    enabled: open && !!parentEndpoint,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (open) {
      const existingParentId = editing
        ? String(editing.sector_id ?? editing.organizational_unit_id ?? "")
        : "";
      reset({ name: editing?.name ?? "", parent_id: existingParentId });
      setApiError("");
    }
  }, [open, editing, reset]);

  async function onSubmit({ name, parent_id }: ItemFormData) {
    setApiError("");
    try {
      const payload: Record<string, string | number> = { name };
      if (parentKey && parent_id) payload[parentKey] = Number(parent_id);

      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      onSaved();
      onClose();
    } catch {
      setApiError("Greška pri čuvanju. Naziv možda već postoji.");
    }
  }

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,17,36,.42)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 18, padding: "28px 28px 24px", width: 440, zIndex: 201, boxShadow: "0 20px 60px rgba(16,24,40,.18)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>
                {editing ? `Izmijeni ${entityLabel}` : `Novi ${entityLabel}`}
              </div>
              {editing && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{editing.name}</div>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 20 }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Parent select (jedinice + kategorije) */}
          {parentEndpoint && parentLabel && parentKey && (
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                {parentLabel}
              </label>
              <select
                {...register("parent_id", { required: `${parentLabel} je obavezan` })}
                style={{ ...selectStyle, borderColor: errors.parent_id ? "var(--red)" : "var(--border)" }}
              >
                <option value="">Odaberite {parentLabel.toLowerCase()}...</option>
                {parentOptions.map((opt) => (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.name}
                    {opt.sector ? ` (${opt.sector.name})` : ""}
                  </option>
                ))}
              </select>
              {errors.parent_id && <p style={{ color: "var(--red)", fontSize: 12, margin: "4px 0 0" }}>{errors.parent_id.message}</p>}
            </div>
          )}

          {/* Name input */}
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Naziv</label>
            <input
              type="text"
              autoFocus={!parentEndpoint}
              placeholder="Unesite naziv..."
              {...register("name", { required: "Naziv je obavezan" })}
              style={{
                width: "100%", padding: "9px 12px",
                border: `1.5px solid ${errors.name ? "var(--red)" : "var(--border)"}`,
                borderRadius: 9, fontSize: 14, color: "#111418",
                background: "#fff", fontFamily: "inherit",
                outline: "none", boxSizing: "border-box", transition: "border-color .15s",
              }}
              onFocus={(e) => { if (!errors.name) e.target.style.borderColor = "var(--violet)"; }}
              onBlur={(e) => { if (!errors.name) e.target.style.borderColor = "var(--border)"; }}
            />
            {errors.name && <p style={{ color: "var(--red)", fontSize: 12, margin: "4px 0 0" }}>{errors.name.message}</p>}
          </div>

          {apiError && (
            <div style={{ padding: "10px 14px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca", color: "var(--red)", fontSize: 13 }}>
              {apiError}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 18px", border: "1px solid var(--border)", borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Odustani</button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: isSubmitting ? "#a78bfa" : "var(--violet)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {isSubmitting ? "Čuvanje..." : editing ? "Sačuvaj izmene" : "Dodaj"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Dictionary Section ───────────────────────────────────────────────────────

interface DictionarySectionProps {
  endpoint:        string;
  addLabel:        string;
  entityLabel:     string;
  parentEndpoint?: string;
  parentLabel?:    string;
  parentKey?:      ParentKey;
  parentColumn?:   string;
}

function DictionarySection({
  endpoint, addLabel, entityLabel,
  parentEndpoint, parentLabel, parentKey, parentColumn,
}: DictionarySectionProps) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState<DictItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DictItem | null>(null);

  const { data: items = [], isLoading } = useQuery<DictItem[]>({
    queryKey: ["dict", endpoint],
    queryFn: ({ signal }) => api.get(endpoint, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const sortableItems = useMemo<SortableDictItem[]>(
    () => items.map((item) => ({
      ...item,
      parent_name: item.sector?.name ?? item.organizational_unit?.name ?? "",
    })),
    [items]
  );

  const { items: sortedItems, requestSort, sortConfig } = useSortableData<SortableDictItem>(sortableItems);

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dict", endpoint] });
      setDeleteTarget(null);
    },
  });

  function refresh() { qc.invalidateQueries({ queryKey: ["dict", endpoint] }); }
  function openAdd() { setEditTarget(null); setModalOpen(true); }
  function openEdit(item: DictItem) { setEditTarget(item); setModalOpen(true); }

  return (
    <>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={openAdd}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--violet)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          {addLabel}
        </button>
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Učitavanje...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: "72px 0", textAlign: "center", color: "var(--muted)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 14px", display: "block", opacity: 0.3 }}>
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nema stavki</p>
            <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>Dodajte prvu stavku klikom na dugme iznad.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#fafafa" }}>
                <tr>
                  {/* ID */}
                  <th onClick={() => requestSort("id")} style={{ ...thStyle, cursor: "pointer", userSelect: "none", width: 80 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      ID <SortIndicator isActive={sortConfig?.key === "id"} direction={sortConfig?.key === "id" ? sortConfig.direction : null} />
                    </span>
                  </th>
                  {/* Naziv */}
                  <th onClick={() => requestSort("name")} style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      Naziv <SortIndicator isActive={sortConfig?.key === "name"} direction={sortConfig?.key === "name" ? sortConfig.direction : null} />
                    </span>
                  </th>
                  {/* Parent column (jedinice + kategorije only) */}
                  {parentColumn && (
                    <th onClick={() => requestSort("parent_name")} style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {parentColumn} <SortIndicator isActive={sortConfig?.key === "parent_name"} direction={sortConfig?.key === "parent_name" ? sortConfig.direction : null} />
                      </span>
                    </th>
                  )}
                  {/* Kreirano */}
                  <th onClick={() => requestSort("created_at")} style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      Kreirano <SortIndicator isActive={sortConfig?.key === "created_at"} direction={sortConfig?.key === "created_at" ? sortConfig.direction : null} />
                    </span>
                  </th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr
                    key={item.id}
                    style={{ transition: "background .1s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    <td style={{ ...tdStyle, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>#{item.id}</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{item.name}</td>
                    {parentColumn && (
                      <td style={tdStyle}>
                        {item.parent_name ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "var(--violet)", background: "var(--violet-soft)", whiteSpace: "nowrap" }}>
                            {item.parent_name}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted-2)" }}>—</span>
                        )}
                      </td>
                    )}
                    <td style={{ ...tdStyle, color: "var(--muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontSize: 13 }}>
                      {fmtDate(item.created_at)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          onClick={() => openEdit(item)}
                          title="Izmijeni"
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--violet)"; b.style.color = "var(--violet)"; b.style.background = "var(--violet-soft)"; }}
                          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Obriši"
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", transition: "all .12s" }}
                          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "#fecaca"; b.style.color = "var(--red)"; b.style.background = "#fef2f2"; }}
                          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "#fff"; }}
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

      {!isLoading && items.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", paddingLeft: 4 }}>
          Ukupno {items.length} {items.length === 1 ? "stavka" : "stavki"}
        </div>
      )}

      <ItemModal
        open={modalOpen}
        editing={editTarget}
        entityLabel={entityLabel}
        endpoint={endpoint}
        parentEndpoint={parentEndpoint}
        parentLabel={parentLabel}
        parentKey={parentKey}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SifarniciPage() {
  const [activeTab, setActiveTab] = useState<TabId>("sektori");
  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <PageShell navId="adm">
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)" }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Administracija</div>
        <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>Šifarnici</h1>
        <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
          Hijerarhijsko upravljanje sektorima, organizacionim jedinicama i kategorijama troškova.
        </p>
      </div>

      <div style={{ padding: "24px 32px 110px" }}>
        {/* Hierarchy info banner */}
        <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "var(--violet-soft)", border: "1px solid #ddd6fe", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 13, color: "var(--violet)", fontWeight: 500 }}>
            Hijerarhija: <strong>Sektor</strong> → <strong>Organizaciona jedinica</strong> → <strong>Kategorija troška</strong>
          </span>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingLeft: 2 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "9px 18px",
                  border: "none",
                  borderBottom: isActive ? "2px solid var(--violet)" : "2px solid transparent",
                  background: "transparent",
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--violet)" : "var(--muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginBottom: -1,
                  transition: "color .12s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        <DictionarySection
          key={active.id}
          endpoint={active.endpoint}
          addLabel={active.addLabel}
          entityLabel={active.entityLabel}
          parentEndpoint={active.parentEndpoint}
          parentLabel={active.parentLabel}
          parentKey={active.parentKey}
          parentColumn={active.parentColumn}
        />
      </div>
    </PageShell>
  );
}
