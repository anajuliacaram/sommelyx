export const COLORS = {
  background: "#f7f5f2",
  backgroundSoft: "#efeae6",
  primary: "#7a2c34",
  primaryHover: "#5a1e24",
  accent: "#2f5d3a",
  text: "#1c1c1c",
  textSecondary: "#6b6b6b",
  border: "#eaeaea",
} as const;

export const TYPOGRAPHY = {
  heading: "'Playfair Display', 'Fraunces', 'Libre Baskerville', Georgia, serif",
  body: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
} as const;

export const SPACING = {
  pageX: "px-4 sm:px-8",
  pageY: "py-6 sm:py-8",
  sectionX: "px-4 sm:px-8",
  sectionY: "pt-3 pb-6 sm:pb-8",
  cardPadding: "p-5 sm:p-6",
  cardPaddingLg: "p-6 sm:p-7",
} as const;

export const designSystem = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  pageShell:
    "min-h-screen overflow-x-hidden text-foreground selection:bg-primary/15 selection:text-primary",
  pageBackground:
    "bg-[linear-gradient(135deg,#f7f5f2_0%,#efeae6_100%)]",
  sectionContainer: "relative px-4 sm:px-8 z-10",
  glassCard: {
    background: "linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(248,243,238,0.94) 100%)",
    backdropFilter: "blur(10px) saturate(1.08)",
    WebkitBackdropFilter: "blur(10px) saturate(1.08)",
    border: "1px solid rgba(255,255,255,0.58)",
    boxShadow: "0 16px 44px -26px rgba(44,20,31,0.22), 0 1px 2px rgba(0,0,0,0.04)",
  } as const,
  glassCardSoft: {
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.25)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 10px 24px -12px rgba(15,15,20,0.12)",
  } as const,
  glassCardLight: {
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.25)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 10px 24px -12px rgba(0,0,0,0.12)",
  } as const,
  primaryButton:
    "h-11 sm:h-12 rounded-2xl px-6 sm:px-7 text-[14px] font-semibold shadow-[0_18px_44px_-22px_rgba(46,74,47,0.50)]",
  pillButton:
    "rounded-full px-4 py-2 text-[12px] font-semibold border border-black/10 bg-white/70 backdrop-blur-sm text-[#3A3A3A] hover:bg-white transition-colors",
  inputField:
    "h-12 rounded-xl border-border/50 bg-background/60 px-4 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary/25 focus:bg-background/90 focus:ring-2 focus:ring-primary/[0.06]",
  authShell:
    "relative min-h-screen overflow-hidden text-foreground selection:bg-primary/15 selection:text-primary",
  authGrid:
    "relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 px-4 py-6 sm:px-8 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-14 lg:py-10",
} as const;

export type DesignSystem = typeof designSystem;
