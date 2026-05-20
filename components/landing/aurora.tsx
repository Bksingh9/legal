// Decorative animated mesh used behind dark hero sections.
// Pure CSS — no JS, no images, no canvas. Respects prefers-reduced-motion via globals.css.
export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={[
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      ].join(" ")}
    >
      <div
        className="absolute -inset-[40%] animate-spin-slow opacity-70"
        style={{
          background:
            "conic-gradient(from 90deg at 50% 50%, rgba(59,107,255,0.0) 0deg, rgba(59,107,255,0.55) 80deg, rgba(245,165,36,0.0) 160deg, rgba(245,165,36,0.45) 240deg, rgba(59,107,255,0.0) 360deg)",
          filter: "blur(80px)"
        }}
      />
      <div className="absolute inset-0 bg-mesh-hero" />
      <div className="absolute inset-0 grain opacity-[0.35] mix-blend-overlay" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-night-900" />
    </div>
  );
}
