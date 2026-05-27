"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import { useUser } from "@/lib/useUser";
import { getRole } from "@/lib/auth";
import api from "@/lib/axios";
import type { AppNotification, RecipientType } from "@/types/notification";
import SendNotificationModal from "@/components/notifications/SendNotificationModal";
import type { Sektor } from "@/types/notifications";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

// ── Konstante ─────────────────────────────────────────────────────────────

const RECIPIENT_LABELS: Record<RecipientType, string> = {
  vlasnik:        "Vlasnik",
  administracija: "Administracija",
  finansije:      "Finansije",
  gradiliste:     "Gradilište",
  svi:            "Svi zaposleni",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("sr-Latn", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Notification Card ─────────────────────────────────────────────────────

interface CardProps {
  notification: AppNotification;
  currentUserId: number | null;
  expanded: boolean;
  onToggle: () => void;
  onTaskDone: (n: AppNotification) => void | Promise<void>;
}

function NotificationCard({ notification: n, currentUserId, expanded, onToggle, onTaskDone }: CardProps) {
  const isSent   = currentUserId !== null && n.sender_id === currentUserId;
  const isUnread = !n.is_read && !isSent;

  const cardBg = n.urgent
    ? "#fff8f8"
    : n.is_task && !n.task_done
    ? "#f6fef7"
    : n.is_task && n.task_done
    ? "#fafafa"
    : isUnread
    ? "#faf9ff"
    : "#fff";

  const defaultBorder = n.urgent
    ? (isUnread ? "#fca5a5" : "#fecaca")
    : n.is_task
    ? (isUnread ? "#86efac" : "#d1fae5")
    : isUnread
    ? "#c4b5fd"
    : "var(--border)";

  const hoverBorder = n.urgent ? "#f87171" : n.is_task ? "#4ade80" : "var(--brand)";

  return (
    <div
      onClick={onToggle}
      style={{
        padding: "14px 18px",
        border: `1px solid ${expanded ? "var(--brand)" : defaultBorder}`,
        borderRadius: 12,
        background: cardBg,
        cursor: "pointer",
        transition: "border-color .15s, background .15s",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
      onMouseEnter={(e) => {
        if (!expanded) (e.currentTarget as HTMLDivElement).style.borderColor = hoverBorder;
      }}
      onMouseLeave={(e) => {
        if (!expanded) (e.currentTarget as HTMLDivElement).style.borderColor = defaultBorder;
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Unread dot */}
        <div
          style={{
            width: 8, height: 8,
            borderRadius: "50%",
            flexShrink: 0,
            background: n.urgent && isUnread
              ? "#dc2626"
              : n.is_task && isUnread
              ? "#16a34a"
              : isUnread
              ? "var(--brand)"
              : "transparent",
            border: isUnread ? "none" : "1.5px solid var(--border)",
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" as React.CSSProperties["flexWrap"] }}>
            <span style={{ fontSize: 15, fontWeight: isUnread ? 700 : 500, color: "#111418" }}>
              {n.title}
            </span>

            {n.urgent && (
              <span
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                  background: "#fee2e2", color: "#dc2626",
                  letterSpacing: ".07em", textTransform: "uppercase" as React.CSSProperties["textTransform"],
                  whiteSpace: "nowrap" as React.CSSProperties["whiteSpace"],
                }}
              >
                Hitno
              </span>
            )}
            {n.is_task && (
              <span
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                  background: n.task_done ? "#d1fae5" : "#dcfce7",
                  color: n.task_done ? "#065f46" : "#15803d",
                  letterSpacing: ".07em", textTransform: "uppercase" as React.CSSProperties["textTransform"],
                  whiteSpace: "nowrap" as React.CSSProperties["whiteSpace"],
                }}
              >
                {n.task_done ? "✓ Završeno" : "Zadatak"}
              </span>
            )}

            {isSent && (
              <span
                style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: ".06em",
                  textTransform: "uppercase" as React.CSSProperties["textTransform"],
                  color: "var(--muted)", border: "1px solid var(--border)",
                  borderRadius: 5, padding: "1px 7px",
                  whiteSpace: "nowrap" as React.CSSProperties["whiteSpace"],
                }}
              >
                → {n.audience.map((a) => RECIPIENT_LABELS[a]).join(", ")}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
            {isSent ? "Vi" : `Od: ${n.sender_name}`} · {formatDate(n.created_at)}
          </div>
        </div>

        {/* Caret */}
        <span
          style={{
            color: "var(--muted)", display: "inline-flex",
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform .2s", flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
          <div
            style={{
              fontSize: 14.5, color: "#374151", lineHeight: 1.7,
              whiteSpace: "pre-wrap" as React.CSSProperties["whiteSpace"],
            }}
          >
            {n.content}
          </div>

          {/* Task-done button — only for recipients */}
          {n.is_task && !isSent && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <button
                disabled={n.task_done}
                onClick={(e) => { e.stopPropagation(); onTaskDone(n); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", borderRadius: 9,
                  border: n.task_done ? "1px solid #86efac" : "1px solid #4ade80",
                  background: n.task_done ? "#d1fae5" : "#f0fdf4",
                  color: n.task_done ? "#065f46" : "#15803d",
                  fontSize: 13, fontWeight: 600,
                  cursor: n.task_done ? "default" : "pointer",
                  fontFamily: "inherit", transition: "all .12s",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {n.task_done ? "Zadatak završen" : "Označi kao završeno"}
              </button>
              {!n.task_done && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Vlasnik će dobiti obavještenje
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ObavjestenjaPage() {
  const { user }   = useUser();
  const isVlasnik  = getRole() === "vlasnik";
  const [sendOpen, setSendOpen]     = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [taskDoneIds, setTaskDoneIds] = useState<Set<number>>(new Set());
  const queryClient                 = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<AppNotification[]>({
    queryKey: ["notifications", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/notifications`, { signal }).then((r) => r.data),
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Mark all as read as soon as the user opens this page.
  // cancelQueries aborts any in-flight GET so it can't overwrite the
  // optimistic setQueryData. If the GET already resolved, setQueryData
  // still corrects the cache. invalidateQueries after PATCH ensures the
  // DB truth is reflected once the write commits.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    queryClient.cancelQueries({ queryKey: ["notifications", TENANT] });
    queryClient.setQueryData<AppNotification[]>(
      ["notifications", TENANT],
      (old) => (old ?? []).map((n) => ({ ...n, is_read: true }))
    );
    api.patch(`/api/${TENANT}/notifications/read-all`).then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications", TENANT] });
    });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMut = useMutation({
    mutationFn: (p: { title: string; content: string; audience: string[]; urgent: boolean; is_task: boolean }) =>
      api.post(`/api/${TENANT}/notifications`, p).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", TENANT] }),
  });

  const handleSend = (title: string, message: string, audience: Sektor[], urgent: boolean, isTask: boolean) => {
    sendMut.mutate({ title, content: message, audience, urgent, is_task: isTask });
  };

  const handleToggle = (n: AppNotification) => {
    setExpandedId((prev) => (prev === n.id ? null : n.id));
  };

  const handleTaskDone = async (n: AppNotification) => {
    if (n.task_done || taskDoneIds.has(n.id)) return;
    setTaskDoneIds((prev) => new Set([...prev, n.id]));
    console.log("[task-done] PATCH firing for id:", n.id);
    try {
      const res = await api.patch(`/api/${TENANT}/notifications/${n.id}/task-done`);
      console.log("[task-done] PATCH success:", res.data);
      queryClient.invalidateQueries({ queryKey: ["notifications", TENANT] });
    } catch (err) {
      console.error("[task-done] PATCH FAILED:", err);
    }
    try {
      await api.post(`/api/${TENANT}/notifications`, {
        title: "Zadatak završen",
        content: `Zadatak "${n.title}" je označen kao završen.`,
        audience: ["vlasnik"],
        urgent: false,
        is_task: false,
      });
    } catch (err) {
      console.error("[auto-notif] POST failed:", err);
    }
  };

  const unreadCount = notifications.filter(
    (n) => !n.is_read && n.sender_id !== user?.id
  ).length;

  return (
    <PageShell navId="obv">
      {/* Header */}
      <div
        style={{
          padding: "var(--hero-padding, 8px 32px 6px)",
          borderBottom: "1px solid var(--border-soft)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>
            Interne poruke
          </div>
          <h1
            style={{
              fontSize: "var(--hero-h1, 28px)",
              fontWeight: 700,
              margin: "4px 0",
              letterSpacing: "-0.02em",
              color: "#111418",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            Obavještenja
            {unreadCount > 0 && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 22, height: 22, borderRadius: 11,
                  background: "var(--brand)", color: "#fff",
                  fontSize: 12, fontWeight: 700, padding: "0 6px",
                }}
              >
                {unreadCount}
              </span>
            )}
          </h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
            {isVlasnik
              ? "Poruke koje ste poslali i primili."
              : "Poruke upućene vašem sektoru i firmi."}
          </p>
        </div>

        <button
          onClick={() => setSendOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 18px", background: "var(--brand)", color: "#fff",
            border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", marginBottom: 6,
            whiteSpace: "nowrap" as React.CSSProperties["whiteSpace"],
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Napiši obavještenje
        </button>
      </div>

      {/* List */}
      <div style={{ padding: "24px 32px 110px", display: "flex", flexDirection: "column", gap: 8 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 72, borderRadius: 12, background: "#f1f2f5" }} />
          ))
        ) : notifications.length === 0 ? (
          <div
            style={{
              padding: "72px 0",
              textAlign: "center" as React.CSSProperties["textAlign"],
              color: "var(--muted)",
            }}
          >
            <svg
              width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}
            >
              <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nema obavještenja</p>
            <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>
              Ovdje će se prikazati poruke upućene vašem sektoru.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={{ ...n, task_done: n.task_done || taskDoneIds.has(n.id) }}
              currentUserId={user?.id ?? null}
              expanded={expandedId === n.id}
              onToggle={() => handleToggle(n)}
              onTaskDone={handleTaskDone}
            />
          ))
        )}
      </div>

      <SendNotificationModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        isVlasnik={isVlasnik}
        onSend={handleSend}
      />
    </PageShell>
  );
}
