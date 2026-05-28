"use client";

import { useState, useEffect, useRef } from "react";
import { IconCaretSm } from "@/components/ui/icons";

export interface SelectOption {
  label: string;
  value: string | number;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (v: string | number) => void;
  options: SelectOption[];
  prefix?: string;
}

export default function CustomSelect({ value, onChange, options, prefix }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const [panelRect, setPanelRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    if (triggerRef.current) setPanelRect(triggerRef.current.getBoundingClientRect());
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const currentLabel = options.find((o) => o.value === value)?.label;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {prefix && (
        <span style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 500, whiteSpace: "nowrap" }}>
          {prefix}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 10px 7px 12px",
          border: `1px solid ${open ? "var(--brand)" : "var(--border)"}`,
          borderRadius: 8,
          background: "#fff",
          fontSize: 13.5,
          color: "#111418",
          fontFamily: "inherit",
          cursor: "pointer",
          transition: "border-color .14s",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontWeight: 600 }}>{currentLabel ?? String(value)}</span>
        <span
          style={{
            display: "inline-flex",
            color: "#9aa0a6",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        >
          <IconCaretSm />
        </span>
      </button>

      {open && panelRect && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: panelRect.bottom + 4,
            left: panelRect.left,
            minWidth: panelRect.width,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(16,24,40,.1), 0 2px 8px rgba(16,24,40,.06)",
            padding: "4px",
            zIndex: 300,
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const isHov      = hoveredItem === opt.value;
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
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13.5,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected ? "var(--brand-soft)" : isHov ? "#f8f9fa" : "transparent",
                  color: isSelected ? "var(--brand)" : isHov ? "#111418" : "#374151",
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
