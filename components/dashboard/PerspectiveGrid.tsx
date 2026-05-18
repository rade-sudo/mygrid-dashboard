export default function PerspectiveGrid() {
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.9,
        width: "100%",
        height: "100%",
      }}
      viewBox="0 0 1200 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#bcd0ff" stopOpacity="0" />
          <stop offset=".55" stopColor="#bcd0ff" stopOpacity=".55" />
          <stop offset="1" stopColor="#bcd0ff" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id="fadeH" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset=".5" stopColor="#bcd0ff" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: 7 }).map((_, i) => {
        const y = 80 + i * 22 + i * i * 1.2;
        return <line key={"h" + i} x1="0" y1={y} x2="1200" y2={y} stroke="url(#fadeH)" strokeWidth=".7" />;
      })}
      {Array.from({ length: 21 }).map((_, i) => {
        const x = (i / 20) * 1200;
        return <line key={"v" + i} x1={x} y1="160" x2="600" y2="70" stroke="url(#fade)" strokeWidth=".7" />;
      })}
    </svg>
  );
}
