"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/axios";
import { IconDollar, IconUsers, IconActivity, IconCal, IconSortAsc, IconSortDesc, IconSort } from "@/components/ui/icons";
import FilterDropdown from "@/components/ui/FilterDropdown";
import { useSortableData } from "@/hooks/useSortableData";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

// ─── Month helpers ────────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_OPTIONS: { value: string; label: string }[] = (() => {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const raw = d.toLocaleDateString("sr-Latn", { month: "long", year: "numeric" });
    opts.push({ value, label: raw.charAt(0).toUpperCase() + raw.slice(1) });
  }
  return opts;
})();

// ─── API types ────────────────────────────────────────────────────────────────

interface PayrollEmployee {
  id: number;
  name: string;
  position: string;
  salary_type: "fiksna_plata" | "satnica";
  base: number;
  hours: number | null;
  total: number;
  payment_status: "paid" | "unpaid";
}

interface PayrollKpi {
  fixed_total: number;
  hourly_workers_count: number;
  hourly_rate_avg: number;
  total_cost: number;
  paid_total: number;
}

interface PayrollResponse {
  month: string;
  kpi: PayrollKpi;
  employees: PayrollEmployee[];
}

// ─── Frontend display types ───────────────────────────────────────────────────

type SalaryType = "fiksna" | "satnica";
type PayStatus = "placeno" | "nije-placeno";

interface PayrollRow {
  id: number;
  name: string;
  position: string;
  type: SalaryType;
  base: number;
  hours: number | null;
  total: number;
  status: PayStatus;
}

