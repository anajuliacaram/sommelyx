import { motion } from "framer-motion";
import { Wine, BarChart3, Shield, Smartphone, Star, TrendingUp, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { WineDivider } from "@/components/WineMesh";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
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

/* Floating dashboard mockup with glassmorphism */
function DashboardMockup() {
  return (
    <motion.div
      className="relative mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 60, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Glow behind mockup */}
      <div
        className="absolute -inset-16 rounded-[40px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, hsl(338 55% 30% / 0.3), transparent 70%)" }}
      />

      <div
        className="relative rounded-2xl overflow-hidden border border-border/40"
        style={{
          transform: "perspective(1600px) rotateX(3deg)",
          transformOrigin: "center bottom",
          background: "linear-gradient(135deg, hsl(340 18% 13% / 0.9), hsl(340 20% 9% / 0.95))",
          backdropFilter: "blur(40px)",
          boxShadow: "0 0 0 1px hsl(340 14% 20% / 0.3), 0 24px 80px -12px hsl(0 0% 0% / 0.6), 0 8px 24px -4px hsl(338 40% 15% / 0.3)",
        }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30" style={{ background: "hsl(340 18% 10% / 0.6)" }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0 60% 55% / 0.6)" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(45 70% 55% / 0.5)" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(130 50% 50% / 0.5)" }} />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="h-3 w-44 rounded-full" style={{ background: "hsl(340 14% 16%)" }} />
          </div>
          <div className="w-14" />
        </div>

        {/* Mock dashboard content */}
        <div className="flex min-h-[260px]">
          {/* Mini sidebar */}
          <div className="w-44 border-r border-border/20 p-3 space-y-1.5 hidden sm:block" style={{ background: "hsl(340 20% 8% / 0.5)" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${i === 1 ? "bg-primary/10 border border-primary/15" : ""}`}>
                <div className="h-3.5 w-3.5 rounded" style={{ background: i === 1 ? "hsl(338 50% 52%)" : "hsl(340 12% 20%)" }} />
                <div className="h-2 rounded" style={{ width: `${50 + i * 8}px`, background: "hsl(340 12% 18%)" }} />
              </div>
            ))}
          </div>

          {/* Main area */}
          <div className="flex-1 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded" style={{ background: "hsl(340 12% 20%)" }} />
                <div className="h-2.5 w-48 rounded" style={{ background: "hsl(340 12% 15%)" }} />
              </div>
              <div className="h-8 w-28 rounded-lg" style={{ background: "linear-gradient(135deg, hsl(340 48% 38%), hsl(338 55% 46%))" }} />
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { v: "2.847", l: "Garrafas" },
                { v: "R$ 184k", l: "Valor" },
                { v: "94.2", l: "Nota Média" },
                { v: "+12%", l: "Este Mês" },
              ].map((m, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-border/25 space-y-1.5"
                  style={{ background: "hsl(340 16% 11% / 0.8)" }}
                >
                  <div className="text-[10px] text-muted-foreground">{m.l}</div>
                  <div className="text-sm font-bold text-foreground font-sans">{m.v}</div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-lg border border-border/25" style={{ background: "hsl(340 16% 11% / 0.6)" }}>
              <div className="text-[10px] text-muted-foreground mb-3">Evolução da Coleção</div>
              <div className="flex gap-1.5 items-end h-16">
                {[28, 45, 35, 62, 48, 70, 42, 58, 75, 52, 82, 65, 88, 72, 68, 90].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h * 0.65}%`,
                      background: i >= 13
                        ? "linear-gradient(to top, hsl(338 48% 38%), hsl(338 55% 52%))"
                        : `hsl(340 12% ${14 + (i % 3)}%)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shadow beneath mockup */}
      <div
        className="absolute -bottom-10 left-[10%] right-[10%] h-20 rounded-full blur-3xl pointer-events-none"
        style={{ background: "hsl(340 30% 5% / 0.9)" }}
      />
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(340 28% 5%) 0%, hsl(340 22% 4%) 50%, hsl(340 20% 3%) 100%)" }}>
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/15" style={{ background: "hsl(340 28% 5% / 0.75)", backdropFilter: "blur(24px) saturate(1.4)" }}>
        <div className="container mx-auto flex items-center justify-between h-14 px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md gradient-wine flex items-center justify-center">
              <Wine className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight font-sans">Sommelyx</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium" style={{ color: "hsl(25 10% 72%)" }}>
            <a href="#features" className="hover:text-foreground transition-colors duration-200">Funcionalidades</a>
            <a href="#pricing" className="hover:text-foreground transition-colors duration-200">Planos</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-[13px] h-8" onClick={() => navigate("/login")}>
              Entrar
            </Button>
            <Button
              size="sm"
              className="gradient-wine text-primary-foreground btn-glow text-[13px] h-8 px-5"
              onClick={() => navigate("/signup")}
            >
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-28 pb-8 px-4 min-h-[92vh] flex flex-col justify-center">
        {/* Background layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 35%, hsl(338 45% 12% / 0.5), transparent 70%)" }}
        />
        {/* Soft floating light streaks */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 40% 30% at 25% 50%, hsl(340 50% 18% / 0.15), transparent 60%)" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 35% 25% at 75% 40%, hsl(37 40% 25% / 0.08), transparent 60%)" }}
        />
        {/* Mesh gradient orbs */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: "15%", left: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, hsl(340 55% 20% / 0.12), transparent 70%)", filter: "blur(80px)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: "30%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, hsl(37 35% 25% / 0.08), transparent 70%)", filter: "blur(60px)" }}
          animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container mx-auto relative z-10 max-w-6xl">
          {/* Tag */}
          <motion.div className="flex justify-center mb-12" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-medium tracking-wide uppercase"
              style={{
                border: "1px solid hsl(340 14% 22% / 0.6)",
                background: "hsl(340 18% 10% / 0.5)",
                backdropFilter: "blur(16px)",
                color: "hsl(25 12% 80%)",
              }}
            >
              <Sparkles className="h-3 w-3 text-gold" /> Wine Tech Platform
            </span>
          </motion.div>

          {/* Hero headline */}
          <div className="max-w-5xl mx-auto relative">
            {/* Radial glow behind headline */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none"
              style={{ background: "radial-gradient(ellipse, hsl(338 50% 25% / 0.25), transparent 65%)", filter: "blur(80px)" }}
            />

            <motion.h1
              className="text-center text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] font-serif font-black leading-[0.92] mb-10 relative z-10"
              style={{ letterSpacing: "-0.04em", color: "hsl(25 15% 96%)" }}
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              <span className="block">Sua adega,</span>
              <span className="relative inline-block mt-1">
                <span className="text-gradient-gold italic">inteligente</span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-[2px]"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(37 38% 58% / 0.6), hsl(37 40% 68% / 0.3), transparent)" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className="text-gradient-gold italic">.</span>
            </motion.h1>

            <motion.p
              className="text-center text-base sm:text-lg max-w-lg mx-auto mb-12 font-light"
              style={{ color: "hsl(25 10% 78%)", lineHeight: 1.85 }}
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              Gerencie sua coleção pessoal ou operação comercial com{" "}
              <span style={{ color: "hsl(25 15% 92%)", fontWeight: 400 }}>tecnologia de ponta</span> e insights que fazem a diferença.
            </motion.p>

            {/* CTAs */}
            <motion.div className="flex flex-col sm:flex-row gap-3 justify-center items-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
              <Button
                size="lg"
                className="text-[14px] px-10 h-13 font-semibold relative overflow-hidden group"
                onClick={() => navigate("/signup")}
                style={{
                  background: "linear-gradient(135deg, hsl(338 52% 48%), hsl(330 55% 52%), hsl(320 50% 55%))",
                  color: "white",
                  boxShadow: "0 0 30px hsl(338 55% 45% / 0.3), 0 4px 16px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(338 50% 65% / 0.3)",
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Começar Gratuitamente <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-[13px] px-7 h-13 font-medium border-border/40 hover:border-border/70 hover:bg-card/30"
                style={{ color: "hsl(25 10% 78%)" }}
                onClick={() => navigate("/login")}
              >
                Já tenho conta →
              </Button>
            </motion.div>
          </div>

          {/* Dashboard mockup */}
          <div className="mt-28 mb-8">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-y border-border/20" style={{ background: "hsl(340 22% 7% / 0.7)", backdropFilter: "blur(20px)" }}>
        <div className="container mx-auto max-w-5xl">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/20"
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
            ].map((stat) => (
              <motion.div key={stat.label} className="px-6 py-8 text-center" variants={fadeUp}>
                <p className="text-lg sm:text-xl font-bold font-sans tracking-tight" style={{ color: "hsl(25 15% 95%)" }}>{stat.value}</p>
                <p className="text-[11px] mt-1.5" style={{ color: "hsl(25 8% 58%)" }}>{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="relative py-36 px-4">
        {/* Subtle ambient light */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 30%, hsl(340 40% 10% / 0.2), transparent 70%)" }} />

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="mb-20" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] mb-4 block" style={{ color: "hsl(37 34% 60%)" }}>Funcionalidades</span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight max-w-2xl" style={{ lineHeight: "1.05", color: "hsl(25 15% 95%)" }}>
              Tudo para gerenciar
              <br />
              <span className="text-gradient-wine">seus vinhos</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group rounded-xl p-8 transition-all duration-300 border border-border/30 hover:border-border/60"
                style={{
                  background: "linear-gradient(160deg, hsl(340 18% 12% / 0.8), hsl(340 20% 9% / 0.6))",
                  boxShadow: "0 2px 8px hsl(0 0% 0% / 0.15), inset 0 1px 0 hsl(340 12% 22% / 0.1)",
                }}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -3, transition: { duration: 0.25 } }}
              >
                <div className="w-10 h-10 rounded-lg gradient-wine flex items-center justify-center mb-6 group-hover:shadow-wine transition-shadow duration-300">
                  <f.icon className="h-4.5 w-4.5 text-primary-foreground" />
                </div>
                <h3 className="text-sm font-semibold mb-2.5 font-sans tracking-tight" style={{ color: "hsl(25 15% 93%)" }}>{f.title}</h3>
                <p className="text-[13px] leading-[1.8]" style={{ color: "hsl(25 8% 62%)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WineDivider />

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="relative py-36 px-4">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, hsl(340 35% 8% / 0.3), transparent 70%)" }} />

        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mb-20" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] mb-4 block" style={{ color: "hsl(37 34% 60%)" }}>Planos</span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight max-w-xl" style={{ lineHeight: "1.05", color: "hsl(25 15% 95%)" }}>
              Planos para cada
              <br />
              <span className="italic text-gradient-gold">necessidade</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`rounded-2xl p-8 transition-all duration-300 relative ${
                  plan.highlighted ? "border border-primary/30" : "border border-border/30 hover:border-border/60"
                }`}
                style={plan.highlighted ? {
                  background: "linear-gradient(160deg, hsl(338 48% 38%), hsl(338 52% 32%))",
                  boxShadow: "0 0 40px hsl(338 55% 35% / 0.25), 0 24px 48px -12px hsl(0 0% 0% / 0.4), inset 0 1px 0 hsl(338 50% 55% / 0.2)",
                } : {
                  background: "linear-gradient(160deg, hsl(340 18% 12% / 0.8), hsl(340 20% 9% / 0.6))",
                  boxShadow: "0 2px 8px hsl(0 0% 0% / 0.15), inset 0 1px 0 hsl(340 12% 22% / 0.1)",
                }}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -3, transition: { duration: 0.25 } }}
              >
                {plan.highlighted && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase"
                    style={{ background: "hsl(37 34% 55%)", color: "hsl(340 18% 8%)" }}
                  >
                    Popular
                  </span>
                )}
                <h3 className="text-base font-bold font-sans mb-1 tracking-tight" style={{ color: plan.highlighted ? "white" : "hsl(25 15% 93%)" }}>{plan.name}</h3>
                <p className="text-[12px] mb-6" style={{ color: plan.highlighted ? "hsl(0 0% 100% / 0.55)" : "hsl(25 8% 58%)" }}>
                  {plan.desc}
                </p>
                <div className="mb-7">
                  <span className="text-3xl font-bold font-sans tracking-tight" style={{ color: plan.highlighted ? "white" : "hsl(25 15% 95%)" }}>{plan.price}</span>
                  <span className="text-[12px] ml-1" style={{ color: plan.highlighted ? "hsl(0 0% 100% / 0.55)" : "hsl(25 8% 58%)" }}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-9">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px]" style={{ color: plan.highlighted ? "hsl(0 0% 100% / 0.85)" : "hsl(25 10% 78%)" }}>
                      <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: plan.highlighted ? "hsl(37 40% 70%)" : "hsl(338 52% 55%)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-11 text-[13px] font-medium ${
                    plan.highlighted
                      ? "bg-white text-background hover:bg-white/90"
                      : "gradient-wine text-primary-foreground btn-glow"
                  }`}
                  onClick={() => navigate("/signup")}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-14 px-4 relative z-10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-wine flex items-center justify-center">
              <Wine className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-[13px] font-sans tracking-tight" style={{ color: "hsl(25 15% 93%)" }}>Sommelyx</span>
          </div>
          <p className="text-[11px]" style={{ color: "hsl(25 8% 48%)" }}>
            © 2026 Sommelyx. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
