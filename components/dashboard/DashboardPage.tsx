"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import BottomTabBar from "@/components/layout/BottomTabBar";
import PerspectiveGrid from "@/components/dashboard/PerspectiveGrid";
import ReportsCard from "@/components/dashboard/cards/ReportsCard";
import ActivityCard from "@/components/dashboard/cards/ActivityCard";
import {
  BankBalanceCard,
  SupplierSaldoCard,
  PdvCard,
} from "@/components/dashboard/cards/FinanceCards";
import StanoviCard from "@/components/dashboard/cards/StanoviCard";
import GorivoCard from "@/components/dashboard/cards/GorivoCard";
import PlateCard from "@/components/dashboard/cards/PlateCard";
import SastanciCard from "@/components/dashboard/cards/SastanciCard";
import { IconCaretSm } from "@/components/ui/icons";
import type { AuthUser } from "@/types/auth";

type CardId =
  | "reports"
  | "activity"
  | "bankBalance"
  | "supplierSaldo"
  | "pdv"
  | "stanovi"
  | "gorivo"
  | "plate"
  | "sastanci";

const CARD_LIST: { id: CardId; label: string }[] = [
  { id: "reports", label: "Izveštaji od sektora" },
  { id: "activity", label: "Aktivnosti sektori" },
  { id: "bankBalance", label: "Stanje na računu" },
  { id: "supplierSaldo", label: "Saldo dobavljača" },
  { id: "pdv", label: "PDV" },
  { id: "stanovi", label: "Stanovi" },
  { id: "gorivo", label: "Gorivo" },
  { id: "plate", label: "Plate" },
  { id: "sastanci", label: "Sastanci" },
];

const INIT_VISIBLE = Object.fromEntries(
  CARD_LIST.map((c) => [c.id, true])
) as Record<CardId, boolean>;

function IconFilter({ w = 16, h = 16 }: { w?: number; h?: number }) {
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 5h18M6 12h12M9 19h6" />
    </svg>
  );
}

function Checkmark() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.5 5l2.5 2.5 4.5-4.5" />
    </svg>
  );
}

interface DashboardPageProps {
  user?: AuthUser | null;
  onLogout?: () => void;
}

