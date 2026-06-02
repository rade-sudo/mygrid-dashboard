"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import { IconActivity } from "@/components/ui/icons";
import api from "@/lib/axios";
import type { ActivityLog, ActivityGroup, ActivityPage } from "@/types/activity";

const T = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const NEW_THRESHOLD_MS = 30 * 60 * 1000;
const PER_PAGE = 20;

function relativeTime(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 5) return "upravo";
  const rtf = new Intl.RelativeTimeFormat("sr-Latn", { numeric: "auto" });
  if (diffSec < 3600)  return rtf.format(-Math.floor(diffSec / 60), "minute");
  if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), "hour");
  return rtf.format(-Math.floor(diffSec / 86400), "day");
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Danas";
  if (isSameDay(date, yesterday)) return "Juče";
  return date.toLocaleDateString("sr-Latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupLogs(logs: ActivityLog[]): ActivityGroup[] {
  const map = new Map<string, ActivityLog[]>();
  for (const log of logs) {
    const key = dayLabel(log.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function actionColor(action: string): string {
  if (action === "obrisao") return "#dc2626";
  if (action === "izmenio") return "#d97706";
  return "var(--brand)";
}

function TimelineItem({
  log,
  isLast,
}: {
  log: ActivityLog;
  isLast: boolean;
}) {
  const isNew = Date.now() - new Date(log.created_at).getTime() < NEW_THRESHOLD_MS;

  return (
    <li
      style={{
        position: "relative",
        paddingLeft: 26,
        paddingBottom: isLast ? 0 : 16,
      }}
    >
      {!isLast && (
        <span
          style={{
            position: "absolute",
            left: 5,
            top: 14,
            width: 1.5,
            bottom: 0,
            background: "var(--border-soft)",
            display: "block",
          }}
        />
      )}

      <span
        style={{
          position: "absolute",
          left: 0,
          top: 4,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: actionColor(log.action),
          boxShadow: "0 0 0 3px #f5f6f8",
          display: "block",
          zIndex: 1,
        }}
      />

      <div
        style={{
          background: isNew ? "rgba(37,99,235,0.05)" : "#fff",
          border: "1px solid var(--border-soft)",
          borderRadius: 10,
          padding: "10px 14px",
          boxShadow: isNew
            ? "0 0 0 1.5px rgba(37,99,235,.15)"
            : "var(--shadow-card)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text)", lineHeight: 1.45 }}>
            {log.user?.name && (
              <span style={{ fontWeight: 600 }}>{log.user.name} · </span>
            )}
            {log.description}
            {isNew && (
              <span
                className="animate-pulse"
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--brand)",
                  marginLeft: 8,
                  verticalAlign: "middle",
                }}
              />
            )}
          </p>
          <span
            style={{
              flexShrink: 0,
              fontSize: 12,
              color: "var(--muted)",
              whiteSpace: "nowrap",
              marginTop: 1,
            }}
          >
            {relativeTime(log.created_at)}
          </span>
        </div>

        <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 20,
              background:
                log.action === "obrisao"
                  ? "#fef2f2"
                  : log.action === "izmenio"
                  ? "#fffbeb"
                  : "var(--brand-soft)",
              color: actionColor(log.action),
              letterSpacing: "0.03em",
              textTransform: "capitalize" as React.CSSProperties["textTransform"],
            }}
          >
            {log.action}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--muted-2)" }}>
            {new Date(log.created_at).toLocaleString("sr-Latn", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </li>
  );
}

export default function AktivnostiPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery<ActivityPage>({
    queryKey: ["activity-logs", page],
    queryFn: () =>
      api
        .get(`/api/${T}/activity-logs`, { params: { page, per_page: PER_PAGE } })
        .then((r) => r.data),
  });

  const logs = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;
  const total = data?.total ?? 0;

  const groups = groupLogs(logs);
  const allItems = groups.flatMap((g) => g.items);

  return (
    <PageShell navId="dash">
      <div style={{ padding: "32px 40px 80px", maxWidth: 760 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => router.back()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-2)",
                background: "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Nazad
            </button>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                  }}
                >
                  <IconActivity w={17} h={17} />
                </span>
                Dnevnik aktivnosti
              </h1>
              {total > 0 && (
                <p style={{ margin: "3px 0 0 42px", fontSize: 13, color: "var(--muted)" }}>
                  {total} zabeleženih aktivnosti
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ color: "var(--muted)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
            Učitavanje aktivnosti...
          </div>
        )}

        {/* Empty */}
        {!isLoading && logs.length === 0 && (
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border-soft)",
              borderRadius: 16,
              padding: "60px 32px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 15,
              lineHeight: 1.7,
              boxShadow: "var(--shadow-card)",
            }}
          >
            Još nema zabeleženih aktivnosti.<br />
            Kad se sačuva nova stavka u modulima, pojaviće se ovde.
          </div>
        )}

        {/* Timeline */}
        {!isLoading && logs.length > 0 && (
          <div>
            {groups.map((group) => (
              <div key={group.label} style={{ marginBottom: 28 }}>
                <p
                  style={{
                    margin: "0 0 12px 26px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "var(--muted)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  {group.label}
                </p>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {group.items.map((log) => (
                    <TimelineItem
                      key={log.id}
                      log={log}
                      isLast={log === allItems[allItems.length - 1]}
                    />
                  ))}
                </ul>
              </div>
            ))}

            {/* Pagination */}
            {lastPage > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginTop: 32,
                }}
              >
                <button
                  disabled={page === 1 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    color: page === 1 ? "var(--muted)" : "var(--text-2)",
                    background: "#fff",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    boxShadow: "var(--shadow-card)",
                    opacity: page === 1 ? 0.5 : 1,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Prethodna
                </button>

                <span style={{ fontSize: 13.5, color: "var(--muted)", minWidth: 90, textAlign: "center" }}>
                  {page} / {lastPage}
                </span>

                <button
                  disabled={page === lastPage || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    color: page === lastPage ? "var(--muted)" : "var(--text-2)",
                    background: "#fff",
                    cursor: page === lastPage ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    boxShadow: "var(--shadow-card)",
                    opacity: page === lastPage ? 0.5 : 1,
                  }}
                >
                  Sledeća
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
