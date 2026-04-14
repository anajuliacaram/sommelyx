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
  },
];

const faqs = [
  { q: "Como funciona o teste grátis de 14 dias?", a: "Você ativa o plano e usa todos os recursos por 14 dias. Dá para cancelar quando quiser." },
  { q: "Qual a diferença entre Pro e Business?", a: "O Pro é para adega pessoal (coleção, consumo, alertas e organização). O Business é para operação comercial, com foco em estoque, vendas e acompanhamento da operação." },
  { q: "Posso trocar de plano depois?", a: "Sim. Você pode mudar de plano a qualquer momento, mantendo seus dados." },
  { q: "Consigo importar minha planilha?", a: "Sim. Você pode importar CSV, Excel e PDF. O Sommelyx mapeia as colunas automaticamente e você confirma antes de salvar." },
  { q: "Os dados são preenchidos automaticamente?", a: "Sim. Em importações e na wishlist, nossa inteligência identifica rótulo, produtor, safra, país, região e outros detalhes para acelerar seu cadastro." },
  { q: "Posso cadastrar vinhos por foto do rótulo?", a: "Sim. Envie uma foto nítida do rótulo e o Sommelyx extrai as informações para preencher o cadastro." },
  { q: "Meus dados ficam privados?", a: "Sim. Sua conta é isolada e seus dados ficam disponíveis apenas para você e sua operação." },
  { q: "Consigo acompanhar reposição e alertas?", a: "Sim. O sistema destaca itens críticos e ajuda a priorizar reposição para evitar ruptura." },
  { q: "Posso registrar entradas e saídas?", a: "Sim. Você registra movimentações e mantém o histórico organizado para consultar depois." },
  { q: "Tem suporte se eu tiver dúvida?", a: "Sim. Use o botão \"Falar com um Sommelier\" no canto da tela para enviar uma mensagem por e-mail." },
  { q: "Funciona bem no celular?", a: "Sim. O layout é responsivo e pensado para operação rápida, inclusive no mobile." },
] as const;

const glassCard = {
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(12px) saturate(1.12)",
  WebkitBackdropFilter: "blur(12px) saturate(1.12)",
  border: "1px solid rgba(255,255,255,0.58)",
  boxShadow:
    "0 14px 42px -14px rgba(30,20,20,0.14), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.76)",
} as const;

interface LandingPricingProps {
  onSignup: () => void;
}

