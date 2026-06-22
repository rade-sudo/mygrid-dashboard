"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import CardHead from "@/components/dashboard/CardHead";
import { IconCal } from "@/components/ui/icons";
import api from "@/lib/axios";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

const INSET_BORDER_SHADOW = [
  "inset 0 1.5px 0 rgba(255,255,255,0.96)",
  "inset 1px 0 0 rgba(255,255,255,0.58)",
  "inset -1px 0 0 rgba(255,255,255,0.28)",
  "inset 0 -1px 0 rgba(255,255,255,0.16)",
].join(", ");

interface MeetingReminder {
  id: number;
  meeting_date: string;
  meeting_time: string | null;
  note: string;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtCardDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = todayISO();
  if (iso === today) return "Danas";
  const diff = Math.round((d.getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
  if (diff === 1) return "Sutra";
  return d.toLocaleDateString("sr-Latn", { day: "2-digit", month: "2-digit" });
}

function ReminderItem({ r, isLast }: { r: MeetingReminder; isLast: boolean }) {
  const today = todayISO();
  const isToday = r.meeting_date === today;

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
        background: isToday ? "#dc2626" : "var(--violet)",
        boxShadow: "0 0 0 2.5px rgba(255,255,255,0.7)",
        display: "block", zIndex: 1,
      }} />
      <div style={{
        background: isToday ? "rgba(220,38,38,0.07)" : "transparent",
        borderRadius: 7,
        padding: isToday ? "4px 8px 4px 6px" : "0 0 0 6px",
        border: isToday ? "1px solid rgba(220,38,38,0.2)" : "none",
      }}>
        <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700, color: isToday ? "#dc2626" : "var(--violet)", marginRight: 6 }}>
            {fmtCardDate(r.meeting_date)}
            {r.meeting_time && ` · ${r.meeting_time.slice(0, 5)}`}
          </span>
          <span style={{
            display: "inline",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {r.note}
          </span>
        </p>
      </div>
    </li>
  );
}

export default function SastanciCard() {
  const router  = useRouter();
  const [hovered, setHovered] = useState(false);

  const { data: allUpcoming = [], isLoading } = useQuery<MeetingReminder[]>({
    queryKey: ["meeting-reminders-card", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/meeting-reminders`, {
        params: { upcoming: 1, limit: 100 },
        signal,
      }).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const reminders = allUpcoming.slice(0, 3);
  const totalCount = allUpcoming.length;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        isolation: "isolate",
        minHeight: 360,
        boxShadow: hovered
          ? "0 8px 32px rgba(0,82,255,.12), 0 4px 12px rgba(16,24,40,.08)"
          : "0 16px 48px rgba(37,99,235,.13), 0 4px 12px rgba(16,24,40,.08)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "transform .2s ease, box-shadow .2s ease",
      }}
    >
      {/* Layer 1 — backdrop blur */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backdropFilter: hovered ? "blur(12px)" : "url(#mg-lg-sidebar) blur(3px) saturate(190%)",
        WebkitBackdropFilter: hovered ? "blur(12px)" : "blur(36px) saturate(190%)",
        background: hovered ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.16)",
        transition: "background .2s ease",
      }} />

      {/* Layer 2 — gradient tint */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(155deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 55%, rgba(124,58,237,0.04) 100%)",
        pointerEvents: "none",
        opacity: hovered ? 0 : 1,
        transition: "opacity .2s ease",
      }} />

      {/* Layer 3 — content */}
      <div style={{
        position: "relative", zIndex: 2,
        padding: "20px 22px",
        display: "flex", flexDirection: "column",
        height: "100%",
      }}>
        <CardHead icon={IconCal} color="violet" title="Predstojeći sastanci" />

        {/* Count badge */}
        {!isLoading && (
          <div style={{ marginTop: 6, marginBottom: 4 }}>
            {totalCount > 0 ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 13, fontWeight: 600,
                color: "var(--violet)",
                background: "rgba(124,58,237,0.09)",
                border: "1px solid rgba(124,58,237,0.18)",
                borderRadius: 20, padding: "3px 10px",
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {totalCount} predstojeć{totalCount === 1 ? "i" : "ih"}
              </span>
            ) : (
              <span style={{ fontSize: 13, color: "rgba(15,23,42,0.38)", fontStyle: "italic" }}>
                Nema zakazanih obaveza
              </span>
            )}
          </div>
        )}

        {isLoading && (
          <div style={{ padding: "18px 0 8px", color: "rgba(15,23,42,0.45)", fontSize: 14, textAlign: "center" as const }}>
            Učitavanje...
          </div>
        )}

        {!isLoading && reminders.length > 0 && (
          <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
            {reminders.map((r, i) => (
              <ReminderItem key={r.id} r={r} isLast={i === reminders.length - 1} />
            ))}
          </ul>
        )}

        <div
          onClick={() => router.push("/dashboard/sastanci")}
          style={{
            marginTop: "auto",
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.35)",
            color: "var(--violet)",
            fontSize: 14.5,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          → Pogledaj sve i dodaj podsetnik
        </div>
      </div>

      {/* Layer 4 — inset prismatic border */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3,
        borderRadius: "inherit", pointerEvents: "none",
        border: hovered ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.52)",
        boxShadow: hovered ? "none" : INSET_BORDER_SHADOW,
        transition: "border-color .2s ease, box-shadow .2s ease",
      }} />
    </div>
  );
}
