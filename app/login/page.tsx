"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconDollar,
  IconBars,
  IconBuild,
  IconDoc,
  IconEye,
  IconEyeOff,
} from "@/components/ui/icons";
import api from "@/lib/axios";
import { setToken, setRole } from "@/lib/auth";

/* ─── Decorative perspective grid for the dark left panel ─── */
function LoginGrid() {
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: 0.38,
      }}
      viewBox="0 0 480 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lgv" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4d90ff" stopOpacity="0" />
          <stop offset=".55" stopColor="#4d90ff" stopOpacity=".7" />
          <stop offset="1" stopColor="#4d90ff" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id="lgh" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0a1b3d" stopOpacity="0" />
          <stop offset=".5" stopColor="#4d90ff" stopOpacity=".45" />
          <stop offset="1" stopColor="#0a1b3d" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: 10 }).map((_, i) => {
        const y = 300 + i * 42 + i * i * 2.2;
        return (
          <line
            key={"h" + i}
            x1="0"
            y1={y}
            x2="480"
            y2={y}
            stroke="url(#lgh)"
            strokeWidth=".9"
          />
        );
      })}
      {Array.from({ length: 18 }).map((_, i) => {
        const x = (i / 17) * 480;
        return (
          <line
            key={"v" + i}
            x1={x}
            y1="700"
            x2="240"
            y2="370"
            stroke="url(#lgv)"
            strokeWidth=".9"
          />
        );
      })}
    </svg>
  );
}

/* ─── Animated spinner for loading state ─── */
function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "mg-spin .7s linear infinite", flexShrink: 0 }}
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 2a10 10 0 0 0-10 10" opacity=".25" />
    </svg>
  );
}

/* ─── Custom checkbox mark ─── */
function CheckMark() {
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

/* ─── Left-panel ERP module list ─── */
const MODULES = [
  { Icon: IconDollar, label: "Finansije i izveštaji",   accent: "#4ade80" },
  { Icon: IconBars,   label: "Prodaja i nekretnine",    accent: "#60a5fa" },
  { Icon: IconBuild,  label: "Gradilište i projekti",   accent: "#fbbf24" },
  { Icon: IconDoc,    label: "Administracija",           accent: "#c084fc" },
] as const;

/* ═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const router = useRouter();
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember]         = useState(false);
  const [focused, setFocused]           = useState<"email" | "password" | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      const res = await api.post(`/api/${tenantId}/login`, { email, password });
      setToken(res.data.token);
      const firstRole = (res.data.user?.roles as string[] | undefined)?.[0];
      if (firstRole) setRole(firstRole);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const e422 = (err as { response?: { data?: { errors?: { email?: string[] } } } })
        ?.response?.data?.errors?.email?.[0];
      const e500 = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(e422 ?? e500 ?? "Greška pri prijavi. Pokušajte ponovo.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name: "email" | "password"): React.CSSProperties => ({
    width: "100%",
    padding: "11px 14px",
    paddingRight: name === "password" ? 44 : 14,
    border: `1.5px solid ${focused === name ? "var(--brand)" : "var(--border)"}`,
    borderRadius: 10,
    fontSize: 14.5,
    color: "#111418",
    background: focused === name ? "#fafcff" : "#fff",
    fontFamily: "inherit",
    outline: "none",
    boxShadow: focused === name ? "0 0 0 3px rgba(37,99,235,.1)" : "none",
    transition: "border-color .15s, box-shadow .15s, background .15s",
    boxSizing: "border-box" as React.CSSProperties["boxSizing"],
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13.5,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 6,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--login-grid, 480px 1fr)",
        minHeight: "100vh",
      }}
    >
      {/* ── Left: brand panel ── */}
      <aside
        style={{
          background: "#0a1b3d",
          position: "relative",
          overflow: "hidden",
          display: "var(--login-aside-d, flex)" as React.CSSProperties["display"],
          flexDirection: "column",
          padding: "52px 44px",
          justifyContent: "space-between",
        }}
      >
        <LoginGrid />

        {/* Logo + tagline */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 46,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            <span style={{ color: "#ffffff" }}>my</span>
            <span style={{ color: "#4d90ff" }}>grid</span>
          </div>
          <p
            style={{
              margin: "10px 0 0",
              color: "rgba(255,255,255,.45)",
              fontSize: 14.5,
              letterSpacing: "0.02em",
            }}
          >
            Poslovni informacioni sistem
          </p>
        </div>

        {/* ERP modules */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 10.5,
              fontWeight: 600,
              color: "rgba(255,255,255,.28)",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as React.CSSProperties["textTransform"],
            }}
          >
            Moduli sistema
          </p>
          {MODULES.map(({ Icon, label, accent }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "13px 16px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.09)",
                borderRadius: 14,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(255,255,255,.07)",
                  color: accent,
                  flexShrink: 0,
                }}
              >
                <Icon w={18} h={18} />
              </span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,.72)", fontWeight: 500 }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Version */}
        <p style={{ position: "relative", margin: 0, fontSize: 12, color: "rgba(255,255,255,.2)" }}>
          mygrid v1.0 · {new Date().getFullYear()}
        </p>
      </aside>

      {/* ── Right: form panel ── */}
      <div
        style={{
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 32px",
          minHeight: "100vh",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Mobile-only logo */}
          <div
            style={{
              display: "var(--login-mob-logo-d, none)" as React.CSSProperties["display"],
              fontWeight: 800,
              fontSize: 34,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginBottom: 36,
              userSelect: "none",
            }}
          >
            <span style={{ color: "var(--brand-ink)" }}>my</span>
            <span style={{ color: "var(--brand)" }}>grid</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 34 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                margin: "0 0 8px",
                letterSpacing: "-0.02em",
                color: "#111418",
              }}
            >
              Dobrodošli nazad
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: "#6b7280" }}>
              Unesite podatke za pristup sistemu
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            {/* Email */}
            <div>
              <label style={labelStyle}>Email adresa</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="ime@firma.ba"
                required
                autoComplete="email"
                style={inputStyle("email")}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Lozinka</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={inputStyle("password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "#9aa0a6",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <IconEyeOff w={18} h={18} /> : <IconEye w={18} h={18} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 13.5,
                  color: "#4b5563",
                  userSelect: "none" as React.CSSProperties["userSelect"],
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember((v) => !v)}
                  style={{ display: "none" }}
                />
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `1.5px solid ${remember ? "var(--brand)" : "var(--border)"}`,
                    background: remember ? "var(--brand)" : "#fff",
                    flexShrink: 0,
                    transition: "all .15s",
                  }}
                >
                  {remember && <CheckMark />}
                </span>
                Zapamti me
              </label>

              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13.5,
                  color: "var(--brand)",
                  padding: 0,
                  fontFamily: "inherit",
                  fontWeight: 500,
                }}
              >
                Zaboravili ste lozinku?
              </button>
            </div>

            {/* Greška */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  fontSize: 13.5,
                  color: "var(--red)",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px 20px",
                background: loading ? "#93adf8" : "var(--brand)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
                marginTop: 4,
                transition: "background .2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <Spinner />
                  Prijavljivanje...
                </>
              ) : (
                "Prijavi se"
              )}
            </button>
          </form>

          {/* Footer note */}
          <p
            style={{
              margin: "32px 0 0",
              fontSize: 13,
              color: "#9aa0a6",
              textAlign: "center" as React.CSSProperties["textAlign"],
              lineHeight: 1.6,
            }}
          >
            Za pristup sistemu kontaktirajte
            <br />
            administratora.
          </p>
        </div>
      </div>
    </div>
  );
}
