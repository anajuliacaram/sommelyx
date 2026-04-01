import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";

interface LandingHeaderProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingHeader({ onLogin, onSignup }: LandingHeaderProps) {
  return (
    <motion.header
      className="fixed top-0 w-full z-50 px-5 sm:px-8 py-3 sm:py-4 bg-background/70 backdrop-blur-2xl border-b border-border/40"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mx-auto flex items-center justify-between max-w-6xl">
        <a href="/" className="flex items-center gap-2.5 sm:gap-3 transition-opacity duration-300 hover:opacity-80">
          <img
            src="/logo-sommelyx.png"
            alt="Sommelyx"
            className="h-8 sm:h-11 md:h-12 w-auto object-contain"
          />
          <span className="text-lg sm:text-xl md:text-2xl font-black tracking-[-0.04em] font-sans hidden sm:block text-foreground">
            Sommelyx
          </span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            className="h-9 px-4 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            onClick={onLogin}
          >
            Entrar
          </Button>
          <MagneticButton>
            <Button
              className="px-5 sm:px-7 h-9 sm:h-10 text-[12px] sm:text-[13px] font-bold rounded-full transition-all bg-foreground hover:bg-foreground/90 text-background shadow-sm"
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
