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
      className="fixed top-0 w-full z-50 px-4 sm:px-8 py-2.5 sm:py-3 lg:py-3.5 bg-background/75 backdrop-blur-2xl border-b border-border/30"
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
          <span className="font-serif text-[17px] sm:text-[19px] md:text-[22px] lg:text-[28px] font-bold tracking-[-0.01em] text-wine">
            Sommelyx
          </span>
        </a>
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <a
            href="https://instagram.com/sommelyx"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg border border-border/40 text-muted-foreground/60 hover:bg-muted/20 hover:text-foreground transition-colors duration-200"
          >
            <Instagram size={14} />
          </a>
          <a
            href="https://www.linkedin.com/company/sommelyx/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg border border-border/40 text-muted-foreground/60 hover:bg-muted/20 hover:text-foreground transition-colors duration-200"
          >
            <Linkedin size={14} />
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="text-[12px] sm:text-[13px] font-semibold border border-border/40 text-foreground px-3 sm:px-4 hover:bg-muted/20"
            onClick={onLogin}
          >
            Entrar
          </Button>
          <MagneticButton>
            <Button
              variant="primary"
              className="px-3.5 sm:px-6 h-9 sm:h-9 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.06em] sm:tracking-[0.08em] rounded-xl shadow-float whitespace-nowrap"
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
