"use client";

import React from "react";
import { IconCal, IconCaretSm } from "@/components/ui/icons";
import NotificationCenter from "@/components/notifications/NotificationCenter";

interface TopBarProps {
  onMenu: () => void;
}

export default function TopBar({ onMenu }: TopBarProps) {
  const today = new Date();
  const formatted = today.toLocaleDateString("sr-Latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Mobile bar: hamburger + brand + notifications */}
      <div
        style={{
          display: "var(--topbar-mob-d, none)" as React.CSSProperties["display"],
          alignItems: "center",
          gap: 12,
          padding: "var(--topbar-mob-pad, 14px 20px 0)",
          justifyContent: "space-between",
        }}
      >
        <button
          aria-label="Meni"
          onClick={onMenu}
          style={{
            display: "var(--hamburger-d, none)" as React.CSSProperties["display"],
            width: 42,
            height: 42,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "#fff",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "var(--shadow-card)",
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div
          style={{
            display: "var(--brand-mob-d, none)" as React.CSSProperties["display"],
            fontWeight: 800,
            fontSize: "var(--brand-mob-sz, 28px)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          <span style={{ color: "var(--brand-ink)" }}>my</span>
          <span style={{ color: "var(--brand)" }}>grid</span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <NotificationCenter />
        </div>
      </div>

      {/* Desktop bar: date pill + notifications */}
      <div
        style={{
          display: "var(--topbar-desk-d, flex)" as React.CSSProperties["display"],
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 10,
          padding: "14px 32px 0",
        }}
      >
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            border: "1px solid var(--border)",
            background: "#fff",
            borderRadius: 12,
            fontSize: 14.5,
            color: "#2a2f37",
            cursor: "pointer",
            boxShadow: "var(--shadow-card)",
            fontFamily: "inherit",
          }}
        >
          <span style={{ color: "var(--muted)" }}>
            <IconCal w={18} h={18} />
          </span>
          <span>{formatted}</span>
          <span style={{ color: "#9aa0a6" }}>
            <IconCaretSm />
          </span>
        </button>
        <NotificationCenter />
      </div>

      {/* Brand — desktop only */}
      <div
        style={{
          display: "var(--brand-desk-d, flex)" as React.CSSProperties["display"],
          justifyContent: "center",
          pointerEvents: "none",
          paddingTop: 8,
          paddingBottom: 4,
        }}
        aria-hidden="false"
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          <span style={{ color: "var(--brand-ink)" }}>my</span>
          <span style={{ color: "var(--brand)" }}>grid</span>
        </div>
      </div>
    </div>
  );
}
