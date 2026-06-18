"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import PaymentDetailsModal from "./PaymentDetailsModal";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

export interface DueApiItem {
  id: string;
  type: "invoice" | "installment";
  title: string;
  subtitle: string;
  amount_due: number;
  total_amount: number;
  due_date: string;
  address: string | null;
  bank_account: string | null;
  payment_reference: string | null;
  pib: string | null;
  document_available: boolean;
  nav_id: number | null;
  // invoice-specific
  invoice_number: string | null;
  // installment-specific
  reminder_title: string | null;
  installment_number: number | null;
  total_installments_count: number | null;
}

interface DueApiResponse {
  data: DueApiItem[];
  total_count: number;
}

export function fmt(val: number) {
  return val.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(val: string): string {
  return new Date(val).toLocaleDateString("sr-Latn", { day: "numeric", month: "short", year: "numeric" });
}

export function getDaysStatus(dueDate: string): {
  daysOverdue: number | null;
  daysUntilDue: number | null;
  isToday: boolean;
} {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return { daysOverdue: Math.abs(diff), daysUntilDue: null, isToday: false };
  if (diff === 0) return { daysOverdue: null, daysUntilDue: null, isToday: true };
  return { daysOverdue: null, daysUntilDue: diff, isToday: false };
}

export function getItemColors(dueDate: string): {
  borderColor: string;
  bgColor: string;
  bgHoverColor: string;
  statusColor: string;
  statusWeight: number;
} {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diff < 0) {
    return { borderColor: "#dc2626", bgColor: "rgba(254,242,242,0.3)", bgHoverColor: "rgba(254,226,226,0.55)", statusColor: "#dc2626", statusWeight: 700 };
  }
  if (diff <= 3) {
    return { borderColor: "#fb923c", bgColor: "rgba(255,247,237,0.3)", bgHoverColor: "rgba(254,235,200,0.55)", statusColor: "#d97706", statusWeight: 700 };
  }
  return { borderColor: "#d1d5db", bgColor: "#f8fafc", bgHoverColor: "#f1f5f9", statusColor: "#6b7280", statusWeight: 500 };
}

export function StatusBadge({ dueDate }: { dueDate: string }) {
  const { daysOverdue, daysUntilDue, isToday } = getDaysStatus(dueDate);
  const { statusColor, statusWeight } = getItemColors(dueDate);
  if (daysOverdue !== null) {
    return (
      <span style={{ fontSize: 11.5, fontWeight: statusWeight, color: statusColor, letterSpacing: ".04em" }}>
        KASNI {daysOverdue}d
      </span>
    );
  }
  if (isToday) {
    return (
      <span style={{ fontSize: 11.5, fontWeight: statusWeight, color: statusColor, letterSpacing: ".04em" }}>
        DANAS
      </span>
    );
  }
  if (daysUntilDue !== null) {
    return (
      <span style={{ fontSize: 11.5, fontWeight: statusWeight, color: statusColor, letterSpacing: ".04em" }}>
        ZA {daysUntilDue} DANA
      </span>
    );
  }
  return null;
}

export function DueItemRow({
  item,
  showDate,
  onClick,
  amountColor,
}: {
  item: DueApiItem;
  showDate?: boolean;
  onClick?: () => void;
  amountColor?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = getItemColors(item.due_date);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { if (onClick) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "11px 14px",
        background: hovered ? colors.bgHoverColor : colors.bgColor,
        borderRadius: 10,
        borderLeft: `3px solid ${colors.borderColor}`,
        cursor: onClick ? "pointer" : "default",
        transition: "background .12s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <div
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 9,
            border: "1px solid #e7d8b0",
            background: "#fdf9ef",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#b45309",
          }}
        >
          {item.type === "invoice" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
              <path d="M14 3v5h5" />
              <path d="M9 13h6M9 17h4" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111418", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.title}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
            {item.subtitle}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: amountColor ?? "#111418", letterSpacing: "-0.01em" }}>
          {fmt(item.amount_due)}
        </div>
        {item.total_amount !== item.amount_due && (
          <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 1 }}>
            od {fmt(item.total_amount)}
          </div>
        )}
        <div style={{ marginTop: 3 }}>
          <StatusBadge dueDate={item.due_date} />
        </div>
        {showDate && (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            Valuta: {fmtDate(item.due_date)}
          </div>
        )}
      </div>
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <>
      <style>{`
        @keyframes dueShimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .due-skel {
          background: linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%);
          background-size: 800px 100%;
          animation: dueShimmer 1.4s infinite linear;
          border-radius: 8px;
        }
      `}</style>
      {[1, 2].map((k) => (
        <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
          <div className="due-skel" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="due-skel" style={{ width: "55%", height: 13, marginBottom: 6 }} />
            <div className="due-skel" style={{ width: "35%", height: 11 }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="due-skel" style={{ width: 80, height: 14, marginBottom: 6 }} />
            <div className="due-skel" style={{ width: 55, height: 11 }} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function DuePaymentsWidget() {
  const [selectedItem, setSelectedItem] = useState<DueApiItem | null>(null);

  const { data, isLoading } = useQuery<DueApiResponse>({
    queryKey: ["due-payments", TENANT],
    queryFn: ({ signal }) =>
      api
        .get(`/api/${TENANT}/finansije/dospele-obaveze`, { params: { limit: 5 }, signal })
        .then((r) => r.data),
    staleTime: 60_000,
  });

  const count = data?.total_count ?? 0;
  const items = data?.data ?? [];

  if (!isLoading && items.length === 0) return null;

  return (
    <>
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 4px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.03)",
          borderTop: "1px solid #e9d5ff",
          borderRight: "1px solid #e9d5ff",
          borderBottom: "1px solid #e9d5ff",
          borderLeft: "4px solid #7c3aed",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px 12px",
            borderBottom: "1px solid #faf5ff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ color: "#7c3aed" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#5b21b6" }}>
              Dospele obaveze
            </span>
            {count > 0 && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 20, height: 20, padding: "0 5px", borderRadius: 10,
                  background: "#f3e8ff", border: "1px solid #e9d5ff",
                  fontSize: 11, fontWeight: 700, color: "#7c3aed",
                }}
              >
                {count}
              </span>
            )}
          </div>

          <Link
            href="/dashboard/finansije/dospele-obaveze"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 8,
              border: "1px solid #e9d5ff", background: "#faf5ff",
              color: "#7c3aed", fontSize: 12.5, fontWeight: 600,
              textDecoration: "none", transition: "background .15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#f3e8ff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#faf5ff"; }}
          >
            Prikaži sve neplaćene
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {isLoading ? (
            <WidgetSkeleton />
          ) : (
            items.map((item) => (
              <DueItemRow
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
              />
            ))
          )}
        </div>
      </div>

      <PaymentDetailsModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
