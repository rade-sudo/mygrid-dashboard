"use client";

import React from "react";
import {
  IconHome,
  IconDollar,
  IconBars,
  IconActivity,
  IconDocLine,
  IconSearch,
} from "@/components/ui/icons";

const TABS = [
  { id: "dash", label: "Početna", icon: IconHome },
  { id: "fin", label: "Finansije", icon: IconDollar },
  { id: "pro", label: "Prodaja", icon: IconBars },
  { id: "izv", label: "Izveštaji", icon: IconActivity },
  { id: "dok", label: "Dokumenti", icon: IconDocLine },
  { id: "pre", label: "Pretraga", icon: IconSearch },
];

interface BottomTabBarProps {
  activeId: string;
  onTab: (id: string) => void;
}

export default function BottomTabBar({ activeId, onTab }: BottomTabBarProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: "var(--tabbar-left, 260px)",
        right: 0,
        bottom: "var(--tabbar-bottom, 18px)",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          background: "#fff",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 24px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)",
          borderRadius: "var(--tabbar-radius, 18px)",
          padding: "var(--tabbar-pad, 8px)",
          display: "grid",
          gridTemplateColumns: "var(--tabbar-grid, repeat(6, minmax(110px, 1fr)))",
          gap: "var(--tabbar-gap, 4px)",
          width: "var(--tabbar-w, min(960px, calc(100% - 64px)))",
        }}
      >
        {TABS.map((tab) => {
          const Ico = tab.icon;
          const isActive = activeId === tab.id || (activeId === "dash" && tab.id === "dash");
          return (
            <button
              key={tab.id}
              onClick={() => onTab(tab.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "var(--tab-pad, 10px 6px 8px)",
                borderRadius: 12,
                fontSize: "var(--tab-sz, 12.5px)",
                color: isActive ? "var(--brand)" : "#4b5563",
                cursor: "pointer",
                background: isActive ? "var(--brand-soft)" : "transparent",
                border: "none",
                fontFamily: "inherit",
                transition: "background .12s ease, color .12s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#f6f7f9";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico w={22} h={22} />
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
