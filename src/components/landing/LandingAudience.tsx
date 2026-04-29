import { motion } from "framer-motion";
import { Wine, UtensilsCrossed, ShoppingCart } from "@/icons/lucide";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const audiences = [
  {
    icon: Wine,
    title: "Colecionadores",
    desc: "Organize sua coleção, acompanhe a janela ideal de cada safra e descubra harmonizações.",
    accent: "hsl(var(--wine))",
    bg: "rgba(123,30,43,0.07)",
    border: "rgba(123,30,43,0.14)",
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurantes & Bares",
    desc: "Carta sob controle, giro por rótulo e harmonização instantânea para sua brigada.",
    accent: "#5F6F52",
    bg: "rgba(95,111,82,0.10)",
    border: "rgba(95,111,82,0.18)",
  },
  {
    icon: ShoppingCart,
    title: "Lojistas & Importadores",
    desc: "Estoque, vendas e reposição em tempo real. Decisões financeiras com base em dados.",
    accent: "#B8860B",
    bg: "rgba(198,167,104,0.12)",
    border: "rgba(198,167,104,0.22)",
  },
];

const glassCard = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(8px) saturate(1.08)",
  WebkitBackdropFilter: "blur(8px) saturate(1.08)",
  border: "1px solid rgba(255,255,255,0.5)",
  boxShadow: "0 14px 40px -22px rgba(44,20,31,0.22), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

export function LandingAudience() {
  return (
    <section className="relative px-4 sm:px-8 pt-3 pb-6 sm:pb-8 z-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="text-center mx-auto max-w-2xl mb-8"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
        >
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-wine mb-3">
            Para quem é
          </span>
          <h2 className="text-[24px] sm:text-[30px] font-semibold tracking-[-0.02em] text-[#1A1A1A] leading-[1.15]">
            Feito para quem leva vinho a sério
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {audiences.map((item, i) => (
            <motion.div
              key={item.title}
              className="rounded-2xl p-5"
              style={glassCard}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              custom={i + 1}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl mb-3"
                style={{ background: item.bg, border: `1px solid ${item.border}` }}
              >
                <item.icon className="h-5 w-5" style={{ color: item.accent }} strokeWidth={1.8} />
              </div>
              <h3 className="text-[16px] font-semibold tracking-tight text-[#1A1A1A]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5F5F5F]">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
