import { motion } from "framer-motion";
import { BookOpen, ChefHat, GlassWater, Search, Sparkles, Wine } from "@/icons/lucide";

const fadeUp = {
  hidden: { opacity: 0, y: 22 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const promiseCards = [
  {
    icon: Wine,
    label: "Adega",
    title: "Acompanhe sua adega",
    copy: "Veja o que está pronto para abrir, o que deve esperar e o que vale repor.",
  },
  {
    icon: BookOpen,
    label: "Carta",
    title: "Leia cartas com mais clareza",
    copy: "Transforme menus e listas externas em escolhas mais fáceis.",
  },
  {
    icon: GlassWater,
    label: "Mesa",
    title: "Harmonize com naturalidade",
    copy: "Encontre combinações para o prato, a ocasião e o estilo do vinho.",
  },
];

const experienceCards = [
  {
    icon: Wine,
    label: "Adega",
    title: "Garrafas no tempo certo.",
    copy: "Organize rótulos, quantidades e momentos de consumo sem perder a personalidade da sua adega.",
  },
  {
    icon: ChefHat,
    label: "Harmonização",
    title: "Mesa e garrafa conversam.",
    copy: "Parta do prato, da ocasião ou do vinho que você quer abrir.",
  },
  {
    icon: Search,
    label: "Carta",
    title: "Cartas ficam mais legíveis.",
    copy: "Use fotos, PDFs e menus para entender opções sem atravessar listas intermináveis.",
  },
];

export function LandingShowcase() {
  return (
    <>
      <section id="experience" className="landing-promise-section">
        <div className="landing-section-heading">
          <motion.p className="landing-kicker" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            O ambiente Sommelyx
          </motion.p>
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
            Adega, carta e mesa no mesmo fluxo.
          </motion.h2>
        </div>

        <div className="landing-promise-grid">
          {promiseCards.map((card, index) => (
            <motion.article
              key={card.label}
              className="landing-note-card"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              custom={index + 2}
            >
              <div className="landing-note-top">
                <span>{card.label}</span>
                <card.icon className="h-4 w-4" />
              </div>
              <h3>{card.title}</h3>
              <p className="landing-note-copy">{card.copy}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="landing-experience-section">
        <div className="landing-section-heading align-left">
          <p className="landing-kicker">Da adega à mesa</p>
          <h2>Escolher melhor começa antes da taça.</h2>
        </div>

        <div className="landing-experience-grid">
          {experienceCards.map((card) => (
            <article key={card.label} className="landing-experience-card">
              <div className="landing-experience-icon"><card.icon className="h-5 w-5" /></div>
              <p>{card.label}</p>
              <h3>{card.title}</h3>
              <span>{card.copy}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="product" className="landing-product-section">
        <div className="landing-product-inner">
          <div className="landing-product-copy">
            <p className="landing-kicker">Insight do dia</p>
            <h2>Abra no tempo certo.</h2>
            <p>
              Sommelyx destaca a garrafa que merece atenção agora, com contexto para decidir sem pressa.
            </p>
          </div>

          <div className="landing-product-scene">
            <div className="landing-product-panel">
              <div className="landing-product-header">
                <span>Insight do dia</span>
                <Sparkles className="h-4 w-4" />
              </div>
              <h3>Abra este rótulo hoje</h3>
              <p>Brunello 2018 está em boa janela para uma refeição de inverno.</p>
              <div className="landing-product-actions">
                <span>Abrir garrafa</span>
                <span>Harmonizar</span>
                <span>Guardar</span>
              </div>
            </div>
            <div className="landing-product-float one">Janela ideal</div>
            <div className="landing-product-float two">Adega atualizada</div>
          </div>
        </div>
      </section>
    </>
  );
}
