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
      className={cn("fab-chat-wrap fixed z-50", className)}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 24px)", right: "20px" }}
    >
      <Popover>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-[var(--sx-b-default)] bg-[var(--sx-bg-card)] text-[var(--sx-t-sub)] shadow-[var(--sx-shadow-sm)] hover:bg-[var(--sx-bg-input)]"
              aria-label="Minimizar botão de contato"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCollapsed(true);
              }}
            >
              <X className="h-4 w-4 text-[var(--sx-t-sub)]" />
            </Button>
          )}

          <PopoverTrigger asChild>
            <Button
              className={cn(
                "fab-chat h-12 w-12 rounded-full border-0 bg-[var(--sx-bordeaux)] p-0 text-[var(--sx-t-white)] shadow-[0_4px_16px_rgba(139,26,59,0.35)] transition-all duration-150 hover:bg-[var(--sx-bordeaux)] hover:opacity-90 hover:shadow-[0_6px_22px_rgba(139,26,59,0.42)] active:scale-[0.98]",
              )}
              aria-label="Envie suas dúvidas e sugestões para a Sommelière"
            >
              <MessageCircle className="h-5 w-5 shrink-0" />
              <span className="sr-only">Envie suas dúvidas e sugestões para a Sommelière</span>
            </Button>
          </PopoverTrigger>
        </div>

        <PopoverContent
          align="end"
          side="top"
          sideOffset={10}
          className="w-[280px] rounded-[var(--sx-r-lg)] border border-[var(--sx-b-default)] bg-[var(--sx-bg-card)] p-3 shadow-[var(--sx-shadow-lg)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sx-bordeaux)]">Contato</p>
              <p className="mt-1 text-[13px] font-medium text-[var(--sx-t-body)]">
                Responda por e-mail em poucos minutos
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[var(--sx-t-sub)] hover:bg-[var(--sx-bg-input)]"
              aria-label={collapsed ? "Expandir botão de contato" : "Minimizar botão de contato"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCollapsed((v) => !v);
              }}
            >
              {collapsed ? <MessageCircle className="h-4 w-4 text-[var(--sx-bordeaux)]" /> : <X className="h-4 w-4 text-[var(--sx-bordeaux)]" />}
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
                className="h-11 w-full justify-start rounded-[var(--sx-r-md)] bg-[var(--sx-bordeaux)] px-4 text-[13px] font-medium text-[var(--sx-t-white)] hover:bg-[var(--sx-bordeaux)] hover:opacity-90"
              >
                <Mail className="h-4 w-4" />
                Enviar mensagem
              </Button>
            </a>

            <Button
              variant="outline"
              className="h-11 w-full justify-start rounded-[var(--sx-r-md)] border-[var(--sx-b-medium)] bg-[var(--sx-bg-card)] px-4 text-[13px] font-medium text-[var(--sx-t-body)] hover:bg-[var(--sx-bg-input)]"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "E-mail copiado" : "Copiar e-mail"}
              <span className="ml-auto text-[11px] font-medium text-[var(--sx-t-muted)]">{CONTACT_EMAIL}</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
