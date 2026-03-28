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
      "Cadastre vinhos com safra, produtor e uva",
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
      "Aproveite cada garrafa no melhor ponto",
    ],
    color: "#22c55e",
  },
  {
    icon: ShieldCheck,
    title: "Tenha controle total",
    bullets: [
      "Histórico completo e notas de degustação",
      "Insights inteligentes da coleção",
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

/* Premium pill style — reused across hero, pricing header, and pricing cards */
const trialPillClass = "inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]";
const trialPillStyle = { background: "#E6F6EC", color: "#166534", border: "1px solid rgba(34,197,94,0.18)" };

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

      {/* ─── AMBIENT LIGHT + GRAIN TEXTURE ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-8%] left-[-6%] w-[55vw] h-[55vw] rounded-full bg-[#8C2044]/[0.05] blur-[160px]" />
        <div className="absolute top-[2%] right-[-8%] w-[45vw] h-[45vw] rounded-full bg-[#E8A1B3]/[0.07] blur-[140px]" />
        <div className="absolute top-[15%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-[#F3E5D8]/[0.08] blur-[120px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[35vw] h-[35vw] rounded-full bg-[#E8A1B3]/[0.04] blur-[120px]" />
        {/* Subtle grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.028]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "200px",
          }}
        />
      </div>

      {/* ─── HEADER ─── */}
      <motion.header
        className="fixed top-0 w-full z-50 px-4 sm:px-6 py-2 sm:py-3 lg:py-4 bg-[#FAF7F6]/80 backdrop-blur-2xl border-b border-[#8C2044]/8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="container mx-auto flex items-center justify-between max-w-6xl">
          <a href="/" className="flex items-center gap-2 sm:gap-3 transition-opacity duration-300 hover:opacity-80">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-7 sm:h-[52px] md:h-[64px] w-auto object-contain" />
            <span className="text-lg sm:text-[24px] md:text-[28px] font-black tracking-tight font-sans hidden sm:block text-[#1A1A1A]" style={{ letterSpacing: "-0.04em" }}>
              Sommelyx
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              className="h-8 sm:h-9 px-3 sm:px-4 text-[12px] sm:text-[13px] font-semibold text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              onClick={handleLoginClick}
            >
              Entrar
            </Button>
            <MagneticButton>
              <Button
                className="px-4 sm:px-6 h-8 sm:h-9 text-[11px] sm:text-[13px] font-bold rounded-xl transition-all bg-[#1A1A1A] hover:bg-[#2a2a2a] text-white shadow-sm"
                onClick={handleStartFreeClick}
              >
                Começar grátis
              </Button>
            </MagneticButton>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-20 sm:pt-32 lg:pt-40 pb-8 sm:pb-16 px-4 sm:px-6 z-10">
        <div className="container mx-auto relative max-w-3xl">
          <div className="flex flex-col items-center text-center">
            <motion.h1
              className="font-serif font-black text-[#1A1A1A]"
              style={{ fontSize: "clamp(24px, 5vw, 56px)", lineHeight: 1.1, letterSpacing: "-0.03em" }}
              initial="hidden" animate="visible" variants={fadeUp} custom={0}
            >
              Controle sua adega e saiba exatamente quando abrir cada vinho
            </motion.h1>

            <motion.p
              className="text-[14px] sm:text-lg md:text-xl max-w-[500px] mt-3 sm:mt-5 font-medium text-[#6B6B6B]"
              style={{ lineHeight: 1.5 }}
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              Organize, acompanhe e nunca mais perca garrafas no ponto errado.
            </motion.p>

            <motion.div
              className="mt-5 sm:mt-7 flex flex-col items-center gap-2.5"
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              <MagneticButton>
                <Button
                  className="group px-8 sm:px-12 h-11 sm:h-[52px] text-[13px] sm:text-[15px] font-bold rounded-xl transition-all text-white hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(140,32,68,0.25)] hover:shadow-[0_14px_36px_rgba(140,32,68,0.35)] bg-[#8C2044] hover:bg-[#7a1b3a] active:scale-[0.98]"
                  onClick={handleStartFreeClick}
                >
                  Começar grátis
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </MagneticButton>
              <span className={trialPillClass} style={trialPillStyle}>
                <Check className="h-3 w-3 text-[#22c55e]" /> 14 dias grátis · Sem cartão
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ SOCIAL PROOF BAR ═══════ */}
      <motion.section
        className="relative z-10 px-4 sm:px-6 pb-8 sm:pb-14"
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
      >
        <div className="container mx-auto max-w-2xl text-center">
          <p className="text-[12px] sm:text-[13px] font-medium text-[#6B6B6B]/80 tracking-wide">
            Usado por colecionadores e profissionais do vinho em todo o Brasil
          </p>
        </div>
      </motion.section>

      {/* ═══════════════ VALUE BLOCKS ═══════════════ */}
      <section id="features" className="relative px-4 sm:px-6 pb-8 sm:pb-14 z-10">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 lg:gap-7">
            {blocks.map((block, i) => (
              <motion.div
                key={block.title}
                className="flex flex-col items-start p-4 sm:p-5 rounded-2xl transition-shadow duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.05)]"
                style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.04)" }}
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={i}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${block.color}10`, border: `1px solid ${block.color}14` }}
                >
                  <block.icon className="h-4 w-4" style={{ color: block.color }} strokeWidth={1.8} />
                </div>

                <h3 className="text-base sm:text-lg font-serif font-black text-[#1A1A1A] mb-2 tracking-tight">
                  {block.title}
                </h3>
                <ul className="space-y-1.5 flex-1">
                  {block.bullets.map(b => (
                    <li key={b} className="flex items-start gap-1.5 text-[12px] sm:text-[13px] text-[#6B6B6B] font-medium leading-snug">
                      <Check className="h-3 w-3 mt-0.5 shrink-0 text-[#22c55e]" strokeWidth={2.5} />
                      {b}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  className="mt-3 text-[12px] font-semibold text-[#8C2044] hover:text-[#7a1b3a] hover:bg-[#8C2044]/5 px-0 h-auto group"
                  onClick={handleStartFreeClick}
                >
                  Começar grátis
                  <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="relative px-4 sm:px-6 pt-8 sm:pt-16 pb-10 sm:pb-20 overflow-hidden z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(140,32,68,0.05),transparent_60%)] pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mx-auto mb-7 sm:mb-12 max-w-xl text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className={`${trialPillClass} mb-3 text-[11px] tracking-wider uppercase font-bold`} style={trialPillStyle}>
              ✔ 14 dias grátis · Sem cartão
            </span>
            <h2 className="text-xl sm:text-3xl md:text-[38px] font-serif font-black tracking-tight text-[#1A1A1A] leading-[1.1] mt-3">
              Escolha o plano ideal para sua adega
            </h2>
            <p className="mt-3 text-[13px] sm:text-[15px] text-[#6B6B6B] font-medium max-w-md mx-auto">
              Comece sem compromisso. Cancele quando quiser.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-[780px] mx-auto items-stretch">
            {plans.map((plan, i) => {
              const s = tierStyle(plan.tier, plan.popular);
              return (
                <motion.div
                  key={plan.name}
                  className={`relative rounded-[20px] overflow-hidden flex flex-col p-5 sm:p-7 h-full ${plan.popular ? "md:scale-[1.03] md:z-10" : ""}`}
                  style={s.bg}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                  whileHover={{ y: -3, transition: { duration: 0.3, ease: "easeOut" } }}
                >
                  {plan.popular && (
                    <div className="absolute top-4 right-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-white text-[#8C2044] shadow-sm">
                        Mais escolhido
                      </span>
                    </div>
                  )}

                  <h3 className="text-lg sm:text-xl font-serif font-black tracking-tight" style={{ color: s.text }}>{plan.name}</h3>
                  <p className="text-[12px] mb-3 font-medium" style={{ color: s.sub }}>{plan.desc}</p>

                  <div className="mb-3 flex items-baseline gap-1">
                    <span className="text-[40px] sm:text-[46px] font-black font-sans tracking-tighter leading-none" style={{ color: s.price }}>{plan.price}</span>
                    <span className="text-[13px] font-medium opacity-40" style={{ color: s.text }}>{plan.period}</span>
                  </div>

                  {/* Trial pill */}
                  <div className="mb-4 w-full rounded-full py-1.5 px-4 text-center transition-all duration-200 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]" style={{ background: "#E6F6EC", border: "1px solid rgba(34,197,94,0.18)" }}>
                    <span className="text-[11px] font-bold" style={{ color: "#166534" }}>
                      ✔ 14 dias grátis · Sem cartão
                    </span>
                  </div>

                  {/* CTA */}
                  <Button
                    className="w-full h-10 sm:h-11 rounded-xl text-[13px] sm:text-[14px] font-semibold transition-all duration-200 mb-1 bg-white text-[#8C2044] hover:bg-[#FFF7FA] shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:scale-[1.01] active:scale-[0.98] border-0"
                    onClick={handleStartFreeClick}
                  >
                    {plan.cta}
                  </Button>
                  <p className="text-[10px] font-medium text-center mb-4 opacity-40" style={{ color: s.text }}>
                    Comece em segundos
                  </p>

                  {/* Benefits */}
                  <ul className="space-y-2 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-[12px] sm:text-[13px] leading-snug font-medium" style={{ color: s.feat }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: s.checkBg }}>
                          <Check className="h-2.5 w-2.5" style={{ color: s.checkColor }} strokeWidth={3} />
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
      <footer className="py-5 sm:py-8 px-4 sm:px-6 relative z-10 border-t border-black/[0.04]">
        <div className="container mx-auto max-w-6xl flex flex-col items-center gap-3 sm:gap-5 md:flex-row md:justify-between md:gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-5 sm:h-7 w-auto object-contain grayscale opacity-50" />
            <span className="font-bold text-[13px] sm:text-sm font-sans tracking-tight text-[#6B6B6B]">Sommelyx</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-[12px] font-semibold uppercase tracking-widest text-[#6B6B6B]">
            <a href="#features" className="hover:text-[#1A1A1A] transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors">Planos</a>
            <button onClick={handleLoginClick} className="hover:text-[#1A1A1A] transition-colors cursor-pointer bg-transparent border-0 font-semibold uppercase tracking-widest text-[10px] sm:text-[12px]">Acesso</button>
          </div>
          <p className="text-[10px] sm:text-[12px] font-medium text-[#6B6B6B]">
            © {new Date().getFullYear()} Sommelyx
          </p>
        </div>
      </footer>
    </div>
  );
}
