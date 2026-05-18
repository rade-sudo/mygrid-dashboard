import CardHead from "@/components/dashboard/CardHead";
import { IconDocLine } from "@/components/ui/icons";

export default function ReportsCard() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "var(--shadow-card)",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHead icon={IconDocLine} color="amber" title="Izveštaji od sektora" onViewAll={() => {}} />
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
        Nema izveštaja od sektora.
      </div>
    </div>
  );
}
