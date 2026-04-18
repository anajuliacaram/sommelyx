import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Logo } from "@/components/Logo";
import { Instagram, Linkedin } from "lucide-react";

interface LandingHeaderProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingHeader({ onLogin, onSignup }: LandingHeaderProps) {
  const { scrollY } = useScroll();
  const blur = useTransform(scrollY, [0, 120], [10, 16]);
  const opacity = useTransform(scrollY, [0, 120], [0.72, 0.84]);

  return (
    <motion.header
      className="fixed top-0 w-full z-50 px-3 sm:px-8"
      style={{
        backdropFilter: useTransform(blur, (v) => `blur(${v}px) saturate(1.3)`),
        WebkitBackdropFilter: useTransform(blur, (v) => `blur(${v}px) saturate(1.3)`),
        background: useTransform(
          opacity,
          (o) => `linear-gradient(to bottom, rgba(255,255,255,${Math.min(o + 0.06, 0.92)}), rgba(255,255,255,${o}))`
        ),
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mx-auto flex items-center justify-between max-w-6xl h-[60px] sm:h-[68px]">
        <a
          href="/"
          className="flex items-center gap-2.5 sm:gap-3 transition-opacity duration-200 hover:opacity-80 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          <Logo
            variant="navbar"
            className="h-10 sm:h-12 md:h-14 drop-shadow-[0_2px_8px_rgba(15,15,20,0.12)]"
          />
          <span className="font-serif text-[22px] sm:text-[26px] md:text-[32px] tracking-[-0.01em] font-extrabold" style={{ color: "#1A1A1A" }}>
            Sommelyx
          </span>
        </a>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href="https://instagram.com/sommelyx"
            target="_blank"
            rel="noopener noreferrer"
              className="hidden sm:flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 hover:-translate-y-[1px]"
              style={{
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(0,0,0,0.06)",
              color: "hsl(var(--wine))",
              boxShadow: "0 8px 18px -14px rgba(0,0,0,0.18)",
            }}
            aria-label="Instagram"
          >
            <Instagram size={16} />
          </a>
          <a
            href="https://www.linkedin.com/company/sommelyx/"
            target="_blank"
            rel="noopener noreferrer"
              className="hidden sm:flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 hover:-translate-y-[1px]"
              style={{
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(0,0,0,0.06)",
              color: "hsl(var(--wine))",
              boxShadow: "0 8px 18px -14px rgba(0,0,0,0.18)",
            }}
            aria-label="LinkedIn"
          >
            <Linkedin size={16} />
          </a>
          <Button
            size="sm"
            className="text-[13px] font-semibold px-4 h-8 rounded-xl transition-all duration-200 hover:-translate-y-0.5 bg-[#772839] text-[#dbdcdb] shadow-md hover:bg-[#772839]/90"
            onClick={onLogin}
          >
            Entrar
          </Button>
          <MagneticButton>
            <Button
              variant="primary"
              className="px-3.5 sm:px-5 h-8 sm:h-9 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.05em] rounded-xl shadow-float whitespace-nowrap active:scale-100 shadow-md opacity-100"
              onClick={onSignup}
            >
              Criar conta grátis
            </Button>
          </MagneticButton>
        </div>
      </div>
    </motion.header>
  );
}
