import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CreditCard, ShieldCheck, Wine } from "@/icons/lucide";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const fadeUp = {
  hidden: { opacity: 0, y: 22 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

type FaqCategory = "planos" | "funcionalidades" | "privacidade";

const plans = [
  {
    name: "Pro",
    badge: "Mais popular",
    price: "R$ 29",
    annual: "R$ 280 / ano",
    text: "Para colecionadores e uso pessoal.",
    features: ["Adega organizada", "Janela de consumo", "Harmonizações", "Leitura de rótulos"],
    dark: false,
  },
  {
    name: "Business",
    badge: "Operação",
    price: "R$ 59",
    annual: "R$ 600 / ano",
    text: "Para restaurantes, bares e lojas.",
    features: ["Estoque e vendas", "Giro de garrafas", "Relatórios", "Histórico operacional"],
    dark: true,
  },
];

const categories: { key: FaqCategory; label: string; icon: typeof CreditCard }[] = [
  { key: "planos", label: "Planos & Cobrança", icon: CreditCard },
  { key: "funcionalidades", label: "Funcionalidades", icon: Wine },
  { key: "privacidade", label: "Privacidade & Suporte", icon: ShieldCheck },
];

export const landingFaqs: { q: string; a: string; cat: FaqCategory }[] = [
  { cat: "planos", q: "Como funciona o teste grátis?", a: "Você usa os recursos por 14 dias e pode cancelar antes da cobrança." },
  { cat: "planos", q: "Qual a diferença entre Pro e Business?", a: "Pro é para adega pessoal. Business inclui operação comercial, estoque, vendas e giro." },
  { cat: "planos", q: "Existe plano anual?", a: "Sim. Pro custa R$ 280 por ano e Business custa R$ 600 por ano." },
  { cat: "funcionalidades", q: "Consigo importar minha planilha?", a: "Sim. CSV, Excel, PDF e imagens podem ser revisados antes de salvar." },
  { cat: "funcionalidades", q: "A Sommelyx lê rótulos e cartas?", a: "Sim. A leitura ajuda a preencher vinhos, organizar cartas e apoiar escolhas." },
  { cat: "funcionalidades", q: "Ela sugere harmonizações?", a: "Sim. Você pode partir do prato ou da garrafa." },
  { cat: "privacidade", q: "Meus dados ficam privados?", a: "Sim. Cada conta tem dados isolados e protegidos por controle de acesso." },
  { cat: "privacidade", q: "Posso exportar meus dados?", a: "Sim. Você pode exportar sua base quando precisar." },
  { cat: "privacidade", q: "Como funciona o suporte?", a: "O suporte responde por e-mail com foco em resolver o problema com clareza." },
];

interface LandingPricingProps {
  onSignup: () => void;
}

function PlanCard({ plan, index, onSignup }: { plan: typeof plans[number]; index: number; onSignup: () => void }) {
  return (
    <motion.article
      className={`landing-plan-card ${plan.dark ? "is-dark" : "is-light"}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      custom={index}
    >
      <div className="landing-plan-top">
        <span>{plan.badge}</span>
        <h3>{plan.name}</h3>
        <p>{plan.text}</p>
      </div>

      <div className="landing-plan-price">
        <strong>{plan.price}</strong>
        <span>/mês</span>
      </div>
      <p className="landing-plan-annual">{plan.annual} · 14 dias grátis</p>

      <button type="button" className={plan.dark ? "landing-btn landing-btn-dark" : "landing-btn landing-btn-primary"} onClick={onSignup}>
        Começar grátis
      </button>

      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>
            <Check className="h-3.5 w-3.5" />
            {feature}
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export function LandingPricing({ onSignup }: LandingPricingProps) {
  const [activeCat, setActiveCat] = useState<FaqCategory>("planos");
  const filteredFaqs = landingFaqs.filter((faq) => faq.cat === activeCat);

  return (
    <section id="pricing" className="landing-pricing-section">
      <div className="landing-section-heading">
        <p className="landing-kicker">Planos</p>
        <h2>Escolha o plano ideal para sua adega.</h2>
        <span>Comece sem compromisso. Cancele quando quiser.</span>
      </div>

      <div className="landing-plan-grid">
        {plans.map((plan, index) => (
          <PlanCard key={plan.name} plan={plan} index={index + 1} onSignup={onSignup} />
        ))}
      </div>

      <div className="landing-comparison-card">
        <div>
        <p>Sommelyx</p>
        <span>Adega, carta e mesa no mesmo fluxo.</span>
          <span>Janelas de consumo e histórico em um só lugar.</span>
          <span>Escolhas mais simples para abrir, guardar ou harmonizar.</span>
        </div>
        <div>
          <p>Apps tradicionais</p>
          <span>Catálogo ou notas isoladas.</span>
          <span>Pouco contexto entre adega, carta e mesa.</span>
          <span>Organização mais próxima de inventário.</span>
        </div>
      </div>

      <div className="landing-faq-section">
        <div className="landing-section-heading">
          <p className="landing-kicker">Dúvidas</p>
          <h2>Perguntas frequentes.</h2>
          <span>Respostas rápidas, organizadas por tema.</span>
        </div>

        <div className="landing-faq-tabs" role="tablist" aria-label="Categorias de perguntas frequentes">
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              className={category.key === activeCat ? "is-active" : ""}
              onClick={() => setActiveCat(category.key)}
            >
              <category.icon className="h-3.5 w-3.5" />
              {category.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="landing-faq-list"
          >
            <Accordion type="single" collapsible defaultValue="faq-0">
              {filteredFaqs.map((item, index) => (
                <AccordionItem key={item.q} value={`faq-${index}`} className="landing-faq-item">
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </AnimatePresence>

        <p className="landing-faq-help">
          Não encontrou? <a href="mailto:sommelyx@gmail.com">Fale com a Sommelière</a>
        </p>
      </div>
    </section>
  );
}
