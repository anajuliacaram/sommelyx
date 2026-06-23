interface WineLoadingAnimationProps {
  size?: number;
  className?: string;
}

// Bottle rotation pivot — base centre in the 200×200 viewBox
const PX = 71;
const PY = 147;

// ── Timing fractions (90 frames @ 30 fps = 3 s loop) ────────────────────────
// 0 → 0.167  tilt out (with 5° overshoot → settle)
// 0.2 → 0.778  pour / fill rises
// 0.778 → 0.9  bottle returns (with 3° undershoot → settle)
// 0.889 → 1.0  shimmer on wine surface

export function WineLoadingAnimation({ size = 200, className }: WineLoadingAnimationProps) {
  return (
    <div style={{ width: size, height: size }} className={className}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
        <defs>
          {/*
           * Glass bowl interior — organic Burgundy-style shape.
           * Rim: 34 px wide (x 118–152, y 90).
           * Widens to ~56 px at mid-bowl (y ≈ 126), narrows to stem at y 150.
           * Used as both clip mask for wine fill and as the visible stroke path.
           */}
          <clipPath id="sx-bowl-clip">
            <path d="M118,90 C107,104 103,130 127,150 L143,150 C167,130 163,104 152,90 Z" />
          </clipPath>
        </defs>

        {/* ── Wine fill — clipped to bowl interior ─────────────────────── */}
        {/*
         * A rect wider than the bowl sits behind the glass stroke.
         * The clip path turns the flat rectangle into a wine-shape fill
         * that follows the organic bowl curves as it rises.
         */}
        {/*
         * Exact 5-keyframe structure that matches the working version —
         * any extra keyframe broke the SMIL timing in some browsers.
         * Bowl bottom is y=150, 80% fill top is y=102 (height 48).
         */}
        <rect
          x="95"
          y="150"
          width="80"
          height="0"
          fill="#6B1A2A"
          fillOpacity="0.82"
          clipPath="url(#sx-bowl-clip)"
        >
          <animate
            attributeName="y"
            values="150;150;102;102;102"
            keyTimes="0;0.167;0.778;0.889;1"
            calcMode="spline"
            keySplines="0 0 1 1;0.42 0 0.58 1;0 0 1 1;0 0 1 1"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="height"
            values="0;0;48;48;48"
            keyTimes="0;0.167;0.778;0.889;1"
            calcMode="spline"
            keySplines="0 0 1 1;0.42 0 0.58 1;0 0 1 1;0 0 1 1"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="fill-opacity"
            values="0.82;0.82;0.82;0.55;0.82"
            keyTimes="0;0.778;0.889;0.944;1"
            calcMode="spline"
            keySplines="0 0 1 1;0 0 1 1;0.5 0 0.5 1;0.5 0 0.5 1"
            dur="3s"
            repeatCount="indefinite"
          />
        </rect>

        {/* ── Wine stream — tapered curved ribbon ──────────────────────── */}
        {/*
         * When bottle tilts 45° (pivot 71,147, mouth local 0,−95):
         *   left lip  → world (134, 76)
         *   right lip → world (142, 84)
         * Stream flows from that tilted opening down to the glass rim (y 90).
         * Left edge arcs gently leftward; right edge is nearly straight.
         * Narrows from ~8 px wide at top to ~6 px at the glass entry.
         */}
        <path
          d="M134,76 C134,82 132,88 132,96 L138,96 C138,88 140,82 142,84 Z"
          fill="#6B1A2A"
          fillOpacity="0.88"
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;0;1;1;0;0"
            keyTimes="0;0.19;0.2;0.778;0.789;1"
            calcMode="linear"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>

        {/* ── Glass — cream strokes, no fill ───────────────────────────── */}
        {/*
         * Bowl: same cubic bezier as the clip path but open at the top
         * so the rim reads as a real glass opening.
         * Left side flares from (118,90) → widest ~(103,126) → (127,150).
         * Right side mirrors. Stroke linecap=round keeps ends soft.
         */}
        <path
          d="M118,90 C107,104 103,130 127,150 L143,150 C167,130 163,104 152,90"
          fill="none"
          stroke="#F5ECD7"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Thin elegant stem */}
        <line
          x1="135" y1="150" x2="135" y2="166"
          stroke="#F5ECD7" strokeWidth="1.5" strokeLinecap="round"
        />
        {/* Flat base — slightly heavier than stem */}
        <line
          x1="120" y1="166" x2="150" y2="166"
          stroke="#F5ECD7" strokeWidth="2" strokeLinecap="round"
        />

        {/* ── Bottle — Bordeaux silhouette, rotates around base ────────── */}
        {/*
         * Pivot at (71, 147). Bottle extends 95 px upward to y 52.
         * Body is 28 px wide (x 57–85); neck is 12 px (x 65–77).
         * Shoulders use cubic bezier for the characteristic Bordeaux
         * angular-but-smooth taper from body to neck.
         *
         * Overshoot tilt sequence:
         *   0° → 50° (fast swing, easeIn) → settle 45° → hold →
         *   return to −3° (undershoot) → settle 0°
         */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values={[
              `0,${PX},${PY}`,
              `50,${PX},${PY}`,
              `45,${PX},${PY}`,
              `45,${PX},${PY}`,
              `-3,${PX},${PY}`,
              `0,${PX},${PY}`,
              `0,${PX},${PY}`,
            ].join(";")}
            keyTimes="0;0.167;0.2;0.778;0.878;0.9;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1;0.5 0 0.5 1;0 0 1 1;0.42 0 0.58 1;0.5 0 0.5 1;0 0 1 1"
            dur="3s"
            repeatCount="indefinite"
          />

          {/*
           * Bordeaux silhouette — two fixes vs previous version:
           *   1. Body tapers 2 px inward (85→84 / 57→58) so sides
           *      read as slightly curved rather than a flat rectangle.
           *   2. Shoulder now spans 32 px (y 80–112) with a gradual
           *      cubic bezier instead of the old 14 px sharp kink.
           *      Control points keep the curve wide early, then pull
           *      firmly into the neck at the end.
           */}
          <path
            d="M85,147 L84,112 C84,100 82,82 77,80 L77,59 L78,52 L64,52 L65,59 L65,80 C60,82 58,100 58,112 L57,147 Z"
            fill="#1A3328"
          />

          {/* Tan capsule — neck + lip, shoulder starts at y 82 */}
          <path
            d="M77,82 L77,59 L78,52 L64,52 L65,59 L65,82 Z"
            fill="#C8954A"
          />

          {/* Highlight strip on capsule */}
          <path
            d="M75,82 L75,60 L76,55 L76,82 Z"
            fill="#D9A96A"
            fillOpacity="0.4"
          />

          {/* Dark cork / seal at bottle top */}
          <rect x="65" y="52" width="12" height="6" rx="1.5" fill="#2A1505" />
        </g>
      </svg>
    </div>
  );
}
