import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, CreditCard, Wine, ShieldCheck } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const plans = [
  {
    name: "Pro",
    badge: "Mais popular",
    price: "R$ 29",
    period: "/mês",
    annualPrice: "R$ 280",
    annualHighlight: "Ganhe 2 meses grátis",
    annualDetail: "por 12 meses na assinatura anual",
    desc: "Para colecionadores e uso pessoal",
    features: [
      "Toda sua adega organizada",
      "Janela ideal de consumo com alertas",
      "Histórico completo de degustações",
      "Inteligência Sommelyx (harmonização e insights)",
    ],
    cta: "Começar teste grátis",
    isLight: true,
    highlighted: true,
  },
  {
    name: "Business",
    badge: null,
    price: "R$ 59",
    period: "/mês",
    annualPrice: "R$ 600",
    annualHighlight: "Ganhe 3 meses grátis",
    annualDetail: "por 12 meses na assinatura anual",
    desc: "Para restaurantes, bares e lojas",
    features: [
      "Tudo do Pro, mais:",
      "Controle de vendas e giro de estoque",
      "Relatórios financeiros automáticos",
      "Gestão operacional e log de movimentações",
    ],
    cta: "Começar teste grátis",
    isLight: false,
    highlighted: false,
  },
];

type FaqCategory = "planos" | "funcionalidades" | "privacidade";

const categories: { key: FaqCategory; label: string; icon: typeof CreditCard; accent: string; bg: string; border: string; soft: string }[] = [
  { key: "planos", label: "Planos & Cobrança", icon: CreditCard, accent: "#7B1E2B", bg: "rgba(123,30,43,0.08)", border: "rgba(123,30,43,0.18)", soft: "rgba(123,30,43,0.04)" },
  { key: "funcionalidades", label: "Funcionalidades", icon: Wine, accent: "#5F6F52", bg: "rgba(95,111,82,0.10)", border: "rgba(95,111,82,0.20)", soft: "rgba(95,111,82,0.04)" },
  { key: "privacidade", label: "Privacidade & Suporte", icon: ShieldCheck, accent: "#B8860B", bg: "rgba(198,167,104,0.12)", border: "rgba(198,167,104,0.24)", soft: "rgba(198,167,104,0.05)" },
];

const faqs: { q: string; a: string; cat: FaqCategory }[] = [
  // Planos
  { cat: "planos", q: "Como funciona o teste grátis de 14 dias?", a: "Você ativa o plano e usa todos os recursos por 14 dias. Dá para cancelar quando quiser, sem cobrança." },
  { cat: "planos", q: "Qual a diferença entre Pro e Business?", a: "O Pro é para adega pessoal (coleção, consumo, alertas e organização). O Business é para operação comercial, com foco em estoque, vendas e acompanhamento da operação." },
  { cat: "planos", q: "Posso trocar de plano depois?", a: "Não recomendamos, pois as funções entre Business e Pro são bem diferentes. Se você deseja gerir sua adega pessoal e a do seu estabelecimento, o ideal é ter uma conta para cada." },
  { cat: "planos", q: "Existe desconto na assinatura anual?", a: "Sim. No Pro você paga R$ 280 por 12 meses (ganha 2 meses grátis). No Business, R$ 600 por 12 meses (ganha 3 meses grátis)." },
  { cat: "planos", q: "Como cancelo minha assinatura?", a: "A qualquer momento, em dois cliques nas configurações da conta. Sem perguntas, sem multa." },

  // Funcionalidades
  { cat: "funcionalidades", q: "Consigo importar minha planilha?", a: "Sim. Importe CSV, Excel e PDF. Mapeamos as colunas automaticamente e você confirma antes de salvar." },
  { cat: "funcionalidades", q: "Posso cadastrar vinhos por foto do rótulo?", a: "Sim. Envie uma foto nítida do rótulo e nossa inteligência extrai produtor, safra, país, região e estilo para preencher o cadastro." },
  { cat: "funcionalidades", q: "Os dados são preenchidos automaticamente?", a: "Sim. Em importações e na wishlist, identificamos rótulo, produtor, safra, região e mais para acelerar seu cadastro." },
  { cat: "funcionalidades", q: "A inteligência harmoniza pratos com meus vinhos?", a: "Sim. Informe o prato e a Inteligência Sommelyx sugere os melhores vinhos da SUA adega, com justificativa enológica." },
  { cat: "funcionalidades", q: "Recebo alertas da janela ideal de consumo?", a: "Sim. O sistema acompanha drink_from / drink_until e avisa quando uma garrafa está no auge ou prestes a passar." },
  { cat: "funcionalidades", q: "Tem controle de vendas e giro?", a: "No plano Business: controle de vendas, giro por rótulo, relatórios financeiros automáticos e log de movimentações." },
  { cat: "funcionalidades", q: "Funciona bem no celular?", a: "Sim. Layout responsivo pensado para operação rápida — inclusive escaneamento de rótulos pela câmera do celular." },
  { cat: "funcionalidades", q: "Consigo organizar por localização física?", a: "Sim. Cadastre zonas, setores, prateleiras e posições. Encontre qualquer garrafa em segundos." },

  // Privacidade
  { cat: "privacidade", q: "Meus dados ficam privados?", a: "Sim. Sua conta é isolada com Row-Level Security. Seus dados são acessíveis apenas para você e sua operação." },
  { cat: "privacidade", q: "Onde meus dados são armazenados?", a: "Em infraestrutura segura na nuvem, com backups automáticos e criptografia em trânsito e em repouso." },
  { cat: "privacidade", q: "Posso exportar meus dados?", a: "Sim. Seus vinhos são seus. Exporte em CSV a qualquer momento, sem fricção." },
  { cat: "privacidade", q: "Como funciona o suporte?", a: "Use o botão 'Falar com um Sommelier' no canto da tela. Respondemos por e-mail com foco em resolver, não em empurrar." },
];


