"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { DueItemRow } from "./DuePaymentsWidget";
import type { DueApiItem } from "./DuePaymentsWidget";
import ReceivableDetailsModal from "./ReceivableDetailsModal";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

interface DueApiResponse {
  data: DueApiItem[];
  total_count: number;
}

function WidgetSkeleton() {
  return (
    <>
      <style>{`
        @keyframes rcvShimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .rcv-skel {
          background: linear-gradient(90deg,#f0fdf4 25%,#dcfce7 50%,#f0fdf4 75%);
          background-size: 800px 100%;
          animation: rcvShimmer 1.4s infinite linear;
          border-radius: 8px;
        }
      `}</style>
      {[1, 2].map((k) => (
        <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
          <div className="rcv-skel" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="rcv-skel" style={{ width: "55%", height: 13, marginBottom: 6 }} />
            <div className="rcv-skel" style={{ width: "35%", height: 11 }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="rcv-skel" style={{ width: 80, height: 14, marginBottom: 6 }} />
            <div className="rcv-skel" style={{ width: 55, height: 11 }} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function UnpaidReceivablesWidget() {
  const [selectedItem, setSelectedItem] = useState<DueApiItem | null>(null);

  const { data, isLoading } = useQuery<DueApiResponse>({
    queryKey: ["unpaid-receivables", TENANT],
    queryFn: ({ signal }) =>
      api
        .get(`/api/${TENANT}/finansije/nenaplacena-potrazivanja`, { params: { limit: 5 }, signal })
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
        borderTop: "1px solid #a7f3d0",
        borderRight: "1px solid #a7f3d0",
        borderBottom: "1px solid #a7f3d0",
        borderLeft: "4px solid #059669",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px 12px",
          borderBottom: "1px solid #f0fdf4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: "#059669" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#065f46" }}>
            Nenaplaćena potraživanja
          </span>
          {count > 0 && (
            <span
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 20, height: 20, padding: "0 5px", borderRadius: 10,
                background: "#d1fae5", border: "1px solid #a7f3d0",
                fontSize: 11, fontWeight: 700, color: "#065f46",
              }}
            >
              {count}
            </span>
          )}
        </div>

        <Link
          href="/dashboard/finansije/nenaplacena-potrazivanja"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 8,
            border: "1px solid #a7f3d0", background: "#f0fdf4",
            color: "#059669", fontSize: 12.5, fontWeight: 600,
            textDecoration: "none", transition: "background .15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#dcfce7"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#f0fdf4"; }}
        >
          Prikaži sve
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
              amountColor="#047857"
              onClick={() => setSelectedItem(item)}
            />
          ))
        )}
      </div>
    </div>

    <ReceivableDetailsModal
      item={selectedItem}
      onClose={() => setSelectedItem(null)}
    />
    </>
  );
}
