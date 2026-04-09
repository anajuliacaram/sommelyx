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
    a: "Sim. Você pode importar CSV, Excel e PDF. O Sommelyx mapeia as colunas automaticamente e você confirma antes de salvar.",
  },
  {
    q: "Os dados são preenchidos automaticamente?",
    a: "Sim. Em importações e na wishlist, nossa inteligência identifica rótulo, produtor, safra, país, região e outros detalhes para acelerar seu cadastro.",
  },
  {
    q: "Posso cadastrar vinhos por foto do rótulo?",
    a: "Sim. Envie uma foto nítida do rótulo e o Sommelyx extrai as informações para preencher o cadastro.",
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
    a: "Sim. Use o botão \"Falar com um Sommelier\" no canto da tela para enviar uma mensagem por e-mail.",
  },
  {
    q: "Funciona bem no celular?",
    a: "Sim. O layout é responsivo e pensado para operação rápida, inclusive no mobile.",
  },
] as const;

interface LandingPricingProps {
  onSignup: () => void;
}

function PlanCard({ plan, i, isLight, onSignup, mobile = false }: { plan: typeof plans[0]; i: number; isLight: boolean; onSignup: () => void; mobile?: boolean }) {
  const txt = isLight ? "#2B2B2B" : "#F8F6F3";
  const txtMuted = isLight ? `${txt}/70` : `${txt}/70`;

  return (
    <motion.div
      key={plan.name}
      className={`
        ${mobile ? "snap-start shrink-0 w-[88%] max-w-[380px]" : ""}
        relative rounded-3xl overflow-hidden flex flex-col h-full transition-all duration-300
        ${isLight
          ? "bg-[#F8F6F3] shadow-[0_30px_92px_-62px_rgba(44,20,31,0.55)] ring-1 ring-black/[0.06]"
          : "bg-[linear-gradient(180deg,#2B2B2B_0%,#1F1C20_55%,#171518_100%)] shadow-[0_34px_100px_-68px_rgba(15,15,20,0.80)] ring-1 ring-white/[0.08]"
        }
      `}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      custom={i + 1}
      {...(!mobile && { whileHover: { y: -4, transition: { duration: 0.3, ease: "easeOut" } } })}
    >
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
            className={isLight
              ? "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-[#6E1E2A] ring-1 ring-[#6E1E2A]/15 bg-[linear-gradient(135deg,rgba(110,30,42,0.07),rgba(198,167,104,0.14))] shadow-[0_16px_40px_-26px_rgba(110,30,42,0.30)]"
              : "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-[#F8F6F3] ring-1 ring-[#C6A768]/30 bg-[linear-gradient(135deg,rgba(198,167,104,0.18),rgba(110,30,42,0.15))] shadow-[0_16px_44px_-28px_rgba(198,167,104,0.40)]"}
          >
            <Check className={isLight ? "h-4 w-4 text-[#6E1E2A]/80" : "h-4 w-4 text-[#C6A768]"} strokeWidth={2.5} />
            14 dias grátis
          </span>
        </div>

        <Button
          variant="primary"
          className={`w-full ${mobile ? "h-11" : "h-11 sm:h-12"} rounded-2xl px-6 text-[13px] sm:text-[14px] font-semibold tracking-tight shadow-[0_18px_54px_-30px_rgba(110,30,42,0.55)] hover:-translate-y-0.5`}
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
    </motion.div>
  );
}

export function LandingPricing({ onSignup }: LandingPricingProps) {
  return (
    <section id="pricing" className="relative px-5 sm:px-8 pt-6 sm:pt-10 pb-14 sm:pb-20 overflow-hidden z-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(340_54%_36%/0.04),transparent_60%)] pointer-events-none" />

      <div className="mx-auto max-w-5xl relative z-10">
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

        {/* Mobile */}
        <div className="md:hidden -mx-5 px-5 overflow-x-auto scrollbar-hide pb-2">
          <div className="flex gap-4 snap-x snap-mandatory">
            {plans.map((plan, i) => (
              <PlanCard key={plan.name} plan={plan} i={i} isLight={i === 0} onSignup={onSignup} mobile />
            ))}
          </div>
        </div>

        {/* Desktop/tablet */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-[800px] mx-auto items-stretch">
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
          <div className="text-center">
            <h3 className="font-serif text-[24px] sm:text-[30px] font-black tracking-tight text-foreground">
              Perguntas frequentes
            </h3>
            <p className="mt-2 font-sans text-[13px] sm:text-[14px] font-medium text-muted-foreground">
              Respostas rápidas para decidir com confiança.
            </p>
          </div>

          <div className="mt-6">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((item, idx) => (
	                <AccordionItem
	                  key={item.q}
	                  value={`faq-${idx}`}
	                  className="group relative overflow-hidden rounded-[18px] border border-[#6E1E2A]/[0.08] bg-[linear-gradient(135deg,rgba(110,30,42,0.025),rgba(198,167,104,0.02))] shadow-[0_22px_70px_-58px_rgba(15,15,20,0.45)] ring-1 ring-white/50 backdrop-blur-2xl transition-all duration-300 ease-premium hover:border-[#6E1E2A]/[0.14] hover:bg-[linear-gradient(135deg,rgba(110,30,42,0.05),rgba(198,167,104,0.035))] hover:-translate-y-0.5 hover:shadow-[0_26px_80px_-60px_rgba(44,20,31,0.50)] data-[state=open]:border-[#6E1E2A]/[0.18] data-[state=open]:bg-[linear-gradient(135deg,rgba(110,30,42,0.065),rgba(198,167,104,0.04))] data-[state=open]:shadow-[0_28px_90px_-66px_rgba(44,20,31,0.60)] before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[3px] before:rounded-r-full before:bg-[#6E1E2A] before:opacity-0 data-[state=open]:before:opacity-100"
	                >
	                  <AccordionTrigger
	                    className="px-5 py-4 text-left font-serif text-[15px] sm:text-[16px] font-semibold tracking-[-0.01em] leading-snug text-foreground/90 hover:no-underline [&>svg]:text-foreground/35 [&[data-state=open]>svg]:text-wine data-[state=open]:text-wine"
	                  >
	                    {item.q}
	                  </AccordionTrigger>
	                  <AccordionContent className="px-5 pb-5 pt-0 font-sans text-[13px] sm:text-[14px] font-normal tracking-[-0.005em] leading-relaxed text-muted-foreground">
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
