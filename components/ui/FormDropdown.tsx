"use client";

import { useState, useEffect, useRef } from "react";
import { IconCaretSm } from "@/components/ui/icons";

export interface DropdownOption {
  value: string;
  label: string;
}

interface FormDropdownProps {
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  placeholder?: string;
}

export default function FormDropdown({
  value,
  onChange,
  options,
  placeholder = "Odaberite...",
}: FormDropdownProps) {
  const [open, setOpen]             = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const [panelRect, setPanelRect]   = useState<DOMRect | null>(null);

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
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "9px 12px",
          border: `1.5px solid ${open ? "var(--violet)" : "var(--border)"}`,
          borderRadius: 9,
          background: "#fff",
          fontSize: 14,
          color: currentLabel ? "#111418" : "var(--muted)",
          fontFamily: "inherit",
          cursor: "pointer",
          boxSizing: "border-box",
          transition: "border-color .14s",
        }}
      >
        <span>{currentLabel ?? placeholder}</span>
        <span style={{
          display: "inline-flex",
          color: "#9aa0a6",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform .2s",
          flexShrink: 0,
        }}>
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
            width: panelRect.width,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(16,24,40,.1), 0 2px 8px rgba(16,24,40,.06)",
            padding: "6px",
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
                  padding: "8px 12px",
                  borderRadius: 9,
                  border: "none",
                  fontSize: 14,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected ? "var(--violet-soft)" : isHov ? "#f8f9fa" : "transparent",
                  color: isSelected ? "var(--violet)" : isHov ? "#111418" : "#374151",
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
