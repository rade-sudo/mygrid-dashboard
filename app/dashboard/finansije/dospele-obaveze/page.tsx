"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import { DueItemRow } from "../_components/DuePaymentsWidget";
import PaymentDetailsModal from "../_components/PaymentDetailsModal";
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
        @keyframes dospShimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .dosp-skel {
          background: linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%);
          background-size: 800px 100%;
          animation: dospShimmer 1.4s infinite linear;
          border-radius: 8px;
        }
      `}</style>
      {[1, 2, 3, 4].map((k) => (
        <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", background: "rgba(254,242,242,0.2)", borderRadius: 10, borderLeft: "3px solid #fca5a5" }}>
          <div className="dosp-skel" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="dosp-skel" style={{ width: "40%", height: 13, marginBottom: 6 }} />
            <div className="dosp-skel" style={{ width: "25%", height: 11 }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="dosp-skel" style={{ width: 90, height: 14, marginBottom: 6 }} />
            <div className="dosp-skel" style={{ width: 60, height: 11 }} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function DospeleObavezePage() {
  const [backHover, setBackHover] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DueApiItem | null>(null);

  const { data, isLoading } = useQuery<DueApiResponse>({
    queryKey: ["due-payments-all", TENANT],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/dospele-obaveze`, { signal }).then((r) => r.data),
    staleTime: 60_000,
  });

  const items = data?.data ?? [];
  const totalCount = data?.total_count ?? 0;

  const invoiceItems = items.filter((i) => i.type === "invoice");
  const installmentItems = items.filter((i) => i.type === "installment");

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
              Dospele obaveze
            </h1>
            <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
              Sve neplaćene fakture i rate koje kasne ili dospevaju u naredna 3 dana.
            </p>
          </div>
          {!isLoading && totalCount > 0 && (
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "6px 14px", borderRadius: 10,
                background: "#fef2f2", border: "1px solid #fecaca",
                fontSize: 13, fontWeight: 700, color: "#b91c1c",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
              {totalCount} {totalCount === 1 ? "obaveza" : totalCount < 5 ? "obaveze" : "obaveza"}
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
              Nema dospelih obaveza
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              Sve fakture i rate su plaćene na vrijeme.
            </div>
          </div>
        ) : (
          <>
            {invoiceItems.length > 0 && (
              <section>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 10 }}>
                  Ulazne fakture · {invoiceItems.length}
                </div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    borderTop: "1px solid #fecaca",
                    borderRight: "1px solid #fecaca",
                    borderBottom: "1px solid #fecaca",
                    borderLeft: "4px solid #b91c1c",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {invoiceItems.map((item) => (
                      <DueItemRow key={item.id} item={item} showDate onClick={() => setSelectedItem(item)} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {installmentItems.length > 0 && (
              <section>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 10 }}>
                  Rate podsjetnika · {installmentItems.length}
                </div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    borderTop: "1px solid #fecaca",
                    borderRight: "1px solid #fecaca",
                    borderBottom: "1px solid #fecaca",
                    borderLeft: "4px solid #b91c1c",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {installmentItems.map((item) => (
                      <DueItemRow key={item.id} item={item} showDate onClick={() => setSelectedItem(item)} />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <PaymentDetailsModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </PageShell>
  );
}
