import { motion } from "framer-motion";
import { BookOpen, GlassWater, Sparkles, Wine } from "@/icons/lucide";
import { designSystem } from "@/styles/designSystem";

const fadeUp = {
  hidden: { opacity: 0, y: 22 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.46, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const scenes = [
  {
    icon: Wine,
    label: "Adega",
    title: "A próxima garrafa aparece sem procurar demais.",
    lines: ["Brunello di Montalcino 2018", "janela ideal", "2 garrafas"],
  },
  {
    icon: BookOpen,
    label: "Carta",
    title: "Uma lista externa vira leitura de serviço.",
    lines: ["Menu de inverno", "12 rótulos reconhecidos", "3 ausências relevantes"],
  },
  {
    icon: GlassWater,
    label: "Mesa",
    title: "A harmonização fecha o ciclo com naturalidade.",
    lines: ["Risoto de funghi", "Barolo Riserva", "96% de aderência"],
  },
];

export function LandingShowcase() {
  return (
    <section id="features" className="relative z-10 px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <span className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-wine">
            <Sparkles className="h-3.5 w-3.5" />
            O ambiente Sommelyx
          </span>
          <h2 className="mt-3 text-[26px] font-medium leading-[1.08] tracking-[-0.025em] text-[rgba(26,23,19,0.92)] sm:text-[38px]">
            Menos painel. Mais direção.
          </h2>
        </motion.div>

        <div className="mt-9 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
          {scenes.map((scene, index) => (
            <motion.article
              key={scene.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              custom={index + 1}
              className="group min-h-[260px] rounded-[28px] p-5 sm:p-6"
              style={designSystem.glassCard}
            >
              <div className="flex h-full flex-col justify-between gap-8">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(58,51,39,0.48)]">
                    {scene.label}
                  </p>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/36 text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] transition-transform duration-300 group-hover:-translate-y-0.5">
                    <scene.icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                </div>

                <h3
                  className="font-serif text-[22px] font-medium leading-[1.18] tracking-[-0.02em] text-[rgba(26,23,19,0.88)]"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                >
                  {scene.title}
                </h3>

                <div className="space-y-2 border-t border-black/[0.045] pt-4">
                  {scene.lines.map((line) => (
                    <div key={line} className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="truncate font-medium text-[rgba(58,51,39,0.68)]">{line}</span>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-wine/45" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
