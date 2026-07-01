// Framer Motion removed to keep dashboard navigation stable.
import { Check, Crown, Zap } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 16 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const plans = [
  {
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    desc: "Para quem coleciona e quer controle total",
    features: [
      "Organize toda sua adega em um só lugar",
      "Saiba o momento ideal de consumo",
      "Histórico completo de degustações",
      "Insights inteligentes da sua coleção",
    ],
    cta: "Começar grátis",
    isLight: true,
  },
  {
    name: "Business",
    price: "R$ 59",
    period: "/mês",
    desc: "Para restaurantes, bares e lojas",
    features: [
      "Controle total de estoque e vendas",
      "Relatórios financeiros automáticos",
      "Análise de giro e performance",
      "Gestão operacional simplificada",
    ],
    cta: "Começar grátis",
    isLight: false,
  },
];

export default function Plans() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <h1 className="t-title">Meu plano</h1>
        <p className="t-subtitle mt-1.5">Gerencie sua assinatura e recursos disponíveis</p>
      </div>

      {/* Current plan badge */}
      <div
        className="card-depth p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-wine flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground font-sans tracking-tight">Plano atual</h3>
              <Badge variant="outline" className="text-[10px] h-5 border-border/60 text-muted-foreground">Ativo</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Escolha seu plano — todos com 14 dias grátis</p>
          </div>
        </div>
        <Button variant="secondary" className="rounded-lg h-8 text-[11px] font-medium px-4">
          <Crown className="h-3 w-3 mr-1" /> Fazer Upgrade
        </Button>
      </div>

      {/* Plans grid — the landing pricing card, indoors */}
      <div className="grid md:grid-cols-2 gap-5 max-w-[760px] mx-auto items-stretch">
        {plans.map((plan) => {
          const highlighted = !plan.isLight;

          return (
            <div
              key={plan.name}
              className="relative flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "rgba(255,252,246,0.7)",
                border: "1px solid rgba(255,255,255,0.7)",
                backdropFilter: "blur(20px) saturate(1.1)",
                WebkitBackdropFilter: "blur(20px) saturate(1.1)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(255,255,255,0.16), 0 2px 6px rgba(26,19,14,0.05), 0 24px 56px -28px rgba(26,19,14,0.3)",
              }}
            >
              {/* wine hairline no topo — assinatura da landing */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                style={{
                  background: `linear-gradient(to right, transparent, ${highlighted ? "#7a1224" : "rgba(184,148,60,0.8)"}, transparent)`,
                  opacity: 0.6,
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-[linear-gradient(180deg,rgba(255,255,255,0.36),transparent)]" />

              <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-center gap-2.5">
                  <h3
                    className="text-[26px] font-semibold tracking-tight text-[#1d150f]"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {plan.name}
                  </h3>
                  {highlighted && (
                    <span className="inline-flex items-center rounded-full border border-[rgba(122,18,36,0.18)] bg-[rgba(122,18,36,0.08)] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.09em] text-[#7a1224]">
                      Operação
                    </span>
                  )}
                </div>
                <p className="mb-5 mt-2 text-[13.5px] font-normal leading-relaxed text-[rgba(29,21,15,0.55)]">
                  {plan.desc}
                </p>

                {/* Price */}
                <div className="mb-4 flex items-end gap-2">
                  <span
                    className="text-[44px] font-semibold leading-none tracking-[-0.02em] text-[#1d150f]"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {plan.price}
                  </span>
                  <span className="pb-[5px] text-[14px] font-normal text-[rgba(29,21,15,0.4)]">
                    {plan.period}
                  </span>
                </div>

                {/* Trial pill */}
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(61,79,53,0.22)] bg-[rgba(61,79,53,0.1)] px-3.5 py-1.5 text-[11px] font-medium text-[#2e3d26]">
                    <Check className="h-3.5 w-3.5 text-[#3d4f35]" strokeWidth={2.5} />
                    14 dias grátis
                  </span>
                </div>

                {/* CTA */}
                <Button
                  variant="primary"
                  className="h-12 w-full rounded-[13px] px-6 text-[14px] font-medium tracking-tight hover:-translate-y-0.5"
                  onClick={() => navigate("/signup")}
                >
                  {plan.cta}
                </Button>

                {/* Divider */}
                <div className="mb-4 mt-5 h-px w-full bg-[rgba(29,21,15,0.08)]" />

                {/* Features */}
                <ul className="flex-1 space-y-3">
                  {plan.features.map(f => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[13px] font-normal leading-relaxed text-[rgba(29,21,15,0.6)]"
                    >
                      <div className="mt-[2px] flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border border-[rgba(61,79,53,0.24)] bg-[rgba(61,79,53,0.12)]">
                        <Check className="h-[9px] w-[9px] text-[#3d4f35]" strokeWidth={2.5} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
