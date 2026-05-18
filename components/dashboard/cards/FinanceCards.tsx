import CardHead from "@/components/dashboard/CardHead";
import { IconCard, IconInvoice, IconActivity } from "@/components/ui/icons";

function KpiCard({
  icon,
  color,
  title,
  big,
  bigColor,
  sub,
  unit,
}: {
  icon: React.ComponentType<{ w?: number; h?: number }>;
  color: "blue" | "green" | "amber" | "gray" | "violet";
  title: string;
  big: string;
  bigColor?: string;
  sub: string;
  unit?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "var(--shadow-card)",
        minHeight: 168,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHead icon={icon} color={color} title={title} />
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginTop: 2,
          color: bigColor ?? "var(--text)",
        }}
      >
        {big}
        {unit && (
          <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500, marginLeft: 8, letterSpacing: 0 }}>
            {unit}
          </span>
        )}
      </div>
      <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 10 }}>{sub}</div>
    </div>
  );
}

export function BankBalanceCard() {
  return (
    <KpiCard
      icon={IconCard}
      color="green"
      title="Stanje na računima"
      big="0,00"
      unit="RSD"
      sub="2 banke · po poslednjem izvodu"
    />
  );
}

export function SupplierSaldoCard() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "var(--shadow-card)",
        minHeight: 168,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHead icon={IconInvoice} color="gray" title="Saldo ulazne fakture" />
      <div
        style={{
          fontSize: 36,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginTop: 2,
          color: "var(--text)",
        }}
      >
        Izmireno
      </div>
      <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 10 }}>0 dobavljača · ukupno za isplatu</div>
    </div>
  );
}

export function PdvCard() {
  return (
    <KpiCard
      icon={IconActivity}
      color="amber"
      title="Ulazni PDV · maj"
      big="0,00"
      unit="RSD"
      sub="RSD · samo maj"
    />
  );
}
