import CardHead from "@/components/dashboard/CardHead";
import { IconActivity } from "@/components/ui/icons";

export default function ActivityCard() {
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
