import React from "react";

interface IconProps {
  w?: number;
  h?: number;
  className?: string;
}

const I = ({
  d,
  w = 20,
  h = 20,
  fill = "none",
  sw = 1.6,
  children,
  vb = "0 0 24 24",
  className,
}: {
  d?: string;
  w?: number;
  h?: number;
  fill?: string;
  sw?: number;
  children?: React.ReactNode;
  vb?: string;
  className?: string;
}) => (
  <svg
    width={w}
    height={h}
    viewBox={vb}
    fill={fill}
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children || <path d={d} />}
  </svg>
);

export const IconHome = (p: IconProps) => (
  <I {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </I>
);

export const IconDollar = (p: IconProps) => (
  <I {...p}>
    <path d="M12 3v18" />
    <path d="M16 7.5a4 4 0 0 0-4-2.5c-2.2 0-4 1.3-4 3.3 0 4.7 8 2.7 8 7.4 0 2-1.8 3.3-4 3.3a4 4 0 0 1-4-2.5" />
  </I>
);

export const IconBars = (p: IconProps) => (
  <I {...p}>
    <path d="M4 19V9" />
    <path d="M10 19V5" />
    <path d="M16 19v-7" />
    <path d="M22 19H2" />
  </I>
);

export const IconBuild = (p: IconProps) => (
  <I {...p}>
    <path d="M3 20h18" />
    <path d="M5 20V8l5-3 5 3v12" />
    <path d="M15 20v-6l4-2v8" />
    <path d="M9 12h2M9 16h2" />
  </I>
);

export const IconDoc = (p: IconProps) => (
  <I {...p}>
    <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h6" />
  </I>
);

export const IconPhone = (p: IconProps) => (
  <I {...p}>
    <path d="M5 4h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </I>
);

export const IconBell = (p: IconProps) => (
  <I {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </I>
);

export const IconCal = (p: IconProps) => (
  <I {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </I>
);

export const IconCaret = (p: IconProps) => (
  <I {...p}>
    <path d="M6 9l6 6 6-6" />
  </I>
);

export const IconCaretSm = (p: IconProps) => (
  <I w={16} h={16} {...p}>
    <path d="M6 9l6 6 6-6" />
  </I>
);

export const IconDocLine = (p: IconProps) => (
  <I {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 8h6M8 12h8M8 16h5" />
  </I>
);

export const IconActivity = (p: IconProps) => (
  <I {...p}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </I>
);

export const IconCard = (p: IconProps) => (
  <I {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M3 10h18" />
  </I>
);

export const IconInvoice = (p: IconProps) => (
  <I {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </I>
);

export const IconFuel = (p: IconProps) => (
  <I {...p}>
    <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M3 21h14" />
    <path d="M15 9h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2" />
    <path d="M8 7h4" />
  </I>
);

export const IconWallet = (p: IconProps) => (
  <I {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h12v4" />
    <path d="M3 7v12a2 2 0 0 0 2 2h14V9H5a2 2 0 0 1-2-2Z" />
    <circle cx="16" cy="14" r="1.2" fill="currentColor" />
  </I>
);

export const IconSearch = (p: IconProps) => (
  <I {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </I>
);

export const IconUsers = (p: IconProps) => (
  <I {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </I>
);

export const IconSettings = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </I>
);

export const IconEye = (p: IconProps) => (
  <I {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </I>
);

export const IconEyeOff = (p: IconProps) => (
  <I {...p}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </I>
);
