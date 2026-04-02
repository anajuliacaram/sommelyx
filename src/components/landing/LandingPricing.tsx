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
    cta: "Começar grátis",
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
    cta: "Começar grátis",
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
    a: "Sim. Use o botão “Falar com um Sommelier” no canto da tela para enviar uma mensagem por e-mail.",
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
                className={`
                  snap-start shrink-0 w-[88%] max-w-[380px] relative rounded-[22px] overflow-hidden flex flex-col h-full
                  transition-all duration-300
                  ${plan.popular
                    ? "bg-[#F8F6F3] shadow-[0_26px_80px_-56px_rgba(44,20,31,0.55)] ring-1 ring-black/[0.06]"
                    : "bg-[linear-gradient(180deg,#2B2B2B_0%,#1F1C20_55%,#171518_100%)] shadow-[0_28px_90px_-60px_rgba(15,15,20,0.75)] ring-1 ring-white/[0.08]"
                  }
                `}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                custom={i + 1}
              >
                {/* subtle accents */}
                {plan.popular ? (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.10),transparent_55%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_30%,rgba(198,167,104,0.10),transparent_55%)]" />
                  </>
                ) : (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.35),transparent_60%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(198,167,104,0.18),transparent_55%)]" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(198,167,104,0.65),transparent)]" />
                  </>
                )}

                <div className="relative p-5 flex flex-col flex-1">
                  <h3 className={plan.popular
                    ? "text-[22px] font-serif font-bold tracking-tight text-[#2B2B2B]"
                    : "text-[22px] font-serif font-bold tracking-tight text-[#F8F6F3]"}
                  >
                    {plan.name}
                  </h3>
                  <p className={plan.popular
                    ? "text-[13px] mt-2 mb-4 font-medium leading-relaxed text-[#2B2B2B]/70"
                    : "text-[13px] mt-2 mb-4 font-medium leading-relaxed text-[#F8F6F3]/70"}
                  >
                    {plan.desc}
                  </p>

                  <div className="mb-4 flex items-end gap-2">
                    <span className={plan.popular
                      ? "text-[40px] font-semibold font-sans tracking-[-0.03em] leading-none text-[#2B2B2B]"
                      : "text-[40px] font-semibold font-sans tracking-[-0.03em] leading-none text-[#F8F6F3]"}
                    >
                      {plan.price}
                    </span>
                    <span className={plan.popular
                      ? "pb-[3px] text-[13px] font-medium text-[#2B2B2B]/55"
                      : "pb-[3px] text-[13px] font-medium text-[#F8F6F3]/55"}
                    >
                      {plan.period}
                    </span>
                  </div>

                  <div className="mb-5 flex items-center gap-2">
                    <span
                      className={plan.popular
                        ? "inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6E1E2A] ring-1 ring-[#6E1E2A]/18 bg-[linear-gradient(90deg,rgba(110,30,42,0.06),rgba(198,167,104,0.18))] shadow-[0_14px_36px_-26px_rgba(110,30,42,0.35)]"
                        : "inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F8F6F3] ring-1 ring-[#C6A768]/25 bg-[linear-gradient(90deg,rgba(110,30,42,0.22),rgba(198,167,104,0.16))] shadow-[0_14px_40px_-28px_rgba(110,30,42,0.45)]"}
                    >
                      14 dias grátis
                    </span>
                    <span className={plan.popular ? "text-[12px] font-medium text-[#2B2B2B]/60" : "text-[12px] font-medium text-[#F8F6F3]/60"}>
                      Cancele quando quiser
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    className={plan.popular
                      ? "w-full h-11 rounded-2xl px-5 text-[13px] font-semibold tracking-tight shadow-[0_16px_44px_-26px_rgba(110,30,42,0.45)] hover:-translate-y-0.5"
                      : "w-full h-11 rounded-2xl px-5 text-[13px] font-semibold tracking-tight shadow-[0_18px_54px_-30px_rgba(110,30,42,0.55)] hover:-translate-y-0.5"}
                    onClick={onSignup}
                  >
                    {plan.cta}
                  </Button>

                  <div className={plan.popular ? "mt-5 h-px w-full bg-black/[0.06] mb-4" : "mt-5 h-px w-full bg-white/[0.08] mb-4"} />

                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className={plan.popular
                          ? "flex items-start gap-2.5 text-[13px] leading-relaxed font-medium text-[#2B2B2B]/80"
                          : "flex items-start gap-2.5 text-[13px] leading-relaxed font-medium text-[#F8F6F3]/80"}
                      >
                        <div
                          className={plan.popular
                            ? "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-[2px] bg-[#6E1E2A]/8 ring-1 ring-[#6E1E2A]/12"
                            : "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-[2px] bg-white/10 ring-1 ring-white/10"}
                        >
                          <Check
                            className={plan.popular ? "h-3 w-3 text-[#6E1E2A]/70" : "h-3 w-3 text-[#C6A768]/80"}
                            strokeWidth={2.5}
                          />
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
              className={`
                relative rounded-[24px] overflow-hidden flex flex-col h-full transition-all duration-300
                ${plan.popular
                  ? "bg-[#F8F6F3] md:scale-[1.01] md:z-10 shadow-[0_30px_92px_-62px_rgba(44,20,31,0.55)] ring-1 ring-black/[0.06]"
                  : "bg-[linear-gradient(180deg,#2B2B2B_0%,#1F1C20_55%,#171518_100%)] shadow-[0_34px_100px_-68px_rgba(15,15,20,0.80)] ring-1 ring-white/[0.08]"
                }
              `}
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
              whileHover={{ y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
            >
              {/* subtle accents */}
              {plan.popular ? (
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

              <div className="relative p-6 sm:p-8 flex flex-col flex-1">
                {/* Plan name & desc */}
                <h3 className={plan.popular
                  ? "text-[24px] font-serif font-bold tracking-tight text-[#2B2B2B]"
                  : "text-[24px] font-serif font-bold tracking-tight text-[#F8F6F3]"}
                >
                  {plan.name}
                </h3>
                <p className={plan.popular
                  ? "text-[14px] mt-2 mb-6 font-medium leading-relaxed text-[#2B2B2B]/70"
                  : "text-[14px] mt-2 mb-6 font-medium leading-relaxed text-[#F8F6F3]/70"}
                >
                  {plan.desc}
                </p>

                {/* Price */}
                <div className="mb-4 flex items-end gap-2">
                  <span className={plan.popular
                    ? "text-[46px] sm:text-[52px] font-semibold font-sans tracking-[-0.03em] leading-none text-[#2B2B2B]"
                    : "text-[46px] sm:text-[52px] font-semibold font-sans tracking-[-0.03em] leading-none text-[#F8F6F3]"}
                  >
                    {plan.price}
                  </span>
                  <span className={plan.popular
                    ? "pb-[6px] text-[14px] font-medium text-[#2B2B2B]/55"
                    : "pb-[6px] text-[14px] font-medium text-[#F8F6F3]/55"}
                  >
                    {plan.period}
                  </span>
                </div>

                <div className="mb-7 flex items-center gap-2">
                  <span
                    className={plan.popular
                      ? "inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6E1E2A] ring-1 ring-[#6E1E2A]/18 bg-[linear-gradient(90deg,rgba(110,30,42,0.06),rgba(198,167,104,0.18))] shadow-[0_16px_40px_-28px_rgba(110,30,42,0.35)]"
                      : "inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#F8F6F3] ring-1 ring-[#C6A768]/25 bg-[linear-gradient(90deg,rgba(110,30,42,0.22),rgba(198,167,104,0.16))] shadow-[0_16px_46px_-30px_rgba(110,30,42,0.48)]"}
                  >
                    14 dias grátis
                  </span>
                  <span className={plan.popular ? "text-[12px] font-medium text-[#2B2B2B]/60" : "text-[12px] font-medium text-[#F8F6F3]/60"}>
                    Cancele quando quiser
                  </span>
                </div>

                {/* CTA */}
                <Button
                  variant="primary"
                  className="w-full h-11 sm:h-12 rounded-2xl px-6 text-[13px] sm:text-[14px] font-semibold tracking-tight shadow-[0_18px_54px_-30px_rgba(110,30,42,0.55)] hover:-translate-y-0.5"
                  onClick={onSignup}
                >
                  {plan.cta}
                </Button>

                {/* Divider */}
                <div className={plan.popular ? "mt-6 h-px w-full bg-black/[0.06] mb-5" : "mt-6 h-px w-full bg-white/[0.08] mb-5"} />

                {/* Benefits */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map(f => (
                    <li
                      key={f}
                      className={plan.popular
                        ? "flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-relaxed font-medium text-[#2B2B2B]/80"
                        : "flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-relaxed font-medium text-[#F8F6F3]/80"}
                    >
                      <div
                        className={plan.popular
                          ? "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-[2px] bg-[#6E1E2A]/8 ring-1 ring-[#6E1E2A]/12"
                          : "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-[2px] bg-white/10 ring-1 ring-white/10"}
                      >
                        <Check
                          className={plan.popular ? "h-3 w-3 text-[#6E1E2A]/70" : "h-3 w-3 text-[#C6A768]/80"}
                          strokeWidth={2.5}
                        />
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
            <h3 className="font-serif text-[24px] sm:text-[30px] font-black tracking-tight text-[#2B2B2B]">
              Perguntas frequentes
            </h3>
            <p className="mt-2 text-[13px] sm:text-[14px] font-medium text-[#2B2B2B]/60">
              Respostas rápidas para decidir com confiança.
            </p>
          </div>

          <div className="mt-6">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((item, idx) => (
                <AccordionItem
                  key={item.q}
                  value={`faq-${idx}`}
                  className="group relative overflow-hidden rounded-[18px] border border-black/[0.05] bg-white/72 shadow-[0_22px_70px_-58px_rgba(15,15,20,0.55)] ring-1 ring-white/65 backdrop-blur-2xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-[0_26px_80px_-60px_rgba(15,15,20,0.60)] data-[state=open]:shadow-[0_28px_90px_-66px_rgba(44,20,31,0.60)] before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[3px] before:rounded-r-full before:bg-[#6E1E2A] before:opacity-0 data-[state=open]:before:opacity-100 after:absolute after:inset-0 after:pointer-events-none after:bg-[#6E1E2A]/[0.02] hover:after:bg-[#6E1E2A]/[0.04] data-[state=open]:after:bg-[#6E1E2A]/[0.065]"
                >
                  <AccordionTrigger
                    className="px-5 py-4 text-left text-[14px] sm:text-[15px] font-serif font-semibold tracking-tight text-[#2B2B2B] hover:no-underline [&>svg]:text-[#2B2B2B]/40 [&[data-state=open]>svg]:text-[#6E1E2A] data-[state=open]:text-[#6E1E2A]"
                  >
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-0 font-sans text-[13px] sm:text-[14px] leading-relaxed text-[#2B2B2B]/70">
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
