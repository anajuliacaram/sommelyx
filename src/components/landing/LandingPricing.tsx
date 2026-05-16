import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { designSystem } from "@/styles/designSystem";

const fadeUp = {
  hidden: { opacity: 0, y: 22 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.46, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const plans = [
  {
    name: "Pro",
    price: "R$ 29",
    detail: "adega pessoal",
    features: ["Adega organizada", "Janelas de consumo", "Harmonizações e leitura de rótulo"],
  },
  {
    name: "Business",
    price: "R$ 59",
    detail: "operação comercial",
    features: ["Estoque e giro", "Importação de cartas", "Movimentações e relatórios"],
  },
];

export const landingFaqs = [
  { cat: "planos", q: "Como funciona o teste grátis de 14 dias?", a: "Você acessa os recursos do plano escolhido por 14 dias e pode cancelar antes da cobrança." },
  { cat: "planos", q: "Qual a diferença entre Pro e Business?", a: "Pro é para adega pessoal. Business é para restaurantes, bares e lojas com estoque comercial." },
  { cat: "funcionalidades", q: "Consigo importar minha planilha?", a: "Sim. A Sommelyx importa CSV, Excel e PDF e permite revisar os dados antes de salvar." },
  { cat: "funcionalidades", q: "Posso cadastrar vinhos por foto do rótulo?", a: "Sim. A IA lê o rótulo e sugere os principais campos quando há confiança suficiente." },
  { cat: "privacidade", q: "Meus dados ficam privados?", a: "Sim. A conta usa isolamento por usuário e proteção de acesso." },
  { cat: "privacidade", q: "Posso exportar meus dados?", a: "Sim. Você pode exportar seus vinhos em CSV quando precisar." },
];

interface LandingPricingProps {
  onSignup: () => void;
}

export function LandingPricing({ onSignup }: LandingPricingProps) {
  return (
    <section id="pricing" className="relative z-10 px-5 pb-12 pt-4 sm:px-8 sm:pb-16">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
        >
          <span className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-wine">
            <Sparkles className="h-3.5 w-3.5" />
            Planos
          </span>
          <h2 className="mt-3 text-[26px] font-medium leading-[1.08] tracking-[-0.025em] text-[rgba(26,23,19,0.92)] sm:text-[36px]">
            Comece pequeno. Evolua quando a operação pedir.
          </h2>
        </motion.div>

        <div className="mt-8 overflow-hidden rounded-[30px]" style={designSystem.glassCard}>
          <div className="divide-y divide-black/[0.05]">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={index + 1}
                className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3
                      className="font-serif text-[25px] font-medium leading-none tracking-[-0.025em] text-[rgba(26,23,19,0.90)]"
                      style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                    >
                      {plan.name}
                    </h3>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.46)]">
                      {plan.detail}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {plan.features.map((feature) => (
                      <span key={feature} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[rgba(58,51,39,0.62)]">
                        <Check className="h-3.5 w-3.5 text-wine/70" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                  <div className="text-left sm:text-right">
                    <p className="text-[24px] font-semibold tracking-[-0.03em] text-[rgba(26,23,19,0.90)]">
                      {plan.price}
                      <span className="ml-1 text-[12px] font-medium text-[rgba(58,51,39,0.52)]">/mês</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-[rgba(58,51,39,0.48)]">14 dias grátis</p>
                  </div>
                  <Button
                    type="button"
                    variant={index === 0 ? "primary" : "outline"}
                    className="h-10 rounded-2xl px-4 text-[12px] font-semibold"
                    onClick={onSignup}
                  >
                    Começar
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          className="mx-auto mt-6 max-w-xl text-center text-[12px] leading-relaxed text-[rgba(58,51,39,0.56)]"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
        >
          Assinatura simples, cancelamento direto e suporte por e-mail quando precisar.
        </motion.p>
      </div>
    </section>
  );
}
