"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import CardHead from "@/components/dashboard/CardHead";
import { IconActivity } from "@/components/ui/icons";
import api from "@/lib/axios";
import type { ActivityLog, ActivityGroup } from "@/types/activity";

const T = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
const NEW_THRESHOLD_MS = 30 * 60 * 1000;

const INSET_BORDER_SHADOW = [
  "inset 0 1.5px 0 rgba(255,255,255,0.96)",
  "inset 1px 0 0 rgba(255,255,255,0.58)",
  "inset -1px 0 0 rgba(255,255,255,0.28)",
  "inset 0 -1px 0 rgba(255,255,255,0.16)",
].join(", ");

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
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(date, today)) return "Danas";
  if (same(date, yesterday)) return "Juče";
  return date.toLocaleDateString("sr-Latn", { day: "numeric", month: "long", year: "numeric" });
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

function TimelineItem({ log, isLast }: { log: ActivityLog; isLast: boolean }) {
  const isNew = Date.now() - new Date(log.created_at).getTime() < NEW_THRESHOLD_MS;
  return (
    <li style={{ position: "relative", paddingLeft: 22, paddingBottom: isLast ? 0 : 14 }}>
      {!isLast && (
        <span style={{
          position: "absolute", left: 4, top: 13,
          width: 1.5, bottom: 0,
          background: "rgba(255,255,255,0.45)",
          display: "block",
        }} />
      )}
      <span style={{
        position: "absolute", left: 0, top: 4,
        width: 10, height: 10, borderRadius: "50%",
        background: actionColor(log.action),
        boxShadow: "0 0 0 2.5px rgba(255,255,255,0.7)",
        display: "block", zIndex: 1,
      }} />
      <div style={{
        background: isNew ? "rgba(255,255,255,0.22)" : "transparent",
        borderRadius: 7,
        padding: isNew ? "4px 8px 4px 6px" : "0 0 0 6px",
        border: isNew ? "1px solid rgba(255,255,255,0.35)" : "none",
      }}>
        <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.45 }}>
          {log.user?.name && <span style={{ fontWeight: 600 }}>{log.user.name} · </span>}
          {log.description}
          {isNew && (
            <span className="animate-pulse" style={{
              display: "inline-block", width: 7, height: 7, borderRadius: "50%",
              background: "var(--brand)", marginLeft: 7, verticalAlign: "middle",
            }} />
          )}
        </p>
        <p style={{ margin: 0, fontSize: 11.5, color: "rgba(15,23,42,0.45)", marginTop: 2 }}>
          {relativeTime(log.created_at)}
        </p>
      </div>
    </li>
  );
}

export default function ActivityCard() {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["activity-logs-recent"],
    queryFn: () => api.get(`/api/${T}/activity-logs/recent`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const groups = groupLogs(logs);
  const allItems = groups.flatMap((g) => g.items);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        isolation: "isolate",
        minHeight: 200,
        boxShadow: hovered
          ? "0 8px 32px rgba(0,82,255,.12), 0 4px 12px rgba(16,24,40,.08)"
          : "0 16px 48px rgba(37,99,235,.13), 0 4px 12px rgba(16,24,40,.08)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "transform .2s ease, box-shadow .2s ease",
      }}
    >
      {/* Layer 1 — backdrop blur + liquid glass distortion */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backdropFilter: hovered
          ? "blur(12px)"
          : "url(#mg-lg-sidebar) blur(3px) saturate(190%)",
        WebkitBackdropFilter: hovered ? "blur(12px)" : "blur(36px) saturate(190%)",
        background: hovered ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.16)",
        transition: "background .2s ease",
      }} />

      {/* Layer 2 — gradient tint */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(155deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 55%, rgba(37,99,235,0.05) 100%)",
        pointerEvents: "none",
        opacity: hovered ? 0 : 1,
        transition: "opacity .2s ease",
      }} />

      {/* Layer 3 — scrollable content */}
      <div style={{
        position: "relative", zIndex: 2,
        padding: "20px 22px",
        display: "flex", flexDirection: "column",
      }}>
        <CardHead
          icon={IconActivity}
          color="blue"
          title="Aktivnosti svi sektori"
          onViewAll={() => router.push("/dashboard/aktivnosti")}
        />

        {isLoading && (
          <div style={{
            padding: "18px 0 8px", color: "rgba(15,23,42,0.45)",
            fontSize: 14, textAlign: "center",
          }}>
            Učitavanje...
          </div>
        )}

        {!isLoading && logs.length === 0 && (
          <div style={{
            padding: "18px 8px 24px", color: "rgba(15,23,42,0.45)",
            fontSize: 15, textAlign: "center", lineHeight: 1.6,
          }}>
            Još nema zabeleženih aktivnosti —<br />
            kad se sačuva nova stavka u modulima,<br />
            pojaviće se ovde.
          </div>
        )}

        {!isLoading && logs.length > 0 && (
          <div style={{ overflowY: "auto", maxHeight: 340 }}>
            {groups.map((group) => (
              <div key={group.label}>
                <p style={{
                  margin: "0 0 8px 22px",
                  fontSize: 11, fontWeight: 700,
                  color: "rgba(15,23,42,0.40)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}>
                  {group.label}
                </p>
                <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0 }}>
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
          </div>
        )}
      </div>

      {/* Layer 4 — inset prismatic border */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3,
        borderRadius: "inherit", pointerEvents: "none",
        border: hovered
          ? "1px solid rgba(255,255,255,0.2)"
          : "1px solid rgba(255,255,255,0.52)",
        boxShadow: hovered ? "none" : INSET_BORDER_SHADOW,
        transition: "border-color .2s ease, box-shadow .2s ease",
      }} />
    </div>
  );
}
