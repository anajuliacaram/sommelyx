import { useEffect } from "react";
import { motion } from "framer-motion";
import { Wine, Search, Bell, StickyNote, Upload, LayoutGrid, ArrowRight, Check, ShieldCheck, BarChart4, Package, TrendingUp, Users, GlassWater, Grape } from "lucide-react";
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

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const personalFeatures = [
  { icon: GlassWater, title: "Janela de Consumo", desc: "Saiba exatamente quando cada garrafa atinge seu melhor momento." },
  { icon: Wine, title: "Organização Total", desc: "Cadastre safra, produtor, uva e localização em fichas completas." },
  { icon: BarChart4, title: "Insights Pessoais", desc: "Acompanhe consumo, avaliações e a evolução da sua coleção." },
];

const commercialFeatures = [
  { icon: Package, title: "Controle de Estoque", desc: "Monitore entradas, saídas e níveis críticos em tempo real." },
  { icon: TrendingUp, title: "Giro & Performance", desc: "Identifique seus produtos mais rentáveis com a curva ABC." },
  { icon: Users, title: "Gestão Operacional", desc: "Relatórios financeiros, importação CSV e visão multiusuário." },
];

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "/mês",
    desc: "Para começar a organizar",
    features: ["Até 50 garrafas", "Dashboard básico", "Notas de degustação", "1 usuário"],
    cta: "Começar Grátis",
    tier: "free" as const,
  },
  {
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    desc: "Para colecionadores sérios",
    features: ["Garrafas ilimitadas", "Analytics avançado", "Wishlist & harmonização", "Alertas inteligentes", "Exportação CSV"],
    cta: "Assinar Pro",
    tier: "pro" as const,
  },
  {
    name: "Business",
    price: "R$ 99",
    period: "/mês",
    desc: "Para restaurantes, bares e lojas",
    features: ["Tudo do Pro", "Multiusuário (até 10)", "Gestão de vendas e estoque", "Relatórios financeiros", "Curva ABC e giro"],
    cta: "Começar Business",
    tier: "business" as const,
  },
];

