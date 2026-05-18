"use client";

import React from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { IconUsers, IconDoc } from "@/components/ui/icons";

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
    available: false,
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
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "var(--violet-soft)",
          color: "var(--violet)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon w={26} h={26} />
      </div>

      <div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#111418",
            marginBottom: 6,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
          {description}
        </div>
      </div>

      {available ? (
        <div
          style={{
            marginTop: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--violet)",
          }}
        >
          Otvori modul
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      ) : (
        <div
          style={{
            marginTop: "auto",
            display: "inline-block",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "3px 9px",
          }}
        >
          Uskoro
        </div>
      )}
    </div>
  );
}

export default function AdministracijaPage() {
  return (
    <PageShell navId="adm">
      <div
        style={{
          padding: "var(--hero-padding, 8px 32px 6px)",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>
          Administracija
        </div>
        <h1
          style={{
            fontSize: "var(--hero-h1, 28px)",
            fontWeight: 700,
            margin: "4px 0",
            letterSpacing: "-0.02em",
            color: "#111418",
          }}
        >
          Odaberite modul
        </h1>
        <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
          Upravljajte kadrovskom evidencijom i dokumentacijom.
        </p>
      </div>

      <div
        style={{
          padding: "28px 32px 110px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 360px))",
          gap: 16,
          alignContent: "start",
        }}
      >
        {MODULES.map((mod) =>
          mod.available ? (
            <Link key={mod.id} href={mod.href} style={{ textDecoration: "none", display: "block" }}>
              <ModuleCard {...mod} />
            </Link>
          ) : (
            <ModuleCard key={mod.id} {...mod} />
          )
        )}
      </div>
    </PageShell>
  );
}
