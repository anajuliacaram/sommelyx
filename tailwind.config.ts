import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"SF Pro Display"', '"Segoe UI Variable"', "system-ui", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', '"SF Pro Text"', '"Segoe UI Variable"', "system-ui", "sans-serif"],
        serif: ['"Libre Baskerville"', "Georgia", "serif"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
        "xs": ["0.8rem", { lineHeight: "1.15rem" }],
        "sm": ["0.875rem", { lineHeight: "1.35rem" }],
        "base": ["0.9375rem", { lineHeight: "1.55rem" }],
        "lg": ["1.125rem", { lineHeight: "1.65rem" }],
        "xl": ["1.3125rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.625rem", { lineHeight: "2rem" }],
        "3xl": ["2rem", { lineHeight: "2.35rem" }],
        "4xl": ["2.5rem", { lineHeight: "2.75rem" }],
      },
      colors: {
        border: "var(--sx-b-default)",
        input: "var(--sx-b-default)",
        ring: "var(--sx-b-focus)",
        background: "var(--sx-bg-base)",
        foreground: "var(--sx-t-body)",
        primary: {
          DEFAULT: "var(--sx-bordeaux)",
          foreground: "var(--sx-t-white)",
        },
        secondary: {
          DEFAULT: "var(--sx-bg-input)",
          foreground: "var(--sx-t-body)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "var(--sx-bg-input)",
          foreground: "var(--sx-t-sub)",
        },
        accent: {
          DEFAULT: "var(--sx-olive)",
          foreground: "var(--sx-t-white)",
        },
        popover: {
          DEFAULT: "var(--sx-bg-card)",
          foreground: "var(--sx-t-body)",
        },
        card: {
          DEFAULT: "var(--sx-bg-card)",
          foreground: "var(--sx-t-body)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        wine: {
          DEFAULT: "hsl(var(--wine))",
          foreground: "hsl(var(--wine-foreground))",
          light: "hsl(var(--wine-light))",
          vivid: "hsl(var(--wine-vivid))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
          light: "hsl(var(--gold-light))",
        },
        cream: {
          DEFAULT: "hsl(var(--cream))",
          dark: "hsl(var(--cream-dark))",
          warm: "hsl(var(--cream-warm))",
        },
        forest: {
          DEFAULT: "hsl(var(--forest))",
          light: "hsl(var(--forest-light))",
          muted: "hsl(var(--forest-muted))",
        },
        copper: {
          DEFAULT: "hsl(var(--copper))",
          light: "hsl(var(--copper-light))",
        },
        cellar: {
          bg: "var(--cellar-bg)",
          surface: "var(--cellar-surface)",
          elevated: "var(--cellar-elevated)",
          ink: "var(--cellar-ink)",
          muted: "var(--cellar-muted)",
          parchment: "var(--cellar-parchment)",
        },
      },
      borderRadius: {
        lg: "var(--sx-r-md)",
        md: "var(--sx-r-sm)",
        sm: "calc(var(--sx-r-sm) - 2px)",
        xl: "var(--sx-r-lg)",
        "2xl": "var(--sx-r-xl)",
        "3xl": "var(--sx-r-xl)",
        "4xl": "var(--sx-r-xl)",
        full: "var(--sx-r-pill)",
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "7.5": "1.875rem",
        "18": "4.5rem",
        "22": "5.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-subtle": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-subtle": "fade-in-subtle 0.35s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      boxShadow: {
        sm: "var(--sx-shadow-sm)",
        md: "var(--sx-shadow-md)",
        lg: "var(--sx-shadow-lg)",
        "glass": "var(--sx-shadow-md)",
        "glass-hover": "var(--sx-shadow-lg)",
        "editorial": "var(--sx-shadow-sm)",
        "editorial-hover": "0 4px 16px -8px rgba(44, 20, 31, 0.10)",
        "wine-glow": "0 4px 20px -6px hsl(var(--wine) / 0.18)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
