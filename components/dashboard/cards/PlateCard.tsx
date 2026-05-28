"use client";
import { useState } from "react";
import CardHead from "@/components/dashboard/CardHead";
import { IconWallet } from "@/components/ui/icons";

export default function PlateCard() {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255, 255, 255, 0.92)" : "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: hovered
          ? "0 8px 32px rgba(0,82,255,.12), 0 4px 12px rgba(16,24,40,.08)"
          : "var(--shadow-card)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "transform .2s ease, box-shadow .2s ease, background .2s ease",
        minHeight: 360,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHead icon={IconWallet} color="blue" title="Plate — maj 2026" />

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginTop: 2,
        }}
      >
        0
        <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500, marginLeft: 8, letterSpacing: 0 }}>
          RSD
        </span>
      </div>
      <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 10 }}>Ukupne plate za maj</div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingTop: 14,
          borderTop: "1px solid var(--border-soft)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5 }}>
          <div style={{ color: "#1f2937" }}>Sektor izvođenje</div>
          <div style={{ fontWeight: 600, color: "var(--amber)" }}>0 RSD</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid var(--border-soft)",
          color: "#1f2937",
          fontSize: 14.5,
          cursor: "pointer",
        }}
      >
        → Klikni za detalje po radniku
      </div>
    </div>
  );
}
