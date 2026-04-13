import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Logo } from "@/components/Logo";
import { Instagram, Linkedin } from "lucide-react";

interface LandingHeaderProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingHeader({ onLogin, onSignup }: LandingHeaderProps) {
  return (
    <motion.header
      className="fixed top-0 w-full z-50 px-3 sm:px-8 py-2.5 sm:py-3 lg:py-3.5"
      style={{
        background: "rgba(15, 42, 36, 0.60)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mx-auto flex items-center justify-between max-w-6xl">
        <a
          href="/"
          className="flex items-center gap-2 sm:gap-3 lg:gap-3.5 transition-opacity duration-200 hover:opacity-80 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          <Logo
            variant="navbar"
            className="h-9 sm:h-10 md:h-11 lg:h-14 drop-shadow-[0_4px_12px_rgba(15,15,20,0.10)]"
          />
          <span className="font-serif text-[17px] sm:text-[19px] md:text-[22px] lg:text-[28px] font-bold tracking-[-0.01em] text-white/90">
            Sommelyx
          </span>
        </a>
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <a
            href="https://instagram.com/sommelyx"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white/80 transition-colors duration-200"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <Instagram size={14} />
          </a>
          <a
            href="https://www.linkedin.com/company/sommelyx/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white/80 transition-colors duration-200"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <Linkedin size={14} />
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="text-[13px] sm:text-[14px] font-semibold px-4 sm:px-5 rounded-xl transition-all duration-250 hover:-translate-y-0.5 text-white/80 hover:text-white hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            onClick={onLogin}
          >
            Entrar
          </Button>
          <MagneticButton>
            <Button
              variant="primary"
              className="px-3 sm:px-6 h-9 sm:h-10 text-[11px] sm:text-[13px] font-semibold uppercase tracking-[0.04em] sm:tracking-[0.06em] rounded-xl shadow-float whitespace-nowrap"
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
