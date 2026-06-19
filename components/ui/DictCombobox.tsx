"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface DictOption {
  id: number;
  name: string;
  sector_id?: number | null;
  sector?: { id: number; name: string } | null;
  organizational_unit_id?: number | null;
  organizational_unit?: { id: number; name: string; sector?: { id: number; name: string } | null } | null;
}

interface Props {
  selectedId: number | null;
  options: DictOption[];
  placeholder: string;
  disabled?: boolean;
  createEndpoint?: string;
  createPayload?: (name: string) => Record<string, unknown>;
  queryKeyToInvalidate?: unknown[];
  onSelect: (item: DictOption | null) => void;
}

const cmp: React.CSSProperties = {
  width: "100%", padding: "7px 8px",
  border: "1.5px solid var(--border)", borderRadius: 7,
  fontSize: 12.5, color: "#111418", background: "#fff",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};

export default function DictCombobox({
  selectedId, options, placeholder, disabled,
  createEndpoint, createPayload, queryKeyToInvalidate, onSelect,
}: Props) {
  const qc = useQueryClient();
  const [query, setQuery]           = useState("");
  const [open, setOpen]             = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({
    position: "fixed", top: -9999, left: -9999, zIndex: 9000,
  });

  const selectedItem = options.find((o) => o.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (query.trim() === "") return options;
    const q = query.toLowerCase().trim();
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const showCreate =
    !disabled &&
    createEndpoint != null &&
    query.trim().length >= 1 &&
    !options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());

  useLayoutEffect(() => {
    if (open && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropStyle({
        position: "fixed",
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 210),
        zIndex: 9000,
      });
    }
  }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      const outsideWrap = wrapRef.current && !wrapRef.current.contains(t);
      const outsideDrop = !dropRef.current || !dropRef.current.contains(t);
      if (outsideWrap && outsideDrop) { setOpen(false); setQuery(""); }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  async function handleCreate() {
    if (!createEndpoint || !createPayload) return;
    setIsCreating(true);
    try {
      const res = await api.post<DictOption>(createEndpoint, createPayload(query.trim()));
      const newItem = res.data;
      if (queryKeyToInvalidate) qc.invalidateQueries({ queryKey: queryKeyToInvalidate });
      onSelect(newItem);
      setOpen(false);
      setQuery("");
    } finally {
      setIsCreating(false);
    }
  }

  const accentBorder = open ? "var(--green)" : selectedId ? "rgba(22,163,74,.35)" : "var(--border)";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <style>{`@keyframes dict-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={open ? query : (selectedItem?.name ?? "")}
          disabled={disabled}
          placeholder={disabled ? "—" : placeholder}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { if (!disabled) { setQuery(""); setOpen(true); } }}
          autoComplete="off"
          style={{
            ...cmp,
            borderColor: disabled ? "var(--border-soft)" : accentBorder,
            background: disabled ? "#f9fafb" : "#fff",
            color: disabled ? "var(--muted-2)" : "#111418",
            cursor: disabled ? "not-allowed" : "text",
            paddingRight: selectedId && !disabled ? 22 : 8,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        />
        {selectedId != null && !disabled && !open && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onSelect(null); setQuery(""); }}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, border: "none", background: "#e5e7eb", color: "#6b7280", cursor: "pointer", borderRadius: "50%", fontSize: 11, display: "grid", placeItems: "center", lineHeight: 1, flexShrink: 0 }}
          >×</button>
        )}
      </div>

      {open && typeof document !== "undefined" && createPortal(
        <div ref={dropRef} style={{ ...dropStyle, background: "#fff", border: "1.5px solid rgba(22,163,74,.4)", borderRadius: 10, boxShadow: "0 8px 28px rgba(16,24,40,.15)", maxHeight: 240, overflowY: "auto" }}>
          {filtered.length === 0 && !showCreate && (
            <div style={{ padding: "9px 12px", fontSize: 12.5, color: "var(--muted)" }}>
              {query.length === 0 ? "Nema opcija" : `Nema rezultata za "${query}"`}
            </div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(opt); setOpen(false); setQuery(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", background: opt.id === selectedId ? "var(--green-soft)" : "transparent", border: "none", borderBottom: "1px solid var(--border-soft)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}
              onMouseEnter={(e) => { if (opt.id !== selectedId) (e.currentTarget as HTMLButtonElement).style.background = "var(--green-soft)"; }}
              onMouseLeave={(e) => { if (opt.id !== selectedId) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div style={{ fontWeight: opt.id === selectedId ? 700 : 600, color: opt.id === selectedId ? "var(--green)" : "#111418", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {opt.name}
              </div>
              {opt.sector?.name && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{opt.sector.name}</div>
              )}
              {opt.organizational_unit && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                  {opt.organizational_unit.name}{opt.organizational_unit.sector?.name ? ` · ${opt.organizational_unit.sector.name}` : ""}
                </div>
              )}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              disabled={isCreating}
              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "8px 12px", background: "var(--green-soft)", border: "none", borderTop: filtered.length > 0 ? "1px solid rgba(22,163,74,.15)" : "none", cursor: isCreating ? "not-allowed" : "pointer", fontFamily: "inherit", color: "var(--green)", fontSize: 12.5, fontWeight: 600 }}
              onMouseEnter={(e) => { if (!isCreating) (e.currentTarget as HTMLButtonElement).style.background = "#c6f0d8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green-soft)"; }}
            >
              {isCreating ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "dict-spin .7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              )}
              {isCreating ? "Kreiranje..." : `Dodaj "${query.trim()}"`}
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
