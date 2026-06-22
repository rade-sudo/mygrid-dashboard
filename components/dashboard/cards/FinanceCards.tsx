"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import CardHead from "@/components/dashboard/CardHead";
import { IconCard, IconInvoice, IconActivity } from "@/components/ui/icons";
import api from "@/lib/axios";
import type { FinanceStats } from "@/types/bank";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

const INSET_BORDER_SHADOW = [
  "inset 0 1.5px 0 rgba(255,255,255,0.96)",
  "inset 1px 0 0 rgba(255,255,255,0.58)",
  "inset -1px 0 0 rgba(255,255,255,0.28)",
  "inset 0 -1px 0 rgba(255,255,255,0.16)",
].join(", ");

function useFinanceStats() {
  return useQuery<FinanceStats>({
    queryKey: ["finance-stats", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finance/stats`, { signal }).then((r) => r.data),
    staleTime: 60_000,
  });
}

function GlassCard({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        isolation: "isolate",
        minHeight: 168,
        boxShadow: hovered
          ? "0 8px 32px rgba(0,82,255,.12), 0 4px 12px rgba(16,24,40,.08)"
          : "0 16px 48px rgba(37,99,235,.13), 0 4px 12px rgba(16,24,40,.08)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "transform .2s ease, box-shadow .2s ease",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backdropFilter: hovered ? "blur(12px)" : "url(#mg-lg-sidebar) blur(3px) saturate(190%)",
        WebkitBackdropFilter: hovered ? "blur(12px)" : "blur(36px) saturate(190%)",
        background: hovered ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.16)",
        transition: "background .2s ease",
      }} />
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(155deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 55%, rgba(37,99,235,0.05) 100%)",
        pointerEvents: "none",
        opacity: hovered ? 0 : 1,
        transition: "opacity .2s ease",
      }} />
      <div style={{
        position: "relative", zIndex: 2,
        padding: "20px 22px",
        display: "flex", flexDirection: "column",
      }}>
        {children}
      </div>
      <div style={{
        position: "absolute", inset: 0, zIndex: 3,
        borderRadius: "inherit", pointerEvents: "none",
        border: hovered ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.52)",
        boxShadow: hovered ? "none" : INSET_BORDER_SHADOW,
        transition: "border-color .2s ease, box-shadow .2s ease",
      }} />
    </div>
  );
}

export function BankBalanceCard() {
  const router = useRouter();
  const { data: stats } = useFinanceStats();

  const balance = stats?.total_bank_balance ?? null;
  const formatted =
    balance !== null
      ? balance.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  return (
    <GlassCard onClick={() => router.push("/dashboard/finansije/banke")}>
      <CardHead icon={IconCard} color="green" title="Stanje na računima" />
      <div style={{
        fontSize: 36, fontWeight: 700,
        letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 2,
        color: "var(--text)",
      }}>
        {formatted ?? "—"}
        {formatted && (
          <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500, marginLeft: 8, letterSpacing: 0 }}>
            RSD
          </span>
        )}
      </div>
      <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 10 }}>
        {balance === null ? "Učitavanje..." : "Po poslednjem izvodu"}
      </div>
    </GlassCard>
  );
}

export function SupplierSaldoCard() {
  const router = useRouter();
  const { data: stats } = useFinanceStats();

  const outstanding = stats?.total_invoices_outstanding ?? null;
  const supplierCount = stats?.outstanding_supplier_count ?? 0;
  const isPaid = outstanding !== null && outstanding === 0;
  const amountColor = isPaid ? "#16a34a" : outstanding !== null && outstanding > 0 ? "#dc2626" : "var(--text)";

  const formatted =
    outstanding !== null
      ? outstanding.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  return (
    <GlassCard onClick={() => router.push("/dashboard/finansije/ulazne-fakture")}>
      <CardHead icon={IconInvoice} color="gray" title="Saldo ulazne fakture" />

      {isPaid ? (
        <div style={{
          fontSize: 36, fontWeight: 700,
          letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 2,
          color: "#16a34a",
        }}>
          Izmireno
        </div>
      ) : (
        <div style={{
          fontSize: 36, fontWeight: 700,
          letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 2,
          color: amountColor,
        }}>
          {formatted ?? "—"}
          {formatted && (
            <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500, marginLeft: 8, letterSpacing: 0 }}>
              RSD
            </span>
          )}
        </div>
      )}

      <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 10 }}>
        {isPaid
          ? "Sve fakture su plaćene"
          : outstanding !== null
          ? `${supplierCount} ${supplierCount === 1 ? "dobavljač" : "dobavljača"} · ukupno za isplatu`
          : "Učitavanje..."}
      </div>
    </GlassCard>
  );
}

export function PdvCard() {
  const router = useRouter();
  const monthName = new Date().toLocaleDateString("sr-Latn", { month: "long" });
  const { data: stats } = useFinanceStats();

  const vat = stats?.monthly_incoming_vat ?? 0;
  const formatted = vat.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <GlassCard onClick={() => router.push("/dashboard/finansije/ulazne-fakture")}>
      <CardHead icon={IconActivity} color="amber" title={`Ulazni PDV · ${monthName}`} />
      <div style={{
        fontSize: 36, fontWeight: 700,
        letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 2,
        color: "var(--text)",
      }}>
        {formatted}
        <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500, marginLeft: 8, letterSpacing: 0 }}>
          RSD
        </span>
      </div>
      <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 10 }}>
        {`Fakturisani PDV · samo ${monthName}`}
      </div>
    </GlassCard>
  );
}
