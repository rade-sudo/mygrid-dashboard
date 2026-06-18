"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import { IconUsers, IconDoc, IconCal, IconActivity } from "@/components/ui/icons";

function IconSifrarnik({ w = 24, h = 24 }: { w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  total_employees: number;
  currently_absent: number;
  expiring_contracts: number;
  total_contracts: number;
}

// ─── Module nav cards ─────────────────────────────────────────────────────────

const MODULES = [
  {
    id: "zaposleni",
    title: "Kadrovska evidencija",
    description: "Pregled zaposlenih, pozicije, ugovori, plate i odsustva.",
    Icon: IconUsers,
    href: "/dashboard/administracija/zaposleni",
    available: true,
  },
  {
    id: "ugovori",
    title: "Ugovori",
    description: "Upravljanje ugovorima i pratećom dokumentacijom.",
    Icon: IconDoc,
    href: "/dashboard/administracija/ugovori",
    available: true,
  },
  {
    id: "godisnji-odmori",
    title: "Godišnji odmori i odsustva",
    description: "Planiranje i evidencija godišnjih odmora, bolovanja i odsustva zaposlenih.",
    Icon: IconCal,
    href: "/dashboard/administracija/godisnji-odmori",
    available: true,
  },
  {
    id: "sifarnici",
    title: "Šifarnici",
    description: "Upravljanje sektorima, organizacionim jedinicama i kategorijama troškova faktura.",
    Icon: IconSifrarnik,
    href: "/dashboard/administracija/sifarnici",
    available: true,
  },
];

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
        transition: "box-shadow .15s, border-color .15s, transform .12s",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
      }}
      onMouseEnter={(e) => {
        if (!available) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "0 6px 24px rgba(124,58,237,.10), 0 1px 4px rgba(16,24,40,.06)";
        el.style.borderColor = "var(--violet)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "var(--shadow-card)";
        el.style.borderColor = "var(--border)";
      }}
    >
      <div
        style={{
          width: 52, height: 52, borderRadius: 14,
          background: "var(--violet-soft)", color: "var(--violet)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon w={26} h={26} />
      </div>

      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111418", marginBottom: 6, letterSpacing: "-0.01em" }}>
          {title}
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
          {description}
        </div>
      </div>

      {available ? (
        <div style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "var(--violet)" }}>
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

// ─── KPI cards ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
  sub: string;
  accent?: boolean;
  accentColor?: string;
  accentBg?: string;
}

function KpiCard({ icon, iconBg, iconColor, value, label, sub, accent, accentColor, accentBg }: KpiCardProps) {
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${accent && value > 0 ? accentColor ?? "var(--border)" : "var(--border)"}`,
      borderRadius: 16,
      padding: "20px 22px",
      boxShadow: "var(--shadow-card)",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: accent && value > 0 ? (accentBg ?? iconBg) : iconBg,
          color: accent && value > 0 ? (accentColor ?? iconColor) : iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
        {accent && value > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
            padding: "3px 9px", borderRadius: 20,
            background: accentBg, color: accentColor,
          }}>
            Pažnja
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: accent && value > 0 ? (accentColor ?? "#111418") : "#111418", letterSpacing: "-0.03em", lineHeight: 1 }}>
          {value}
        </div>
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
        @keyframes kpiShimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .kpi-skel {
          background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%);
          background-size: 800px 100%;
          animation: kpiShimmer 1.4s infinite linear;
          border-radius: 8px;
        }
      `}</style>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px", boxShadow: "var(--shadow-card)" }}>
          <div className="kpi-skel" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 18 }} />
          <div className="kpi-skel" style={{ width: 64, height: 32, marginBottom: 8 }} />
          <div className="kpi-skel" style={{ width: 120, height: 14, marginBottom: 6 }} />
          <div className="kpi-skel" style={{ width: 90, height: 12 }} />
        </div>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdministracijaPage() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/admin/stats`, { signal }).then((r) => r.data),
    staleTime: 60_000,
  });

  return (
    <PageShell navId="adm">
      {/* Page header */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)" }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>
          Administracija
        </div>
        <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
          Pregled
        </h1>
        <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
          Upravljajte kadrovskom evidencijom i dokumentacijom.
        </p>
      </div>

      <div style={{ padding: "28px 32px 110px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* KPI sekcija */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
            Statistike
          </div>
          <div className={`grid w-full gap-4 grid-cols-1 sm:grid-cols-2 ${stats && stats.expiring_contracts > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {isLoading || !stats ? (
              <KpiSkeleton />
            ) : (
              <>
                <KpiCard
                  iconBg="var(--violet-soft)"
                  iconColor="var(--violet)"
                  icon={<IconUsers w={22} h={22} />}
                  value={stats.total_employees}
                  label="Aktivnih zaposlenih"
                  sub="Trenutno aktivni radnici"
                />
                <KpiCard
                  iconBg="#e8f6ee"
                  iconColor="#16a34a"
                  icon={<IconCal w={22} h={22} />}
                  value={stats.currently_absent}
                  label="Na odmoru / odsutni"
                  sub="Danas je datum odmora"
                />
                <KpiCard
                  iconBg="var(--violet-soft)"
                  iconColor="var(--violet)"
                  icon={<IconDoc w={22} h={22} />}
                  value={stats.total_contracts}
                  label="Ukupno ugovora"
                  sub="Svi poslovni ugovori"
                />
                {stats.expiring_contracts > 0 && (
                  <KpiCard
                    iconBg="#fdf3e3"
                    iconColor="#d97706"
                    icon={<IconActivity w={22} h={22} />}
                    value={stats.expiring_contracts}
                    label="Ističu ugovori"
                    sub="U narednih 30 dana"
                    accent
                    accentColor="#d97706"
                    accentBg="#fdf3e3"
                  />
                )}
              </>
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
