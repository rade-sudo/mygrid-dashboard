import CardHead from "@/components/dashboard/CardHead";
import { IconWallet } from "@/components/ui/icons";

export default function PlateCard() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "var(--shadow-card)",
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
