"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomTabBar from "./BottomTabBar";
import { useUser } from "@/lib/useUser";
import { getNavRoute } from "@/lib/navUtils";

interface PageShellProps {
  navId: string;
  children: React.ReactNode;
}

export default function PageShell({ navId, children }: PageShellProps) {
  const router = useRouter();
  const { user, loading, logout } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6f8",
          color: "var(--muted)",
          fontSize: 15,
          fontFamily: "inherit",
        }}
      >
        Učitavanje...
      </div>
    );
  }

  if (!user) return null;

  const handleNav = (id: string) => {
    setMenuOpen(false);
    router.push(getNavRoute(id));
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--layout-cols, 288px 1fr)",
        minHeight: "100vh",
        background: "#f5f6f8",
        alignItems: "start",
      }}
    >
      {/* SVG filter — liquid glass refraction (Chrome/Edge) */}
      <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id="mg-lg-main" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" seed="5" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="1.5" result="smoothNoise" />
            <feDisplacementMap in="SourceGraphic" in2="smoothNoise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

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
        activeId={navId}
        onNav={handleNav}
        onClose={() => setMenuOpen(false)}
        isOpen={menuOpen}
        user={user}
        onLogout={logout}
      />

      {/* Glass main panel */}
      <main
        style={{
          position: "relative",
          margin: "var(--main-margin, 14px 14px 14px 0)",
          borderRadius: "var(--main-radius, 18px)",
          overflow: "clip" as React.CSSProperties["overflow"],
          isolation: "isolate",
          minWidth: 0,
          minHeight: "calc(100vh - 28px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 48px rgba(37,99,235,.08), 0 4px 12px rgba(16,24,40,.06)",
        }}
      >
        {/* Layer 1 — backdrop blur + SVG distortion */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backdropFilter: "url(#mg-lg-main) blur(24px) saturate(140%)",
            WebkitBackdropFilter: "blur(24px) saturate(140%)",
            background: "rgba(255, 255, 255, 0.1)",
          }}
        />

        {/* Layer 2 — gradient tint */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: "linear-gradient(155deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 55%, rgba(37,99,235,0.03) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Layer 3 — content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <TopBar onMenu={() => setMenuOpen(true)} />
          {children}
          {/* <BottomTabBar activeId="" onTab={(id) => router.push(getNavRoute(id))} /> */}
        </div>

        {/* Layer 4 — specular rimlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            borderRadius: "inherit",
            boxShadow: [
              "inset 0 1.5px 0 rgba(255,255,255,0.96)",
              "inset 1px 0 0 rgba(255,255,255,0.58)",
              "inset -1px 0 0 rgba(255,255,255,0.28)",
              "inset 0 -1px 0 rgba(255,255,255,0.16)",
            ].join(", "),
            border: "1px solid rgba(255,255,255,0.52)",
            pointerEvents: "none",
          }}
        />
      </main>
    </div>
  );
}
