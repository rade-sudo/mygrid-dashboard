"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconBell } from "@/components/ui/icons";
import type { Notification } from "@/types/notifications";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "upravo";
  if (mins < 60) return `pre ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `pre ${hours} h`;
  return `pre ${Math.floor(hours / 24)} dana`;
}

interface Props {
  notifications: Notification[];
  unreadCount: number;
  readIds: string[];
  onMarkAllRead: () => void;
  onOpenSend: () => void;
}

export default function NotificationBell({
  notifications,
  unreadCount,
  readIds,
  onMarkAllRead,
  onOpenSend,
}: Props) {
  const router  = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goToPage = () => {
    setOpen(false);
    router.push("/dashboard/obavjestenja");
  };

  const recentNotifs = notifications.slice(0, 5);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        aria-label="Obaveštenja"
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          if (willOpen && unreadCount > 0) onMarkAllRead();
        }}
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          border: open
            ? "1px solid rgba(124,58,237,0.35)"
            : "1px solid var(--border)",
          background: open ? "rgba(124,58,237,0.06)" : "#fff",
          display: "grid",
          placeItems: "center",
          position: "relative",
          cursor: "pointer",
          boxShadow: "var(--shadow-card)",
          color: open ? "#7c3aed" : "var(--text)",
          transition: "all .15s",
        }}
      >
        <IconBell w={20} h={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              minWidth: unreadCount > 9 ? 16 : 8,
              height: unreadCount > 9 ? 16 : 8,
              borderRadius: 999,
              background: "#7c3aed",
              boxShadow: "0 0 0 2px #fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 800,
              color: "#fff",
              padding: unreadCount > 9 ? "0 3px" : 0,
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : ""}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            background: "#fff",
            border: "1px solid #ececec",
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            overflow: "hidden",
            zIndex: 200,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: "1px solid #f1f1f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "#7c3aed",
                }}
              >
                Obaveštenja
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 8,
                    background: "#f1ebff",
                    color: "#7c3aed",
                  }}
                >
                  {unreadCount} novo
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                style={{
                  fontSize: 11.5,
                  color: "#8a8f98",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "2px 4px",
                }}
              >
                Označi sve pročitano
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div
            style={{
              padding: "8px 8px 4px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <button
              onClick={() => { setOpen(false); onOpenSend(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 12px",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "background .12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(124,58,237,0.06)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "#f1ebff",
                  display: "grid",
                  placeItems: "center",
                  color: "#7c3aed",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111418", lineHeight: 1.25 }}>
                  Pošalji obaveštenje
                </div>
                <div style={{ fontSize: 11.5, color: "#8a8f98", marginTop: 2 }}>
                  u izabrani sektor
                </div>
              </div>
            </button>

            <button
              onClick={goToPage}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 12px",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "background .12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(37,99,235,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "#eaf1ff",
                  display: "grid",
                  placeItems: "center",
                  color: "#2563eb",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
                  <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111418", lineHeight: 1.25 }}>
                  Istorija obaveštenja
                </div>
                <div style={{ fontSize: 11.5, color: "#8a8f98", marginTop: 2 }}>
                  sva poslata · po sektoru
                </div>
              </div>
            </button>
          </div>

          {/* Recent list */}
          {recentNotifs.length > 0 && (
            <>
              <div
                style={{
                  padding: "8px 16px 6px",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "#b6bac1",
                  borderTop: "1px solid #f5f5f5",
                }}
              >
                Poslednja obaveštenja
              </div>
              <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
                {recentNotifs.map((n) => {
                  const isUnread = !readIds.includes(n.id);
                  return (
                    <button
                      key={n.id}
                      onClick={goToPage}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "9px 10px",
                        borderRadius: 9,
                        border: "none",
                        background: isUnread ? "#fafbff" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        fontFamily: "inherit",
                        transition: "background .1s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f5f5f5")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = isUnread
                          ? "#fafbff"
                          : "transparent")
                      }
                    >
                      <div style={{ paddingTop: 4, flexShrink: 0 }}>
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: n.urgent
                              ? "#dc2626"
                              : isUnread
                              ? "#7c3aed"
                              : "#e5e7eb",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: isUnread ? 600 : 500,
                            color: "#111418",
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.urgent && "⚠ "}
                          {n.title}
                        </div>
                        {n.message && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#8a8f98",
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {n.message}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "#b6bac1", marginTop: 2 }}>
                          {relativeTime(n.createdAt)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {notifications.length > 5 && (
                <button
                  onClick={goToPage}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "transparent",
                    border: "none",
                    borderTop: "1px solid #f5f5f5",
                    color: "#7c3aed",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background .1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#fafbff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Prikaži sva ({notifications.length}) →
                </button>
              )}
            </>
          )}

          {recentNotifs.length === 0 && (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "#b6bac1",
                fontSize: 13,
                borderTop: "1px solid #f5f5f5",
              }}
            >
              Nema obaveštenja
            </div>
          )}
        </div>
      )}
    </div>
  );
}