function PlanCard({ plan, i, isLight, onSignup, mobile = false }: { plan: typeof plans[0]; i: number; isLight: boolean; onSignup: () => void; mobile?: boolean }) {
  const txt = isLight ? "#2B2B2B" : "#F8F6F3";

  return (
    <motion.div
      key={plan.name}
      className={`
        ${mobile ? "snap-start shrink-0 w-[88%] max-w-[380px]" : ""}
        relative rounded-3xl overflow-hidden flex flex-col h-full transition-all duration-300
      `}
      style={
          isLight
          ? {
              ...glassCard,
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 18px 56px -18px rgba(30,20,20,0.14), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.84)",
            }
          : {
              background: "linear-gradient(180deg, rgba(55,30,36,0.96) 0%, rgba(41,22,28,0.98) 52%, rgba(28,15,20,1) 100%)",
              border: "1px solid rgba(198,167,104,0.16)",
              boxShadow: "0 20px 60px -20px rgba(15,15,20,0.52), inset 0 1px 0 rgba(255,255,255,0.08)",
            }
      }
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      custom={i + 1}
      {...(!mobile && { whileHover: { y: -4, transition: { duration: 0.3, ease: "easeOut" } } })}
    >
      {isLight ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.08),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_35%,rgba(198,167,104,0.08),transparent_55%)]" />
          {/* Top highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)" }} />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.35),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_18%,rgba(198,167,104,0.18),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(198,167,104,0.65),transparent)]" />
        </>
      )}

      <div className={`relative ${mobile ? "p-5" : "p-6 sm:p-8"} flex flex-col flex-1`}>
        <h3 className={`${mobile ? "text-[22px]" : "text-[24px]"} font-serif font-bold tracking-tight`} style={{ color: txt }}>
          {plan.name}
        </h3>
        <p className={`${mobile ? "text-[13px] mt-2 mb-4" : "text-[14px] mt-2 mb-6"} font-medium leading-relaxed`} style={{ color: isLight ? "rgba(43,43,43,0.7)" : "rgba(248,246,243,0.7)" }}>
          {plan.desc}
        </p>

        <div className="mb-4 flex items-end gap-2">
          <span className={`${mobile ? "text-[40px]" : "text-[46px] sm:text-[52px]"} font-semibold font-sans tracking-[-0.03em] leading-none`} style={{ color: txt }}>
            {plan.price}
          </span>
          <span className={`${mobile ? "pb-[3px] text-[13px]" : "pb-[6px] text-[14px]"} font-medium`} style={{ color: isLight ? "rgba(43,43,43,0.55)" : "rgba(248,246,243,0.55)" }}>
            {plan.period}
          </span>
        </div>

        <div className={`${mobile ? "mb-5" : "mb-7"} flex items-center gap-2.5`}>
          <span
            className="chip-surface px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em]"
            style={
              isLight
                ? {
                    color: "#6E1E2A",
                    background: "rgba(110,30,42,0.08)",
                    border: "1px solid rgba(110,30,42,0.14)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.62)",
                  }
                : {
                    color: "#F8F6F3",
                    background: "linear-gradient(135deg, rgba(198,167,104,0.22), rgba(110,30,42,0.18))",
                    border: "1px solid rgba(198,167,104,0.34)",
                    boxShadow: "0 10px 28px -8px rgba(198,167,104,0.24)",
                  }
            }
          >
            <Check className={isLight ? "h-4 w-4 text-[#6E1E2A]/80" : "h-4 w-4 text-[#C6A768]"} strokeWidth={2.5} />
            14 dias grátis
          </span>
        </div>

        <Button
          variant="primary"
          className={`w-full ${mobile ? "h-11" : "h-11 sm:h-12"} rounded-2xl px-6 text-[13px] sm:text-[14px] font-semibold tracking-tight hover:-translate-y-0.5`}
          style={{
            boxShadow: "0 12px 32px -10px rgba(110,30,42,0.48), inset 0 1px 0 rgba(255,255,255,0.18)",
          }}
          onClick={onSignup}
        >
          {plan.cta}
        </Button>

        <div className={`${mobile ? "mt-5 mb-4" : "mt-6 mb-5"} h-px w-full`} style={{ background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)" }} />

        <ul className="space-y-3 flex-1">
          {plan.features.map(f => (
            <li
              key={f}
              className={`flex items-start gap-2.5 ${mobile ? "text-[13px]" : "text-[13px] sm:text-[14px]"} leading-relaxed font-medium`}
              style={{ color: isLight ? "rgba(43,43,43,0.8)" : "rgba(248,246,243,0.8)" }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-[2px]"
                style={
                  isLight
                    ? { background: "rgba(110,30,42,0.08)", border: "1px solid rgba(110,30,42,0.12)" }
                    : { background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.14)" }
                }
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
    </motion.div>
  );
}

export function LandingPricing({ onSignup }: LandingPricingProps) {
  return (
    <section id="pricing" className="relative px-5 sm:px-8 pt-6 pb-14 overflow-hidden z-10 sm:pt-0 sm:pb-0">
      <div className="mx-auto max-w-5xl relative z-10">
        <motion.div
          className="section-surface section-surface--full mx-auto sm:mb-8 max-w-[800px] sm:px-6 sm:py-5 items-center text-center ml-[70px] mt-0 mb-[20px] py-[5px] px-[5px] pl-[5px] pr-[5px] pt-[5px]"
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
        >
          <h2 className="section-surface__title sm:text-[2rem] md:text-[2.25rem] max-w-[640px] text-3xl font-bold">
            Escolha o plano ideal para sua adega
          </h2>
          <p className="section-surface__subtitle mt-2.5 sm:text-[14px] max-w-xl mx-auto leading-relaxed font-semibold text-sm">
            Comece sem compromisso. Cancele quando quiser.
          </p>
        </motion.div>

        {/* Mobile */}
        <div className="md:hidden -mx-5 px-5 overflow-x-auto scrollbar-hide pb-2">
          <div className="flex gap-4 snap-x snap-mandatory">
            {plans.map((plan, i) => (
              <PlanCard key={plan.name} plan={plan} i={i} isLight={i === 0} onSignup={onSignup} mobile />
            ))}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:grid grid-cols-2 gap-5 sm:gap-6 max-w-[800px] mx-auto items-stretch">
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} i={i} isLight={i === 0} onSignup={onSignup} />
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
          <div className="section-surface mx-auto text-center items-center">
            <h3 className="section-surface__title font-serif text-[24px] sm:text-[30px]">
              Perguntas frequentes
            </h3>
            <p className="section-surface__subtitle mt-2 font-sans text-[13px] sm:text-[14px]">
              Respostas rápidas para decidir com confiança.
            </p>
          </div>

          <div className="mt-6">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((item, idx) => (
                <AccordionItem
                  key={item.q}
                  value={`faq-${idx}`}
                  className="group relative overflow-hidden rounded-[18px] transition-all duration-300 ease-premium hover:-translate-y-0.5 data-[state=open]:before:opacity-100 before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[3px] before:rounded-r-full before:bg-[#6E1E2A] before:opacity-0"
                  style={{
                    ...glassCard,
                    background: "rgba(255,255,255,0.10)",
                    backdropFilter: "blur(10px) saturate(1.15)",
                    WebkitBackdropFilter: "blur(10px) saturate(1.15)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    boxShadow: "0 12px 30px -14px rgba(20,14,16,0.18), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.40)",
                  }}
                >
                  <AccordionTrigger
                    className="px-5 py-4 text-left font-serif text-[15px] sm:text-[16px] font-semibold tracking-[-0.01em] leading-snug hover:no-underline [&>svg]:text-[#F4F1EC]/75 [&[data-state=open]>svg]:text-[#F4F1EC] data-[state=open]:text-[#F4F1EC]"
                    style={{ color: "#F4F1EC" }}
                  >
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-0 font-sans text-[13px] sm:text-[14px] font-normal tracking-[-0.005em] leading-relaxed" style={{ color: "rgba(244,241,236,0.82)" }}>
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
