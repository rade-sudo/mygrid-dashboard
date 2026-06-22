"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import CardHead from "@/components/dashboard/CardHead";
import { IconWallet } from "@/components/ui/icons";
import api from "@/lib/axios";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

const INSET_BORDER_SHADOW = [
  "inset 0 1.5px 0 rgba(255,255,255,0.96)",
  "inset 1px 0 0 rgba(255,255,255,0.58)",
  "inset -1px 0 0 rgba(255,255,255,0.28)",
  "inset 0 -1px 0 rgba(255,255,255,0.16)",
].join(", ");

interface PayrollData {
  month: string;
  kpi: {
    total_cost: number;
    paid_total: number;
    fixed_total: number;
    hourly_workers_count: number;
    hourly_rate_avg: number;
  };
  sector_breakdown: Record<string, number>;
}

function fmt(n: number) {
  return n.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PlateCard() {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const monthName = new Date().toLocaleDateString("sr-Latn", { month: "long", year: "numeric" });

  const { data } = useQuery<PayrollData>({
    queryKey: ["payroll-card", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/plate`, { signal }).then((r) => r.data),
    staleTime: 60_000,
  });

  const totalCost = data?.kpi.total_cost ?? null;
  const sectors = data ? Object.entries(data.sector_breakdown) : [];

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
        height: "100%",
      }}>
        <CardHead icon={IconWallet} color="blue" title={`Plate — ${monthName}`} />

        <div style={{
          fontSize: 36, fontWeight: 700,
          letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 2,
          color: "var(--text)",
        }}>
          {totalCost !== null ? fmt(totalCost) : "—"}
          <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500, marginLeft: 8, letterSpacing: 0 }}>
            RSD
          </span>
        </div>
        <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 10 }}>
          {totalCost !== null ? `Ukupne plate za ${monthName}` : "Učitavanje..."}
        </div>

        {/* Sector breakdown */}
        <div style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.35)",
        }}>
          {sectors.length === 0 && totalCost !== null && (
            <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
              Nema zaposlenih sa platama
            </div>
          )}
          {sectors.map(([sector, amount]) => (
            <div key={sector} style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5 }}>
              <div style={{ color: "#1f2937", textTransform: "capitalize" as React.CSSProperties["textTransform"] }}>
                {sector || "Bez sektora"}
              </div>
              <div style={{ fontWeight: 600, color: "var(--amber)" }}>
                {fmt(amount)} RSD
              </div>
            </div>
          ))}
        </div>

        {/* Navigate link */}
        <div
          onClick={() => router.push("/dashboard/finansije/plate")}
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.35)",
            color: "var(--brand)",
            fontSize: 14.5,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          → Klikni za detalje po radniku
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
