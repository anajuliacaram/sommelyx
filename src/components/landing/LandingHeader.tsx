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
      className="fixed top-0 w-full z-50 px-4 sm:px-8 py-2.5 sm:py-3.5 lg:py-4 bg-background/70 backdrop-blur-2xl border-b border-border/40"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mx-auto flex items-center justify-between max-w-6xl">
        <a
          href="/"
          className="flex items-center gap-2 sm:gap-3 lg:gap-4 transition-opacity duration-300 hover:opacity-80 rounded-2xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          <Logo
            variant="navbar"
            className="h-10 sm:h-10 md:h-12 lg:h-16 drop-shadow-[0_16px_40px_rgba(15,15,20,0.18)]"
          />
          <span className="font-serif text-[18px] sm:text-[20px] md:text-[24px] lg:text-[34px] font-black tracking-tight text-[#7B1E3A]">
            Sommelyx
          </span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://instagram.com/sommelyx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-wine/20 text-wine/70 hover:bg-wine/10 hover:text-wine transition-colors duration-200"
          >
            <Instagram size={15} />
          </a>
          <a
            href="https://www.linkedin.com/company/sommelyx/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-wine/20 text-wine/70 hover:bg-wine/10 hover:text-wine transition-colors duration-200"
          >
            <Linkedin size={15} />
          </a>
          <Button
            variant="secondary"
            size="sm"
            className="text-[13px] font-semibold bg-white/35 border border-wine/[0.10] shadow-[0_10px_26px_-18px_rgba(15,15,20,0.35)] hover:bg-wine/5 text-wine"
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
