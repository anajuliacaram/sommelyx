// Small reusable inline icons for the V6 landing.
// Kept as components to avoid duplicating SVG markup across cards.

export function ArrowIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      className="arrow"
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
    >
      <path d="M1 6h10M6.5 2L11 6l-4.5 4" />
    </svg>
  );
}

export function ArrowIconSmall() {
  return (
    <svg
      className="arrow"
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
    >
      <path d="M1 5h8M5.5 1.5L9 5l-4.5 3.5" />
    </svg>
  );
}

// Olive check used inside chips / extraction rows
export function CheckTiny({ stroke = "#3d4f35", strokeWidth = 1.6 }: { stroke?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 8 8" fill="none" stroke={stroke} strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M1.5 4l1.6 1.6L6.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckMark() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M2 6.2l2.4 2.4L10 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FeatureCheck() {
  return (
    <span className="check">
      <CheckTiny stroke="#3d4f35" strokeWidth={1.5} />
    </span>
  );
}
