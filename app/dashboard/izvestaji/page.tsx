"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import { useUser } from "@/lib/useUser";
import CustomSelect from "@/components/ui/CustomSelect";
import api from "@/lib/axios";
import type { AppNotification, PaginatedNotifications } from "@/types/notification";

const T = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

const PER_PAGE_OPTIONS = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function relativeTime(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 5) return "upravo";
  const rtf = new Intl.RelativeTimeFormat("sr-Latn", { numeric: "auto" });
  if (diffSec < 3600)  return rtf.format(-Math.floor(diffSec / 60), "minute");
  if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), "hour");
  return rtf.format(-Math.floor(diffSec / 86400), "day");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("sr-Latn", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Danas";
  if (sameDay(date, yesterday)) return "Juče";
  return date.toLocaleDateString("sr-Latn", { day: "numeric", month: "long", year: "numeric" });
}

function groupByDay(items: AppNotification[]): [string, AppNotification[]][] {
  const map = new Map<string, AppNotification[]>();
  for (const item of items) {
    const key = dayLabel(item.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries());
}

// ── ReportModal ────────────────────────────────────────────────────────────

function ReportModal({ report: r, onClose }: { report: AppNotification; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(10,17,36,.42)",
          backdropFilter: "blur(3px)",
          zIndex: 599,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(620px, calc(100vw - 32px))",
          maxHeight: "82vh",
          background: "#fff",
          borderRadius: 18,
          zIndex: 600,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(16,24,40,.18), 0 4px 16px rgba(16,24,40,.08)",
          animation: "modalFadeIn .2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            flexShrink: 0,
          }}
        >
          {/* Sender avatar */}
          <div
            style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: r.urgent ? "#fee2e2" : "var(--brand-soft)",
              color: r.urgent ? "#dc2626" : "var(--brand)",
              display: "grid", placeItems: "center",
              fontSize: 13, fontWeight: 700,
            }}
          >
            {getInitials(r.sender_name)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as React.CSSProperties["flexWrap"] }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111418" }}>
                {r.sender_name}
              </span>
              {r.urgent && (
                <span
                  style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                    background: "#fee2e2", color: "#dc2626",
                    letterSpacing: ".07em", textTransform: "uppercase" as React.CSSProperties["textTransform"],
                  }}
                >
                  Hitno
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 18, fontWeight: 700, color: "#111418",
                letterSpacing: "-0.01em", marginTop: 3, lineHeight: 1.3,
              }}
            >
              {r.title}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5 }}>
              {formatDate(r.created_at)}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent", cursor: "pointer",
              display: "grid", placeItems: "center",
              color: "var(--muted)", fontSize: 18, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px 28px", overflowY: "auto", flex: 1 }}>
          {r.content ? (
            <p
              style={{
                margin: 0,
                fontSize: 14.5,
                color: "#374151",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap" as React.CSSProperties["whiteSpace"],
              }}
            >
              {r.content}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted-2)", fontStyle: "italic" }}>
              Ovaj izvještaj nema sadržaja.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// ── ReportCard ─────────────────────────────────────────────────────────────

function ReportCard({
  report: r,
  onOpen,
  isLast,
}: {
  report: AppNotification;
  onOpen: () => void;
  isLast: boolean;
}) {
  const defaultBorder = r.urgent ? "#fecaca" : !r.is_read ? "#c4b5fd" : "var(--border-soft)";

  return (
    <li
      style={{
        position: "relative",
        paddingLeft: 28,
        paddingBottom: isLast ? 0 : 14,
      }}
    >
      {/* Vertical connector */}
      {!isLast && (
        <span
          style={{
            position: "absolute", left: 5, top: 16,
            width: 1.5, bottom: 0,
            background: "var(--border-soft)", display: "block",
          }}
        />
      )}

      {/* Dot */}
      <span
        style={{
          position: "absolute", left: 0, top: 6,
          width: 12, height: 12, borderRadius: "50%",
          background: r.urgent ? "#dc2626" : "var(--brand)",
          boxShadow: "0 0 0 3px #f5f6f8",
          display: "block", zIndex: 1,
        }}
      />

      {/* Card */}
      <div
        onClick={onOpen}
        style={{
          background: r.urgent ? "#fff8f8" : !r.is_read ? "#faf9ff" : "#fff",
          border: `1px solid ${defaultBorder}`,
          borderRadius: 10,
          padding: "12px 16px",
          cursor: "pointer",
          boxShadow: "var(--shadow-card)",
          transition: "border-color .15s, box-shadow .15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = r.urgent ? "#f87171" : "var(--brand)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 10px rgba(37,99,235,.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = defaultBorder;
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-card)";
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
            {/* Avatar */}
            <div
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: r.urgent ? "#fee2e2" : "var(--brand-soft)",
                color: r.urgent ? "#dc2626" : "var(--brand)",
                display: "grid", placeItems: "center",
                fontSize: 11, fontWeight: 700,
              }}
            >
              {getInitials(r.sender_name)}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" as React.CSSProperties["flexWrap"] }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
                  {r.sender_name}
                </span>
                {r.urgent && (
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                      background: "#fee2e2", color: "#dc2626",
                      letterSpacing: ".07em", textTransform: "uppercase" as React.CSSProperties["textTransform"],
                      whiteSpace: "nowrap" as React.CSSProperties["whiteSpace"],
                    }}
                  >
                    Hitno
                  </span>
                )}
                {!r.is_read && (
                  <span
                    style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: r.urgent ? "#dc2626" : "var(--brand)",
                      display: "inline-block", flexShrink: 0,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: 14.5, fontWeight: !r.is_read ? 700 : 600,
                  color: "#111418", marginTop: 1,
                  whiteSpace: "nowrap" as React.CSSProperties["whiteSpace"],
                  overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {r.title}
              </div>
            </div>
          </div>

          <span style={{ flexShrink: 0, fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" as React.CSSProperties["whiteSpace"], marginTop: 2 }}>
            {relativeTime(r.created_at)}
          </span>
        </div>

        {/* Content preview — always 3 lines, uniform height */}
        {r.content ? (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
            <div
              style={{
                fontSize: 13.5,
                color: "#374151",
                lineHeight: 1.65,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
              }}
            >
              {r.content}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-soft)" }}>
            <span style={{ fontSize: 13, color: "var(--muted-2)", fontStyle: "italic" }}>Bez sadržaja</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11.5, color: "var(--muted-2)" }}>
            {formatDate(r.created_at)}
          </span>
          <span
            style={{
              fontSize: 12, fontWeight: 600, color: "var(--brand)",
              display: "inline-flex", alignItems: "center", gap: 3,
            }}
          >
            Otvori →
          </span>
        </div>
      </div>
    </li>
  );
}

// ── Section group label ────────────────────────────────────────────────────

function GroupLabel({ children, color = "var(--muted)" }: { children: React.ReactNode; color?: string }) {
  return (
    <p
      style={{
        margin: "0 0 10px 28px",
        fontSize: 11.5, fontWeight: 700, color,
        letterSpacing: "0.07em",
        textTransform: "uppercase" as React.CSSProperties["textTransform"],
      }}
    >
      {children}
    </p>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function IzvestajiPage() {
  const { user }      = useUser();
  const queryClient   = useQueryClient();
  const [selected, setSelected]               = useState<AppNotification | null>(null);
  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    api.patch(`/api/${T}/notifications/read-all`).then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications", T] });
    });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: paginated, isLoading } = useQuery<PaginatedNotifications>({
    queryKey: ["izvestaji", T, debouncedSearch, page, perPage],
    queryFn: ({ signal }) =>
      api.get(`/api/${T}/notifications`, {
        signal,
        params: {
          received_only: 1,
          urgent_first: 1,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          page,
          per_page: perPage,
        },
      }).then((r) => r.data),
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const reports        = paginated?.data ?? [];
  const total          = paginated?.total ?? 0;
  const lastPage       = paginated?.last_page ?? 1;
  const from           = paginated?.from ?? 0;
  const to             = paginated?.to ?? 0;
  const urgentReports  = reports.filter((r) => r.urgent);
  const regularReports = reports.filter((r) => !r.urgent);
  const regularGroups  = groupByDay(regularReports);

  return (
    <PageShell navId="izv">
      <div style={{ padding: "32px 40px 80px", maxWidth: 780 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: 0, fontSize: 22, fontWeight: 700,
              letterSpacing: "-0.02em", color: "var(--text)",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span
              style={{
                width: 32, height: 32, borderRadius: 9,
                display: "grid", placeItems: "center",
                background: "var(--brand-soft)", color: "var(--brand)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6"  y1="20" x2="6"  y2="14" />
              </svg>
            </span>
            Izveštaji
          </h1>
          {total > 0 && (
            <p style={{ margin: "4px 0 0 42px", fontSize: 13, color: "var(--muted)" }}>
              {total} primljenih izvještaja
            </p>
          )}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraži po naslovu ili sadržaju..."
              style={{
                width: "100%", padding: "8px 12px 8px 36px",
                border: "1px solid var(--border)", borderRadius: 10,
                fontSize: 14, color: "#111418", background: "#fff",
                fontFamily: "inherit", outline: "none",
                boxSizing: "border-box", transition: "border-color .15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <CustomSelect
            value={perPage}
            onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
            options={PER_PAGE_OPTIONS}
            prefix="Prikaži:"
          />
        </div>

        {/* Loading */}
        {isLoading && !paginated && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 120, borderRadius: 10, background: "#f1f2f5" }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && reports.length === 0 && (
          <div
            style={{
              background: "#fff", border: "1px solid var(--border-soft)",
              borderRadius: 16, padding: "60px 32px",
              textAlign: "center" as React.CSSProperties["textAlign"],
              color: "var(--muted)", fontSize: 15, lineHeight: 1.7,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <svg
              width="44" height="44" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
              style={{ margin: "0 auto 14px", display: "block", opacity: 0.3 }}
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6"  y1="20" x2="6"  y2="14" />
            </svg>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>
              {debouncedSearch ? "Nema izvještaja za tu pretragu" : "Nema primljenih izvještaja"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>
              {debouncedSearch
                ? `Nije pronađeno ništa za „${debouncedSearch}".`
                : "Kad menadžeri pošalju izvještaj, pojaviće se ovdje."}
            </p>
          </div>
        )}

        {/* Reports */}
        {!isLoading && reports.length > 0 && (
          <div>
            {urgentReports.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <GroupLabel color="#dc2626">Hitno</GroupLabel>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {urgentReports.map((r, i) => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      onOpen={() => setSelected(r)}
                      isLast={i === urgentReports.length - 1}
                    />
                  ))}
                </ul>
              </div>
            )}

            {regularGroups.map(([day, items]) => (
              <div key={day} style={{ marginBottom: 28 }}>
                <GroupLabel>{day}</GroupLabel>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {items.map((r, i) => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      onOpen={() => setSelected(r)}
                      isLast={i === items.length - 1}
                    />
                  ))}
                </ul>
              </div>
            ))}

            {lastPage > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 12 }}>
                <span style={{ fontSize: 13.5, color: "var(--muted)" }}>
                  Prikazano <strong style={{ color: "#374151" }}>{from}–{to}</strong> od{" "}
                  <strong style={{ color: "#374151" }}>{total}</strong>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "8px 16px", border: "1px solid var(--border)",
                      borderRadius: 10, fontSize: 13, fontWeight: 500,
                      color: page === 1 ? "var(--muted)" : "var(--text-2)",
                      background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer",
                      fontFamily: "inherit", boxShadow: "var(--shadow-card)", opacity: page === 1 ? 0.5 : 1,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    Prethodna
                  </button>
                  <span
                    style={{
                      fontSize: 13.5, color: "#374151", fontWeight: 500,
                      background: "var(--brand-soft)", border: "1px solid rgba(37,99,235,.15)",
                      borderRadius: 8, padding: "7px 14px", minWidth: 70,
                      textAlign: "center" as React.CSSProperties["textAlign"],
                    }}
                  >
                    {page} / {lastPage}
                  </span>
                  <button
                    disabled={page >= lastPage}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "8px 16px", border: "1px solid var(--border)",
                      borderRadius: 10, fontSize: 13, fontWeight: 500,
                      color: page >= lastPage ? "var(--muted)" : "var(--text-2)",
                      background: "#fff", cursor: page >= lastPage ? "not-allowed" : "pointer",
                      fontFamily: "inherit", boxShadow: "var(--shadow-card)", opacity: page >= lastPage ? 0.5 : 1,
                    }}
                  >
                    Sledeća
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report modal */}
      {selected && (
        <ReportModal report={selected} onClose={() => setSelected(null)} />
      )}
    </PageShell>
  );
}
