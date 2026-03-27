import { useEffect } from "react";
import { motion } from "framer-motion";
import { Wine, Bell, ArrowRight, Check, Package, GlassWater, ShieldCheck, Clock } from "lucide-react";
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

const pillars = [
  {
    icon: Wine,
    title: "Organize",
    headline: "Cada garrafa no lugar certo",
    desc: "Cadastre safra, produtor, uva e localização. Encontre qualquer rótulo em segundos.",
    color: "#8F2D56",
  },
  {
    icon: Clock,
    title: "Saiba quando beber",
    headline: "Nunca perca o ponto ideal",
    desc: "Alertas de janela de consumo avisam quando cada garrafa está pronta para abrir.",
    color: "#22c55e",
  },
  {
    icon: ShieldCheck,
    title: "Controle total",
    headline: "Estoque, consumo e visão clara",
    desc: "Acompanhe o que entra e sai, monitore estoque baixo e tome decisões com dados reais.",
    color: "#3b82f6",
  },
];

const plans = [
  {
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    desc: "Para colecionadores sérios",
    trial: "14 dias grátis",
    features: ["Garrafas ilimitadas", "Alertas de consumo ideal", "Insights e relatórios", "Exportação CSV"],
    cta: "Começar 14 dias grátis",
    tier: "pro" as const,
  },
  {
    name: "Business",
    price: "R$ 99",
    period: "/mês",
    desc: "Para restaurantes, bares e lojas",
    trial: "14 dias grátis",
    features: ["Tudo do Pro", "Gestão de vendas e estoque", "Relatórios financeiros", "Curva ABC e giro"],
    cta: "Começar 14 dias grátis",
    tier: "business" as const,
  },
];

