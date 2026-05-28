"use client";

import React, { useState, useRef, useEffect } from "react";
import api from "@/lib/axios";
import { useNotifications } from "@/lib/useNotifications";
import {
  IconHome,
  IconDollar,
  IconBars,
  IconBuild,
  IconDoc,
  IconPhone,
  IconBell,
  IconCaretSm,
  IconEye,
  IconEyeOff,
} from "@/components/ui/icons";
import type { AuthUser } from "@/types/auth";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

// ── Inline icons ─────────────────────────────────────────────────────────

function IconLogout({ w = 16, h = 16 }: { w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconUserPlus({ w = 16, h = 16 }: { w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/-/g, " ");
}

// ── Nav filtriranje po ulozi ──────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ w?: number; h?: number }>;
}

const NAV_ALL: NavItem[] = [
  { id: "dash", label: "Dashboard",      icon: IconHome   },
  { id: "fin",  label: "Finansije",      icon: IconDollar },
  { id: "pro",  label: "Prodaja",        icon: IconBars   },
  { id: "grad", label: "Gradilište",     icon: IconBuild  },
  { id: "adm",  label: "Administracija", icon: IconDoc    },
  { id: "obv",  label: "Obaveštenja",   icon: IconBell   },
];

function getAllowedNavIds(roles: string[]): string[] {
  if (roles.includes("vlasnik"))              return ["dash", "fin", "pro", "grad", "adm", "obv"];
  if (roles.includes("administrator"))        return ["adm", "obv"];
  if (roles.includes("menadzer-finansija"))   return ["dash", "fin", "obv"];
  if (roles.includes("menadzer-gradilista"))  return ["dash", "grad", "obv"];
  return ["dash", "obv"];
}

const NAV_COLORS: Record<string, { bg: string; text: string }> = {
  dash: { bg: "var(--brand-soft)",  text: "var(--brand)"  },
  fin:  { bg: "var(--green-soft)",  text: "var(--green)"  },
  pro:  { bg: "var(--brand-soft)",  text: "var(--brand)"  },
  grad: { bg: "var(--amber-soft)",  text: "var(--amber)"  },
  adm:  { bg: "var(--violet-soft)", text: "var(--violet)" },
  obv:  { bg: "var(--amber-soft)",  text: "var(--amber)"  },
};

const CONTACTS = [
  { role: "Menadžer pumpa",  name: "—" },
  { role: "Šef gradilišta",  name: "—" },
  { role: "Prodaja",         name: "—" },
];

// ── AddUserPanel ──────────────────────────────────────────────────────────

interface AddUserForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

const EMPTY_ADD_USER: AddUserForm = {
  name: "", email: "", phone: "", password: "", role: "administrator",
};

const ROLE_OPTIONS = [
  { value: "administrator",        label: "Šef administracije" },
  { value: "menadzer-finansija",   label: "Šef finansija"      },
  { value: "menadzer-gradilista",  label: "Šef gradilišta"     },
];

interface AddUserPanelProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function AddUserPanel({ open, onClose, onSuccess }: AddUserPanelProps) {
  const [form, setForm]         = useState<AddUserForm>(EMPTY_ADD_USER);
  const [apiErrors, setApiErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_ADD_USER);
      setApiErrors({});
      setShowPw(false);
    }
  }, [open]);

  const set = (field: keyof AddUserForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setApiErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiErrors({});
    setLoading(true);
    try {
      const res = await api.post(`/api/${TENANT}/users`, {
        ...form,
        phone: form.phone || null,
      });
      onSuccess(`Korisnik ${res.data.name} je uspješno dodat.`);
      onClose();
    } catch (err: unknown) {
      const errs = (err as { response?: { data?: { errors?: Record<string, string[]> } } })
        ?.response?.data?.errors ?? {};
      setApiErrors(errs);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const iStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1.5px solid var(--border)",
    borderRadius: 9,
    fontSize: 14,
    color: "#111418",
    background: "#fff",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color .15s",
  };
  const lStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 5,
  };
  const errStyle: React.CSSProperties = {
    color: "var(--red)",
    fontSize: 12,
    margin: "4px 0 0",
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(10,17,36,.42)",
          zIndex: 100,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: 420,
          background: "#fff",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(16,24,40,.12)",
          animation: "slideInRight .25s cubic-bezier(.32,.72,.27,1)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border-soft)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#111418" }}>
            Dodaj korisnika
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--muted)" }}>
            Novi korisnik dobija pristup sistemu sa odabranom ulogom.
          </p>
        </div>

        {/* Form */}
        <form
          id="add-user-form"
          onSubmit={handleSubmit}
          style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label style={lStyle}>Ime i prezime</label>
            <input type="text" value={form.name} onChange={set("name")} required placeholder="Npr. Marko Marković" style={iStyle} />
            {apiErrors.name && <p style={errStyle}>{apiErrors.name[0]}</p>}
          </div>

          <div>
            <label style={lStyle}>Email adresa</label>
            <input type="email" value={form.email} onChange={set("email")} required placeholder="marko@firma.ba" style={iStyle} />
            {apiErrors.email && <p style={errStyle}>{apiErrors.email[0]}</p>}
          </div>

          <div>
            <label style={lStyle}>
              Broj telefona{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcionalno)</span>
            </label>
            <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+387 61 000 000" style={iStyle} />
          </div>

          <div>
            <label style={lStyle}>Lozinka</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                required
                placeholder="Minimalno 8 znakova"
                style={{ ...iStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  color: "var(--muted)", display: "flex", alignItems: "center",
                }}
              >
                {showPw ? <IconEyeOff w={16} h={16} /> : <IconEye w={16} h={16} />}
              </button>
            </div>
            {apiErrors.password && <p style={errStyle}>{apiErrors.password[0]}</p>}
          </div>

          <div>
            <label style={lStyle}>Uloga u sistemu</label>
            <select value={form.role} onChange={set("role")} required style={{ ...iStyle, cursor: "pointer" }}>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {apiErrors.role && <p style={errStyle}>{apiErrors.role[0]}</p>}
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border-soft)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 18px",
              border: "1px solid var(--border)",
              borderRadius: 9,
              background: "#fff",
              fontSize: 14,
              color: "#374151",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 500,
            }}
          >
            Odustani
          </button>
          <button
            type="submit"
            form="add-user-form"
            disabled={loading}
            style={{
              padding: "9px 20px",
              border: "none",
              borderRadius: 9,
              background: loading ? "#93adf8" : "var(--brand)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Dodavanje..." : "Dodaj korisnika"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────

interface SidebarProps {
  activeId: string;
  onNav: (id: string) => void;
  onClose?: () => void;
  isOpen?: boolean;
  user?: AuthUser | null;
  onLogout?: () => void;
}

export default function Sidebar({ activeId, onNav, onClose, isOpen, user, onLogout }: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [addUserOpen, setAddUserOpen]     = useState(false);
  const [toast, setToast]                 = useState<string | null>(null);
  const userCardRef                       = useRef<HTMLDivElement>(null);
  const { unreadCount }                   = useNotifications();

  const isVlasnik = user?.roles.includes("vlasnik") ?? false;
  const allowedIds = getAllowedNavIds(user?.roles ?? []);
  const filteredNav = NAV_ALL.filter((item) => allowedIds.includes(item.id));

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (userCardRef.current && !userCardRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  function handleSuccess(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <>
      {/* SVG filter — liquid glass refraction (Chrome/Edge) */}
      <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id="mg-lg-sidebar" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" seed="2" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="1.5" result="smoothNoise" />
            <feDisplacementMap in="SourceGraphic" in2="smoothNoise" scale="7" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          </filter>
        </defs>
      </svg>

      <aside
        style={{
          position: "var(--sidebar-pos, sticky)" as React.CSSProperties["position"],
          top: "var(--sidebar-top-offset, 14px)" as unknown as number,
          margin: "var(--sidebar-margin, 14px 0 14px 14px)",
          width: "var(--sidebar-w, 260px)",
          flexShrink: 0,
          height: "var(--sidebar-height, calc(100vh - 28px))",
          maxHeight: "var(--sidebar-height, calc(100vh - 28px))",
          borderRadius: "var(--sidebar-radius, 18px)",
          transform: isOpen ? "translateX(0)" : "var(--sidebar-transform, none)",
          transition: "transform .25s cubic-bezier(.32,.72,.27,1)",
          zIndex: "var(--sidebar-z, auto)" as unknown as number,
          alignSelf: "flex-start",
          overflow: "hidden",
          isolation: "isolate",
          boxShadow: "0 16px 48px rgba(37,99,235,.13), 0 4px 12px rgba(16,24,40,.08)",
        }}
      >
        {/* Layer 1 — backdrop blur + SVG distortion */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backdropFilter: "url(#mg-lg-sidebar) blur(36px) saturate(190%)",
            WebkitBackdropFilter: "blur(36px) saturate(190%)",
            background: "rgba(255, 255, 255, 0.16)",
          }}
        />

        {/* Layer 2 — gradient tint (brighter top-left → dimmer bottom-right) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: "linear-gradient(155deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 55%, rgba(37,99,235,0.05) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Layer 3 — scrollable content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            padding: "18px 14px 14px",
            gap: 6,
          }}
        >
          {/* Logo */}
          <div style={{ height: 56, display: "flex", alignItems: "center", paddingLeft: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 32, letterSpacing: "-0.04em", lineHeight: 1, userSelect: "none" }}>
              <span style={{ color: "var(--brand-ink)" }}>my</span>
              <span style={{ color: "var(--brand)" }}>grid</span>
            </div>
          </div>

          {/* Main navigation — filtrirano po ulozi */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "6px 0" }}>
            {filteredNav.map((item) => {
              const Ico = item.icon;
              const isActive = activeId === item.id;
              const clr = NAV_COLORS[item.id] ?? NAV_COLORS.dash;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNav(item.id); onClose?.(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "11px 14px", borderRadius: 10,
                    color: isActive ? clr.text : "#1a1f2e",
                    fontSize: 15, fontWeight: 500, cursor: "pointer",
                    background: isActive ? clr.bg : "transparent",
                    border: "none", width: "100%", textAlign: "left",
                    transition: "background .12s ease, color .12s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.42)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <span style={{ color: isActive ? clr.text : "#4b5563", flexShrink: 0 }}>
                    <Ico w={20} h={20} />
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.id === "obv" && unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1,
                        padding: "2px 7px",
                        borderRadius: 999,
                        background: isActive ? clr.text : "rgba(124,58,237,0.12)",
                        color: isActive ? "#fff" : "#7c3aed",
                        flexShrink: 0,
                      }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Brzi kontakti */}
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".12em", color: "var(--muted)", padding: "14px 12px 6px", textTransform: "uppercase" }}>
            Brzi kontakti
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {CONTACTS.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderRadius: 10, color: "#1a1f2e", fontSize: 14.5 }}>
                <span style={{ color: "var(--muted-2)", flexShrink: 0 }}>
                  <IconPhone w={18} h={18} />
                </span>
                <div>
                  <div>{c.role}</div>
                  <div style={{ fontSize: 13, color: "var(--muted-2)", marginTop: 2 }}>{c.name}</div>
                </div>
              </div>
            ))}
          </div>

          {/* User card */}
          <div ref={userCardRef} style={{ marginTop: "auto", position: "relative" }}>
            {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: 0, right: 0,
                  background: "rgba(255, 255, 255, 0.82)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid rgba(255, 255, 255, 0.70)",
                  borderRadius: 14,
                  boxShadow: "0 12px 40px rgba(37,99,235,.12), 0 2px 8px rgba(16,24,40,.08), inset 0 1px 0 rgba(255,255,255,.95)",
                  overflow: "hidden",
                }}
              >
                {isVlasnik && (
                  <button
                    onClick={() => { setUserMenuOpen(false); setAddUserOpen(true); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "11px 14px",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 14, color: "var(--brand)",
                      fontFamily: "inherit", fontWeight: 500, textAlign: "left",
                      borderBottom: "1px solid rgba(255,255,255,0.5)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,246,255,0.6)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                  >
                    <IconUserPlus w={16} h={16} />
                    Dodaj korisnika
                  </button>
                )}
                <button
                  onClick={() => { setUserMenuOpen(false); onLogout?.(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "11px 14px",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, color: "#dc2626",
                    fontFamily: "inherit", fontWeight: 500, textAlign: "left",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(254,242,242,0.65)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                >
                  <IconLogout w={16} h={16} />
                  Odjavi se
                </button>
              </div>
            )}

            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: 10,
                border: `1px solid ${userMenuOpen ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.50)"}`,
                background: userMenuOpen ? "rgba(239,246,255,0.50)" : "rgba(255,255,255,0.38)",
                backdropFilter: "blur(12px) saturate(160%)",
                WebkitBackdropFilter: "blur(12px) saturate(160%)",
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(16,24,40,.06), inset 0 1px 0 rgba(255,255,255,.90)",
                width: "100%",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "border-color .15s, background .15s",
              }}
            >
            <div
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: "#1f2937", color: "#fff",
                display: "grid", placeItems: "center",
                fontWeight: 700, fontSize: 14, letterSpacing: ".02em", flexShrink: 0,
              }}
            >
              {user ? getInitials(user.name) : "—"}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.2, color: "#111418" }}>
                {user?.name ?? "—"}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                {user?.roles[0] ? formatRole(user.roles[0]) : "—"}
              </div>
            </div>
            <span
              style={{
                color: userMenuOpen ? "var(--brand)" : "#9aa0a6",
                display: "inline-flex",
                transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform .2s, color .15s",
                flexShrink: 0,
              }}
            >
              <IconCaretSm />
            </span>
          </button>
          </div>{/* /user card */}
        </div>{/* /Layer 3 content */}

        {/* Layer 4 — specular rimlight (above content, pointer-events off) */}
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
      </aside>

      {/* AddUser slide-over */}
      <AddUserPanel
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24, right: 24,
            zIndex: 200,
            padding: "12px 18px",
            background: "#111418",
            color: "#fff",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 340,
            animation: "slideInRight .2s ease",
          }}
        >
          <span style={{ color: "#4ade80", fontSize: 18, lineHeight: 1 }}>✓</span>
          {toast}
        </div>
      )}
    </>
  );
}
