"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Sektor } from "@/types/notifications";

const SEKTORI: { id: Sektor; label: string; color: string }[] = [
  { id: "svi",             label: "Svi sektori",   color: "#2563eb" },
  { id: "finansije",       label: "Finansije",      color: "#16a34a" },
  { id: "prodaja",         label: "Prodaja",        color: "#2563eb" },
  { id: "gradiliste",      label: "Gradilište",     color: "#d97706" },
  { id: "administracija",  label: "Administracija", color: "#7c3aed" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (
    title: string,
    message: string,
    audience: Sektor[],
    urgent: boolean,
    isTask: boolean
  ) => void;
}

export default function SendNotificationModal({ open, onClose, onSend }: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Sektor[]>(["svi"]);
  const [urgent, setUrgent] = useState(false);
  const [isTask, setIsTask] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setMessage("");
      setAudience(["svi"]);
      setUrgent(false);
      setIsTask(false);
      setTimeout(() => titleRef.current?.focus(), 60);
    }
  }, [open]);

  const toggleAudience = (id: Sektor) => {
    if (id === "svi") {
      setAudience(["svi"]);
      return;
    }
    setAudience((prev) => {
      const withoutSvi = prev.filter((a) => a !== "svi");
      if (withoutSvi.includes(id)) {
        const next = withoutSvi.filter((a) => a !== id);
        return next.length === 0 ? ["svi"] : next;
      }
      return [...withoutSvi, id];
    });
  };

  const handleSend = () => {
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    onSend(title.trim(), message.trim(), audience, urgent, isTask);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 540,
          boxShadow: "0 24px 60px rgba(0,0,0,0.16), 0 0 0 1px rgba(124,58,237,0.1)",
          border: "1px solid rgba(124,58,237,0.15)",
          borderTop: "3px solid #7c3aed",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "22px 26px 18px",
            borderBottom: "1px solid #f1f1f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "#f1ebff",
                display: "grid",
                placeItems: "center",
                color: "#7c3aed",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111418" }}>Novo obaveštenje</div>
              <div style={{ fontSize: 12, color: "#8a8f98", marginTop: 1 }}>Šalje: Milan Jovanović</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #ececec",
              background: "transparent",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              color: "#8a8f98",
              fontSize: 16,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 26px 0" }}>
          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 6 }}>
              Naslov
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="npr. Praznik 1.5. — slobodan dan"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 9,
                border: "1px solid #ececec",
                background: "#fafafa",
                fontSize: 14,
                color: "#111418",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color .15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
              onBlur={(e) => (e.target.style.borderColor = "#ececec")}
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 6 }}>
              Tekst <span style={{ fontWeight: 400, color: "#b6bac1" }}>(opciono)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Detalji obaveštenja..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 9,
                border: "1px solid #ececec",
                background: "#fafafa",
                fontSize: 13.5,
                color: "#111418",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
                lineHeight: 1.55,
                transition: "border-color .15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
              onBlur={(e) => (e.target.style.borderColor = "#ececec")}
            />
          </div>

          {/* Sectors */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
              Pošalji u sektor(e)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {SEKTORI.map((s) => {
                const isSelected = audience.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleAudience(s.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: isSelected ? `1px solid ${s.color}40` : "1px solid #ececec",
                      background: isSelected ? `${s.color}0d` : "#fafafa",
                      cursor: "pointer",
                      fontSize: 13,
                      color: isSelected ? s.color : "#4b5563",
                      fontFamily: "inherit",
                      fontWeight: isSelected ? 600 : 400,
                      textAlign: "left",
                      transition: "all .12s",
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: s.color,
                        flexShrink: 0,
                        opacity: isSelected ? 1 : 0.4,
                      }}
                    />
                    {s.label}
                    {isSelected && (
                      <span style={{ marginLeft: "auto", fontSize: 12 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 13,
                color: urgent ? "#dc2626" : "#4b5563",
                cursor: "pointer",
                padding: "7px 10px",
                borderRadius: 8,
                background: urgent ? "rgba(220,38,38,0.05)" : "transparent",
                border: urgent ? "1px solid rgba(220,38,38,0.2)" : "1px solid transparent",
                transition: "all .12s",
              }}
            >
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "#dc2626", cursor: "pointer" }}
              />
              <span>⚠️ Označi kao hitno</span>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 13,
                color: isTask ? "#2563eb" : "#4b5563",
                cursor: "pointer",
                padding: "7px 10px",
                borderRadius: 8,
                background: isTask ? "rgba(37,99,235,0.05)" : "transparent",
                border: isTask ? "1px solid rgba(37,99,235,0.2)" : "1px solid transparent",
                transition: "all .12s",
              }}
            >
              <input
                type="checkbox"
                checked={isTask}
                onChange={(e) => setIsTask(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "#2563eb", cursor: "pointer" }}
              />
              <span>☑️ Zadatak — može se označiti kao završeno</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 26px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderTop: "1px solid #f1f1f1",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: 9,
              border: "1px solid #ececec",
              background: "#fafafa",
              color: "#4b5563",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Otkaži
          </button>
          <button
            onClick={handleSend}
            disabled={!title.trim()}
            style={{
              padding: "9px 22px",
              borderRadius: 9,
              border: "1px solid rgba(124,58,237,0.4)",
              background: title.trim() ? "rgba(124,58,237,0.1)" : "#f5f5f5",
              color: title.trim() ? "#7c3aed" : "#b6bac1",
              fontSize: 13,
              fontWeight: 700,
              cursor: title.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "all .15s",
              letterSpacing: ".02em",
            }}
          >
            Pošalji obaveštenje
          </button>
        </div>
      </div>
    </div>
  );
}
