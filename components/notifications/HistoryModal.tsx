"use client";

import React, { useState } from "react";
import type { Notification, Sektor } from "@/types/notifications";

const SEKTOR_LABELS: Record<Sektor, string> = {
  vlasnik: "Vlasnik",
  svi: "Svi sektori",
  finansije: "Finansije",
  prodaja: "Prodaja",
  gradiliste: "Gradilište",
  administracija: "Administracija",
};

const SEKTOR_COLORS: Record<Sektor, string> = {
  vlasnik: "#7c3aed",
  svi: "#2563eb",
  finansije: "#16a34a",
  prodaja: "#2563eb",
  gradiliste: "#d97706",
  administracija: "#7c3aed",
};

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  readIds: string[];
  onDelete: (id: string) => void;
  onToggleTask: (id: string) => void;
  onSendNew: () => void;
  onMarkRead: (id: string) => void;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "upravo";
  if (mins < 60) return `pre ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `pre ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "juče";
  return `pre ${days} dana`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("sr-Latn", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryModal({
  open,
  onClose,
  notifications,
  readIds,
  onDelete,
  onToggleTask,
  onSendNew,
  onMarkRead,
}: Props) {
  const [filterSektor, setFilterSektor] = useState<Sektor | "">("");
  const [filterType, setFilterType] = useState<"" | "urgent" | "task">("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!open) return null;

  const filtered = notifications.filter((n) => {
    if (filterSektor && !n.audience.includes(filterSektor) && !n.audience.includes("svi"))
      return false;
    if (filterType === "urgent" && !n.urgent) return false;
    if (filterType === "task" && !n.isTask) return false;
    return true;
  });

  const totalCount = notifications.length;
  const urgentCount = notifications.filter((n) => n.urgent).length;
  const taskCount = notifications.filter((n) => n.isTask).length;
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 720,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.16), 0 0 0 1px rgba(124,58,237,0.08)",
          border: "1px solid #ececec",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #f1f1f1",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "#f1ebff",
                display: "grid",
                placeItems: "center",
                color: "#7c3aed",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
                <path d="M9 8h6M9 12h6M9 16h4" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>Istorija obaveštenja</div>
              <div style={{ fontSize: 12, color: "#8a8f98", marginTop: 1 }}>Sva poslata obaveštenja</div>
            </div>
            <button
              onClick={onSendNew}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 9,
                border: "1px solid rgba(124,58,237,0.35)",
                background: "rgba(124,58,237,0.07)",
                color: "#7c3aed",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Novo obaveštenje
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid #ececec",
                background: "transparent",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                color: "#8a8f98",
                fontSize: 16,
              }}
            >
              ×
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Ukupno", value: totalCount, color: "#111418" },
              { label: "Nepročitano", value: unreadCount, color: unreadCount > 0 ? "#7c3aed" : "#8a8f98" },
              { label: "Hitno", value: urgentCount, color: urgentCount > 0 ? "#dc2626" : "#8a8f98" },
              { label: "Zadaci", value: taskCount, color: taskCount > 0 ? "#2563eb" : "#8a8f98" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "#fafafa",
                  border: "1px solid #f1f1f1",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "#8a8f98", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {/* Sektor filter */}
            <select
              value={filterSektor}
              onChange={(e) => setFilterSektor(e.target.value as Sektor | "")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #ececec",
                background: "#fafafa",
                fontSize: 12.5,
                color: "#4b5563",
                fontFamily: "inherit",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Svi sektori</option>
              <option value="finansije">Finansije</option>
              <option value="prodaja">Prodaja</option>
              <option value="gradiliste">Gradilište</option>
              <option value="administracija">Administracija</option>
            </select>

            {/* Type filters */}
            {(["", "urgent", "task"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: filterType === t ? "1px solid #7c3aed" : "1px solid #ececec",
                  background: filterType === t ? "#f1ebff" : "#fafafa",
                  color: filterType === t ? "#7c3aed" : "#4b5563",
                  fontSize: 12.5,
                  fontWeight: filterType === t ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t === "" ? "Sve" : t === "urgent" ? "⚠️ Hitno" : "☑️ Zadaci"}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm delete dialog */}
        {confirmDeleteId && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.28)",
              backdropFilter: "blur(3px)",
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "28px 28px 22px",
                width: 320,
                boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
                border: "1px solid #ececec",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(220,38,38,0.08)",
                  border: "1px solid rgba(220,38,38,0.2)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 14px",
                  color: "#dc2626",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418", marginBottom: 6 }}>
                Obriši obaveštenje?
              </div>
              <div style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.5, marginBottom: 20 }}>
                Ova akcija je nepovratna. Obaveštenje će biti trajno obrisano.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 9,
                    border: "1px solid #ececec",
                    background: "#fafafa",
                    color: "#4b5563",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Odustani
                </button>
                <button
                  onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 9,
                    border: "1px solid rgba(220,38,38,0.35)",
                    background: "rgba(220,38,38,0.07)",
                    color: "#dc2626",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Da, obriši
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px 24px" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "#8a8f98",
                fontSize: 14,
              }}
            >
              {notifications.length === 0
                ? "Nema poslatih obaveštenja."
                : "Nema obaveštenja za izabrani filter."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((n) => {
                const isUnread = !readIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => onMarkRead(n.id)}
                    style={{
                      padding: "13px 16px",
                      borderRadius: 12,
                      border: n.urgent
                        ? "1px solid rgba(220,38,38,0.25)"
                        : "1px solid #ececec",
                      background: n.urgent
                        ? "rgba(220,38,38,0.025)"
                        : isUnread
                        ? "#fafbff"
                        : "#fff",
                      cursor: "pointer",
                      transition: "background .12s",
                      position: "relative",
                    }}
                  >
                    {/* Unread dot */}
                    {isUnread && (
                      <span
                        style={{
                          position: "absolute",
                          top: 14,
                          right: 42,
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#7c3aed",
                        }}
                      />
                    )}

                    {/* Delete X button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(n.id); }}
                      title="Obriši obaveštenje"
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 10,
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        border: "1px solid transparent",
                        background: "transparent",
                        color: "#c4c8d0",
                        fontSize: 16,
                        lineHeight: 1,
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "inherit",
                        transition: "all .1s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(220,38,38,0.08)";
                        e.currentTarget.style.borderColor = "rgba(220,38,38,0.25)";
                        e.currentTarget.style.color = "#dc2626";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                        e.currentTarget.style.color = "#c4c8d0";
                      }}
                    >
                      ×
                    </button>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                      {/* Badges */}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {n.urgent && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: ".08em",
                              textTransform: "uppercase",
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: "rgba(220,38,38,0.1)",
                              border: "1px solid rgba(220,38,38,0.25)",
                              color: "#dc2626",
                            }}
                          >
                            HITNO
                          </span>
                        )}
                        {n.isTask && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: ".08em",
                              textTransform: "uppercase",
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: "rgba(37,99,235,0.08)",
                              border: "1px solid rgba(37,99,235,0.2)",
                              color: "#2563eb",
                            }}
                          >
                            ZADATAK
                          </span>
                        )}
                        {n.audience.map((aud) => (
                          <span
                            key={aud}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: ".06em",
                              textTransform: "uppercase",
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: `${SEKTOR_COLORS[aud]}12`,
                              color: SEKTOR_COLORS[aud],
                            }}
                          >
                            {SEKTOR_LABELS[aud]}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#111418",
                        marginBottom: n.message ? 4 : 0,
                        lineHeight: 1.35,
                        paddingRight: 20,
                      }}
                    >
                      {n.title}
                    </div>

                    {n.message && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "#4b5563",
                          lineHeight: 1.5,
                          marginBottom: 8,
                        }}
                      >
                        {n.message}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 6,
                      }}
                    >
                      <div style={{ fontSize: 11.5, color: "#b6bac1" }}>
                        {formatDateTime(n.createdAt)} · {relativeTime(n.createdAt)}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {n.isTask && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleTask(n.id); }}
                            style={{
                              padding: "3px 9px",
                              borderRadius: 6,
                              border: n.taskDone ? "1px solid rgba(22,163,74,0.3)" : "1px solid rgba(37,99,235,0.25)",
                              background: n.taskDone ? "rgba(22,163,74,0.07)" : "rgba(37,99,235,0.06)",
                              color: n.taskDone ? "#16a34a" : "#2563eb",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {n.taskDone ? "✓ Završeno" : "Označi završeno"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
