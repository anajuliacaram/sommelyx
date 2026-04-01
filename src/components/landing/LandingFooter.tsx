import { Button } from "@/components/ui/button";

interface LandingFooterProps {
  onLogin: () => void;
}

export function LandingFooter({ onLogin }: LandingFooterProps) {
  return (
    <footer className="py-8 sm:py-10 px-5 sm:px-8 relative z-10 border-t border-border/40">
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-6 sm:h-7 w-auto object-contain grayscale opacity-40" />
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
        <p className="text-[11px] sm:text-[12px] font-medium text-muted-foreground/60">
          © {new Date().getFullYear()} Sommelyx
        </p>
      </div>
    </footer>
  );
}
