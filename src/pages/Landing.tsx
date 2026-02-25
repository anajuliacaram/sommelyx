import { motion } from "framer-motion";
import { Wine, BarChart3, Shield, Smartphone, Star, TrendingUp, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { WineMesh, WineDivider } from "@/components/WineMesh";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
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

/* Floating dashboard mockup with perspective depth */
function DashboardMockup() {
  return (
    <motion.div
      className="relative mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Glow behind */}
      <div className="absolute -inset-8 rounded-3xl opacity-40" style={{ background: "radial-gradient(ellipse at center, hsl(340 55% 20% / 0.3), transparent 70%)" }} />

      <div className="relative surface-elevated rounded-2xl p-[2px] overflow-hidden" style={{ transform: "perspective(1400px) rotateX(4deg)", transformOrigin: "center bottom" }}>
        {/* Subtle border gradient */}
        <div className="absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(135deg, hsl(340 40% 25% / 0.3), transparent 50%, hsl(37 30% 45% / 0.15))" }} />

        <div className="relative bg-background rounded-[14px] overflow-hidden">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30 bg-card/30">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-wine-vivid/30" />
              <div className="w-2 h-2 rounded-full bg-gold/20" />
              <div className="w-2 h-2 rounded-full bg-muted-foreground/15" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="skeleton-premium h-2.5 w-40 rounded-full" />
            </div>
            <div className="w-12" />
          </div>

          {/* Mock dashboard */}
          <div className="flex">
            {/* Mini sidebar */}
            <div className="w-44 border-r border-border/20 p-3 space-y-1.5 hidden sm:block">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md ${i === 1 ? "bg-sidebar-accent/50" : ""}`}>
                  <div className="skeleton-premium h-3 w-3 rounded" />
                  <div className="skeleton-premium h-2 w-16 rounded" />
                </div>
              ))}
            </div>

            {/* Main */}
            <div className="flex-1 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="skeleton-premium h-4 w-28 rounded" />
                  <div className="skeleton-premium h-2.5 w-44 rounded" />
                </div>
                <div className="skeleton-premium h-7 w-24 rounded-md" />
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { v: "2.847", l: "Garrafas" },
                  { v: "R$ 184k", l: "Valor" },
                  { v: "94.2", l: "Nota Média" },
                  { v: "+12%", l: "Este Mês" },
                ].map((m, i) => (
                  <div key={i} className="card-depth p-3 space-y-1.5">
                    <div className="text-[10px] text-muted-foreground">{m.l}</div>
                    <div className="text-sm font-bold text-foreground font-sans">{m.v}</div>
                  </div>
                ))}
              </div>

              <div className="card-depth p-4">
                <div className="text-[10px] text-muted-foreground mb-3">Evolução da Coleção</div>
                <div className="flex gap-1.5 items-end h-16">
                  {[28, 45, 35, 62, 48, 70, 42, 58, 75, 52, 82, 65, 88, 72, 68, 90].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-[2px] transition-all"
                      style={{
                        height: `${h * 0.65}%`,
                        background: i >= 13
                          ? "linear-gradient(to top, hsl(340 45% 32%), hsl(340 50% 42%))"
                          : `hsl(340 10% ${14 + (i % 3)}%)`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating shadow */}
      <div className="absolute -bottom-8 left-[15%] right-[15%] h-16 rounded-full blur-3xl" style={{ background: "hsl(340 30% 8% / 0.8)" }} />
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-2xl border-b border-border/20">
        <div className="container mx-auto flex items-center justify-between h-14 px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md gradient-wine flex items-center justify-center">
              <Wine className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight font-sans">WineVault</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-muted-foreground font-medium">
            <a href="#features" className="hover:text-foreground transition-colors duration-200">Funcionalidades</a>
            <a href="#pricing" className="hover:text-foreground transition-colors duration-200">Planos</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-[13px] h-8" onClick={() => navigate("/login")}>
              Entrar
            </Button>
            <Button size="sm" className="gradient-wine text-primary-foreground btn-glow text-[13px] h-8 px-5" onClick={() => navigate("/signup")}>
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-24 pb-4 px-4 min-h-[90vh] flex flex-col justify-center noise">
        {/* Layered background */}
        <div className="absolute inset-0 gradient-wine-deep" />
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <WineMesh variant="hero" />

        <div className="container mx-auto relative z-10 max-w-6xl">
          {/* Tag */}
          <motion.div className="flex justify-center mb-10" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium border border-border/30 bg-card/20 backdrop-blur-xl text-muted-foreground tracking-wide uppercase">
              <Sparkles className="h-3 w-3 text-gold" /> Wine Tech Platform
            </span>
          </motion.div>

          {/* Editorial headline */}
          <div className="max-w-5xl mx-auto relative">
            {/* Glow behind headline */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse, hsl(340 50% 20% / 0.25), transparent 70%)", filter: "blur(60px)" }} />

            <motion.h1
              className="text-center text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] font-serif font-black text-foreground leading-[0.92] mb-8 relative z-10"
              style={{ letterSpacing: "-0.04em" }}
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              <span className="block">Sua adega,</span>
              <span className="relative inline-block mt-1">
                <span className="text-gradient-gold italic">inteligente</span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-[2px]"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(37 35% 55% / 0.6), hsl(37 38% 65% / 0.3), transparent)" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className="text-gradient-gold italic">.</span>
            </motion.h1>

            <motion.p
              className="text-center text-sm sm:text-base text-secondary-foreground max-w-md mx-auto mb-10 leading-[1.8] font-light"
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              Gerencie sua coleção pessoal ou operação comercial com{" "}
              <span className="text-foreground font-normal">tecnologia de ponta</span> e insights que fazem a diferença.
            </motion.p>

            {/* CTAs */}
            <motion.div className="flex flex-col sm:flex-row gap-3 justify-center items-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
              <Button
                size="lg"
                className="gradient-wine text-primary-foreground btn-glow text-[14px] px-8 h-12 font-medium shadow-wine"
                onClick={() => navigate("/signup")}
              >
                Começar Gratuitamente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-[13px] px-6 h-12 text-muted-foreground hover:text-foreground font-medium"
                onClick={() => navigate("/login")}
              >
                Já tenho conta →
              </Button>
            </motion.div>
          </div>

          {/* Dashboard mockup */}
          <div className="mt-20 mb-8">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-y border-border/20 bg-card/40 backdrop-blur-xl">
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
              <motion.div key={stat.label} className="px-6 py-6 text-center" variants={fadeUp}>
                <p className="text-lg sm:text-xl font-bold text-foreground font-sans tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="relative py-28 px-4">
        <WineMesh variant="subtle" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="mb-20" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-medium text-gold uppercase tracking-[0.15em] mb-4 block">Funcionalidades</span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground tracking-tight max-w-2xl" style={{ lineHeight: "1.05" }}>
              Tudo para gerenciar
              <br />
              <span className="text-gradient-wine">seus vinhos</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group card-depth p-7 hover:border-border transition-all duration-200"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -2 }}
              >
                <div className="w-9 h-9 rounded-lg gradient-wine flex items-center justify-center mb-4 group-hover:shadow-wine transition-shadow duration-200">
                  <f.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5 font-sans tracking-tight">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-[1.7]">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WineDivider />

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="relative py-28 px-4">
        <WineMesh variant="subtle" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mb-20" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-medium text-gold uppercase tracking-[0.15em] mb-4 block">Planos</span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground tracking-tight max-w-xl" style={{ lineHeight: "1.05" }}>
              Planos para cada
              <br />
              <span className="italic text-gradient-gold">necessidade</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-3">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`rounded-2xl p-7 transition-all duration-200 relative ${
                  plan.highlighted
                    ? "gradient-wine text-primary-foreground shadow-wine glow-wine border border-wine-vivid/20"
                    : "card-depth hover:border-border"
                }`}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -2 }}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-gold text-gold-foreground tracking-wide uppercase">
                    Popular
                  </span>
                )}
                <h3 className="text-base font-bold font-sans mb-0.5 tracking-tight">{plan.name}</h3>
                <p className={`text-[11px] mb-5 ${plan.highlighted ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                  {plan.desc}
                </p>
                <div className="mb-6">
                  <span className="text-3xl font-bold font-sans tracking-tight">{plan.price}</span>
                  <span className={`text-[11px] ml-1 ${plan.highlighted ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs">
                      <Check className={`h-3 w-3 flex-shrink-0 ${plan.highlighted ? "text-gold-light" : "text-primary"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-11 text-xs font-medium ${
                    plan.highlighted
                      ? "bg-primary-foreground text-wine hover:bg-primary-foreground/90 btn-gold-glow"
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
      <footer className="border-t border-border/20 py-10 px-4 relative z-10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-wine flex items-center justify-center">
              <Wine className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-[13px] text-foreground font-sans tracking-tight">WineVault</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            © 2026 WineVault. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
