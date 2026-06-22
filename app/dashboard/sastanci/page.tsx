"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import DatePicker from "@/components/ui/DatePicker";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import api from "@/lib/axios";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

interface MeetingReminder {
  id: number;
  meeting_date: string;
  meeting_time: string | null;
  note: string;
  created_at: string;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDay(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("sr-Latn", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function isPast(iso: string): boolean {
  return iso < todayISO();
}

function groupByDate(items: MeetingReminder[]): { date: string; items: MeetingReminder[] }[] {
  const map = new Map<string, MeetingReminder[]>();
  for (const item of items) {
    const key = item.meeting_date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

// ── Custom Time Input ──────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value ? value.split(":") : ["", ""];

  const setH = (hh: string) => onChange(hh && m ? `${hh}:${m || "00"}` : hh ? `${hh}:00` : "");
  const setM = (mm: string) => onChange(h && mm ? `${h}:${mm}` : "");

  const selectStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 9,
    border: "1px solid #ececec",
    background: "#fafafa",
    fontSize: 14,
    color: h || m ? "#111418" : "#b6bac1",
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a8f98' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: 30,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <select value={h ?? ""} onChange={(e) => setH(e.target.value)} style={selectStyle}>
        <option value="">Sat</option>
        {HOURS.map((hh) => <option key={hh} value={hh}>{hh}h</option>)}
      </select>
      <span style={{ color: "var(--muted)", fontWeight: 700, fontSize: 16 }}>:</span>
      <select value={m ?? ""} onChange={(e) => setM(e.target.value)} style={selectStyle} disabled={!h}>
        <option value="">Min</option>
        {MINUTES.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          style={{
            width: 30, height: 30, borderRadius: 7,
            border: "1px solid #ececec", background: "#fafafa",
            color: "var(--muted)", cursor: "pointer",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Centered Modal ─────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  editing: MeetingReminder | null;
  onClose: () => void;
  onSave: (data: { meeting_date: string; meeting_time: string; note: string }) => void;
}

function ReminderModal({ open, editing, onClose, onSave }: ModalProps) {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setDate(editing?.meeting_date ?? todayISO());
      setTime(editing?.meeting_time?.slice(0, 5) ?? "");
      setNote(editing?.note ?? "");
      setTimeout(() => noteRef.current?.focus(), 80);
    }
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const canSave = date.length === 10 && note.trim().length > 0;

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(10,17,36,0.38)",
          backdropFilter: "blur(4px)",
          zIndex: 599,
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(480px, calc(100vw - 32px))",
        maxHeight: "90vh",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 24px 64px rgba(10,17,36,0.18), 0 4px 16px rgba(10,17,36,0.08)",
        zIndex: 600,
        display: "flex", flexDirection: "column",
        animation: "modalIn .22s cubic-bezier(.32,.72,.27,1)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "22px 24px 18px",
          borderBottom: "1px solid #f1f1f1",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--violet-soft)",
              display: "grid", placeItems: "center",
              color: "var(--violet)", flexShrink: 0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>
                {editing ? "Uredi podsetnik" : "Novi podsetnik"}
              </div>
              <div style={{ fontSize: 12, color: "#8a8f98", marginTop: 1 }}>
                Zakaži sastanak ili obavezu
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            border: "1px solid #ececec", background: "transparent",
            cursor: "pointer", display: "grid", placeItems: "center",
            color: "#8a8f98", fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 700,
              letterSpacing: ".12em", textTransform: "uppercase" as const,
              color: "var(--violet)", marginBottom: 6,
            }}>Datum sastanka</label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 700,
              letterSpacing: ".12em", textTransform: "uppercase" as const,
              color: "var(--violet)", marginBottom: 6,
            }}>
              Vrijeme{" "}
              <span style={{ fontWeight: 400, color: "#b6bac1", textTransform: "none" as const }}>(opciono)</span>
            </label>
            <TimeInput value={time} onChange={setTime} />
          </div>

          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 700,
              letterSpacing: ".12em", textTransform: "uppercase" as const,
              color: "var(--violet)", marginBottom: 6,
            }}>Napomena / obaveza</label>
            <textarea
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Unesite detalje sastanka ili obaveze..."
              style={{
                width: "100%", padding: "10px 12px",
                borderRadius: 9, border: "1px solid #ececec",
                background: "#fafafa", fontSize: 13.5,
                color: "#111418", outline: "none",
                fontFamily: "inherit", resize: "vertical" as const,
                lineHeight: 1.55, boxSizing: "border-box" as const,
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.target.style.borderColor = "#ececec")}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px 20px",
          borderTop: "1px solid #f1f1f1",
          display: "flex", gap: 8, justifyContent: "flex-end",
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 9,
            border: "1px solid #ececec", background: "#fafafa",
            color: "#4b5563", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>Otkaži</button>
          <button
            onClick={() => canSave && onSave({ meeting_date: date, meeting_time: time, note: note.trim() })}
            disabled={!canSave}
            style={{
              padding: "9px 22px", borderRadius: 9,
              border: canSave ? "1px solid rgba(124,58,237,0.4)" : "1px solid #ececec",
              background: canSave ? "rgba(124,58,237,0.1)" : "#f5f5f5",
              color: canSave ? "var(--violet)" : "#b6bac1",
              fontSize: 13, fontWeight: 700,
              cursor: canSave ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {editing ? "Sačuvaj izmjene" : "Dodaj podsetnik"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Reminder Row ──────────────────────────────────────────────────────────

function ReminderRow({ r, onEdit, onDelete }: {
  r: MeetingReminder;
  onEdit: (r: MeetingReminder) => void;
  onDelete: (id: number) => void;
}) {
  const past = isPast(r.meeting_date);
  const [hovEdit, setHovEdit]     = useState(false);
  const [hovDelete, setHovDelete] = useState(false);

  return (
    <div style={{
      display: "flex", alignItems: "flex-start",
      gap: 14, padding: "14px 16px",
      borderRadius: 12,
      background: past ? "#fafafa" : "#fff",
      border: `1px solid ${past ? "#f0f0f0" : "#ececec"}`,
      opacity: past ? 0.65 : 1,
    }}>
      {/* Time column */}
      <div style={{ flexShrink: 0, width: 50, textAlign: "center" as const, paddingTop: 2 }}>
        {r.meeting_time ? (
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--violet)", lineHeight: 1.1 }}>
            {r.meeting_time.slice(0, 5)}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--muted-2)" }}>—</div>
        )}
        {past && (
          <div style={{ fontSize: 10, color: "var(--muted-2)", marginTop: 3 }}>prošlo</div>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: "stretch", background: past ? "#e8e8e8" : "var(--violet-soft)", flexShrink: 0 }} />

      {/* Note */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#111418", lineHeight: 1.5, whiteSpace: "pre-wrap" as const }}>
          {r.note}
        </p>
      </div>

      {/* Icon action buttons */}
      <div style={{ display: "flex", gap: 5, flexShrink: 0, paddingTop: 1 }}>
        <button
          onClick={() => onEdit(r)}
          onMouseEnter={() => setHovEdit(true)}
          onMouseLeave={() => setHovEdit(false)}
          title="Uredi"
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: `1px solid ${hovEdit ? "var(--brand)" : "#ececec"}`,
            background: hovEdit ? "var(--brand-soft)" : "#fafafa",
            color: hovEdit ? "var(--brand)" : "var(--muted)",
            cursor: "pointer", display: "grid", placeItems: "center",
            transition: "all .12s",
          }}
        >
          <IconPencil w={14} h={14} />
        </button>
        <button
          onClick={() => onDelete(r.id)}
          onMouseEnter={() => setHovDelete(true)}
          onMouseLeave={() => setHovDelete(false)}
          title="Obriši"
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: `1px solid ${hovDelete ? "#fca5a5" : "#ececec"}`,
            background: hovDelete ? "#fff1f1" : "#fafafa",
            color: hovDelete ? "#dc2626" : "var(--muted)",
            cursor: "pointer", display: "grid", placeItems: "center",
            transition: "all .12s",
          }}
        >
          <IconTrash w={14} h={14} />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SastanciPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<MeetingReminder | null>(null);

  const { data: reminders = [], isLoading } = useQuery<MeetingReminder[]>({
    queryKey: ["meeting-reminders", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/meeting-reminders`, { signal }).then((r) => r.data),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["meeting-reminders", TENANT] });

  const createMutation = useMutation({
    mutationFn: (data: { meeting_date: string; meeting_time: string; note: string }) =>
      api.post(`/api/${TENANT}/meeting-reminders`, data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { meeting_date: string; meeting_time: string; note: string } }) =>
      api.put(`/api/${TENANT}/meeting-reminders/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/${TENANT}/meeting-reminders/${id}`),
    onSuccess: invalidate,
  });

  const handleSave = (data: { meeting_date: string; meeting_time: string; note: string }) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else         createMutation.mutate(data);
    setModalOpen(false);
    setEditing(null);
  };

  const today = todayISO();
  const upcoming = reminders.filter((r) => r.meeting_date >= today);
  const past     = reminders.filter((r) => r.meeting_date < today);

  const upcomingGroups = groupByDate(upcoming);
  const pastGroups     = groupByDate([...past].reverse());

  return (
    <PageShell navId="dash">
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--hero-padding, 8px 32px 6px)",
        flexWrap: "wrap" as const, gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: "var(--hero-h1, 32px)", fontWeight: 700,
            margin: "8px 0 4px", letterSpacing: "-0.02em",
          }}>
            Podsetnici za sastanke
          </h1>
          <p style={{ margin: 0, color: "#2a2f37", fontSize: "var(--hero-p, 15.5px)" }}>
            {upcoming.length > 0
              ? `${upcoming.length} predstojeć${upcoming.length === 1 ? "i" : "ih"} podsetnik${upcoming.length === 1 ? "" : upcoming.length >= 2 && upcoming.length <= 4 ? "a" : "a"}`
              : "Predstojeći i prošli podsetnici"}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 12,
            background: "var(--violet)", color: "#fff",
            border: "none", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(124,58,237,0.25)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Dodaj podsetnik
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "var(--content-padding, 16px 32px 100px)", display: "flex", flexDirection: "column", gap: 32 }}>

        {isLoading && (
          <div style={{ padding: "40px 0", textAlign: "center" as const, color: "var(--muted)", fontSize: 15 }}>
            Učitavanje...
          </div>
        )}

        {!isLoading && reminders.length === 0 && (
          <div style={{
            textAlign: "center" as const, padding: "60px 24px",
            color: "var(--muted)", fontSize: 15, lineHeight: 1.7,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            Nema podsetnika.<br />
            Dodaj prvi klikom na dugme iznad.
          </div>
        )}

        {/* Predstojeći */}
        {upcomingGroups.length > 0 && (
          <section>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
              textTransform: "uppercase" as const,
              color: "var(--violet)", marginBottom: 14,
            }}>
              Predstojeći · {upcoming.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {upcomingGroups.map(({ date, items }) => (
                <div key={date}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "var(--muted)",
                    marginBottom: 8, paddingLeft: 4,
                    textTransform: "capitalize" as const,
                  }}>
                    {fmtDay(date)}
                    {date === today && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, fontWeight: 700,
                        padding: "2px 7px", borderRadius: 4,
                        background: "var(--violet-soft)", color: "var(--violet)",
                        letterSpacing: ".06em", textTransform: "uppercase" as const,
                      }}>Danas</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((r) => (
                      <ReminderRow
                        key={r.id} r={r}
                        onEdit={(r) => { setEditing(r); setModalOpen(true); }}
                        onDelete={(id) => deleteMutation.mutate(id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prošli */}
        {pastGroups.length > 0 && (
          <section>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
              textTransform: "uppercase" as const,
              color: "var(--muted)", marginBottom: 14,
            }}>
              Prošli · {past.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {pastGroups.map(({ date, items }) => (
                <div key={date}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "var(--muted-2)",
                    marginBottom: 8, paddingLeft: 4,
                    textTransform: "capitalize" as const,
                  }}>
                    {fmtDay(date)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((r) => (
                      <ReminderRow
                        key={r.id} r={r}
                        onEdit={(r) => { setEditing(r); setModalOpen(true); }}
                        onDelete={(id) => deleteMutation.mutate(id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <ReminderModal
        open={modalOpen}
        editing={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
      />
    </PageShell>
  );
}
