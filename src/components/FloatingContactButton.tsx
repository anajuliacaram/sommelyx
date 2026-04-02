import { useMemo, useState } from "react";
import { Mail, MessageCircle, Copy, Check } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const CONTACT_EMAIL = "sommelyx@gmail.com";

type Props = {
  className?: string;
};

export function FloatingContactButton({ className }: Props) {
  const [copied, setCopied] = useState(false);

  const mailto = useMemo(() => {
    const subject = encodeURIComponent("Contato Sommelyx");
    const body = encodeURIComponent(
      "Oi! Quero falar com a Sommelyx.\n\nMe ajude com:\n- \n\nMeu nome:\nMeu telefone (opcional):\n",
    );
    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, []);

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
      className={cn("fixed right-4 z-50", className)}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            className="h-12 px-5 rounded-full shadow-[0_18px_50px_-28px_rgba(15,15,20,0.65)] border border-white/25 bg-white/20 backdrop-blur-xl hover:bg-white/28"
            aria-label="Fale conosco"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-[13px] font-bold tracking-tight">Fale conosco</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="top"
          sideOffset={10}
          className="w-[280px] rounded-2xl border border-black/[0.08] bg-white/85 p-3 shadow-[0_26px_70px_-48px_rgba(15,15,20,0.75)] backdrop-blur-2xl"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7B1E3A]">Contato</p>
          <p className="mt-1 text-[13px] font-semibold text-foreground">
            Responda por e-mail em poucos minutos
          </p>
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
              className="w-full h-11 rounded-xl justify-start px-4 text-[13px] font-semibold bg-white/70"
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

