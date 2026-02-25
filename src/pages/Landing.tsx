import { motion } from "framer-motion";
import { Wine, BarChart3, Shield, Smartphone, Star, TrendingUp, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 20 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const features = [
  { icon: Wine, title: "Gestão Completa", desc: "Cadastre vinhos com todos os detalhes: safra, uvas, notas de degustação e mais." },
  { icon: BarChart3, title: "Analytics Inteligente", desc: "Dashboards visuais com métricas em tempo real da sua coleção ou negócio." },
  { icon: Shield, title: "Multi-tenant Seguro", desc: "Dados isolados por conta. Permissões granulares por papel de usuário." },
  { icon: Smartphone, title: "Mobile First", desc: "Interface responsiva otimizada para uso em celular, tablet e desktop." },
  { icon: Star, title: "Avaliações & Notas", desc: "Sistema de avaliação pessoal com notas de degustação detalhadas." },
  { icon: TrendingUp, title: "Relatórios Comerciais", desc: "Faturamento, margem, curva ABC e giro de estoque para negócios." },
];

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "/mês",
    desc: "Para começar a organizar",
    features: ["Até 50 garrafas", "Dashboard básico", "Notas de degustação", "1 usuário"],
    cta: "Começar Grátis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    desc: "Para colecionadores sérios",
    features: ["Garrafas ilimitadas", "Analytics avançado", "Wishlist & harmonização", "Alertas inteligentes", "Exportação CSV"],
    cta: "Iniciar Trial Grátis",
    highlighted: true,
  },
  {
    name: "Business",
    price: "R$ 99",
    period: "/mês",
    desc: "Para operações comerciais",
    features: ["Tudo do Pro", "Multiusuário (até 10)", "Gestão de vendas", "Relatórios financeiros", "Cadastro de clientes", "Suporte prioritário"],
    cta: "Falar com Vendas",
    highlighted: false,
  },
];

/* ─── Light theme color tokens ─── */
const c = {
  bg: "#F7F4F2",
  bgSubtle: "#F0EDEA",
  text: "#1A1A1A",
  textSecondary: "#5C5C5C",
  textTertiary: "#8A8A8A",
  border: "rgba(0,0,0,0.06)",
  borderHover: "rgba(0,0,0,0.12)",
  wine: "#6B1D3A",
  wineLight: "#C4457A",
  wineDark: "#4E1229",
  wineGlow: "rgba(107, 29, 58, 0.12)",
  gold: "#C9A86A",
  goldLight: "#D9BF8A",
  cardBg: "rgba(255,255,255,0.7)",
  cardBorder: "rgba(0,0,0,0.05)",
  navBg: "rgba(247,244,242,0.8)",
};

