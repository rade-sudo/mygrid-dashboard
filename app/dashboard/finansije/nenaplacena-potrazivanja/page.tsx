"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import { DueItemRow } from "../_components/DuePaymentsWidget";
import type { DueApiItem } from "../_components/DuePaymentsWidget";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

interface DueApiResponse {
  data: DueApiItem[];
  total_count: number;
}

function PageSkeleton() {
  return (
    <>
      <style>{`
        @keyframes rcvPageShimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .rcvp-skel {
          background: linear-gradient(90deg,#f0fdf4 25%,#dcfce7 50%,#f0fdf4 75%);
          background-size: 800px 100%;
          animation: rcvPageShimmer 1.4s infinite linear;
          border-radius: 8px;
        }
      `}</style>
      {[1, 2, 3, 4].map((k) => (
        <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", background: "rgba(240,253,244,0.4)", borderRadius: 10, borderLeft: "3px solid #6ee7b7" }}>
          <div className="rcvp-skel" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="rcvp-skel" style={{ width: "40%", height: 13, marginBottom: 6 }} />
            <div className="rcvp-skel" style={{ width: "25%", height: 11 }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="rcvp-skel" style={{ width: 90, height: 14, marginBottom: 6 }} />
            <div className="rcvp-skel" style={{ width: 60, height: 11 }} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function NenaplacenaPotrazivanjaPa() {
  const [backHover, setBackHover] = useState(false);

  const { data, isLoading } = useQuery<DueApiResponse>({
    queryKey: ["unpaid-receivables-all", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/nenaplacena-potrazivanja`, { signal }).then((r) => r.data),
    staleTime: 60_000,
  });

  const items = data?.data ?? [];
  const totalCount = data?.total_count ?? 0;

  return (
    <PageShell navId="fin">
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)" }}>
        <Link
          href="/dashboard/finansije"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: 14, textDecoration: "none",
            color: backHover ? "#111418" : "#9ca3af",
            fontSize: 13, fontWeight: 500, transition: "color .15s",
          }}
          onMouseEnter={() => setBackHover(true)}
          onMouseLeave={() => setBackHover(false)}
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: backHover ? "translateX(-3px)" : "none", transition: "transform .15s ease" }}
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Nazad na finansije
        </Link>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Finansije</div>
            <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
              Nenaplaćena potraživanja
            </h1>
            <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
              Sve izlazne fakture koje klijenti još nisu platili.
            </p>
          </div>
          {!isLoading && totalCount > 0 && (
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "6px 14px", borderRadius: 10,
                background: "#d1fae5", border: "1px solid #a7f3d0",
                fontSize: 13, fontWeight: 700, color: "#065f46",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              {totalCount} {totalCount === 1 ? "faktura" : totalCount < 5 ? "fakture" : "faktura"}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "28px 32px 110px", display: "flex", flexDirection: "column", gap: 28 }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PageSkeleton />
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: "48px 0", textAlign: "center",
              border: "1px dashed var(--border)", borderRadius: 14,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#111418", marginBottom: 6 }}>
              Nema nenaplaćenih potraživanja
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              Sve izlazne fakture su naplaćene.
            </div>
          </div>
        ) : (
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 10 }}>
              Izlazne fakture · {items.length}
            </div>
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                borderTop: "1px solid #a7f3d0",
                borderRight: "1px solid #a7f3d0",
                borderBottom: "1px solid #a7f3d0",
                borderLeft: "4px solid #059669",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((item) => (
                  <DueItemRow key={item.id} item={item} showDate amountColor="#047857" />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
