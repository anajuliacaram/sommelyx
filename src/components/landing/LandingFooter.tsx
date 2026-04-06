import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Instagram, Linkedin } from "lucide-react";

interface LandingFooterProps {
  onLogin: () => void;
}

export function LandingFooter({ onLogin }: LandingFooterProps) {
  return (
    <footer className="py-8 sm:py-10 px-5 sm:px-8 relative z-10 border-t border-border/40">
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-2.5">
          <Logo variant="compact" className="h-6 sm:h-7 w-auto grayscale opacity-40" />
          <span className="font-bold text-[13px] font-sans tracking-tight text-muted-foreground">Sommelyx</span>
        </div>
        <div className="flex items-center gap-5 sm:gap-7 text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Planos</a>
          <Button
            type="button"
            variant="ghost"
            onClick={onLogin}
            className="h-auto p-0 bg-transparent hover:bg-transparent text-muted-foreground hover:text-foreground text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest"
          >
            Acesso
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://instagram.com/sommelyx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-8 w-8 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            aria-label="Instagram"
          >
            <Instagram size={16} />
          </a>
          <a
            href="https://www.linkedin.com/company/sommelyx/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-8 w-8 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin size={16} />
          </a>
        </div>
        <p className="text-[11px] sm:text-[12px] font-medium text-muted-foreground/60">
          © {new Date().getFullYear()} Sommelyx
        </p>
      </div>
    </footer>
  );
}
