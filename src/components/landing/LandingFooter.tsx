import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { BrandName } from "@/components/BrandName";
import { Instagram, Linkedin } from "lucide-react";

interface LandingFooterProps {
  onLogin: () => void;
}

export function LandingFooter({ onLogin }: LandingFooterProps) {
  return (
    <footer
      className="surface-clarity py-4 sm:py-5 px-5 sm:px-8 relative z-10 rounded-t-[28px] mt-6 sm:mt-8"
      style={{
        borderTop: "1px solid rgba(0,0,0,0.06)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(248,244,237,0.96) 100%)",
        backdropFilter: "blur(8px) saturate(1.02)",
        WebkitBackdropFilter: "blur(8px) saturate(1.02)",
      }}
    >
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-2 sm:gap-3 md:flex-row md:justify-between">
        <div className="flex items-center gap-3 min-w-[220px] sm:min-w-[250px]">
          <Logo variant="compact" className="h-12 sm:h-14 w-auto shrink-0 opacity-100 drop-shadow-[0_2px_8px_rgba(15,15,20,0.12)]" />
          <div className="flex flex-col leading-none min-w-0">
            <BrandName className="text-[20px] sm:text-[24px]" />
            <span className="mt-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F5F5F] whitespace-nowrap">
              Gestão inteligente de adegas
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5 sm:gap-7 text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-[#5F5F5F]">
          <a href="#features" className="hover:text-[#1A1A1A] transition-colors">Funcionalidades</a>
          <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors">Planos</a>
          <Button
            type="button"
            variant="ghost"
            onClick={onLogin}
            className="h-auto p-0 bg-transparent hover:bg-transparent hover:text-[#1A1A1A] text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest"
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
            className="flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 hover:-translate-y-[1px]"
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
        </div>
        <p className="text-[11px] sm:text-[12px] font-medium text-[#5F5F5F]">
          © {new Date().getFullYear()} Sommelyx
        </p>
      </div>
    </footer>
  );
}
