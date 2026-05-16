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
  heading: "'Libre Baskerville', Georgia, serif",
  body: "'Plus Jakarta Sans', system-ui, sans-serif",
} as const;

export const SPACING = {
  pageX: "px-4 sm:px-8",
  pageY: "py-5 sm:py-7",
  sectionX: "px-4 sm:px-8",
  sectionY: "pt-2 pb-5 sm:pb-7",
  cardPadding: "p-4 sm:p-5",
  cardPaddingLg: "p-5 sm:p-6",
} as const;

export const designSystem = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  pageShell:
    "min-h-screen overflow-x-hidden text-foreground selection:bg-primary/15 selection:text-primary",
  pageBackground:
    "app-background",
  gradientText: "gradient-text",
  sectionContainer: "relative px-4 sm:px-8 z-10",
  glassCard: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(249,244,237,0.44) 100%)",
    backdropFilter: "blur(22px) saturate(1.06)",
    WebkitBackdropFilter: "blur(22px) saturate(1.06)",
    border: "1px solid rgba(255,255,255,0.34)",
    boxShadow: "0 28px 62px -44px rgba(58,51,39,0.24), 0 1px 0 rgba(255,255,255,0.46) inset",
    borderRadius: "24px",
  } as const,
  glassCardSoft: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.50) 0%, rgba(249,244,237,0.36) 100%)",
    backdropFilter: "blur(20px) saturate(1.05)",
    WebkitBackdropFilter: "blur(20px) saturate(1.05)",
    border: "1px solid rgba(255,255,255,0.30)",
    boxShadow: "0 24px 52px -42px rgba(58,51,39,0.20), 0 1px 0 rgba(255,255,255,0.40) inset",
    borderRadius: "22px",
  } as const,
  glassCardLight: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(250,246,240,0.34) 100%)",
    backdropFilter: "blur(20px) saturate(1.05)",
    WebkitBackdropFilter: "blur(20px) saturate(1.05)",
    border: "1px solid rgba(255,255,255,0.30)",
    boxShadow: "0 22px 48px -42px rgba(58,51,39,0.18), 0 1px 0 rgba(255,255,255,0.38) inset",
    borderRadius: "22px",
  } as const,
  headerShell: {
    backdropFilter: "blur(16px) saturate(1.06)",
    WebkitBackdropFilter: "blur(16px) saturate(1.06)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.76) 0%, rgba(255,255,255,0.62) 100%)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  } as const,
  footerShell: {
    borderTop: "1px solid rgba(255,255,255,0.46)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.74) 100%)",
    backdropFilter: "blur(16px) saturate(1.06)",
    WebkitBackdropFilter: "blur(16px) saturate(1.06)",
  } as const,
  socialIcon: {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(0,0,0,0.05)",
    color: "hsl(var(--wine))",
    boxShadow: "0 8px 18px -14px rgba(0,0,0,0.14)",
  } as const,
  primaryButton:
    "h-11 sm:h-12 rounded-[17px] px-5.5 sm:px-6.5 text-[13px] font-semibold bg-[linear-gradient(135deg,#7b1e2b_0%,#912634_100%)] text-white shadow-[0_20px_40px_-24px_rgba(123,30,43,0.46),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.035] active:scale-[0.975]",
  secondaryButton:
    "h-11 sm:h-12 rounded-[17px] border border-white/30 bg-[rgba(255,252,247,0.48)] px-5.5 sm:px-6.5 text-[13px] font-semibold text-[rgba(36,30,24,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.40),0_16px_32px_-28px_rgba(58,51,39,0.16)] backdrop-blur-xl transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-[rgba(255,253,249,0.62)]",
  pillButton:
    "rounded-full px-4 py-2 text-[12px] font-semibold border border-[rgba(58,51,39,0.08)] bg-white/72 backdrop-blur-sm text-[#3A3A3A] hover:bg-white transition-colors",
  inputField:
    "h-10 rounded-[15px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(249,244,237,0.40)_100%)] px-3.5 text-[13px] font-medium text-[rgba(36,30,24,0.86)] placeholder:text-[rgba(108,96,84,0.52)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_14px_28px_-28px_rgba(58,51,39,0.14)] backdrop-blur-xl transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-primary/16 focus:bg-[linear-gradient(180deg,rgba(255,255,255,0.66)_0%,rgba(252,248,242,0.52)_100%)] focus:ring-2 focus:ring-primary/[0.055]",
  authShell:
    "relative min-h-screen overflow-hidden text-foreground selection:bg-primary/15 selection:text-primary",
  authGrid:
    "relative z-10 mx-auto grid min-h-screen w-full max-w-[1160px] items-center grid-cols-1 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[1fr_0.92fr] lg:gap-8 lg:px-5 lg:py-6",
  authCard: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.76) 0%, rgba(249,244,237,0.70) 100%)",
    backdropFilter: "blur(18px) saturate(1.02)",
    WebkitBackdropFilter: "blur(18px) saturate(1.02)",
    border: "1px solid rgba(255,255,255,0.56)",
    boxShadow: "0 22px 46px -34px rgba(58,51,39,0.18), 0 1px 2px rgba(255,255,255,0.52) inset",
    borderRadius: "20px",
  } as const,
  authPanel: "rounded-[20px] p-4 sm:p-5 md:p-6 lg:p-7",
  authFormCard: "w-full max-w-[500px] rounded-[20px] p-4 sm:p-5 md:p-6",
  authLogoLink: "inline-flex items-center gap-2.5 sm:gap-3 transition-opacity hover:opacity-80",
  authLogo: "h-10 sm:h-12 md:h-14 w-auto drop-shadow-[0_2px_8px_rgba(15,15,20,0.12)]",
  authBrand: "text-[22px] sm:text-[26px] md:text-[32px]",
  authHeadline: "text-[26px] sm:text-[30px] font-semibold leading-[1.06] tracking-[-0.02em] text-[rgba(26,23,19,0.92)]",
  authBody: "text-[13px] font-medium leading-relaxed text-[rgba(72,60,46,0.74)]",
} as const;

export type DesignSystem = typeof designSystem;
