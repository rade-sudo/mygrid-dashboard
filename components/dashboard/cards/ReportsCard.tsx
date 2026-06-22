"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import CardHead from "@/components/dashboard/CardHead";
import { IconChart } from "@/components/ui/icons";
import api from "@/lib/axios";
import type { AppNotification } from "@/types/notification";

const T = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

const INSET_BORDER_SHADOW = [
  "inset 0 1.5px 0 rgba(255,255,255,0.96)",
  "inset 1px 0 0 rgba(255,255,255,0.58)",
  "inset -1px 0 0 rgba(255,255,255,0.28)",
  "inset 0 -1px 0 rgba(255,255,255,0.16)",
].join(", ");

function relativeTime(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 5) return "upravo";
  const rtf = new Intl.RelativeTimeFormat("sr-Latn", { numeric: "auto" });
  if (diffSec < 3600)  return rtf.format(-Math.floor(diffSec / 60), "minute");
  if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), "hour");
  return rtf.format(-Math.floor(diffSec / 86400), "day");
}

function ReportItem({ report: r, isLast }: { report: AppNotification; isLast: boolean }) {
  return (
    <li style={{ position: "relative", paddingLeft: 22, paddingBottom: isLast ? 0 : 12 }}>
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
        background: r.urgent ? "#dc2626" : "var(--brand)",
        boxShadow: "0 0 0 2.5px rgba(255,255,255,0.7)",
        display: "block", zIndex: 1,
      }} />
      <div style={{
        background: r.urgent ? "rgba(220,38,38,0.08)" : "transparent",
        borderRadius: 7,
        padding: r.urgent ? "4px 8px 4px 6px" : "0 0 0 6px",
        border: r.urgent ? "1px solid rgba(220,38,38,0.25)" : "none",
      }}>
        <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.45 }}>
          <span style={{ fontWeight: 600 }}>{r.sender_name}</span>
          {" · "}
          <span style={{
            display: "inline",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {r.title}
          </span>
          {r.urgent && (
            <span style={{
              display: "inline-block",
              marginLeft: 6,
              fontSize: 9.5, fontWeight: 700,
              padding: "1px 5px", borderRadius: 4,
              background: "#fee2e2", color: "#dc2626",
              letterSpacing: ".06em", textTransform: "uppercase" as React.CSSProperties["textTransform"],
              verticalAlign: "middle",
            }}>
              Hitno
            </span>
          )}
        </p>
        <p style={{ margin: 0, fontSize: 11.5, color: "rgba(15,23,42,0.45)", marginTop: 2 }}>
          {relativeTime(r.created_at)}
        </p>
      </div>
    </li>
  );
}

export default function ReportsCard() {
  const router  = useRouter();
  const [hovered, setHovered] = useState(false);

  const { data: reports = [], isLoading } = useQuery<AppNotification[]>({
    queryKey: ["reports-recent", T],
    queryFn: () =>
      api.get(`/api/${T}/notifications`, {
        params: { received_only: 1, urgent_first: 1, per_page: 8, page: 1 },
      }).then((r) => (r.data.data as AppNotification[])),
    refetchInterval: 60_000,
  });

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
        background: "linear-gradient(155deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 55%, rgba(37,99,235,0.05) 100%)",
        pointerEvents: "none",
        opacity: hovered ? 0 : 1,
        transition: "opacity .2s ease",
      }} />

      {/* Layer 3 — content */}
      <div style={{
        position: "relative", zIndex: 2,
        padding: "20px 22px",
        display: "flex", flexDirection: "column",
      }}>
        <CardHead
          icon={IconChart}
          color="blue"
          title="Izveštaji od sektora"
          onViewAll={() => router.push("/dashboard/izvestaji")}
        />

        {isLoading && (
          <div style={{
            padding: "18px 0 8px", color: "rgba(15,23,42,0.45)",
            fontSize: 14, textAlign: "center",
          }}>
            Učitavanje...
          </div>
        )}

        {!isLoading && reports.length === 0 && (
          <div style={{
            padding: "18px 8px 24px", color: "rgba(15,23,42,0.45)",
            fontSize: 15, textAlign: "center", lineHeight: 1.6,
          }}>
            Nema primljenih izvještaja —<br />
            kad menadžeri pošalju izvještaj,<br />
            pojaviće se ovde.
          </div>
        )}

        {!isLoading && reports.length > 0 && (
          <div style={{ overflowY: "auto", maxHeight: 340 }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {reports.map((r, i) => (
                <ReportItem
                  key={r.id}
                  report={r}
                  isLast={i === reports.length - 1}
                />
              ))}
            </ul>
          </div>
        )}
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