/* Dashboard mockup — light version */
function DashboardMockup() {
  return (
    <motion.div
      className="relative mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 50, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Glow behind */}
      <div
        className="absolute -inset-20 rounded-[48px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${c.wineGlow}, transparent 70%)` }}
      />

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          transform: "perspective(1600px) rotateX(3deg)",
          transformOrigin: "center bottom",
          background: "linear-gradient(135deg, #FFFFFF 0%, #FAFAF9 100%)",
          border: `1px solid ${c.border}`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 24px 80px -12px rgba(0,0,0,0.12), 0 8px 24px -4px rgba(0,0,0,0.06)",
        }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${c.border}`, background: "#FEFEFE" }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="h-5 w-52 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-[9px] text-gray-400 font-medium">app.sommelyx.com</span>
            </div>
          </div>
          <div className="w-14" />
        </div>

        {/* Mock content */}
        <div className="flex min-h-[280px]">
          {/* Sidebar */}
          <div className="w-44 p-3 space-y-1.5 hidden sm:block" style={{ borderRight: `1px solid ${c.border}`, background: "#FEFEFE" }}>
            {["Início", "Meus Vinhos", "Números", "Config"].map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium"
                style={{
                  background: i === 0 ? "rgba(155,45,94,0.06)" : "transparent",
                  color: i === 0 ? c.wine : c.textTertiary,
                  border: i === 0 ? `1px solid rgba(155,45,94,0.1)` : "1px solid transparent",
                }}
              >
                <div className="h-3 w-3 rounded" style={{ background: i === 0 ? c.wine : "#E5E5E5" }} />
                {label}
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 p-5 space-y-4" style={{ background: c.bgSubtle }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: c.text }}>Olá, Marcelo</div>
                <div className="text-[11px]" style={{ color: c.textTertiary }}>Resumo da sua adega</div>
              </div>
              <div
                className="h-8 px-4 rounded-lg flex items-center text-[11px] font-medium text-white"
                style={{ background: `linear-gradient(135deg, ${c.wine}, ${c.wineLight})` }}
              >
                + Adicionar
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { v: "2.847", l: "Garrafas" },
                { v: "R$ 184k", l: "Valor" },
                { v: "12", l: "Beber Agora" },
                { v: "+18", l: "Este Mês" },
              ].map((m, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg space-y-1"
                  style={{ background: "white", border: `1px solid ${c.border}` }}
                >
                  <div className="text-[10px] font-medium" style={{ color: c.textTertiary }}>{m.l}</div>
                  <div className="text-sm font-bold font-sans" style={{ color: c.text }}>{m.v}</div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-lg" style={{ background: "white", border: `1px solid ${c.border}` }}>
              <div className="text-[10px] font-medium mb-3" style={{ color: c.textTertiary }}>Evolução da Coleção</div>
              <div className="flex gap-1.5 items-end h-16">
                {[28, 45, 35, 62, 48, 70, 42, 58, 75, 52, 82, 65, 88, 72, 68, 90].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h * 0.65}%`,
                      background: i >= 13
                        ? `linear-gradient(to top, ${c.wine}, ${c.wineLight})`
                        : "#F0EEEC",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shadow */}
      <div
        className="absolute -bottom-8 left-[12%] right-[12%] h-16 rounded-full blur-3xl pointer-events-none"
        style={{ background: "rgba(0,0,0,0.06)" }}
      />
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: c.bg, color: c.text }}>
      {/* Ultra-subtle noise texture */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.025,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 w-full z-50"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(12px) saturate(1.4)",
          borderBottom: "1px solid rgba(155,45,94,0.06)",
          backgroundImage: "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(155,45,94,0.015), transparent 70%)",
        }}
      >
        <div className="container mx-auto flex items-center justify-between h-[56px] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${c.wine}, ${c.wineLight})`,
                boxShadow: `0 2px 8px ${c.wineGlow}`,
              }}
            >
              <Wine className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-extrabold tracking-tight font-sans" style={{ color: c.text }}>Sommelyx</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium" style={{ color: c.textSecondary }}>
            <a href="#features" className="hover:text-[#1A1A1A] transition-colors duration-200">Funcionalidades</a>
            <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors duration-200">Planos</a>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="text-[13px] h-9 px-4 hover:bg-black/[0.04] rounded-full"
              style={{ color: c.textSecondary }}
              onClick={() => navigate("/login")}
            >
              Entrar
            </Button>
            <Button
              size="sm"
              className="text-[13px] h-9 px-5 text-white border-0 rounded-full transition-all duration-200 hover:brightness-110 hover:shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${c.wineLight}, ${c.wine})`,
                boxShadow: `0 2px 16px ${c.wineGlow}, 0 1px 2px rgba(0,0,0,0.06)`,
              }}
              onClick={() => navigate("/signup")}
            >
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-28 pb-8 px-4 min-h-[92vh] flex flex-col justify-center">
        {/* Slow-drifting ambient gradient */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              "radial-gradient(ellipse 70% 50% at 45% 35%, rgba(155,45,94,0.045), transparent 65%)",
              "radial-gradient(ellipse 70% 50% at 55% 30%, rgba(155,45,94,0.035), transparent 65%)",
              "radial-gradient(ellipse 70% 50% at 45% 35%, rgba(155,45,94,0.045), transparent 65%)",
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              "radial-gradient(ellipse 40% 35% at 20% 50%, rgba(184,134,11,0.03), transparent 60%)",
              "radial-gradient(ellipse 40% 35% at 25% 45%, rgba(184,134,11,0.02), transparent 60%)",
              "radial-gradient(ellipse 40% 35% at 20% 50%, rgba(184,134,11,0.03), transparent 60%)",
            ],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              "radial-gradient(ellipse 35% 30% at 80% 40%, rgba(155,45,94,0.025), transparent 55%)",
              "radial-gradient(ellipse 35% 30% at 75% 45%, rgba(155,45,94,0.018), transparent 55%)",
              "radial-gradient(ellipse 35% 30% at 80% 40%, rgba(155,45,94,0.025), transparent 55%)",
            ],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Floating orbs */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: "12%", left: "8%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(155,45,94,0.05), transparent 70%)", filter: "blur(80px)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: "25%", right: "3%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,134,11,0.035), transparent 70%)", filter: "blur(70px)" }}
          animate={{ x: [0, -25, 0], y: [0, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container mx-auto relative z-10 max-w-6xl">
          {/* Tag */}
          <motion.div className="flex justify-center mb-10" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold tracking-wide uppercase"
              style={{
                border: `1px solid ${c.borderHover}`,
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(12px)",
                color: c.wine,
              }}
            >
              <Sparkles className="h-3 w-3" style={{ color: c.gold }} /> Wine Tech Platform
            </span>
          </motion.div>

          {/* Headline */}
          <div className="max-w-5xl mx-auto relative">
            {/* Subtle radial glow behind text */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(155,45,94,0.06), transparent 65%)", filter: "blur(60px)" }}
            />

            <motion.h1
              className="text-center text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] font-serif font-black leading-[0.92] mb-8 relative z-10"
              style={{ letterSpacing: "-0.04em", color: c.text }}
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              <span className="block">Sua adega,</span>
              <span className="relative inline-block mt-1">
                <span
                  className="italic"
                  style={{
                    background: `linear-gradient(135deg, ${c.wine}, ${c.wineLight}, ${c.goldLight})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  inteligente
                </span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${c.goldLight}, ${c.gold}, transparent)` }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span
                className="italic"
                style={{
                  background: `linear-gradient(135deg, ${c.wine}, ${c.wineLight})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >.</span>
            </motion.h1>

            <motion.p
              className="text-center text-base sm:text-lg max-w-lg mx-auto mb-12 font-light"
              style={{ color: c.textSecondary, lineHeight: 1.85 }}
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              Gerencie sua coleção pessoal ou operação comercial com{" "}
              <span style={{ color: c.text, fontWeight: 500 }}>tecnologia de ponta</span> e insights que fazem a diferença.
            </motion.p>

            {/* CTAs */}
            <motion.div className="flex flex-col sm:flex-row gap-3 justify-center items-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                <Button
                  size="lg"
                  className="text-[14px] px-10 h-13 font-semibold relative overflow-hidden group text-white border-0 rounded-full transition-shadow duration-250"
                  onClick={() => navigate("/signup")}
                  style={{
                    background: `linear-gradient(135deg, ${c.wine}, ${c.wineLight})`,
                    boxShadow: `0 0 40px ${c.wineGlow}, 0 4px 16px rgba(155,45,94,0.2), 0 1px 3px rgba(0,0,0,0.08)`,
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Começar Gratuitamente <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-[13px] px-7 h-13 font-medium rounded-full transition-all duration-250 hover:shadow-sm"
                  style={{
                    color: c.textSecondary,
                    border: `1px solid ${c.borderHover}`,
                    background: "rgba(255,255,255,0.5)",
                    backdropFilter: "blur(8px)",
                  }}
                  onClick={() => navigate("/login")}
                >
                  Já tenho conta →
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Dashboard mockup */}
          <div className="mt-28 mb-8">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <section
        className="relative z-10"
        style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, background: "rgba(255,255,255,0.5)", backdropFilter: "blur(16px)" }}
      >
        <div className="container mx-auto max-w-5xl">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ "--divide-color": c.border } as React.CSSProperties}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {[
              { label: "Garrafas gerenciadas", value: "2.847" },
              { label: "Valor em adegas", value: "R$ 184k" },
              { label: "Avaliações feitas", value: "1.293" },
              { label: "Usuários ativos", value: "12.5k" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="px-6 py-8 text-center"
                style={{ borderRight: i < 3 ? `1px solid ${c.border}` : "none" }}
                variants={fadeUp}
              >
                <p className="text-xl font-bold font-sans tracking-tight" style={{ color: c.text }}>{stat.value}</p>
                <p className="text-[11px] mt-1.5 font-medium" style={{ color: c.textTertiary }}>{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="relative py-32 px-4">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 50% 40% at 50% 30%, rgba(155,45,94,0.025), transparent 70%)" }}
        />

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="mb-20" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-4 block" style={{ color: c.wine }}>
              Funcionalidades
            </span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight max-w-2xl" style={{ lineHeight: "1.05", color: c.text }}>
              Tudo para gerenciar
              <br />
              <span
                className="italic"
                style={{
                  background: `linear-gradient(135deg, ${c.wine}, ${c.wineLight})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >seus vinhos</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group relative p-[1px] transition-all duration-[250ms] ease-out"
                style={{ borderRadius: 20 }}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{
                  y: -6,
                  scale: 1.01,
                  transition: { duration: 0.25, ease: "easeOut" },
                }}
              >
                {/* Gradient border layer */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: 20,
                    background: "linear-gradient(135deg, rgba(155,45,94,0.12), rgba(212,168,67,0.10), rgba(155,45,94,0.06))",
                  }}
                />
                {/* Card content */}
                <div
                  className="relative p-8 group-hover:bg-white/80 transition-[background,box-shadow] duration-[250ms]"
                  style={{
                    borderRadius: 19,
                    background: "rgba(255,255,255,0.65)",
                    backdropFilter: "blur(14px)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 transition-shadow duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${c.wine}, ${c.wineLight})`,
                      boxShadow: `0 3px 12px ${c.wineGlow}`,
                    }}
                  >
                    <f.icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold mb-2.5 font-sans tracking-tight" style={{ color: c.text }}>{f.title}</h3>
                  <p className="text-[13px] leading-[1.8]" style={{ color: c.textSecondary }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto max-w-5xl px-4">
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${c.border}, transparent)` }} />
      </div>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="relative py-32 px-4">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(155,45,94,0.02), transparent 70%)" }}
        />

        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mb-20" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-4 block" style={{ color: c.wine }}>Planos</span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight max-w-xl" style={{ lineHeight: "1.05", color: c.text }}>
              Planos para cada
              <br />
              <span
                className="italic"
                style={{
                  background: `linear-gradient(135deg, ${c.gold}, ${c.goldLight})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >necessidade</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className="rounded-2xl p-8 relative"
                style={plan.highlighted ? {
                  background: `linear-gradient(160deg, ${c.wine}, ${c.wineLight})`,
                  boxShadow: `0 0 60px ${c.wineGlow}, 0 24px 48px -12px rgba(155,45,94,0.2), 0 1px 3px rgba(0,0,0,0.08)`,
                  border: "1px solid rgba(255,255,255,0.15)",
                } : {
                  background: c.cardBg,
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${c.cardBorder}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)",
                }}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.25, ease: "easeOut" } }}
              >
                {plan.highlighted && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase"
                    style={{ background: c.gold, color: "white" }}
                  >
                    Popular
                  </span>
                )}
                <h3
                  className="text-base font-bold font-sans mb-1 tracking-tight"
                  style={{ color: plan.highlighted ? "white" : c.text }}
                >
                  {plan.name}
                </h3>
                <p className="text-[12px] mb-6" style={{ color: plan.highlighted ? "rgba(255,255,255,0.65)" : c.textTertiary }}>
                  {plan.desc}
                </p>
                <div className="mb-7">
                  <span
                    className="text-3xl font-bold font-sans tracking-tight"
                    style={{ color: plan.highlighted ? "white" : c.text }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-[12px] ml-1" style={{ color: plan.highlighted ? "rgba(255,255,255,0.55)" : c.textTertiary }}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-9">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-[13px]"
                      style={{ color: plan.highlighted ? "rgba(255,255,255,0.9)" : c.textSecondary }}
                    >
                      <Check
                        className="h-3.5 w-3.5 flex-shrink-0"
                        style={{ color: plan.highlighted ? c.goldLight : c.wine }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-11 text-[13px] font-medium rounded-full ${
                    plan.highlighted ? "" : "text-white border-0"
                  }`}
                  style={plan.highlighted ? {
                    background: "white",
                    color: c.wine,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  } : {
                    background: `linear-gradient(135deg, ${c.wine}, ${c.wineLight})`,
                    boxShadow: `0 2px 12px ${c.wineGlow}`,
                  }}
                  onClick={() => navigate("/signup")}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-14 px-4 relative z-10" style={{ borderTop: `1px solid ${c.border}` }}>
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${c.wine}, ${c.wineLight})` }}
            >
              <Wine className="h-3 w-3 text-white" />
            </div>
            <span className="font-bold text-[13px] font-sans tracking-tight" style={{ color: c.text }}>Sommelyx</span>
          </div>
          <p className="text-[11px]" style={{ color: c.textTertiary }}>
            © 2026 Sommelyx. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
