import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
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
    cta: "Começar teste grátis",
    popular: true,
  },
  {
    name: "Business",
    price: "R$ 99",
    period: "/mês",
    desc: "Para restaurantes, bares e lojas",
    features: [
      "Controle total de estoque e vendas",
      "Relatórios financeiros automáticos",
      "Análise de giro e performance",
      "Gestão operacional simplificada",
    ],
    cta: "Começar teste grátis",
    popular: false,
  },
];

interface LandingPricingProps {
  onSignup: () => void;
}

export function LandingPricing({ onSignup }: LandingPricingProps) {
  return (
    <section id="pricing" className="relative px-5 sm:px-8 pt-6 sm:pt-10 pb-14 sm:pb-20 overflow-hidden z-10">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(340_54%_36%/0.04),transparent_60%)] pointer-events-none" />

      <div className="mx-auto max-w-5xl relative z-10">
        {/* Header */}
        <motion.div
          className="mx-auto mb-7 sm:mb-10 max-w-xl text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black tracking-tight text-foreground leading-[1.1]">
            Escolha o plano ideal para sua adega
          </h2>
          <p className="mt-4 text-[14px] sm:text-[15px] text-muted-foreground font-medium max-w-md mx-auto">
            Comece sem compromisso. Cancele quando quiser.
          </p>
        </motion.div>

        {/* Mobile: carrossel (menos scroll) */}
        <div className="md:hidden -mx-5 px-5 overflow-x-auto scrollbar-hide pb-2">
          <div className="flex gap-4 snap-x snap-mandatory">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`snap-start shrink-0 w-[88%] max-w-[380px] relative rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 ${
                  plan.popular
                    ? "shadow-[0_20px_60px_hsl(340_54%_36%/0.2),0_0_0_1px_hsl(0_0%_100%/0.2)]"
                    : "shadow-[0_12px_40px_hsl(240_10%_4%/0.12),0_0_0_1px_hsl(0_0%_100%/0.1)]"
                }`}
                style={{
                  background: plan.popular
                    ? "linear-gradient(160deg, hsl(340 54% 32%) 0%, hsl(340 48% 42%) 50%, hsl(340 42% 50%) 100%)"
                    : "linear-gradient(160deg, hsl(240 10% 12%) 0%, hsl(260 12% 18%) 50%, hsl(280 14% 22%) 100%)",
                }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="p-5 flex flex-col flex-1">
                  {plan.popular && (
                    <div className="mb-3">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary-foreground/95 text-wine shadow-sm">
                        Mais escolhido
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-serif font-black tracking-tight text-primary-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-[13px] mt-1 mb-4 font-medium text-primary-foreground/55">
                    {plan.desc}
                  </p>

                  <div className="mb-4 flex items-baseline gap-1.5">
                    <span className="text-[44px] font-black font-sans tracking-[-0.04em] leading-none text-primary-foreground">
                      {plan.price}
                    </span>
                    <span className="text-[14px] font-medium text-primary-foreground/40">
                      {plan.period}
                    </span>
                  </div>

                  <div className="mb-4 w-full rounded-full py-2.5 px-4 text-center bg-emerald-600 text-white shadow-[0_14px_34px_-26px_rgba(16,185,129,0.85)] ring-1 ring-emerald-200/30">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em]">
                      14 dias grátis
                    </span>
                  </div>

                  <Button
                    className={`w-full h-11 rounded-xl text-[13px] font-bold transition-all duration-200 mb-2 active:scale-[0.98] ${
                      plan.popular
                        ? "bg-primary-foreground text-wine hover:bg-primary-foreground/90 shadow-[0_4px_20px_hsl(0_0%_0%/0.15)]"
                        : "bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/15 shadow-[0_4px_16px_hsl(0_0%_0%/0.1)]"
                    }`}
                    onClick={onSignup}
                  >
                    {plan.cta}
                  </Button>
                  <p className="text-[10px] font-medium text-center mb-5 text-primary-foreground/30">
                    Comece em segundos
                  </p>

                  <div className="h-px w-full bg-primary-foreground/10 mb-4" />

                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug font-medium text-primary-foreground/85">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0 bg-primary-foreground/10">
                          <Check className="h-3 w-3 text-primary-foreground/70" strokeWidth={3} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Desktop/tablet */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-[800px] mx-auto items-stretch">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 ${
                plan.popular
                  ? "md:scale-[1.02] md:z-10 shadow-[0_20px_60px_hsl(340_54%_36%/0.2),0_0_0_1px_hsl(0_0%_100%/0.2)]"
                  : "shadow-[0_12px_40px_hsl(240_10%_4%/0.12),0_0_0_1px_hsl(0_0%_100%/0.1)]"
              }`}
              style={{
                background: plan.popular
                  ? "linear-gradient(160deg, hsl(340 54% 32%) 0%, hsl(340 48% 42%) 50%, hsl(340 42% 50%) 100%)"
                  : "linear-gradient(160deg, hsl(240 10% 12%) 0%, hsl(260 12% 18%) 50%, hsl(280 14% 22%) 100%)",
              }}
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
              whileHover={{ y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
            >
              <div className="p-6 sm:p-8 flex flex-col flex-1">
                {/* Badge */}
                {plan.popular && (
                  <div className="mb-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary-foreground/95 text-wine shadow-sm">
                      Mais escolhido
                    </span>
                  </div>
                )}

                {/* Plan name & desc */}
                <h3 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-primary-foreground">
                  {plan.name}
                </h3>
                <p className="text-[13px] mt-1 mb-5 font-medium text-primary-foreground/55">
                  {plan.desc}
                </p>

                {/* Price */}
                <div className="mb-5 flex items-baseline gap-1.5">
                  <span className="text-[44px] sm:text-[52px] font-black font-sans tracking-[-0.04em] leading-none text-primary-foreground">
                    {plan.price}
                  </span>
                  <span className="text-[14px] font-medium text-primary-foreground/40">
                    {plan.period}
                  </span>
                </div>

                {/* Trial pill */}
                <div className="mb-5 w-full rounded-full py-2.5 px-4 text-center bg-emerald-600 text-white shadow-[0_16px_40px_-28px_rgba(16,185,129,0.85)] ring-1 ring-emerald-200/30">
                  <span className="text-[12px] font-black uppercase tracking-[0.12em]">
                    14 dias grátis
                  </span>
                </div>

                {/* CTA */}
                <Button
                  className={`w-full h-11 sm:h-12 rounded-xl text-[13px] sm:text-[14px] font-bold transition-all duration-200 mb-2 active:scale-[0.98] ${
                    plan.popular
                      ? "bg-primary-foreground text-wine hover:bg-primary-foreground/90 shadow-[0_4px_20px_hsl(0_0%_0%/0.15)]"
                      : "bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/15 shadow-[0_4px_16px_hsl(0_0%_0%/0.1)]"
                  }`}
                  onClick={onSignup}
                >
                  {plan.cta}
                </Button>
                <p className="text-[10px] font-medium text-center mb-6 text-primary-foreground/30">
                  Comece em segundos
                </p>

                {/* Divider */}
                <div className="h-px w-full bg-primary-foreground/10 mb-5" />

                {/* Benefits */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-snug font-medium text-primary-foreground/85">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0 bg-primary-foreground/10">
                        <Check className="h-3 w-3 text-primary-foreground/70" strokeWidth={3} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
