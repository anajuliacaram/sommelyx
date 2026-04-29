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
  headerShell: {
    backdropFilter: "blur(14px) saturate(1.3)",
    WebkitBackdropFilter: "blur(14px) saturate(1.3)",
    background: "linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,0.84))",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  } as const,
  footerShell: {
    borderTop: "1px solid rgba(0,0,0,0.06)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(248,244,237,0.96) 100%)",
    backdropFilter: "blur(8px) saturate(1.02)",
    WebkitBackdropFilter: "blur(8px) saturate(1.02)",
  } as const,
  socialIcon: {
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(0,0,0,0.06)",
    color: "hsl(var(--wine))",
    boxShadow: "0 8px 18px -14px rgba(0,0,0,0.18)",
  } as const,
  primaryButton:
    "h-11 sm:h-12 rounded-[10px] px-6 sm:px-7 text-[14px] font-semibold shadow-[0_18px_44px_-22px_rgba(46,74,47,0.50)]",
  pillButton:
    "rounded-full px-4 py-2 text-[12px] font-semibold border border-black/10 bg-white/70 backdrop-blur-sm text-[#3A3A3A] hover:bg-white transition-colors",
  inputField:
    "h-11 rounded-[10px] border-border/50 bg-[#f5f5f5] px-4 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary/25 focus:bg-white focus:ring-2 focus:ring-primary/[0.08]",
  authShell:
    "relative min-h-screen overflow-hidden text-foreground selection:bg-primary/15 selection:text-primary",
  authGrid:
    "relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 px-4 py-6 sm:px-8 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-14 lg:py-10",
  authCard: {
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(0,0,0,0.05)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  } as const,
  authPanel: "rounded-[20px] p-6 sm:p-8 md:p-10 lg:p-12",
  authFormCard: "w-full max-w-[520px] rounded-[20px] p-6 sm:p-7 md:p-9",
  authLogoLink: "inline-flex items-center gap-2.5 sm:gap-3 transition-opacity hover:opacity-80",
  authLogo: "h-8 sm:h-10 md:h-12 w-auto drop-shadow-[0_2px_8px_rgba(15,15,20,0.12)]",
  authBrand: "text-[22px] sm:text-[26px] md:text-[32px]",
  authHeadline: "text-[30px] sm:text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground",
  authBody: "text-[14px] font-medium leading-relaxed text-[#5F5F5F]",
} as const;

export type DesignSystem = typeof designSystem;
