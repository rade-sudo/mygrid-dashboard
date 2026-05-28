"use client";
import { useState } from "react";
import CardHead from "@/components/dashboard/CardHead";
import { IconHome } from "@/components/ui/icons";

interface KvRowProps {
  label: React.ReactNode;
  value: string;
  valueColor?: string;
}

function KvRow({ label, value, valueColor }: KvRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 14.5,
      }}
    >
      <div style={{ color: "#1f2937" }}>{label}</div>
      <div
        style={{
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          color: valueColor ?? "var(--text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function StanoviCard() {
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
        position: "relative",
      }}
    >
      {/* Green top accent */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          bottom: "auto",
          height: 2,
          background: "var(--green)",
          borderRadius: "16px 16px 0 0",
        }}
      />

      <CardHead icon={IconHome} color="green" title="Stanovi — pregled" />

      <div
        style={{
          fontSize: 46,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color: "var(--green)",
        }}
      >
        122
      </div>
      <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 10 }}>
        slobodnih stanova · od ukupno 209
      </div>

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
        <KvRow
          label={<>Vrednost slobodnih<br />stanova</>}
          value="9.254.241,40€"
          valueColor="var(--green)"
        />
        <KvRow
          label={<>Ostalo za naplatu<br /><small style={{ color: "var(--muted)", fontSize: 12.5 }}>(kredit + keš)</small></>}
          value="796.552,28€"
          valueColor="var(--red)"
        />
        <KvRow
          label="Ukupno neplaćeno"
          value="10.050.793,68€"
          valueColor="var(--brand)"
        />
        <KvRow
          label="Prodato"
          value="87 / 209"
          valueColor="var(--brand)"
        />
      </div>
    </div>
  );
}
