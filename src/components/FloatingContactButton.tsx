import { useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle, Copy, Check, X } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const CONTACT_EMAIL = "sommelyx@gmail.com";
const COLLAPSE_KEY = "sommelyx_contact_collapsed";

type Props = {
  className?: string;
};

export function FloatingContactButton({ className }: Props) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const mailto = useMemo(() => {
    const subject = encodeURIComponent("Contato Sommelyx");
    const body = encodeURIComponent(
      "Oi! Quero falar com a Sommelyx.\n\nMe ajude com:\n- \n\nMeu nome:\nMeu telefone (opcional):\n",
    );
    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // no-op (clipboard blocked)
    }
  };

  return (
    <div
      className={cn("fixed z-50", className)}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)", right: "16px" }}
    >
      <Popover>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full border border-white/18 bg-white/55 backdrop-blur-md shadow-sm hover:bg-white/65"
              aria-label="Minimizar botão de contato"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCollapsed(true);
              }}
            >
              <X className="h-4 w-4 text-primary" />
            </Button>
          )}

          <PopoverTrigger asChild>
            <Button
              className={cn(
                "rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
                collapsed ? "h-12 w-12 px-0" : "h-auto min-h-12 px-4 py-2",
              )}
              aria-label="Envie suas dúvidas e sugestões para a Sommelière"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="text-[11px] leading-[1.3] font-black tracking-tight text-left">
                  Envie suas dúvidas e<br />sugestões para a Sommelière
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </div>

        <PopoverContent
          align="end"
          side="top"
          sideOffset={10}
          className="w-[280px] rounded-2xl border border-white/16 bg-white/65 p-3 shadow-[0_26px_70px_-48px_rgba(15,15,20,0.75)] backdrop-blur-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7B1E3A]">Contato</p>
              <p className="mt-1 text-[13px] font-semibold text-foreground">
                Responda por e-mail em poucos minutos
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-black/[0.04]"
              aria-label={collapsed ? "Expandir botão de contato" : "Minimizar botão de contato"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCollapsed((v) => !v);
              }}
            >
              {collapsed ? <MessageCircle className="h-4 w-4 text-[#7B1E3A]" /> : <X className="h-4 w-4 text-[#7B1E3A]" />}
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            <a
              href={mailto}
              className="block"
              aria-label={`Enviar e-mail para ${CONTACT_EMAIL}`}
            >
              <Button
                variant="primary"
                className="w-full h-11 rounded-xl justify-start px-4 text-[13px] font-bold"
              >
                <Mail className="h-4 w-4" />
                Enviar mensagem
              </Button>
            </a>

            <Button
              variant="outline"
              className="w-full h-11 rounded-xl justify-start px-4 text-[13px] font-semibold bg-white/50 backdrop-blur-sm"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "E-mail copiado" : "Copiar e-mail"}
              <span className="ml-auto text-[11px] font-medium text-muted-foreground">{CONTACT_EMAIL}</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
