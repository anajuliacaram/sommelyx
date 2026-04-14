import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Instagram, Linkedin } from "lucide-react";

interface LandingFooterProps {
  onLogin: () => void;
}

export function LandingFooter({ onLogin }: LandingFooterProps) {
  return (
    <footer
      className="surface-clarity py-8 sm:py-10 px-5 sm:px-8 relative z-10 rounded-t-[28px] mt-6 sm:mt-8"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.28)",
        background: "linear-gradient(180deg, rgba(250,247,242,0.72) 0%, rgba(248,244,237,0.84) 100%)",
        backdropFilter: "blur(14px) saturate(1.02)",
        WebkitBackdropFilter: "blur(14px) saturate(1.02)",
      }}
    >
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-4 rounded-3xl px-5 py-4 bg-white/60 border border-white/60 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.16)] min-w-[250px] sm:min-w-[280px]">
          <Logo variant="compact" className="h-8 sm:h-10 w-auto grayscale-0 shrink-0 opacity-100 font-semibold text-xl" />
          <div className="flex flex-col leading-none min-w-0">
            <span className="font-bold text-[14px] sm:text-[15px] font-sans tracking-tight text-foreground">Sommelyx</span>
            <span className="mt-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/55 whitespace-nowrap">
              Gestão inteligente de adegas
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5 sm:gap-7 text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-foreground/72">
          <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Planos</a>
          <Button
            type="button"
            variant="ghost"
            onClick={onLogin}
            className="h-auto p-0 bg-transparent hover:bg-transparent hover:text-foreground text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest"
          >
            Acesso
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://instagram.com/sommelyx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 hover:-translate-y-[1px]"
            style={{
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(255,255,255,0.5)",
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
            className="flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 hover:-translate-y-[1px]"
            style={{
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(255,255,255,0.5)",
              color: "hsl(var(--wine))",
              boxShadow: "0 8px 18px -14px rgba(0,0,0,0.18)",
            }}
            aria-label="LinkedIn"
          >
            <Linkedin size={16} />
          </a>
        </div>
        <p className="text-[11px] sm:text-[12px] font-medium text-foreground/50">
          © {new Date().getFullYear()} Sommelyx
        </p>
      </div>
    </footer>
  );
}
