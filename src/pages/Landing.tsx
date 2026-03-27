import { useEffect } from "react";
import { motion } from "framer-motion";
import { Wine, Check, ShieldCheck, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { analytics } from "@/lib/analytics";

const fadeUp = {
  hidden: { opacity: 0, y: 18 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const blocks = [
  {
    icon: Wine,
    title: "Organize sua adega",
    bullets: [
      "Cadastre todos seus vinhos com safra, produtor e uva",
      "Visualize tudo em um só lugar",
      "Encontre qualquer garrafa em segundos",
    ],
    color: "#8C2044",
  },
  {
    icon: Clock,
    title: "Saiba quando beber",
    bullets: [
      "Alertas de consumo no momento ideal",
      "Evite abrir cedo ou tarde demais",
      "Aproveite cada garrafa no melhor momento",
    ],
    color: "#22c55e",
  },
  {
    icon: ShieldCheck,
    title: "Tenha controle total",
    bullets: [
      "Histórico completo e notas de degustação",
      "Insights inteligentes da sua coleção",
      "Tudo registrado automaticamente",
    ],
    color: "#3b82f6",
  },
];

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
    tier: "pro" as const,
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
    tier: "business" as const,
    popular: false,
  },
];

const tierStyle = (tier: "pro" | "business", popular: boolean) => {
  if (tier === "business") return {
    bg: { background: "linear-gradient(160deg, #2B0F1F 0%, #4A1932 52%, #6A2143 100%)", boxShadow: "0 16px 32px rgba(74,25,50,0.25)", border: "1px solid rgba(255,255,255,0.14)" },
    text: "white", sub: "rgba(255,255,255,0.55)", price: "white", feat: "rgba(255,255,255,0.88)",
    checkBg: "rgba(255,225,236,0.18)", checkColor: "#FFD3E4",
  };
  return {
    bg: { background: "linear-gradient(160deg, #8C2044 0%, #B5436A 52%, #D4638A 100%)", boxShadow: popular ? "0 20px 50px rgba(140,32,68,0.35), 0 0 0 2px rgba(255,255,255,0.25)" : "0 12px 28px rgba(140,32,68,0.2)", border: popular ? "2px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.18)" },
    text: "white", sub: "rgba(255,255,255,0.6)", price: "white", feat: "rgba(255,255,255,0.9)",
    checkBg: "rgba(255,255,255,0.2)", checkColor: "#FFE0EC",
  };
};

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    analytics.trackOncePerSession("landing_page_view", "landing");
  }, []);

  const handleStartFreeClick = () => {
    analytics.track("landing_cta_start_free_click");
    navigate("/signup");
  };

  const handleLoginClick = () => {
    analytics.track("landing_cta_login_click");
    navigate("/login");
  };

  return (
    <div className="min-h-screen overflow-hidden selection:bg-[#8F2D56]/20 selection:text-[#1A1A1A] bg-[#FAF7F6] text-[#1A1A1A]">

      {/* ─── AMBIENT LIGHT ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-8%] left-[-6%] w-[55vw] h-[55vw] rounded-full bg-[#8C2044]/[0.06] blur-[160px]" />
        <div className="absolute top-[2%] right-[-8%] w-[45vw] h-[45vw] rounded-full bg-[#E8A1B3]/[0.08] blur-[140px]" />
        <div className="absolute top-[15%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-[#F3E5D8]/[0.1] blur-[120px]" />
      </div>

      {/* ─── HEADER ─── */}
      <motion.header
        className="fixed top-0 w-full z-50 px-4 sm:px-6 py-2.5 sm:py-4 lg:py-5 bg-[#FAF7F6]/80 backdrop-blur-2xl border-b border-[#8C2044]/8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="container mx-auto flex items-center justify-between max-w-6xl">
          <a href="/" className="flex items-center gap-2 sm:gap-3 transition-opacity duration-300 hover:opacity-80">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-8 sm:h-[58px] md:h-[72px] w-auto object-contain" />
            <span className="text-lg sm:text-[26px] md:text-[32px] font-black tracking-tight font-sans hidden sm:block text-[#1A1A1A]" style={{ letterSpacing: "-0.04em" }}>
              Sommelyx
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              className="h-8 sm:h-10 px-3 sm:px-5 text-[12px] sm:text-[14px] font-semibold text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              onClick={handleLoginClick}
            >
              Entrar
            </Button>
            <MagneticButton>
              <Button
                className="px-4 sm:px-7 h-8 sm:h-10 text-[11px] sm:text-[13px] font-bold rounded-xl transition-all bg-[#1A1A1A] hover:bg-[#2a2a2a] text-white shadow-sm"
                onClick={handleStartFreeClick}
              >
                Começar grátis
              </Button>
            </MagneticButton>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-24 px-4 sm:px-6 z-10">
        <div className="container mx-auto relative max-w-3xl">
          <div className="flex flex-col items-center text-center">
            <motion.h1
              className="font-serif font-black text-[#1A1A1A]"
              style={{ fontSize: "clamp(28px, 5vw, 58px)", lineHeight: 1.1, letterSpacing: "-0.03em" }}
              initial="hidden" animate="visible" variants={fadeUp} custom={0}
            >
              Controle sua adega e saiba exatamente quando abrir cada vinho
            </motion.h1>

            <motion.p
              className="text-base sm:text-lg md:text-xl max-w-[520px] mt-5 sm:mt-6 font-medium text-[#6B6B6B]"
              style={{ lineHeight: 1.55 }}
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              Organize, acompanhe e nunca mais perca garrafas no ponto errado.
            </motion.p>

            <motion.div
              className="mt-7 sm:mt-9 flex flex-col items-center gap-3"
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              <MagneticButton>
                <Button
                  className="group px-10 sm:px-14 h-13 sm:h-[56px] text-[14px] sm:text-[15px] font-bold rounded-xl transition-all text-white hover:-translate-y-1 shadow-[0_12px_32px_rgba(140,32,68,0.3)] hover:shadow-[0_18px_40px_rgba(140,32,68,0.4)] bg-[#8C2044] hover:bg-[#7a1b3a]"
                  onClick={handleStartFreeClick}
                >
                  Começar grátis
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </MagneticButton>
              <span className="text-[12px] text-[#6B6B6B] font-medium flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#22c55e]" /> 14 dias grátis · Sem cartão de crédito
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ SOCIAL PROOF BAR ═══════ */}
      <motion.section
        className="relative z-10 px-4 sm:px-6 pb-16 sm:pb-20"
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
      >
        <div className="container mx-auto max-w-2xl text-center">
          <p className="text-[13px] sm:text-[14px] font-medium text-[#6B6B6B] tracking-wide">
            Usado por colecionadores e profissionais do vinho em todo o Brasil
          </p>
        </div>
      </motion.section>

      {/* ═══════════════ VALUE BLOCKS ═══════════════ */}
      <section id="features" className="relative px-4 sm:px-6 pb-16 sm:pb-24 z-10">
        <div className="container mx-auto max-w-5xl">
          <div className="grid gap-12 sm:gap-16 lg:gap-20">
            {blocks.map((block, i) => (
              <motion.div
                key={block.title}
                className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-8 md:gap-14`}
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={fadeUp} custom={0}
              >
                {/* Icon area */}
                <div className="shrink-0">
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center"
                    style={{ background: `${block.color}10`, border: `1px solid ${block.color}20` }}
                  >
                    <block.icon className="h-10 w-10 sm:h-12 sm:w-12" style={{ color: block.color }} strokeWidth={1.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center md:text-left flex-1 max-w-lg">
                  <h3 className="text-2xl sm:text-3xl font-serif font-black text-[#1A1A1A] mb-4 tracking-tight">
                    {block.title}
                  </h3>
                  <ul className="space-y-2.5">
                    {block.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-[15px] text-[#6B6B6B] font-medium leading-relaxed">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#22c55e]" strokeWidth={2.5} />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Button
                      variant="ghost"
                      className="text-[14px] font-semibold text-[#8C2044] hover:text-[#7a1b3a] hover:bg-[#8C2044]/5 px-0 h-auto group"
                      onClick={handleStartFreeClick}
                    >
                      Começar grátis
                      <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="relative px-4 sm:px-6 py-16 sm:py-24 lg:py-28 overflow-hidden z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(140,32,68,0.06),transparent_60%)] pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mx-auto mb-10 sm:mb-14 max-w-xl text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="inline-block px-4 py-1.5 rounded-full text-[12px] font-bold tracking-widest uppercase mb-4" style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
              Teste grátis por 14 dias
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-[40px] font-serif font-black tracking-tight text-[#1A1A1A] leading-[1.1]">
              Escolha o plano ideal para sua adega
            </h2>
            <p className="mt-4 text-[15px] text-[#6B6B6B] font-medium max-w-md mx-auto">
              Comece sem compromisso. Cancele quando quiser.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-[800px] mx-auto items-stretch">
            {plans.map((plan, i) => {
              const s = tierStyle(plan.tier, plan.popular);
              return (
                <motion.div
                  key={plan.name}
                  className={`relative rounded-[24px] overflow-hidden flex flex-col p-7 sm:p-9 h-full ${plan.popular ? "md:scale-[1.03] md:z-10" : ""}`}
                  style={s.bg}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                  whileHover={{ y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
                >
                  {plan.popular && (
                    <div className="absolute top-5 right-5">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-white text-[#8C2044] shadow-md">
                        Mais escolhido
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl sm:text-2xl font-serif font-black tracking-tight" style={{ color: s.text }}>{plan.name}</h3>
                  <p className="text-[13px] mb-5 font-medium" style={{ color: s.sub }}>{plan.desc}</p>

                  <div className="mb-5 flex items-baseline gap-1.5">
                    <span className="text-[48px] sm:text-[52px] font-black font-sans tracking-tighter leading-none" style={{ color: s.price }}>{plan.price}</span>
                    <span className="text-sm font-medium opacity-40" style={{ color: s.text }}>{plan.period}</span>
                  </div>

                  {/* Trial pill */}
                  <div className="mb-5 w-full rounded-full py-1.5 px-4 text-center" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <span className="text-[13px] font-medium" style={{ color: "#22c55e" }}>
                      ✓ 14 dias grátis · Sem cartão
                    </span>
                  </div>

                  {/* CTA */}
                  <Button
                    className="w-full h-13 sm:h-14 rounded-xl text-[15px] font-semibold transition-all duration-300 mb-1.5 bg-white text-[#8C2044] hover:bg-[#FFF7FA] shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.15)] hover:scale-[1.02] border-0"
                    onClick={handleStartFreeClick}
                  >
                    {plan.cta}
                  </Button>
                  <p className="text-[11px] font-medium text-center mb-6 opacity-40" style={{ color: s.text }}>
                    Comece em segundos
                  </p>

                  {/* Benefits */}
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-[14px] leading-snug font-medium" style={{ color: s.feat }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: s.checkBg }}>
                          <Check className="h-3 w-3" style={{ color: s.checkColor }} strokeWidth={3} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 relative z-10 border-t border-black/[0.04]">
        <div className="container mx-auto max-w-6xl flex flex-col items-center gap-5 sm:gap-6 md:flex-row md:justify-between md:gap-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-6 sm:h-8 w-auto object-contain grayscale opacity-50" />
            <span className="font-bold text-sm sm:text-base font-sans tracking-tight text-[#6B6B6B]">Sommelyx</span>
          </div>
          <div className="flex items-center gap-5 sm:gap-8 text-[11px] sm:text-[13px] font-semibold uppercase tracking-widest text-[#6B6B6B]">
            <a href="#features" className="hover:text-[#1A1A1A] transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors">Planos</a>
            <button onClick={handleLoginClick} className="hover:text-[#1A1A1A] transition-colors cursor-pointer bg-transparent border-0 font-semibold uppercase tracking-widest text-[11px] sm:text-[13px]">Acesso</button>
          </div>
          <p className="text-[11px] sm:text-[13px] font-medium text-[#6B6B6B]">
            © {new Date().getFullYear()} Sommelyx
          </p>
        </div>
      </footer>
    </div>
  );
}
