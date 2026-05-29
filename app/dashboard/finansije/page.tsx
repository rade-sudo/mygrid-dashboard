"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import { IconDollar, IconInvoice, IconCard, IconUsers } from "@/components/ui/icons";
import type { FinanceStats } from "@/types/bank";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

const MODULES = [
  {
    id: "banke",
    title: "Bankarski izvodi",
    description: "Pregled stanja bankovnih računa i evidencija transakcija.",
    Icon: IconCard,
    href: "/dashboard/finansije/banke",
    available: true,
  },
  {
    id: "ulazne-fakture",
    title: "Ulazne fakture",
    description: "Evidencija primljenih faktura i troškova.",
    Icon: IconInvoice,
    href: "/dashboard/finansije/ulazne-fakture",
    available: true,
  },
  {
    id: "dobavljaci",
    title: "Dobavljači",
    description: "Evidencija i upravljanje dobavljačima firme.",
    Icon: IconUsers,
    href: "/dashboard/finansije/dobavljaci",
    available: true,
  },
  {
    id: "izlazne-fakture",
    title: "Izlazne fakture",
    description: "Kreiranje i praćenje izlaznih faktura i prihoda.",
    Icon: IconInvoice,
    href: "#",
    available: false,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(val: number): string {
  return val.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RSD";
}

// ─── Module nav card ─────────────────────────────────────────────────────────

function ModuleCard({
  title,
  description,
  Icon,
  available,
}: {
  title: string;
  description: string;
  Icon: React.ComponentType<{ w?: number; h?: number }>;
  available: boolean;
}) {
  return (
    <div
      style={{
        padding: 28,
        border: "1px solid var(--border)",
        borderRadius: 18,
        background: "#fff",
        boxShadow: "var(--shadow-card)",
        opacity: available ? 1 : 0.55,
        cursor: available ? "pointer" : "default",
        transition: "box-shadow .15s, border-color .15s",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
      }}
      onMouseEnter={(e) => {
        if (!available) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "0 6px 24px rgba(22,163,74,.12), 0 1px 4px rgba(16,24,40,.06)";
        el.style.borderColor = "var(--green)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "var(--shadow-card)";
        el.style.borderColor = "var(--border)";
      }}
    >
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--green-soft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon w={26} h={26} />
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 6, letterSpacing: "-0.01em" }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{description}</div>
      </div>
      {available ? (
        <div style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "var(--green)" }}>
          Otvori modul
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      ) : (
        <div style={{ marginTop: "auto", display: "inline-block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 9px" }}>
          Uskoro
        </div>
      )}
    </div>
  );
}

// ─── KPI card + skeleton ─────────────────────────────────────────────────────

function KpiCard({ icon, iconBg, iconColor, value, label, sub }: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, color: iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginTop: 4 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <>
      <style>{`
        @keyframes finShimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .fin-skel {
          background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%);
          background-size: 800px 100%;
          animation: finShimmer 1.4s infinite linear;
          border-radius: 8px;
        }
      `}</style>
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px", boxShadow: "var(--shadow-card)" }}>
        <div className="fin-skel" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 18 }} />
        <div className="fin-skel" style={{ width: 180, height: 28, marginBottom: 8 }} />
        <div className="fin-skel" style={{ width: 130, height: 14, marginBottom: 6 }} />
        <div className="fin-skel" style={{ width: 100, height: 12 }} />
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinansijePage() {
  const { data: stats, isLoading } = useQuery<FinanceStats>({
    queryKey: ["finance-stats", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finance/stats`, { signal }).then((r) => r.data),
    staleTime: 60_000,
  });

  return (
    <PageShell navId="fin">
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)" }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Finansije</div>
        <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
          Pregled
        </h1>
        <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
          Upravljajte bankovnim računima, fakturama i finansijama firme.
        </p>
      </div>

      <div style={{ padding: "28px 32px 110px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* KPI sekcija */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
            Statistike
          </div>
          <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading || !stats ? (
              <KpiSkeleton />
            ) : (
              <KpiCard
                iconBg="var(--green-soft)"
                iconColor="var(--green)"
                icon={<IconDollar w={22} h={22} />}
                value={formatCurrency(stats.total_bank_balance)}
                label="Ukupno na računima"
                sub="Zbir svih bankovnih salda"
              />
            )}
          </div>
        </div>

        {/* Navigacione kartice */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
            Moduli
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 360px))", gap: 16, alignItems: "stretch" }}>
            {MODULES.map((mod) =>
              mod.available ? (
                <Link key={mod.id} href={mod.href} style={{ textDecoration: "none", display: "flex" }}>
                  <ModuleCard {...mod} />
                </Link>
              ) : (
                <ModuleCard key={mod.id} {...mod} />
              )
            )}
          </div>
        </div>

      </div>
    </PageShell>
  );
}
