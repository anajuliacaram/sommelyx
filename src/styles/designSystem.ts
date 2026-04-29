export const COLORS = {
  background: "#f6f1eb",
  backgroundSoft: "#efeae6",
  primary: "#7a2c34",
  primaryHover: "#5a1e24",
  accent: "#c89b6d",
  text: "#1c1c1c",
  textSecondary: "#6b6b6b",
  border: "#eaeaea",
} as const;

export const TYPOGRAPHY = {
  heading: "'Playfair Display', 'Fraunces', Georgia, serif",
  body: "'Inter', system-ui, sans-serif",
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
    "bg-[linear-gradient(135deg,#f6f1eb_0%,#efeae6_100%)]",
  sectionContainer: "relative px-4 sm:px-8 z-10",
  glassCard: {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.4)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    borderRadius: "20px",
  } as const,
  glassCardSoft: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(0,0,0,0.05)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  } as const,
  glassCardLight: {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.4)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
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
    "h-11 sm:h-12 rounded-[12px] px-6 sm:px-7 text-[14px] font-semibold bg-[linear-gradient(135deg,#7b1e2b_0%,#9f2c3a_100%)] text-white shadow-[0_14px_30px_-18px_rgba(123,30,43,0.35)] transition-all duration-200 ease-out hover:-translate-y-px hover:brightness-105 active:scale-[0.98]",
  secondaryButton:
    "h-11 sm:h-12 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white/70 px-6 sm:px-7 text-[14px] font-semibold text-[#2A2A2A] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white",
  pillButton:
    "rounded-full px-4 py-2 text-[12px] font-semibold border border-black/10 bg-white/70 backdrop-blur-sm text-[#3A3A3A] hover:bg-white transition-colors",
  inputField:
    "h-11 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-[#f5f5f5] px-4 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/50 transition-all duration-200 ease-out focus:border-primary/25 focus:bg-white focus:ring-2 focus:ring-primary/[0.08]",
  authShell:
    "relative min-h-screen overflow-hidden text-foreground selection:bg-primary/15 selection:text-primary",
  authGrid:
    "relative z-10 mx-auto grid min-h-screen w-full max-w-[1180px] items-center grid-cols-1 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-4 lg:py-8",
  authCard: {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.4)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    borderRadius: "20px",
  } as const,
  authPanel: "rounded-[20px] p-5 sm:p-6 md:p-8 lg:p-10",
  authFormCard: "w-full max-w-[520px] rounded-[20px] p-5 sm:p-6 md:p-8",
  authLogoLink: "inline-flex items-center gap-2.5 sm:gap-3 transition-opacity hover:opacity-80",
  authLogo: "h-10 sm:h-12 md:h-14 w-auto drop-shadow-[0_2px_8px_rgba(15,15,20,0.12)]",
  authBrand: "text-[22px] sm:text-[26px] md:text-[32px]",
  authHeadline: "text-[28px] sm:text-[32px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground",
  authBody: "text-[14px] font-medium leading-relaxed text-[#5F5F5F]",
} as const;

export type DesignSystem = typeof designSystem;