const tierStyle = (tier: "free" | "pro" | "business") => {
  if (tier === "business") return {
    bg: { background: "linear-gradient(160deg, #2B0F1F 0%, #4A1932 52%, #6A2143 100%)", boxShadow: "0 16px 32px rgba(74,25,50,0.25), 0 0 0 1px rgba(255,255,255,0.12) inset", border: "1px solid rgba(255,255,255,0.14)" },
    text: "white", sub: "rgba(255,255,255,0.55)", price: "white", period: "rgba(255,255,255,0.35)", feat: "rgba(255,255,255,0.88)", border: "rgba(255,255,255,0.12)",
    checkBg: "rgba(255,225,236,0.18)", checkColor: "#FFD3E4",
    btn: "bg-white text-[#3B1326] hover:bg-[#FFF7FA] border border-white/70 shadow-[0_8px_20px_rgba(20,8,14,0.2)]",
    badge: true,
  };
  if (tier === "pro") return {
    bg: { background: "linear-gradient(160deg, #8C2044 0%, #B5436A 52%, #D4638A 100%)", boxShadow: "0 12px 28px rgba(140,32,68,0.2), 0 0 0 1px rgba(255,255,255,0.15) inset", border: "1px solid rgba(255,255,255,0.18)" },
    text: "white", sub: "rgba(255,255,255,0.6)", price: "white", period: "rgba(255,255,255,0.4)", feat: "rgba(255,255,255,0.9)", border: "rgba(255,255,255,0.15)",
    checkBg: "rgba(255,255,255,0.2)", checkColor: "#FFE0EC",
    btn: "bg-white text-[#8C2044] hover:bg-[#FFF7FA] border border-white/70 shadow-[0_8px_20px_rgba(140,32,68,0.15)]",
    badge: true,
  };
  return {
    bg: { background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,15,20,0.06)", boxShadow: "0 4px 16px -8px rgba(15,15,20,0.08)" },
    text: "#0F0F14", sub: "#9CA3AF", price: "#0F0F14", period: "#9CA3AF", feat: "#4B5563", border: "rgba(0,0,0,0.04)",
    checkBg: "rgba(140,32,68,0.08)", checkColor: "#8C2044",
    btn: "bg-[#F5F5F5] text-[#18181B] hover:bg-white shadow-[0_2px_8px_rgba(15,15,20,0.04)] border border-black/[0.06]",
    badge: false,
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
      <section id="features" className="relative pt-20 sm:pt-32 lg:pt-40 pb-6 sm:pb-8 lg:pb-14 px-4 sm:px-6 flex items-center overflow-visible">
        <div className="absolute inset-x-0 top-0 h-[76%] bg-[radial-gradient(circle_at_18%_22%,rgba(143,45,86,0.16),transparent_46%),radial-gradient(circle_at_82%_18%,rgba(196,69,105,0.14),transparent_42%),linear-gradient(180deg,rgba(255,246,251,0.8),transparent_72%)] pointer-events-none" />
        <div className="absolute inset-0 z-0 opacity-[0.28] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(88,20,46,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(88,20,46,0.07) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
        <div className="absolute top-[-12%] left-[-12%] w-[46vw] h-[46vw] rounded-full bg-[#8C2044]/14 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-30%] right-[-10%] w-[44vw] h-[44vw] rounded-full bg-[#e8cfda]/35 blur-[140px] pointer-events-none" />

        <div className="container mx-auto relative z-10 max-w-7xl">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="mb-4 sm:mb-6 flex items-center gap-3">
              <div className="h-7 sm:h-8 px-3 sm:px-4 rounded-full bg-[#8C2044]/8 border border-[#8C2044]/18 shadow-[0_8px_18px_rgba(140,32,68,0.08)] flex items-center justify-center">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#8C2044]">Gestão Inteligente de Vinhos</span>
              </div>
            </motion.div>

            <motion.h1
              className="font-serif font-black text-[#0F0F14]"
              style={{ fontSize: "clamp(32px, 5.5vw, 76px)", lineHeight: 1, letterSpacing: "-0.04em" }}
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              Sua coleção organizada.
              <br />
              <span className="italic text-gradient-wine">Sua operação sob controle.</span>
            </motion.h1>

            <motion.p
              className="text-base sm:text-lg md:text-[20px] max-w-[620px] mt-5 sm:mt-8 font-medium text-[#4B5563]"
              style={{ lineHeight: 1.5 }}
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              Para quem coleciona com paixão ou opera com precisão. Organize sua adega pessoal ou gerencie estoque, vendas e performance do seu negócio — tudo em um só lugar.
            </motion.p>

            <motion.div
              className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-center gap-3 sm:gap-5"
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
            >
              <MagneticButton>
                <Button
                  className="group relative isolate w-full sm:w-auto px-8 sm:px-14 h-12 sm:h-[64px] text-[12px] sm:text-[14px] font-black uppercase tracking-[0.14em] sm:tracking-[0.16em] rounded-2xl sm:rounded-[20px] transition-all text-white hover:-translate-y-1.5 shadow-[0_18px_40px_rgba(122,35,72,0.44)] hover:shadow-[0_24px_52px_rgba(122,35,72,0.52)] border border-white/25"
                  style={{ background: "linear-gradient(130deg, #a83866 0%, #7f1e44 42%, #5c1632 100%)" }}
                  onClick={handleStartFreeClick}
                >
                  <span className="pointer-events-none absolute inset-[1px] rounded-[18px] bg-gradient-to-b from-white/30 via-transparent to-transparent" />
                  Começar Grátis
                </Button>
              </MagneticButton>
            </motion.div>

            <motion.div
              className="mt-5 sm:mt-7 flex items-center gap-4 sm:gap-6 pt-3"
              initial="hidden" animate="visible" variants={fadeUp} custom={4}
            >
              <div className="flex -space-x-2.5 sm:-space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#FAFAFA] bg-slate-200 overflow-hidden"><img src="https://i.pravatar.cc/100?img=11" alt="Avatar" className="w-full h-full object-cover" /></div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#FAFAFA] bg-slate-300 overflow-hidden"><img src="https://i.pravatar.cc/100?img=12" alt="Avatar" className="w-full h-full object-cover" /></div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#FAFAFA] bg-slate-400 overflow-hidden"><img src="https://i.pravatar.cc/100?img=13" alt="Avatar" className="w-full h-full object-cover" /></div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#FAFAFA] bg-[#0F0F14] flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white">+2k</div>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] sm:text-[14px] font-bold text-[#0F0F14]">Colecionadores e gestores confiam</span>
                <span className="text-[11px] sm:text-[12px] font-medium text-[#7B6A73] flex items-center gap-1.5 mt-0.5">
                  <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#8C2044]" /> Comece em 30 segundos, sem cartão.
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TWO JOURNEYS ═══════════════ */}
      <section className="relative px-4 sm:px-6 py-10 sm:py-16 lg:py-20">
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="text-center mb-8 sm:mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-[0.22em] text-primary mb-2 block">
              Duas Jornadas, Uma Plataforma
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black tracking-tight text-[#0F0F14] leading-[1.08]">
              O que o Sommelyx faz <span className="italic text-gradient-wine">por você</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Personal Journey */}
            <motion.div
              className="rounded-[24px] p-6 sm:p-8 relative overflow-hidden"
              style={{ background: "linear-gradient(160deg, rgba(143,45,86,0.06), rgba(255,255,255,0.9))", border: "1px solid rgba(143,45,86,0.12)" }}
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#8F2D56]/8 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)" }}>
                  <Wine className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#0F0F14]">Adega Pessoal</h3>
                  <p className="text-[11px] font-medium text-[#9CA3AF]">Para colecionadores e entusiastas</p>
                </div>
              </div>
              <div className="space-y-4">
                {personalFeatures.map((f, i) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white shadow-sm border border-black/[0.04]">
                      <f.icon className="h-4 w-4 text-[#8C2044]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-[#0F0F14] mb-0.5">{f.title}</h4>
                      <p className="text-[13px] text-[#6B7280] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                className="mt-6 w-full h-11 rounded-xl text-[12px] font-bold tracking-wide bg-[#8F2D56] text-white hover:bg-[#7a1e47] transition-all"
                onClick={handleStartFreeClick}
              >
                Organizar minha coleção <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Button>
            </motion.div>

            {/* Commercial Journey */}
            <motion.div
              className="rounded-[24px] p-6 sm:p-8 relative overflow-hidden"
              style={{ background: "linear-gradient(160deg, #2B0F1F, #4A1932, #6A2143)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 16px 32px rgba(74,25,50,0.2)" }}
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/20">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">Operação Comercial</h3>
                  <p className="text-[11px] font-medium text-white/50">Para restaurantes, bares e lojas</p>
                </div>
              </div>
              <div className="space-y-4">
                {commercialFeatures.map((f, i) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/10 border border-white/10">
                      <f.icon className="h-4 w-4 text-white/80" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-0.5">{f.title}</h4>
                      <p className="text-[13px] text-white/60 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                className="mt-6 w-full h-11 rounded-xl text-[12px] font-bold tracking-wide bg-white text-[#3B1326] hover:bg-[#FFF7FA] transition-all"
                onClick={handleStartFreeClick}
              >
                Controlar minha operação <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="relative bg-[#FAFAFA] px-4 sm:px-6 pb-10 sm:pb-16 pt-6 sm:pt-8 lg:pb-20 lg:pt-10">
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mx-auto mb-6 sm:mb-10 max-w-2xl text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="mb-2 sm:mb-4 block text-[11px] sm:text-[13px] font-black uppercase tracking-[0.22em] text-primary">
              Planos
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black tracking-tight text-foreground leading-[1.08]">
              Escolha o plano <span className="italic text-gradient-wine">ideal</span>
            </h2>
            <p className="mt-3 text-[14px] sm:text-[16px] text-[#6B7280] font-medium max-w-md mx-auto">
              Da coleção pessoal à operação comercial, com tudo que você precisa.
            </p>
          </motion.div>

          {/* Mobile: horizontal scroll carousel */}
          <div className="flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-3 pb-4 -mx-4 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth", scrollPaddingLeft: "16px" }}>
            {plans.map((plan, i) => {
              const s = tierStyle(plan.tier);
              return (
                <motion.div
                  key={plan.name}
                  className="snap-start shrink-0 w-[75vw] max-w-[280px] rounded-2xl overflow-hidden flex flex-col p-3.5"
                  style={s.bg}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                >
                  {s.badge && (
                    <div className="flex justify-end mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[7px] font-black tracking-[0.12em] uppercase bg-gradient-to-r from-[#EAB3C8]/80 to-[#D1739A]/80 text-[#3B1326] border border-white/40 shadow-sm">
                        {plan.tier === "pro" ? "Colecionadores" : "Operações"}
                      </span>
                    </div>
                  )}
                  <h3 className="text-sm font-serif font-black tracking-tight" style={{ color: s.text }}>{plan.name}</h3>
                  <p className="text-[10px] mb-1.5 font-medium" style={{ color: s.sub }}>{plan.desc}</p>
                  <div className="mb-2 flex items-baseline gap-1 border-b pb-2" style={{ borderColor: s.border }}>
                    <span className="text-2xl font-black font-sans tracking-tighter" style={{ color: s.price }}>{plan.price}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: s.period }}>{plan.period}</span>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {plan.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[10px] leading-snug font-medium" style={{ color: s.feat }}>
                        <div className="w-3 h-3 rounded-full flex items-center justify-center shrink-0" style={{ background: s.checkBg }}>
                          <Check className="h-1.5 w-1.5" style={{ color: s.checkColor }} strokeWidth={3} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-auto w-full h-8 rounded-xl text-[10px] font-bold tracking-wide transition-all duration-300 ${s.btn}`}
                    onClick={handleStartFreeClick}
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Desktop: grid layout */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-4 lg:gap-5 items-center">
            {plans.map((plan, i) => {
              const s = tierStyle(plan.tier);
              const isScaled = plan.tier !== "free";
              return (
                <motion.div
                  key={plan.name}
                  className={`relative rounded-[24px] overflow-hidden flex flex-col ${isScaled ? "p-6 md:p-8 z-10" : "p-6 md:p-7"}`}
                  style={{ ...s.bg, ...(plan.tier === "business" ? { transform: "scale(1.06)" } : {}) }}
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
                  <h3 className="text-lg font-serif font-black tracking-tight" style={{ color: s.text }}>{plan.name}</h3>
                  <p className="text-[12px] mb-4 font-medium" style={{ color: s.sub }}>{plan.desc}</p>
                  <div className="mb-5 flex items-baseline gap-1 border-b pb-5" style={{ borderColor: s.border }}>
                    <span className="text-4xl md:text-5xl font-black font-sans tracking-tighter" style={{ color: s.price }}>{plan.price}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: s.period }}>{plan.period}</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[13px] leading-snug font-medium" style={{ color: s.feat }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: s.checkBg }}>
                          <Check className="h-2.5 w-2.5" style={{ color: s.checkColor }} strokeWidth={3} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-auto w-full h-11 rounded-2xl text-[12px] font-bold tracking-wide transition-all duration-300 ${s.btn}`}
                    onClick={handleStartFreeClick}
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ STATS ═══════════════ */}
      <section className="relative z-10 py-12 sm:py-24 border-y border-black/[0.04] bg-[#0F0F14] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
        <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-gradient-to-bl from-[#8C2044]/30 to-transparent blur-[140px] pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative z-10 px-4">
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-12 md:gap-0" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            {[
              { label: "Garrafas gerenciadas", value: "320k+" },
              { label: "Valor em acervos", value: "R$ 48M+" },
              { label: "Operações ativas", value: "1.2k+" },
              { label: "Satisfação", value: "99%" },
            ].map((stat) => (
              <motion.div key={stat.label} className="text-center relative md:border-r border-white/10 last:border-0" variants={fadeUp}>
                <p className="text-3xl sm:text-4xl md:text-6xl font-black font-serif tracking-tight text-white mb-1 sm:mb-3" style={{ textShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>{stat.value}</p>
                <p className="text-[10px] sm:text-[12px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/50">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-6 sm:py-14 px-4 sm:px-6 relative z-10 bg-white border-t border-black/[0.04]">
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
