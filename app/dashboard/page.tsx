"use client";

import DashboardPage from "@/components/dashboard/DashboardPage";
import { useUser } from "@/lib/useUser";

export default function Dashboard() {
  const { user, loading, logout } = useUser();

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

  return <DashboardPage user={user} onLogout={logout} />;
}
