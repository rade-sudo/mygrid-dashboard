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
          background: "var(--bg)",
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
        activeId={navId}
        onNav={handleNav}
        onClose={() => setMenuOpen(false)}
        isOpen={menuOpen}
        user={user}
        onLogout={logout}
      />

      <main
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background: "#ffffff",
        }}
      >
        <TopBar onMenu={() => setMenuOpen(true)} />
        {children}
        <BottomTabBar activeId="" onTab={(id) => router.push(getNavRoute(id))} />
      </main>
    </div>
  );
}
