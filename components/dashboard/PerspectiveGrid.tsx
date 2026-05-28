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
            "linear-gradient(to right, rgba(0,82,255,0.16) 1px, transparent 1px)",
            "linear-gradient(to bottom, rgba(0,82,255,0.16) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "50px 50px",
          transform: "perspective(1500px) rotateX(55deg)",
          transformOrigin: "50% 0%",
          animation: "grid-move 1.5s linear infinite",
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 25%, black 50%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 25%, black 50%)",
        }}
      />
    </div>
  );
}
