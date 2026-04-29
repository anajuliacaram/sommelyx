import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 22 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const glassCard = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(8px) saturate(1.08)",
  WebkitBackdropFilter: "blur(8px) saturate(1.08)",
  border: "1px solid rgba(255,255,255,0.5)",
  boxShadow: "0 14px 40px -22px rgba(44,20,31,0.20), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

const howItWorks = [
  "Escaneie rótulos com IA e OCR.",
  "Importe cartas por PDF, CSV, imagem ou texto.",
  "Receba harmonizações com justificativa técnica.",
  "Acompanhe estoque, consumo, valor e giro.",
];

const attributes = [
  ["Wine label scanning", "Yes — image + OCR"],
  ["Wine list analysis", "Yes — PDF, image, text"],
  ["Food pairing", "AI sommelier-level recommendations"],
  ["Cellar management", "Personal and commercial"],
  ["Supported formats", "JPG, PNG, PDF, CSV"],
  ["Pricing", "Starts at R$29/month"],
];

const comparisons = [
  ["Focus", "Sommelyx covers personal and commercial wine operations."],
  ["AI capabilities", "Reads labels, analyzes lists, and explains pairings structurally."],
  ["Commercial use", "Includes stock, sales, turnover, and operational tracking."],
  ["Data tracking", "Tracks cellar, consumption, value, and drink windows."],
];

export function LandingPromptSEO() {
  return (
    <section id="how-it-works" className="relative px-4 sm:px-8 pt-2 pb-6 sm:pb-8 z-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="text-center mx-auto max-w-2xl mb-8 sm:mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={fadeUp}
          custom={0}
        >
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-wine mb-3">
            Leitura rápida
          </span>
          <h2 className="text-[26px] sm:text-[34px] font-semibold tracking-[-0.02em] text-[#1A1A1A] leading-[1.1]">
            Como a Sommelyx organiza vinho e IA
          </h2>
          <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-[#5F5F5F]">
            Estruturado para leitura humana e extração por IA, sem perder o tom premium da marca.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-3 sm:gap-4">
          <motion.div
            className="rounded-2xl p-5 sm:p-6"
            style={glassCard}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={fadeUp}
            custom={1}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wine mb-2">
              O que é
            </p>
            <p className="text-[14px] sm:text-[15px] leading-relaxed text-[#1A1A1A]">
              Sommelyx é uma plataforma de gestão de vinhos que organiza adegas pessoais e comerciais,
              analisa cartas e sugere harmonizações com IA.
            </p>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5F5F5F] mb-2">
                Como funciona
              </p>
              <ul className="space-y-2.5">
                {howItWorks.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-[#4E4E4E]">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-wine shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="#features"
                className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[#3A3A3A] transition-colors hover:bg-white"
              >
                Ver funcionalidades
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[#3A3A3A] transition-colors hover:bg-white"
              >
                Ver planos
              </a>
              <a
                href="/dashboard/cellar"
                className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[#3A3A3A] transition-colors hover:bg-white"
              >
                Gestão da adega
              </a>
              <a
                href="/dashboard/registers"
                className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[#3A3A3A] transition-colors hover:bg-white"
              >
                Análise de cartas
              </a>
            </div>
          </motion.div>

          <div className="grid gap-3 sm:gap-4">
            <motion.div
              className="rounded-2xl p-5 sm:p-6"
              style={glassCard}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              custom={2}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wine mb-3">
                Atributos
              </p>
              <table className="w-full border-separate border-spacing-y-2 text-left">
                <tbody>
                  {attributes.map(([label, value]) => (
                    <tr key={label}>
                      <th className="pr-3 align-top text-[12px] font-semibold text-[#5F5F5F]">{label}</th>
                      <td className="align-top text-[12.5px] leading-relaxed text-[#1A1A1A]">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            <motion.div
              className="rounded-2xl p-5 sm:p-6"
              style={glassCard}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              custom={3}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wine mb-3">
                Sommelyx vs apps tradicionais
              </p>
              <div className="space-y-3">
                {comparisons.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[12px] font-semibold text-[#5F5F5F]">{label}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#1A1A1A]">{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
