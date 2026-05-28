"use client";

import { useState, useEffect, useRef } from "react";
import { IconCaretSm } from "@/components/ui/icons";

type FilterColor = "violet" | "green" | "brand" | "amber";

const COLOR_MAP: Record<FilterColor, { border: string; bg: string; bgOpen: string; text: string }> = {
  violet: { border: "var(--violet)", bg: "var(--violet-soft)", bgOpen: "#faf8ff", text: "var(--violet)" },
  green:  { border: "var(--green)",  bg: "var(--green-soft)",  bgOpen: "#f0fdf4", text: "var(--green)"  },
  brand:  { border: "var(--brand)",  bg: "var(--brand-soft)",  bgOpen: "#f0f4ff", text: "var(--brand)"  },
  amber:  { border: "var(--amber)",  bg: "var(--amber-soft)",  bgOpen: "#fffbeb", text: "var(--amber)"  },
};

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: FilterOption[];
  icon?: React.ReactNode;
  color?: FilterColor;
}

export default function FilterDropdown({
  value,
  onChange,
  placeholder,
  options,
  icon,
  color = "violet",
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const c = COLOR_MAP[color];
  const active = value !== "";
  const currentLabel = active
    ? (options.find((o) => o.value === value)?.label ?? placeholder)
    : placeholder;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          border: `1px solid ${active || open ? c.border : "var(--border)"}`,
          background: active ? c.bg : open ? c.bgOpen : "#fff",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 500,
          color: active || open ? c.text : "#2a2f37",
          boxShadow: "var(--shadow-card)",
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          transition: "border-color .14s, background .14s, color .14s",
        }}
      >
        {icon && (
          <span style={{ display: "inline-flex", color: active || open ? c.text : "#9aa0a6", transition: "color .14s" }}>
            {icon}
          </span>
        )}
        <span>{currentLabel}</span>
        <span style={{
          display: "inline-flex",
          color: active || open ? c.text : "#9aa0a6",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform .2s, color .14s",
        }}>
          <IconCaretSm />
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 8px 32px rgba(16,24,40,.1), 0 2px 8px rgba(16,24,40,.06)",
          padding: "6px",
          minWidth: 180,
          zIndex: 60,
        }}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const isHov = hoveredItem === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onMouseEnter={() => setHoveredItem(opt.value)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 9,
                  border: "none",
                  fontSize: 14,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected ? c.bg : isHov ? "#f8f9fa" : "transparent",
                  color: isSelected ? c.text : isHov ? "#111418" : "#374151",
                  transition: "background .1s, color .1s",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
