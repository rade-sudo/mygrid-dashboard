import React from "react";

type ColorKey = "blue" | "green" | "amber" | "gray" | "violet";

const colorMap: Record<ColorKey, { title: string; badge: string }> = {
  blue:   { title: "#1d4ed8", badge: "var(--brand-soft)" },
  green:  { title: "#166534", badge: "var(--green-soft)" },
  amber:  { title: "#b45309", badge: "var(--amber-soft)" },
  gray:   { title: "#374151", badge: "#f1f3f6" },
  violet: { title: "#6d28d9", badge: "var(--violet-soft)" },
};

const iconColorMap: Record<ColorKey, string> = {
  blue:   "var(--brand)",
  green:  "var(--green)",
  amber:  "var(--amber)",
  gray:   "#4b5563",
  violet: "var(--violet)",
};

interface CardHeadProps {
  icon: React.ComponentType<{ w?: number; h?: number }>;
  color?: ColorKey;
  title: string;
  aside?: React.ReactNode;
  onViewAll?: () => void;
}

export default function CardHead({ icon: Ico, color = "blue", title, aside, onViewAll }: CardHeadProps) {
  const { title: titleColor, badge: badgeBg } = colorMap[color];
  const iconColor = iconColorMap[color];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: ".12em",
          color: titleColor,
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: badgeBg,
            color: iconColor,
            flexShrink: 0,
          }}
        >
          <Ico w={16} h={16} />
        </span>
        {title}
      </div>
      {aside && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{aside}</div>
      )}
      {onViewAll && (
        <button
          onClick={onViewAll}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 500,
            color: "#374151",
            background: "#fff",
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "var(--shadow-card)",
            whiteSpace: "nowrap",
            transition: "background .12s ease, color .12s ease, border-color .12s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "var(--brand-soft)";
            el.style.color = "var(--brand)";
            el.style.borderColor = "#bcd0ff";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "#fff";
            el.style.color = "#374151";
            el.style.borderColor = "var(--border)";
          }}
        >
          Pogledaj sve
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
