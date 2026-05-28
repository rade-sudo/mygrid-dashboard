export default function PerspectiveGrid() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
        background: "linear-gradient(to bottom, rgba(234,241,255,0.55) 0%, rgba(234,241,255,0.15) 45%, transparent 75%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "-100%",
          right: "-100%",
          top: 0,
          height: "400%",
          backgroundImage: [
            "linear-gradient(to right, rgba(37,99,235,0.13) 1px, transparent 1px)",
            "linear-gradient(to bottom, rgba(37,99,235,0.13) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "50px 50px",
          transform: "perspective(1500px) rotateX(55deg)",
          transformOrigin: "50% 0%",
          animation: "grid-move 1.5s linear infinite",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.8) 10%, black 22%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.8) 10%, black 22%)",
        }}
      />
    </div>
  );
}
