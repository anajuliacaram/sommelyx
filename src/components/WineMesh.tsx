import { motion } from "framer-motion";

/**
 * WineVault proprietary generative visual — organic wine-colored mesh/wave.
 * Use across hero, dividers, empty states, auth panels.
 */

interface WineMeshProps {
  className?: string;
  variant?: "hero" | "divider" | "subtle" | "empty-state";
}

export function WineMesh({ className = "", variant = "hero" }: WineMeshProps) {
  const opacity = variant === "hero" ? 0.5 : variant === "divider" ? 0.3 : variant === "subtle" ? 0.12 : 0.2;
  const height = variant === "hero" ? "100%" : variant === "divider" ? "200px" : "100%";

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={{ height }}>
      <svg
        viewBox="0 0 1200 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity }}
      >
        <defs>
          <radialGradient id="wv-glow-1" cx="30%" cy="40%" r="50%">
            <stop offset="0%" stopColor="hsl(340 55% 28%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wv-glow-2" cx="70%" cy="60%" r="40%">
            <stop offset="0%" stopColor="hsl(340 50% 22%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wv-gold" cx="60%" cy="30%" r="30%">
            <stop offset="0%" stopColor="hsl(37 35% 45%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="wv-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(340 50% 35%)" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(340 50% 35%)" stopOpacity="0.3" />
            <stop offset="70%" stopColor="hsl(340 55% 40%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(340 50% 35%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wv-line-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(37 35% 50%)" stopOpacity="0" />
            <stop offset="40%" stopColor="hsl(37 35% 50%)" stopOpacity="0.12" />
            <stop offset="60%" stopColor="hsl(37 35% 55%)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="hsl(37 35% 50%)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Organic glows */}
        <ellipse cx="360" cy="240" rx="320" ry="240" fill="url(#wv-glow-1)" />
        <ellipse cx="840" cy="360" rx="280" ry="200" fill="url(#wv-glow-2)" />
        <ellipse cx="720" cy="180" rx="200" ry="160" fill="url(#wv-gold)" />

        {/* Parametric flowing lines */}
        <motion.path
          d="M0 320 C200 280, 400 360, 600 300 S1000 340, 1200 280"
          stroke="url(#wv-line-1)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.5, ease: "easeOut", delay: 0.3 }}
        />
        <motion.path
          d="M0 380 C300 340, 500 420, 700 360 S1000 400, 1200 340"
          stroke="url(#wv-line-1)"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.8, ease: "easeOut", delay: 0.6 }}
        />
        <motion.path
          d="M0 260 C250 220, 450 300, 650 240 S900 280, 1200 220"
          stroke="url(#wv-line-2)"
          strokeWidth="0.8"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 3, ease: "easeOut", delay: 0.9 }}
        />
        <motion.path
          d="M0 440 C350 400, 550 480, 750 420 S1050 460, 1200 400"
          stroke="url(#wv-line-1)"
          strokeWidth="0.6"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 3.2, ease: "easeOut", delay: 1.2 }}
        />

        {/* Subtle dot accents */}
        {variant === "hero" && (
          <>
            <circle cx="300" cy="300" r="2" fill="hsl(340 50% 40%)" opacity="0.3" />
            <circle cx="600" cy="280" r="1.5" fill="hsl(37 35% 55%)" opacity="0.25" />
            <circle cx="900" cy="350" r="2" fill="hsl(340 50% 35%)" opacity="0.2" />
            <circle cx="150" cy="400" r="1.5" fill="hsl(340 50% 40%)" opacity="0.15" />
            <circle cx="1050" cy="250" r="1.5" fill="hsl(37 35% 50%)" opacity="0.2" />
          </>
        )}
      </svg>
    </div>
  );
}

/** Section divider using the WineVault visual language */
export function WineDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-px w-full overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-border/30" />
      <motion.div
        className="absolute inset-y-0 left-0 right-0"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(340 50% 35% / 0.4) 30%, hsl(37 35% 50% / 0.2) 70%, transparent 100%)",
        }}
        initial={{ scaleX: 0, originX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as const }}
      />
    </div>
  );
}

/** Halo ring for emphasis */
export function WineHalo({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <div
        className="w-full h-full rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(340 55% 25% / 0.08) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
