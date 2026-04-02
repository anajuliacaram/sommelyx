import { motion } from "framer-motion";
import { Check } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

const faqs = [
  {
    q: "Como funciona o teste grátis de 14 dias?",
    a: "Você ativa o plano e usa todos os recursos por 14 dias. Dá para cancelar quando quiser.",
  },
  {
    q: "Qual a diferença entre Pro e Business?",
    a: "O Pro é para adega pessoal (coleção, consumo, alertas e organização). O Business é para operação comercial, com foco em estoque, vendas e acompanhamento da operação.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Sim. Você pode mudar de plano a qualquer momento, mantendo seus dados.",
  },
  {
    q: "Consigo importar minha planilha?",
    a: "Sim. Você pode importar CSV e Excel (XLS/XLSX) e também PDF. A IA mapeia as colunas e você confirma antes de salvar.",
  },
  {
    q: "A IA preenche os dados automaticamente?",
    a: "Sim. Em importações e na wishlist, a IA tenta identificar rótulo, produtor, safra, país, região e outros detalhes para acelerar seu cadastro.",
  },
  {
    q: "Posso cadastrar vinhos por foto do rótulo?",
    a: "Sim. Você pode enviar uma foto nítida do rótulo e a IA extrai as informações para preencher o cadastro.",
  },
  {
    q: "Meus dados ficam privados?",
    a: "Sim. Sua conta é isolada e seus dados ficam disponíveis apenas para você e sua operação.",
  },
  {
    q: "Consigo acompanhar reposição e alertas?",
    a: "Sim. O sistema destaca itens críticos e ajuda a priorizar reposição para evitar ruptura.",
  },
  {
    q: "Posso registrar entradas e saídas?",
    a: "Sim. Você registra movimentações e mantém o histórico organizado para consultar depois.",
  },
  {
    q: "Tem suporte se eu tiver dúvida?",
    a: "Sim. Use o botão “Fale conosco” no canto da tela para enviar uma mensagem por e-mail.",
  },
  {
    q: "Funciona bem no celular?",
    a: "Sim. O layout é responsivo e pensado para operação rápida, inclusive no mobile.",
  },
] as const;

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
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/90 text-[#7B1E3A] shadow-sm ring-1 ring-white/25">
                        Mais escolhido
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-serif font-black tracking-tight text-primary-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-[13px] mt-1 mb-4 font-medium text-primary-foreground/72">
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
                    variant="outline"
                    className="w-full h-11 rounded-xl text-[13px] font-bold mb-2 active:scale-[0.98] bg-white text-[#7B1E3A] border-white/25 shadow-[0_10px_30px_rgba(0,0,0,0.14)] hover:bg-white/95 hover:border-white/35 hover:-translate-y-0.5"
                    onClick={onSignup}
                  >
                    {plan.cta}
                  </Button>
                  <p className="text-[10px] font-medium text-center mb-5 text-primary-foreground/55">
                    Comece em segundos
                  </p>

                  <div className="h-px w-full bg-primary-foreground/10 mb-4" />

                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug font-medium text-primary-foreground/88">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0 bg-white/12 ring-1 ring-white/10">
                          <Check className="h-3 w-3 text-white/80" strokeWidth={3} />
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
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/90 text-[#7B1E3A] shadow-sm ring-1 ring-white/25">
                      Mais escolhido
                    </span>
                  </div>
                )}

                {/* Plan name & desc */}
                <h3 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-primary-foreground">
                  {plan.name}
                </h3>
                <p className="text-[13px] mt-1 mb-5 font-medium text-primary-foreground/72">
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
                  variant="outline"
                  className="w-full h-11 sm:h-12 rounded-xl text-[13px] sm:text-[14px] font-bold mb-2 active:scale-[0.98] bg-white text-[#7B1E3A] border-white/25 shadow-[0_12px_34px_rgba(0,0,0,0.16)] hover:bg-white/95 hover:border-white/35 hover:-translate-y-0.5"
                  onClick={onSignup}
                >
                  {plan.cta}
                </Button>
                <p className="text-[10px] font-medium text-center mb-6 text-primary-foreground/55">
                  Comece em segundos
                </p>

                {/* Divider */}
                <div className="h-px w-full bg-primary-foreground/10 mb-5" />

                {/* Benefits */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-snug font-medium text-primary-foreground/88">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0 bg-white/12 ring-1 ring-white/10">
                        <Check className="h-3 w-3 text-white/80" strokeWidth={3} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <motion.div
          className="mx-auto mt-10 sm:mt-12 max-w-3xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={fadeUp}
          custom={4}
        >
          <div className="text-center">
            <h3 className="font-serif text-[22px] sm:text-[26px] font-black tracking-tight text-foreground">
              Perguntas frequentes
            </h3>
            <p className="mt-2 text-[14px] sm:text-[15px] font-medium text-muted-foreground">
              Respostas rápidas para decidir com confiança.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-black/[0.06] bg-white/60 shadow-[0_26px_70px_-58px_rgba(15,15,20,0.65)] ring-1 ring-white/60 backdrop-blur-2xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, idx) => (
                <AccordionItem
                  key={item.q}
                  value={`faq-${idx}`}
                  className="border-black/[0.06]"
                >
                  <AccordionTrigger
                    className="px-5 text-left text-[14px] sm:text-[15px] font-semibold tracking-tight text-foreground hover:no-underline data-[state=open]:text-[#7B1E3A]"
                  >
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-0 text-[13px] sm:text-[14px] leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
