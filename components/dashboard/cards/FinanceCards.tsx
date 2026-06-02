"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CardHead from "@/components/dashboard/CardHead";
import { IconCard, IconInvoice, IconActivity } from "@/components/ui/icons";
import api from "@/lib/axios";
import type { FinanceStats } from "@/types/bank";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

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
  const monthName = new Date().toLocaleDateString("sr-Latn", { month: "long" });

  const { data: stats } = useQuery<FinanceStats>({
    queryKey: ["finance-stats", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finance/stats`, { signal }).then((r) => r.data),
    staleTime: 60_000,
  });

  const vat = stats?.monthly_incoming_vat ?? 0;
  const formatted = vat.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <KpiCard
      icon={IconActivity}
      color="amber"
      title={`Ulazni PDV · ${monthName}`}
      big={formatted}
      unit="RSD"
      sub={`Fakturisani PDV · samo ${monthName}`}
    />
  );
}
