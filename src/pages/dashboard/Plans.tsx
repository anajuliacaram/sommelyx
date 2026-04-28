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

      {/* Plans grid — same style as landing */}
      <div className="grid md:grid-cols-2 gap-5 max-w-[760px] mx-auto items-stretch">
        {plans.map((plan, i) => {
          const isLight = plan.isLight;
          const txt = isLight ? "#2B2B2B" : "#F8F6F3";

          return (
            <div
              key={plan.name}
              className={`
                relative rounded-3xl overflow-hidden flex flex-col transition-all duration-300
                ${isLight
                  ? "bg-[#F8F6F3] shadow-[0_30px_92px_-62px_rgba(44,20,31,0.55)] ring-1 ring-black/[0.06]"
                  : "bg-[linear-gradient(180deg,#2B2B2B_0%,#1F1C20_55%,#171518_100%)] shadow-[0_34px_100px_-68px_rgba(15,15,20,0.80)] ring-1 ring-white/[0.08]"
                }
              `}
            >
              {/* Radial overlays */}
              {isLight ? (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.10),transparent_55%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_35%,rgba(198,167,104,0.10),transparent_55%)]" />
                </>
              ) : (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.35),transparent_60%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_18%,rgba(198,167,104,0.18),transparent_55%)]" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(198,167,104,0.65),transparent)]" />
                </>
              )}

              <div className="relative p-6 sm:p-7 flex flex-col flex-1">
                <h3
                  className="text-[22px] font-serif font-bold tracking-tight"
                  style={{ color: txt }}
                >
                  {plan.name}
                </h3>
                <p
                  className="text-[13px] mt-2 mb-5 font-medium leading-relaxed"
                  style={{ color: isLight ? "rgba(43,43,43,0.7)" : "rgba(248,246,243,0.7)" }}
                >
                  {plan.desc}
                </p>

                {/* Price */}
                <div className="mb-4 flex items-end gap-2">
                  <span
                    className="text-[42px] sm:text-[48px] font-semibold font-sans tracking-[-0.03em] leading-none"
                    style={{ color: txt }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className="pb-[5px] text-[13px] font-medium"
                    style={{ color: isLight ? "rgba(43,43,43,0.55)" : "rgba(248,246,243,0.55)" }}
                  >
                    {plan.period}
                  </span>
                </div>

                {/* Trial pill */}
                <div className="mb-5 flex items-center gap-2.5">
                  <span
                    className={isLight
                      ? "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6E1E2A] ring-1 ring-[#6E1E2A]/15 bg-[linear-gradient(135deg,rgba(110,30,42,0.07),rgba(198,167,104,0.14))] shadow-[0_16px_40px_-26px_rgba(110,30,42,0.30)]"
                      : "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#F8F6F3] ring-1 ring-[#C6A768]/30 bg-[linear-gradient(135deg,rgba(198,167,104,0.18),rgba(110,30,42,0.15))] shadow-[0_16px_44px_-28px_rgba(198,167,104,0.40)]"}
                  >
                    <Check className={isLight ? "h-3.5 w-3.5 text-[#6E1E2A]/80" : "h-3.5 w-3.5 text-[#C6A768]"} strokeWidth={2.5} />
                    14 dias grátis
                  </span>
                </div>

                {/* CTA */}
                <Button
                  variant="primary"
                  className="w-full h-11 rounded-2xl px-6 text-[13px] font-semibold tracking-tight shadow-[0_18px_54px_-30px_rgba(110,30,42,0.55)] hover:-translate-y-0.5"
                  onClick={() => navigate("/signup")}
                >
                  {plan.cta}
                </Button>

                {/* Divider */}
                <div
                  className="mt-5 mb-4 h-px w-full"
                  style={{ background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)" }}
                />

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map(f => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[13px] leading-relaxed font-medium"
                      style={{ color: isLight ? "rgba(43,43,43,0.8)" : "rgba(248,246,243,0.8)" }}
                    >
                      <div
                        className={isLight
                          ? "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-[2px] bg-[#6E1E2A]/8 ring-1 ring-[#6E1E2A]/12"
                          : "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-[2px] bg-white/10 ring-1 ring-white/10"}
                      >
                        <Check
                          className={isLight ? "h-3 w-3 text-[#6E1E2A]/70" : "h-3 w-3 text-[#C6A768]/80"}
                          strokeWidth={2.5}
                        />
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
