import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Logo } from "@/components/Logo";

interface LandingHeaderProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingHeader({ onLogin, onSignup }: LandingHeaderProps) {
  return (
    <motion.header
      className="fixed top-0 w-full z-50 px-4 sm:px-8 py-2.5 sm:py-3.5 bg-background/70 backdrop-blur-2xl border-b border-border/40"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mx-auto flex items-center justify-between max-w-6xl">
        <a
          href="/"
          className="flex items-center gap-2 sm:gap-3 transition-opacity duration-300 hover:opacity-80 rounded-2xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          <Logo
            variant="navbar"
            className="h-9 sm:h-9 md:h-11 drop-shadow-[0_10px_28px_rgba(15,15,20,0.18)]"
          />
          <span className="font-serif text-[16px] sm:text-[18px] md:text-[20px] font-black tracking-tight text-[#7B1E3A]">
            Sommelyx
          </span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="secondary"
            size="sm"
            className="text-[13px] font-semibold bg-white/35 border border-black/[0.06] shadow-[0_10px_26px_-18px_rgba(15,15,20,0.35)] hover:bg-white/45"
            onClick={onLogin}
          >
            Entrar
          </Button>
          <MagneticButton>
            <Button
              variant="primary"
              className="px-5 sm:px-7 h-9 sm:h-10 text-[12px] sm:text-[13px] font-black uppercase tracking-[0.12em] rounded-full shadow-float"
              onClick={onSignup}
            >
              Começar grátis
            </Button>
          </MagneticButton>
        </div>
      </div>
    </motion.header>
  );
}