const tierStyle = (tier: "pro" | "business") => {
  if (tier === "business") return {
    bg: { background: "linear-gradient(160deg, #2B0F1F 0%, #4A1932 52%, #6A2143 100%)", boxShadow: "0 16px 32px rgba(74,25,50,0.25), 0 0 0 1px rgba(255,255,255,0.12) inset", border: "1px solid rgba(255,255,255,0.14)" },
    text: "white", sub: "rgba(255,255,255,0.55)", price: "white", period: "rgba(255,255,255,0.35)", feat: "rgba(255,255,255,0.88)", border: "rgba(255,255,255,0.12)",
    checkBg: "rgba(255,225,236,0.18)", checkColor: "#FFD3E4",
    btn: "bg-white text-[#3B1326] hover:bg-[#FFF7FA] border border-white/70 shadow-[0_8px_20px_rgba(20,8,14,0.2)]",
    badge: true,
  };
  return {
    bg: { background: "linear-gradient(160deg, #8C2044 0%, #B5436A 52%, #D4638A 100%)", boxShadow: "0 12px 28px rgba(140,32,68,0.2), 0 0 0 1px rgba(255,255,255,0.15) inset", border: "1px solid rgba(255,255,255,0.18)" },
    text: "white", sub: "rgba(255,255,255,0.6)", price: "white", period: "rgba(255,255,255,0.4)", feat: "rgba(255,255,255,0.9)", border: "rgba(255,255,255,0.15)",
    checkBg: "rgba(255,255,255,0.2)", checkColor: "#FFE0EC",
    btn: "bg-white text-[#8C2044] hover:bg-[#FFF7FA] border border-white/70 shadow-[0_8px_20px_rgba(140,32,68,0.15)]",
    badge: true,
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
    <div className="min-h-screen overflow-hidden premium-noise selection:bg-[#8F2D56]/20 selection:text-[#0F0F14] bg-[radial-gradient(circle_at_12%_-8%,rgba(173,69,104,0.18),transparent_40%),radial-gradient(circle_at_82%_6%,rgba(255,255,255,0.85),transparent_35%),#f6f3f5] text-[#0F0F14]">

      {/* ─── HEADER ─── */}
      <motion.header
        className="fixed top-0 w-full z-50 px-4 sm:px-6 py-2.5 sm:py-5 lg:py-6 bg-[#FFF8FB]/78 backdrop-blur-2xl border-b border-[#8C2044]/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <a href="/" className="flex items-center gap-2 sm:gap-3 transition-opacity duration-300 hover:opacity-80">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-8 sm:h-[68px] md:h-[90px] w-auto object-contain" />
            <span className="text-lg sm:text-[30px] md:text-[38px] font-black tracking-tight font-sans hidden xsm:block text-[#0F0F14]" style={{ letterSpacing: "-0.04em" }}>
              Sommelyx
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-6">
            <MagneticButton>
              <Button
                variant="outline"
                className="inline-flex h-8 sm:h-11 md:h-12 rounded-full px-3.5 sm:px-6 md:px-7 text-[11px] sm:text-[14px] font-semibold text-foreground bg-transparent border border-border/60 shadow-none transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-[0_4px_14px_hsl(var(--primary)/0.25)] active:bg-[hsl(340,54%,30%)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                onClick={handleLoginClick}
              >
                Entrar
              </Button>
            </MagneticButton>
            <MagneticButton>
              <Button
                className="px-3.5 sm:px-6 md:px-9 h-8 sm:h-11 md:h-12 text-[10px] sm:text-[13px] font-black uppercase tracking-[0.1em] sm:tracking-[0.13em] rounded-2xl transition-all shadow-[0_10px_22px_-12px_rgba(140,32,68,0.28)] hover:shadow-[0_16px_30px_-16px_rgba(140,32,68,0.36)] bg-[#0F0F14] hover:bg-[#202028] text-white"
                onClick={handleStartFreeClick}
              >
                Começar Grátis
              </Button>
            </MagneticButton>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-24 sm:pt-32 lg:pt-36 pb-2 sm:pb-4 px-4 sm:px-6 flex items-center overflow-visible">
        <div className="absolute inset-x-0 top-0 h-[76%] bg-[radial-gradient(circle_at_18%_22%,rgba(143,45,86,0.16),transparent_46%),radial-gradient(circle_at_82%_18%,rgba(196,69,105,0.14),transparent_42%),linear-gradient(180deg,rgba(255,246,251,0.8),transparent_72%)] pointer-events-none" />
        <div className="absolute top-[-12%] left-[-12%] w-[46vw] h-[46vw] rounded-full bg-[#8C2044]/14 blur-[130px] pointer-events-none" />

        <div className="container mx-auto relative z-10 max-w-3xl">
          <div className="flex flex-col items-center text-center">
            <motion.h1
              className="font-serif font-black text-[#0F0F14]"
              style={{ fontSize: "clamp(28px, 5vw, 64px)", lineHeight: 1.08, letterSpacing: "-0.04em" }}
              initial="hidden" animate="visible" variants={fadeUp} custom={0}
            >
              Gerencie sua adega e nunca mais perca o{" "}
              <span className="italic text-gradient-wine">ponto ideal de consumo</span>
            </motion.h1>

            <motion.p
              className="text-base sm:text-lg md:text-xl max-w-[540px] mt-4 sm:mt-5 font-medium text-[#4B5563]"
              style={{ lineHeight: 1.5 }}
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              Organize, acompanhe e saiba exatamente quando abrir cada garrafa.
            </motion.p>

            <motion.div
              className="mt-5 sm:mt-7"
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              <MagneticButton>
                <Button
                  className="group relative isolate px-10 sm:px-14 h-13 sm:h-[60px] text-[13px] sm:text-[15px] font-black uppercase tracking-[0.14em] rounded-2xl transition-all text-white hover:-translate-y-1.5 shadow-[0_18px_40px_rgba(122,35,72,0.44)] hover:shadow-[0_24px_52px_rgba(122,35,72,0.52)] border border-white/25"
                  style={{ background: "linear-gradient(130deg, #a83866 0%, #7f1e44 42%, #5c1632 100%)" }}
                  onClick={handleStartFreeClick}
                >
                  <span className="pointer-events-none absolute inset-[1px] rounded-[14px] bg-gradient-to-b from-white/30 via-transparent to-transparent" />
                  Começar Grátis
                </Button>
              </MagneticButton>
            </motion.div>

            <motion.p
              className="mt-2.5 text-[12px] text-[#9CA3AF] font-medium flex items-center gap-1.5"
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
            >
              <Check className="h-3.5 w-3.5 text-[#8C2044]" /> Sem cartão de crédito. Comece em 30 segundos.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ═══════════════ 3 PILLARS ═══════════════ */}
      <section id="features" className="relative px-4 sm:px-6 py-4 sm:py-6">
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="text-center mb-5 sm:mb-7" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black tracking-tight text-[#0F0F14] leading-[1.08]">
              Controle sua adega, saiba o momento ideal
              <br className="hidden sm:block" />
              <span className="italic text-gradient-wine"> e evite perder garrafas</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4 lg:gap-6">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                className="rounded-2xl p-5 sm:p-6 text-center relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 20px -8px rgba(0,0,0,0.06)" }}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -4, transition: { duration: 0.3 } }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${p.color}14` }}>
                  <p.icon className="h-6 w-6" style={{ color: p.color }} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 block" style={{ color: p.color }}>{p.title}</span>
                <h3 className="text-lg font-serif font-bold text-[#0F0F14] mb-2">{p.headline}</h3>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="relative bg-[#FAFAFA] px-4 sm:px-6 py-6 sm:py-8 lg:py-10">
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mx-auto mb-6 sm:mb-8 max-w-xl text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black tracking-tight text-[#0F0F14] leading-[1.08]">
              Escolha o plano <span className="italic text-gradient-wine">ideal</span>
            </h2>
            <p className="mt-3 text-[14px] text-[#6B7280] font-medium max-w-md mx-auto">
              Da coleção pessoal à operação comercial.
            </p>
          </motion.div>

          {/* Mobile: horizontal scroll */}
          <div className="flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-3 pb-4 -mx-4 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth", scrollPaddingLeft: "16px" }}>
            {plans.map((plan, i) => {
              const s = tierStyle(plan.tier);
              return (
                <motion.div key={plan.name} className="snap-start shrink-0 w-[75vw] max-w-[320px] rounded-2xl overflow-hidden flex flex-col p-3.5" style={s.bg} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                  {s.badge && (
                    <div className="flex justify-end mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[7px] font-black tracking-[0.12em] uppercase bg-gradient-to-r from-[#EAB3C8]/80 to-[#D1739A]/80 text-[#3B1326] border border-white/40 shadow-sm">
                        {plan.tier === "pro" ? "Colecionadores" : "Operações"}
                      </span>
                    </div>
                  )}
                  <h3 className="text-sm font-serif font-black tracking-tight" style={{ color: s.text }}>{plan.name}</h3>
                  <p className="text-[10px] mb-1.5 font-medium" style={{ color: s.sub }}>{plan.desc}</p>
                  <div className="mb-1 flex items-baseline gap-1 border-b pb-2" style={{ borderColor: s.border }}>
                    <span className="text-2xl font-black font-sans tracking-tighter" style={{ color: s.price }}>{plan.price}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: s.period }}>{plan.period}</span>
                  </div>
                  <p className="text-[9px] font-bold mb-2 tracking-wide" style={{ color: s.checkColor }}>
                    ✦ {plan.trial}
                  </p>
                  <ul className="space-y-1 mb-3">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-[10px] leading-snug font-medium" style={{ color: s.feat }}>
                        <div className="w-3 h-3 rounded-full flex items-center justify-center shrink-0" style={{ background: s.checkBg }}>
                          <Check className="h-1.5 w-1.5" style={{ color: s.checkColor }} strokeWidth={3} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className={`mt-auto w-full h-8 rounded-xl text-[10px] font-bold tracking-wide transition-all duration-300 ${s.btn}`} onClick={handleStartFreeClick}>
                    {plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Desktop */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-6 max-w-[720px] mx-auto items-stretch">
            {plans.map((plan, i) => {
              const s = tierStyle(plan.tier);
              return (
                <motion.div
                  key={plan.name}
                  className="relative rounded-[24px] overflow-hidden flex flex-col p-7 md:p-9"
                  style={s.bg}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                  whileHover={{ y: -4, transition: { duration: 0.3 } }}
                >
                  {s.badge && (
                    <div className="absolute top-0 right-0 p-5">
                      <span className="px-3 py-1.5 rounded-full text-[9px] font-black tracking-[0.14em] uppercase bg-gradient-to-r from-[#EAB3C8]/80 to-[#D1739A]/80 text-[#3B1326] border border-white/40 shadow-sm backdrop-blur-sm">
                        {plan.tier === "pro" ? "Colecionadores" : "Operações"}
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-serif font-black tracking-tight" style={{ color: s.text }}>{plan.name}</h3>
                  <p className="text-[13px] mb-4 font-medium" style={{ color: s.sub }}>{plan.desc}</p>
                  <div className="mb-3 flex items-baseline gap-1.5 border-b pb-4" style={{ borderColor: s.border }}>
                    <span className="text-5xl font-black font-sans tracking-tighter" style={{ color: s.price }}>{plan.price}</span>
                    <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: s.period }}>{plan.period}</span>
                  </div>
                  <div className="mb-5 px-3 py-2 rounded-xl flex items-center justify-center gap-2" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <span className="text-[14px] font-black tracking-wide" style={{ color: s.text }}>
                      🎁 Teste grátis por 14 dias
                    </span>
                  </div>
                  <ul className="space-y-3 mb-7">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-[14px] leading-snug font-medium" style={{ color: s.feat }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: s.checkBg }}>
                          <Check className="h-3 w-3" style={{ color: s.checkColor }} strokeWidth={3} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className={`mt-auto w-full h-12 rounded-2xl text-[13px] font-bold tracking-wide transition-all duration-300 ${s.btn}`} onClick={handleStartFreeClick}>
                    {plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-5 sm:py-10 px-4 sm:px-6 relative z-10 bg-white border-t border-black/[0.04]">
        <div className="container mx-auto max-w-7xl flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:justify-between md:gap-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-6 sm:h-9 w-auto object-contain grayscale opacity-60" />
            <span className="font-black text-sm sm:text-[20px] font-sans tracking-tight text-foreground">Sommelyx</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-8 text-[10px] sm:text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Planos</a>
            <button onClick={handleLoginClick} className="hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 font-bold uppercase tracking-widest text-[10px] sm:text-[13px]">Acesso</button>
          </div>
          <p className="text-[10px] sm:text-[13px] font-medium text-muted-foreground text-center">
            © {new Date().getFullYear()} Sommelyx
          </p>
        </div>
      </footer>
    </div>
  );
}
