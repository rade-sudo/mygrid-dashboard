"use client";
import { useState } from "react";
import CardHead from "@/components/dashboard/CardHead";
import { IconHome } from "@/components/ui/icons";

const INSET_BORDER_SHADOW = [
  "inset 0 1.5px 0 rgba(255,255,255,0.96)",
  "inset 1px 0 0 rgba(255,255,255,0.58)",
  "inset -1px 0 0 rgba(255,255,255,0.28)",
  "inset 0 -1px 0 rgba(255,255,255,0.16)",
].join(", ");

export default function StanoviCard() {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        isolation: "isolate",
        minHeight: 360,
        boxShadow: hovered
          ? "0 8px 32px rgba(0,82,255,.12), 0 4px 12px rgba(16,24,40,.08)"
          : "0 16px 48px rgba(37,99,235,.13), 0 4px 12px rgba(16,24,40,.08)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "transform .2s ease, box-shadow .2s ease",
      }}
    >
      {/* Layer 1 — backdrop blur + liquid glass distortion */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backdropFilter: hovered
          ? "blur(12px)"
          : "url(#mg-lg-sidebar) blur(3px) saturate(190%)",
        WebkitBackdropFilter: hovered ? "blur(12px)" : "blur(36px) saturate(190%)",
        background: hovered ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.16)",
        transition: "background .2s ease",
      }} />

      {/* Layer 2 — gradient tint */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(155deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 55%, rgba(37,99,235,0.05) 100%)",
        pointerEvents: "none",
        opacity: hovered ? 0 : 1,
        transition: "opacity .2s ease",
      }} />

      {/* Layer 3 — content */}
      <div style={{
        position: "relative", zIndex: 2,
        padding: "20px 22px",
        display: "flex", flexDirection: "column",
        height: "100%",
      }}>
        <CardHead icon={IconHome} color="green" title="Stanovi — pregled" />

        <div style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          color: "rgba(15,23,42,0.45)",
          fontSize: 15,
          textAlign: "center",
          padding: "18px 8px 24px",
          lineHeight: 1.6,
        }}>
          Modul dolazi uskoro —<br />
          podaci o stanovima biće<br />
          dostupni ovde.
        </div>
      </div>

      {/* Layer 4 — inset prismatic border */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3,
        borderRadius: "inherit", pointerEvents: "none",
        border: hovered
          ? "1px solid rgba(255,255,255,0.2)"
          : "1px solid rgba(255,255,255,0.52)",
        boxShadow: hovered ? "none" : INSET_BORDER_SHADOW,
        transition: "border-color .2s ease, box-shadow .2s ease",
      }} />
    </div>
  );
}
