import CardHead from "@/components/dashboard/CardHead";
import { IconCal } from "@/components/ui/icons";

export default function SastanciCard() {
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