interface LandingPricingProps {
  onSignup: () => void;
}

function PlanCard({ plan, i, onSignup, mobile = false }: { plan: typeof plans[0]; i: number; onSignup: () => void; mobile?: boolean }) {
  const isLight = plan.isLight;
  const txt = isLight ? "#1A1A1A" : "#F8F6F3";
  const sub = isLight ? "#5F5F5F" : "rgba(248,246,243,0.72)";

  return (
    <motion.div
      key={plan.name}
      className={`
        ${mobile ? "snap-start shrink-0 w-[88%] max-w-[380px]" : ""}
        relative rounded-3xl overflow-hidden flex flex-col h-full
      `}
      style={
        isLight
          ? {
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: plan.highlighted ? "1.5px solid rgba(123,30,43,0.35)" : "1px solid rgba(0,0,0,0.06)",
              boxShadow: plan.highlighted
                ? "0 30px 80px -40px rgba(110,30,42,0.45), 0 1px 2px rgba(0,0,0,0.04)"
                : "0 14px 40px -22px rgba(44,20,31,0.18), 0 1px 2px rgba(0,0,0,0.04)",
            }
          : {
              background: "linear-gradient(180deg, rgba(43,43,43,0.98) 0%, rgba(31,28,32,0.99) 55%, rgba(23,21,24,1) 100%)",
              border: "1px solid rgba(198,167,104,0.18)",
              boxShadow: "0 18px 50px -28px rgba(15,15,20,0.50)",
            }
      }
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      custom={i + 1}
      whileHover={!mobile ? { y: -5 } : undefined}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* "Mais popular" badge */}
      {plan.badge && (
        <div className="absolute -top-px left-0 right-0 flex justify-center">
          <span
            className="inline-flex items-center gap-1 rounded-b-xl px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-md"
            style={{
              background: "linear-gradient(135deg, #7B1E2B, #6E1E2A)",
            }}
          >
            <Sparkles className="h-3 w-3" />
            {plan.badge}
          </span>
        </div>
      )}

      {/* Radial overlays */}
      {isLight ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.08),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_35%,rgba(198,167,104,0.08),transparent_55%)]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.32),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_18%,rgba(198,167,104,0.16),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(198,167,104,0.6),transparent)]" />
        </>
      )}

      <div className={`relative p-6 sm:p-7 flex flex-col flex-1 ${plan.badge ? "pt-9" : ""}`}>
        <h3 className="text-[20px] font-semibold tracking-tight" style={{ color: txt }}>
          {plan.name}
        </h3>
        <p className="mt-1.5 mb-4 text-[13.5px] leading-relaxed" style={{ color: sub }}>
          {plan.desc}
        </p>

        <div className="mb-3 flex items-end gap-1.5">
          <span className="text-[40px] font-semibold tracking-[-0.02em] leading-none" style={{ color: txt }}>
            {plan.price}
          </span>
          <span className="pb-[5px] text-[13px] font-medium" style={{ color: sub }}>
            {plan.period}
          </span>
        </div>

        <div className="mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.10em]"
            style={
              isLight
                ? {
                    color: "#6E1E2A",
                    background: "rgba(123,30,43,0.08)",
                    border: "1px solid rgba(123,30,43,0.14)",
                  }
                : {
                    color: "#C6A768",
                    background: "rgba(198,167,104,0.12)",
                    border: "1px solid rgba(198,167,104,0.28)",
                  }
            }
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            14 dias grátis
          </span>
        </div>

        {/* Annual plan highlight */}
        {plan.annualPrice && (
          <div
            className="mb-5 rounded-2xl p-4 relative overflow-hidden"
            style={
              isLight
                ? {
                    background: "linear-gradient(135deg, rgba(95,111,82,0.16) 0%, rgba(198,167,104,0.14) 100%)",
                    border: "1px solid rgba(95,111,82,0.32)",
                    boxShadow: "0 8px 24px -16px rgba(95,111,82,0.35)",
                  }
                : {
                    background: "linear-gradient(135deg, rgba(198,167,104,0.24) 0%, rgba(198,167,104,0.10) 100%)",
                    border: "1px solid rgba(198,167,104,0.45)",
                    boxShadow: "0 8px 24px -14px rgba(198,167,104,0.35)",
                  }
            }
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p
                  className="text-[18px] sm:text-[20px] font-bold tracking-[-0.01em] leading-none"
                  style={{ color: isLight ? "#2E3A26" : "#E8C97A" }}
                >
                  ou {plan.annualPrice}
                </p>
                <p
                  className="mt-1 text-[12px] sm:text-[13px] font-semibold leading-snug"
                  style={{ color: isLight ? "#3F4D36" : "#F5E9CC" }}
                >
                  {plan.annualDetail}
                </p>
              </div>
              <span
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.06em]"
                style={
                  isLight
                    ? {
                        color: "#FFFFFF",
                        background: "linear-gradient(135deg, #5F6F52, #4A5640)",
                        boxShadow: "0 6px 16px -8px rgba(95,111,82,0.55)",
                      }
                    : {
                        color: "#1A1A1A",
                        background: "linear-gradient(135deg, #E8C97A, #C6A768)",
                        boxShadow: "0 6px 16px -8px rgba(198,167,104,0.55)",
                      }
                }
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
                {plan.annualHighlight}
              </span>
            </div>
          </div>
        )}

        <Button
          variant={isLight ? "primary" : "secondary"}
          className={`w-full h-11 rounded-2xl px-6 text-[13px] font-semibold ${
            isLight
              ? "shadow-[0_18px_44px_-22px_rgba(110,30,42,0.55)]"
              : "bg-[#C6A768] hover:bg-[#B8995A] text-[#1A1A1A] shadow-[0_18px_44px_-22px_rgba(198,167,104,0.45)]"
          }`}
          onClick={onSignup}
        >
          {plan.cta}
        </Button>

        <div
          className="mt-5 mb-4 h-px w-full"
          style={{ background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)" }}
        />

        <ul className="space-y-2.5 flex-1">
          {plan.features.map((f, idx) => {
            const isHeader = idx === 0 && f.endsWith(":");
            return (
              <li
                key={f}
                className="flex items-start gap-2.5 text-[13px] leading-relaxed"
                style={{ color: isLight ? "rgba(26,26,26,0.85)" : "rgba(248,246,243,0.82)" }}
              >
                {!isHeader && (
                  <div
                    className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-[2px]"
                    style={
                      isLight
                        ? { background: "rgba(110,30,42,0.08)", border: "1px solid rgba(110,30,42,0.14)" }
                        : { background: "rgba(198,167,104,0.14)", border: "1px solid rgba(198,167,104,0.22)" }
                    }
                  >
                    <Check
                      className={isLight ? "h-2.5 w-2.5 text-[#6E1E2A]/80" : "h-2.5 w-2.5 text-[#C6A768]"}
                      strokeWidth={3}
                    />
                  </div>
                )}
                <span className={isHeader ? "font-semibold" : ""}>{f}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}

export function LandingPricing({ onSignup }: LandingPricingProps) {
  const [activeCat, setActiveCat] = useState<FaqCategory>("planos");
  const filteredFaqs = faqs.filter((f) => f.cat === activeCat);
  const activeMeta = categories.find((c) => c.key === activeCat)!;

  return (
    <section id="pricing" className="relative px-4 sm:px-8 pt-3 pb-8 z-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="text-center mx-auto max-w-2xl mb-8"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
        >
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-wine mb-3">
            Planos
          </span>
          <h2 className="text-[26px] sm:text-[34px] font-semibold tracking-[-0.02em] text-[#1A1A1A] leading-[1.1]">
            Escolha o plano ideal para sua adega
          </h2>
          <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-[#5F5F5F]">
            Comece sem compromisso. Cancele quando quiser.
          </p>
        </motion.div>

        {/* Mobile carousel */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide pb-2">
          <div className="flex gap-3 snap-x snap-mandatory">
            {plans.map((plan, i) => (
              <PlanCard key={plan.name} plan={plan} i={i} onSignup={onSignup} mobile />
            ))}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:grid grid-cols-2 gap-5 max-w-[800px] mx-auto items-stretch">
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} i={i} onSignup={onSignup} />
          ))}
        </div>

        {/* FAQ — categorias coloridas */}
        <motion.div
          className="mx-auto mt-14 max-w-3xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={fadeUp}
          custom={4}
        >
          <div className="text-center mb-6">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-wine mb-2">
              Dúvidas
            </span>
            <h3 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.02em] text-[#1A1A1A]">
              Perguntas frequentes
            </h3>
            <p className="mt-2 text-[13.5px] text-[#5F5F5F]">
              Respostas rápidas, organizadas por tema.
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex justify-center mb-5 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="inline-flex gap-1.5 p-1 rounded-2xl bg-white/70 backdrop-blur-md border border-black/[0.06] shadow-sm">
              {categories.map((c) => {
                const isActive = c.key === activeCat;
                return (
                  <button
                    key={c.key}
                    onClick={() => setActiveCat(c.key)}
                    className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors whitespace-nowrap"
                    style={{ color: isActive ? "#fff" : "#5F5F5F" }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="faq-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: c.accent }}
                        transition={{ type: "spring", stiffness: 360, damping: 32 }}
                      />
                    )}
                    <c.icon className="relative z-10 h-3.5 w-3.5" />
                    <span className="relative z-10">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FAQ list */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCat}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Accordion type="single" collapsible defaultValue="faq-0" className="space-y-2.5">
                {filteredFaqs.map((item, idx) => (
                  <AccordionItem
                    key={item.q}
                    value={`faq-${idx}`}
                    className="group relative overflow-hidden rounded-xl border bg-white/92 backdrop-blur-sm pl-5 pr-4 transition-all duration-300"
                    style={{
                      borderColor: "rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* Color accent bar */}
                    <span
                      className="absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-300 opacity-60 group-data-[state=open]:opacity-100"
                      style={{ background: activeMeta.accent }}
                    />
                    <AccordionTrigger
                      className="py-3.5 text-left text-[14px] font-semibold tracking-tight text-[#1A1A1A] hover:no-underline [&>svg]:transition-colors"
                      style={{
                        ['--tw-text-opacity' as string]: 1,
                      }}
                    >
                      <span className="group-data-[state=open]:font-semibold" style={{ color: undefined }}>{item.q}</span>
                    </AccordionTrigger>
                    <AccordionContent
                      className="pb-3.5 pt-0 text-[13.5px] leading-relaxed text-[#5F5F5F]"
                    >
                      <div
                        className="rounded-lg p-3"
                        style={{ background: activeMeta.soft, border: `1px solid ${activeMeta.border}` }}
                      >
                        {item.a}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </AnimatePresence>

          {/* Helper line */}
          <p className="mt-6 text-center text-[15px] sm:text-[16px] text-[#3A3A3A] font-medium">
            Não encontrou?{" "}
            <a
              href="mailto:sommelyx@gmail.com"
              className="font-semibold text-wine hover:underline"
            >
              Fale com a Sommelière
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