export default function DashboardPage({ user, onLogout }: DashboardPageProps) {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("dash");
  const [activeTab, setActiveTab] = useState("dash");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCards, setVisibleCards] =
    useState<Record<CardId, boolean>>(INIT_VISIBLE);
  const [hoveredCard, setHoveredCard] = useState<CardId | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const handleNav = (id: string) => {
    if (id === "adm") { router.push("/dashboard/administracija"); return; }
    if (id === "fin") { router.push("/dashboard/finansije"); return; }
    if (id === "pro") { router.push("/dashboard/prodaja"); return; }
    if (id === "grad") { router.push("/dashboard/gradiliste"); return; }
    if (id === "obv") { router.push("/dashboard/obavjestenja"); return; }
    setActiveNav(id);
    setActiveTab("dash");
  };

  const handleTab = (id: string) => {
    setActiveTab(id);
    const navMap: Record<string, string> = { dash: "dash", fin: "fin", pro: "pro" };
    setActiveNav(navMap[id] ?? activeNav);
  };

  const toggleCard = (id: CardId) =>
    setVisibleCards((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    if (!filterOpen) return;
    const onDown = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [filterOpen]);

  const hiddenCount = CARD_LIST.filter((c) => !visibleCards[c.id]).length;
  const r1 = [visibleCards.reports, visibleCards.activity].filter(Boolean).length;
  const r2 = [visibleCards.bankBalance, visibleCards.supplierSaldo, visibleCards.pdv].filter(Boolean).length;
  const r3 = [visibleCards.stanovi, visibleCards.gorivo, visibleCards.plate, visibleCards.sastanci].filter(Boolean).length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--layout-cols, 260px 1fr)",
        minHeight: "100vh",
        background: "#ffffff",
      }}
    >
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,17,36,.42)",
            zIndex: 40,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      <Sidebar
        activeId={activeNav}
        onNav={handleNav}
        onClose={() => setMenuOpen(false)}
        isOpen={menuOpen}
        user={user}
        onLogout={onLogout}
      />

      <main
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background: "#ffffff",
          position: "relative",
          isolation: "isolate",
        }}
      >
        <PerspectiveGrid />
        <TopBar onMenu={() => setMenuOpen(true)} />

        {/* Hero wrapper: no overflow so the dropdown isn't clipped */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "relative",
              padding: "var(--hero-padding, 8px 32px 6px)",
              overflow: "hidden",
            }}
          >
            <h1
              style={{
                fontSize: "var(--hero-h1, 32px)",
                fontWeight: 700,
                margin: "8px 0 4px",
                letterSpacing: "-0.02em",
                position: "relative",
              }}
            >
              Dashboard
            </h1>
            <p
              style={{
                margin: 0,
                color: "#2a2f37",
                fontSize: "var(--hero-p, 15.5px)",
                position: "relative",
              }}
            >
              Dobrodošao, {user?.name?.split(" ")[0] ?? ""}!
            </p>
          </div>

          {/* Filter button */}
          <div
            ref={filterRef}
            style={{
              position: "absolute",
              top: "50%",
              right: 32,
              transform: "translateY(-50%)",
              zIndex: 50,
            }}
          >
            <button
              onClick={() => setFilterOpen((v) => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                border: `1px solid ${filterOpen || hiddenCount > 0 ? "var(--brand)" : "var(--border)"}`,
                background: filterOpen ? "#f5f8ff" : "#fff",
                borderRadius: 12,
                fontSize: 14,
                color: filterOpen || hiddenCount > 0 ? "var(--brand)" : "#2a2f37",
                cursor: "pointer",
                boxShadow: "var(--shadow-card)",
                fontFamily: "inherit",
                fontWeight: 500,
              }}
            >
              <IconFilter />
              <span>Kartice</span>
              {hiddenCount > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background: "var(--brand)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "0 5px",
                  }}
                >
                  {hiddenCount}
                </span>
              )}
              <span
                style={{
                  color: "#9aa0a6",
                  display: "inline-flex",
                  transform: filterOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <IconCaretSm />
              </span>
            </button>

            {filterOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 240,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  boxShadow:
                    "0 8px 32px rgba(16,24,40,.1), 0 2px 8px rgba(16,24,40,.06)",
                  zIndex: 60,
                }}
              >
                <div
                  style={{
                    padding: "10px 16px 8px",
                    borderBottom: "1px solid var(--border-soft)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--muted)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase" as React.CSSProperties["textTransform"],
                    }}
                  >
                    Prikaz kartica
                  </span>
                  <button
                    onClick={() => setVisibleCards(INIT_VISIBLE)}
                    style={{
                      fontSize: 12,
                      color: "var(--brand)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontFamily: "inherit",
                      fontWeight: 500,
                    }}
                  >
                    Prikaži sve
                  </button>
                </div>

                <div style={{ padding: "6px 0" }}>
                  {CARD_LIST.map((card) => (
                    <label
                      key={card.id}
                      onMouseEnter={() => setHoveredCard(card.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 16px",
                        cursor: "pointer",
                        fontSize: 14,
                        color: visibleCards[card.id] ? "#111418" : "var(--muted)",
                        background:
                          hoveredCard === card.id ? "#f8f9fa" : "transparent",
                        userSelect: "none" as React.CSSProperties["userSelect"],
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          border: `1.5px solid ${visibleCards[card.id] ? "var(--brand)" : "var(--border)"}`,
                          background: visibleCards[card.id] ? "var(--brand)" : "#fff",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      >
                        {visibleCards[card.id] && <Checkmark />}
                      </span>
                      <input
                        type="checkbox"
                        checked={visibleCards[card.id]}
                        onChange={() => toggleCard(card.id)}
                        style={{ display: "none" }}
                      />
                      {card.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            padding: "var(--content-padding, 24px 32px 110px)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--content-gap, 20px)",
          }}
        >
          {r1 > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  r1 === 2 ? "var(--row2-cols, 1fr 1fr)" : "1fr",
                gap: 20,
              }}
            >
              {visibleCards.reports && <ReportsCard />}
              {visibleCards.activity && <ActivityCard />}
            </div>
          )}

          {r2 > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  r2 === 3
                    ? "var(--row3-cols, repeat(3, 1fr))"
                    : `repeat(${r2}, 1fr)`,
                gap: 20,
              }}
            >
              {visibleCards.bankBalance && <BankBalanceCard />}
              {visibleCards.supplierSaldo && <SupplierSaldoCard />}
              {visibleCards.pdv && <PdvCard />}
            </div>
          )}

          {r3 > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  r3 === 4
                    ? "var(--row4-cols, repeat(4, 1fr))"
                    : `repeat(${r3}, 1fr)`,
                gap: 20,
              }}
            >
              {visibleCards.stanovi && <StanoviCard />}
              {visibleCards.gorivo && <GorivoCard />}
              {visibleCards.plate && <PlateCard />}
              {visibleCards.sastanci && <SastanciCard />}
            </div>
          )}
        </div>

        <BottomTabBar activeId={activeTab} onTab={handleTab} />
      </main>
    </div>
  );
}
