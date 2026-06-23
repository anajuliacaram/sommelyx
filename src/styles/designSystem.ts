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
  // V6 landing language: Fraunces for editorial headlines, Geist for UI.
  heading: "'Fraunces', Georgia, serif",
  body: "'Geist', 'Inter', system-ui, sans-serif",
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
  // V6 primary CTA — burgundy gradient, inner highlight, soft depth, hover lift.
  primaryButton:
    "h-12 rounded-[14px] px-7 text-[14.5px] font-medium normal-case text-[#fdf3ee] bg-[linear-gradient(180deg,#8d1d36_0%,#7B1730_48%,#5B1023_100%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.2),0_3px_8px_rgba(122,18,36,0.3),0_12px_30px_-10px_rgba(122,18,36,0.5)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-0",
  // V6 secondary — warm cream glass, burgundy hover.
  secondaryButton:
    "h-12 rounded-[14px] border border-[rgba(122,18,36,0.16)] bg-[rgba(255,252,246,0.55)] px-6 text-[14.5px] font-medium normal-case text-[#3d4f35] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[rgba(122,18,36,0.3)] hover:text-[#7a1224] hover:bg-[rgba(122,18,36,0.06)]",
  pillButton:
    "rounded-full px-4 py-2 text-[12px] font-medium border border-[rgba(122,18,36,0.12)] bg-[rgba(255,252,246,0.7)] backdrop-blur-sm text-[#3d4f35] hover:text-[#7a1224] hover:bg-[rgba(122,18,36,0.06)] transition-colors",
  // V6 input — translucent cream glass, hairline border, burgundy focus ring.
  inputField:
    "h-12 w-full rounded-[13px] border border-[rgba(122,18,36,0.12)] bg-[rgba(255,252,246,0.6)] px-4 text-[15px] font-normal text-[#1d150f] placeholder:text-[rgba(29,21,15,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-[rgba(122,18,36,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(122,18,36,0.16)] focus:bg-[rgba(255,253,249,0.82)]",
  authShell:
    "auth-v6 relative min-h-screen overflow-hidden text-foreground selection:bg-primary/15 selection:text-primary",
  authGrid:
    "relative z-10 mx-auto grid min-h-screen w-full max-w-[1160px] items-center grid-cols-1 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[1fr_0.92fr] lg:gap-8 lg:px-5 lg:py-6",
  // V6 glass card — translucent cream, layered highlight + soft depth.
  authCard: {
    background: "rgba(255,252,246,0.72)",
    backdropFilter: "blur(20px) saturate(1.1)",
    WebkitBackdropFilter: "blur(20px) saturate(1.1)",
    border: "1px solid rgba(255,255,255,0.7)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(255,255,255,0.16), 0 2px 6px rgba(50,30,20,0.05), 0 24px 56px -28px rgba(50,30,20,0.3)",
    borderRadius: "22px",
  } as const,
  authPanel: "rounded-[22px] p-4 sm:p-5 md:p-6 lg:p-7",
  authFormCard: "w-full max-w-[480px] rounded-[22px] p-5 sm:p-6 md:p-7",
  authLogoLink: "inline-flex items-center gap-2.5 sm:gap-3 transition-opacity hover:opacity-80",
  authLogo: "h-10 sm:h-12 md:h-14 w-auto drop-shadow-[0_2px_8px_rgba(15,15,20,0.12)]",
  authBrand: "text-[22px] sm:text-[26px] md:text-[32px] text-[#7a1224]",
  authHeadline:
    "text-[28px] sm:text-[32px] font-medium leading-[1.04] tracking-[-0.022em] text-[#1d150f]",
  authBody: "text-[14px] font-normal leading-relaxed text-[rgba(72,60,46,0.7)]",
} as const;

export type DesignSystem = typeof designSystem;
