"use client";
import { useState } from "react";
import CardHead from "@/components/dashboard/CardHead";
import { IconActivity } from "@/components/ui/icons";

export default function ActivityCard() {
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
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHead icon={IconActivity} color="blue" title="Aktivnosti svi sektori" onViewAll={() => {}} />
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          color: "var(--muted)",
          fontSize: 15,
          textAlign: "center",
          padding: "18px 8px 24px",
          lineHeight: 1.6,
        }}
      >
        Još nema zabeleženih aktivnosti —<br />
        kad se sačuva nova stavka u modulima,<br />
        pojaviće se ovde.
      </div>
    </div>
  );
}
