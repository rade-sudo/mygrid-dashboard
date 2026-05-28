"use client";
import { useState } from "react";
import CardHead from "@/components/dashboard/CardHead";
import { IconCal } from "@/components/ui/icons";

export default function SastanciCard() {
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
      <CardHead icon={IconCal} color="violet" title="Predstojeći sastanci" />

      <div style={{ color: "var(--violet)", fontSize: 22, fontWeight: 600 }}>—</div>
      <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 14 }}>
        Nema zakazanih obaveza
      </div>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 14,
          borderTop: "1px solid var(--border-soft)",
          color: "#1f2937",
          fontSize: 14.5,
          cursor: "pointer",
        }}
      >
        Dodaj podsetnik klikom →
      </div>
    </div>
  );
}