function toRow(emp: PayrollEmployee): PayrollRow {
  return {
    id: emp.id,
    name: emp.name,
    position: emp.position,
    type: emp.salary_type === "fiksna_plata" ? "fiksna" : "satnica",
    base: emp.base,
    hours: emp.hours,
    total: emp.total,
    status: emp.payment_status === "paid" ? "placeno" : "nije-placeno",
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(val: number): string {
  return val.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RSD";
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ employeeId, isLoading, isError, isReadOnly, onMarkPaid }: {
  employeeId: number;
  isLoading: boolean;
  isError: boolean;
  isReadOnly: boolean;
  onMarkPaid: (id: number) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const baseStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "3px 10px", borderRadius: 20,
    fontSize: 12, fontWeight: 600, minWidth: 116,
  };

  if (isReadOnly) {
    return (
      <span style={{ ...baseStyle, background: "#f3f4f6", color: "#9ca3af" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
        Nije plaćeno
      </span>
    );
  }

  if (isLoading) {
    return (
      <span style={{ ...baseStyle, background: "#f3f4f6", color: "#9ca3af", gap: 6, opacity: 0.75 }}>
        <span className="payroll-spin" style={{
          width: 11, height: 11,
          border: "2px solid #d1d5db",
          borderTopColor: "#6b7280",
          borderRadius: "50%",
          display: "inline-block",
          flexShrink: 0,
        }} />
        Procesiranje…
      </span>
    );
  }

  if (isError) {
    return (
      <span style={{ ...baseStyle, background: "#fef2f2", color: "#dc2626" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
        Greška
      </span>
    );
  }

  return (
    <span
      onClick={() => onMarkPaid(employeeId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Klikni da evidentiraš isplatu"
      style={{
        ...baseStyle,
        background: hovered ? "#f0fdf4" : "#f3f4f6",
        color: hovered ? "#16a34a" : "#6b7280",
        cursor: "pointer",
        transform: hovered ? "scale(1.05)" : "scale(1)",
        transition: "background .15s, color .15s, transform .15s",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {hovered ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Plaćeno
        </>
      ) : (
        <>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
          Nije plaćeno
        </>
      )}
    </span>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, iconBg, iconColor, value, label, sub }: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, color: iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 23, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginTop: 4 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

// ─── Budget progress card ────────────────────────────────────────────────────

function PayrollBudgetCard({ paidTotal, totalCost, isLoading, monthName }: {
  paidTotal: number;
  totalCost: number;
  isLoading: boolean;
  monthName: string;
}) {
  const percent = totalCost > 0 ? Math.min(100, (paidTotal / totalCost) * 100) : 0;
  const remaining = Math.max(0, totalCost - paidTotal);

  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--violet-soft)", color: "var(--violet)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IconActivity w={22} h={22} />
      </div>
      <div>
        {isLoading ? (
          <div style={{ fontSize: 23, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", lineHeight: 1 }}>—</div>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 23, fontWeight: 800, color: "#111418", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {paidTotal.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--muted)" }}>
              od {totalCost.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
            </span>
          </div>
        )}
        <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginTop: 4 }}>
          Isplaćeno · {monthName}
        </div>
        <div style={{ background: "#f3f4f6", height: 8, borderRadius: 4, marginTop: 12, overflow: "hidden" }}>
          <div style={{
            background: "var(--green)",
            height: "100%",
            borderRadius: 4,
            width: isLoading ? "0%" : `${percent}%`,
            transition: "width 0.5s ease",
          }} />
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
          {isLoading ? "Učitavanje..." : `Preostalo za isplatu: ${remaining.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`}
        </div>
      </div>
    </div>
  );
}

// ─── Sort indicator ──────────────────────────────────────────────────────────

function SortIndicator({ isActive, direction }: {
  isActive: boolean;
  direction: "asc" | "desc" | null;
}) {
  if (!isActive) {
    return <IconSort w={12} h={12} style={{ opacity: 0.3, flexShrink: 0 }} />;
  }
  return direction === "asc"
    ? <IconSortAsc w={12} h={12} style={{ color: "var(--green)", flexShrink: 0 }} />
    : <IconSortDesc w={12} h={12} style={{ color: "var(--green)", flexShrink: 0 }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatePage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [errorIds, setErrorIds] = useState<number[]>([]);

  const isReadOnly = selectedMonth !== getCurrentMonth();

  useEffect(() => {
    setLoadingIds([]);
    setErrorIds([]);
  }, [selectedMonth]);

  const { data, isLoading } = useQuery<PayrollResponse>({
    queryKey: ["payroll", TENANT, selectedMonth],
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/finansije/plate`, {
        params: { month: selectedMonth },
        signal,
      }).then((r) => r.data),
    staleTime: 60_000,
  });

  const handleMarkAsPaid = async (employeeId: number) => {
    if (isReadOnly) return;
    setLoadingIds((prev) => [...prev, employeeId]);
    try {
      await api.put(`/api/${TENANT}/finansije/plate/${employeeId}/isplati`, {
        month: selectedMonth,
      });
      await queryClient.invalidateQueries({ queryKey: ["payroll", TENANT, selectedMonth] });
    } catch {
      setErrorIds((prev) => [...prev, employeeId]);
      setTimeout(() => {
        setErrorIds((prev) => prev.filter((id) => id !== employeeId));
      }, 4000);
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== employeeId));
    }
  };

  // Month name derived from selected month, not today's date
  const monthName = new Date(selectedMonth + "-15").toLocaleDateString("sr-Latn", { month: "long" });
  const selectedMonthLabel = MONTH_OPTIONS.find((o) => o.value === selectedMonth)?.label ?? selectedMonth;

  const rows = useMemo<PayrollRow[]>(() => (data?.employees ?? []).map(toRow), [data]);
  const { items: sortedRows, requestSort, sortConfig } = useSortableData<PayrollRow>(rows);
  const kpi = data?.kpi;

  const fixedTotal    = kpi?.fixed_total ?? 0;
  const hourlyCount   = kpi?.hourly_workers_count ?? 0;
  const hourlyAvgRate = Math.round(kpi?.hourly_rate_avg ?? 0);
  const totalCost     = kpi?.total_cost ?? 0;
  const paidTotal     = kpi?.paid_total ?? 0;
  const fixedCount    = rows.filter((r) => r.type === "fiksna").length;

  const thStyle: React.CSSProperties = {
    padding: "10px 16px",
    textAlign: "left",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    color: "var(--muted)",
    borderBottom: "1px solid var(--border-soft)",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "13px 16px",
    fontSize: 14,
    color: "#111418",
    borderBottom: "1px solid var(--border-soft)",
    verticalAlign: "middle",
  };

  return (
    <PageShell navId="fin">
      <style>{`
        @keyframes payroll-spin { to { transform: rotate(360deg); } }
        .payroll-spin { animation: payroll-spin 0.7s linear infinite; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: "var(--hero-padding, 8px 32px 6px)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Finansije</div>
          <h1 style={{ fontSize: "var(--hero-h1, 28px)", fontWeight: 700, margin: "4px 0", letterSpacing: "-0.02em", color: "#111418" }}>
            Plate
          </h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--muted)" }}>
            Obračun i evidencija plata zaposlenih po mjesecima.
          </p>
        </div>
      </div>

      <div style={{ padding: "28px 32px 110px", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* ── KPI kartice ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>
              Statistike · {monthName}
            </div>
            <FilterDropdown
              value={selectedMonth}
              onChange={setSelectedMonth}
              placeholder="Odaberi mjesec"
              options={MONTH_OPTIONS}
              icon={<IconCal w={15} h={15} />}
              color="green"
            />
          </div>
          <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-3">
            <KpiCard
              iconBg="var(--green-soft)"
              iconColor="var(--green)"
              icon={<IconDollar w={22} h={22} />}
              value={isLoading ? "—" : fmtCurrency(fixedTotal)}
              label="Fiksne plate (ukupno)"
              sub={isLoading ? "Učitavanje..." : `Za ${fixedCount} zaposlena`}
            />
            <KpiCard
              iconBg="var(--brand-soft)"
              iconColor="var(--brand)"
              icon={<IconUsers w={22} h={22} />}
              value={isLoading ? "—" : `${hourlyCount} radnika`}
              label="Rad na satnicu"
              sub={isLoading ? "Učitavanje..." : `Prosječno ${hourlyAvgRate.toLocaleString("sr-Latn")} RSD/h`}
            />
            <PayrollBudgetCard
              paidTotal={paidTotal}
              totalCost={totalCost}
              isLoading={isLoading}
              monthName={monthName}
            />
          </div>
        </div>

        {/* ── Tabela ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>
              Obračun za {monthName}
            </div>
            {isReadOnly && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 20,
                background: "#f8fafc", border: "1px solid var(--border-soft)",
                fontSize: 12, color: "var(--muted)", fontWeight: 500,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {selectedMonthLabel} · Samo za čitanje
              </div>
            )}
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("name")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Radnik
                        <SortIndicator isActive={sortConfig?.key === "name"} direction={sortConfig && sortConfig.key === "name" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("type")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Tip plate
                        <SortIndicator isActive={sortConfig?.key === "type"} direction={sortConfig && sortConfig.key === "type" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("base")}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        Osnovica
                        <SortIndicator isActive={sortConfig?.key === "base"} direction={sortConfig && sortConfig.key === "base" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("hours")}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        Ostvareni sati
                        <SortIndicator isActive={sortConfig?.key === "hours"} direction={sortConfig && sortConfig.key === "hours" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("total")}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        Ukupno za isplatu
                        <SortIndicator isActive={sortConfig?.key === "total"} direction={sortConfig && sortConfig.key === "total" ? sortConfig.direction : null} />
                      </span>
                    </th>
                    <th style={{ ...thStyle, textAlign: "center", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("status")}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        Status
                        <SortIndicator isActive={sortConfig?.key === "status"} direction={sortConfig && sortConfig.key === "status" ? sortConfig.direction : null} />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", borderBottom: "none" }}>
                        Učitavanje...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", borderBottom: "none" }}>
                        Nema podataka za odabrani period.
                      </td>
                    </tr>
                  ) : sortedRows.map((row) => (
                    <tr
                      key={row.id}
                      style={{ background: "transparent", transition: "background .1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{row.position}</div>
                      </td>

                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px", borderRadius: 20,
                          fontSize: 12, fontWeight: 600,
                          background: row.type === "fiksna" ? "var(--brand-soft)" : "#f0fdf4",
                          color:      row.type === "fiksna" ? "var(--brand)"      : "#15803d",
                        }}>
                          {row.type === "fiksna" ? "Fiksna" : "Po satu"}
                        </span>
                      </td>

                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-geist-mono), monospace", fontSize: 13.5 }}>
                        {row.type === "fiksna"
                          ? fmtCurrency(row.base)
                          : `${row.base.toLocaleString("sr-Latn")} RSD/h`}
                      </td>

                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {row.hours !== null
                          ? <span style={{ fontWeight: 600 }}>{row.hours}h</span>
                          : <span style={{ color: "var(--muted-2)" }}>—</span>}
                      </td>

                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 14.5, fontFamily: "var(--font-geist-mono), monospace" }}>
                        {fmtCurrency(row.total)}
                      </td>

                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {row.status === "placeno" ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 10px", borderRadius: 20,
                            fontSize: 12, fontWeight: 600,
                            background: "var(--green-soft)", color: "var(--green)",
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                            Plaćeno
                          </span>
                        ) : (
                          <StatusBadge
                            employeeId={row.id}
                            isLoading={loadingIds.includes(row.id)}
                            isError={errorIds.includes(row.id)}
                            isReadOnly={isReadOnly}
                            onMarkPaid={handleMarkAsPaid}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {!isLoading && rows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#fafafa" }}>
                      <td colSpan={4} style={{ ...tdStyle, borderBottom: "none", fontWeight: 600, fontSize: 13.5, color: "#374151" }}>
                        Ukupno za obračunski period
                      </td>
                      <td style={{ ...tdStyle, borderBottom: "none", textAlign: "right", fontWeight: 800, fontSize: 15, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-geist-mono), monospace" }}>
                        {fmtCurrency(totalCost)}
                      </td>
                      <td style={{ ...tdStyle, borderBottom: "none" }} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          {!isLoading && rows.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", paddingLeft: 4 }}>
              {rows.length} zaposlena u obračunu
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
}
