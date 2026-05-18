import CardHead from "@/components/dashboard/CardHead";
import { IconFuel } from "@/components/ui/icons";

function FuelRow({ label, value, color }: { label: string; value: string; color: string }) {
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
      <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color }}>
        {value}
      </div>
    </div>
  );
}

export default function GorivoCard() {
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
      <CardHead icon={IconFuel} color="green" title="Gorivo — maj 2026" />

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginTop: 2,
          color: "var(--green)",
        }}
      >
        11.293,64
        <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500, marginLeft: 8, letterSpacing: 0 }}>L</span>
      </div>
      <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 10 }}>
        Ukupno za mesec · zadnji unos<br />
        <strong style={{ fontWeight: 600 }}>03.05.2026</strong>
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
        <FuelRow label="Dizel" value="5.486,04 L" color="var(--brand)" />
        <FuelRow label="Dizel X Energy" value="742,13 L" color="var(--amber)" />
        <FuelRow label="Benzin" value="3.557,66 L" color="var(--red)" />
        <FuelRow label="Benzin 100" value="950,24 L" color="var(--amber)" />
        <FuelRow label="Gas" value="557,57 L" color="var(--green)" />
      </div>
    </div>
  );
}
