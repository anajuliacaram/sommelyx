import { motion } from "framer-motion";
import { Wine, BarChart3, Shield, Smartphone, Star, TrendingUp, Users, Zap, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
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
    cta: "Iniciar Trial de 14 dias",
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

/* Decorative blob */
function Blob({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      style={{ background: "radial-gradient(circle, hsl(340 60% 25% / 0.15) 0%, transparent 70%)" }}
    />
  );
}

function GoldBlob({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      style={{ background: "radial-gradient(circle, hsl(37 40% 45% / 0.08) 0%, transparent 70%)" }}
    />
  );
}

/* Dashboard mockup floating */
function DashboardMockup() {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.6, duration: 1, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: "1200px" }}
    >
      <div className="surface-elevated rounded-2xl p-1 glow-wine">
        <div className="bg-background rounded-xl overflow-hidden">
          {/* Mock header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-wine-vivid/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-gold/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="skeleton-premium h-3 w-32 rounded-full" />
            </div>
          </div>
          {/* Mock content */}
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card-depth p-3 space-y-2">
                  <div className="skeleton-premium h-2.5 w-10 rounded" />
                  <div className="skeleton-premium h-5 w-14 rounded" />
                </div>
              ))}
            </div>
            <div className="card-depth p-4 space-y-3">
              <div className="skeleton-premium h-3 w-24 rounded" />
              <div className="flex gap-2 items-end">
                {[40, 65, 45, 80, 60, 75, 55, 70, 85, 50, 90, 72].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h * 0.6}px`,
                      background: i === 10
                        ? "linear-gradient(to top, hsl(340 50% 35%), hsl(340 55% 45%))"
                        : "hsl(340 10% 15%)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Shadow beneath */}
      <div className="absolute -bottom-6 left-[10%] right-[10%] h-12 bg-background/80 blur-2xl rounded-full" />
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background noise overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-wine flex items-center justify-center">
              <Wine className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold text-foreground tracking-tight font-sans">WineVault</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-muted-foreground font-medium">
            <a href="#features" className="hover:text-foreground transition-colors duration-200">Funcionalidades</a>
            <a href="#pricing" className="hover:text-foreground transition-colors duration-200">Planos</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-[13px]" onClick={() => navigate("/login")}>Entrar</Button>
            <Button size="sm" className="gradient-wine text-primary-foreground btn-glow text-[13px] h-8 px-4 rounded-lg" onClick={() => navigate("/signup")}>
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-8 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 gradient-wine-deep" />
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <Blob className="w-[600px] h-[600px] -top-40 -left-40" />
        <GoldBlob className="w-[400px] h-[400px] top-20 -right-20" />
        <Blob className="w-[300px] h-[300px] bottom-0 left-1/3" />

        <div className="container mx-auto relative z-10 max-w-6xl">
          {/* Badge */}
          <motion.div className="flex justify-center mb-8" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border border-border/50 bg-card/40 backdrop-blur-xl text-muted-foreground">
              <Sparkles className="h-3 w-3 text-gold" /> Plataforma Wine Tech Inteligente
            </span>
          </motion.div>

          {/* Headline — asymmetric, editorial */}
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-foreground leading-[0.95] mb-8 tracking-tight"
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              Sua adega,{" "}
              <br className="hidden sm:block" />
              <span className="relative inline-block">
                <span className="text-gradient-gold">inteligente</span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(37 35% 52%), hsl(37 38% 65%))" }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className="text-gradient-gold">.</span>
            </motion.h1>

            <motion.p
              className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              Gerencie sua coleção pessoal ou operação comercial com{" "}
              <span className="text-foreground/80 font-medium">tecnologia de ponta</span>,{" "}
              design premium e insights que fazem a diferença.
            </motion.p>

            <motion.div className="flex flex-col sm:flex-row gap-3 justify-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
              <Button
                size="lg"
                className="gradient-wine text-primary-foreground btn-glow text-sm px-7 h-11 rounded-xl font-medium"
                onClick={() => navigate("/signup")}
              >
                Começar Gratuitamente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-sm px-7 h-11 rounded-xl border-border/60 bg-card/30 backdrop-blur-xl hover:bg-card/50 font-medium"
                onClick={() => navigate("/login")}
              >
                Já tenho conta
              </Button>
            </motion.div>
          </div>

          {/* Dashboard mockup */}
          <div className="mt-16 max-w-3xl mx-auto">
            <DashboardMockup />
          </div>

          {/* Social proof numbers */}
          <motion.div
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border/30 bg-border/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            {[
              { label: "Garrafas Gerenciadas", value: "2.847" },
              { label: "Valor em Adegas", value: "R$ 184k" },
              { label: "Avaliações", value: "1.293" },
              { label: "Usuários Ativos", value: "12.5k" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card/40 backdrop-blur-xl px-6 py-5 text-center">
                <p className="text-xl sm:text-2xl font-bold text-foreground font-sans tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 px-4">
        <Blob className="w-[500px] h-[500px] -right-40 top-20" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-xs font-medium text-gold uppercase tracking-widest mb-4 block">Funcionalidades</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-5">
              Tudo para gerenciar vinhos
            </h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              Da adega pessoal à operação comercial, uma plataforma completa e inteligente.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="card-depth p-6 glass-hover group"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div className="w-10 h-10 rounded-lg gradient-wine flex items-center justify-center mb-4 group-hover:shadow-wine transition-shadow duration-200">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground mb-2 font-sans tracking-tight">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-24 px-4">
        <GoldBlob className="w-[400px] h-[400px] -left-20 top-40" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-xs font-medium text-gold uppercase tracking-widest mb-4 block">Planos</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-5">
              Planos para cada necessidade
            </h2>
            <p className="text-muted-foreground text-base">
              Comece grátis e evolua conforme sua adega cresce.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`rounded-2xl p-7 transition-all duration-200 relative ${
                  plan.highlighted
                    ? "gradient-wine text-primary-foreground shadow-wine glow-wine border border-wine-vivid/20"
                    : "card-depth glass-hover"
                }`}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold bg-gold text-gold-foreground tracking-wide uppercase">
                    Popular
                  </span>
                )}
                <h3 className="text-lg font-bold font-sans mb-1 tracking-tight">{plan.name}</h3>
                <p className={`text-xs mb-5 ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {plan.desc}
                </p>
                <div className="mb-6">
                  <span className="text-3xl font-bold font-sans tracking-tight">{plan.price}</span>
                  <span className={`text-xs ml-1 ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px]">
                      <Check className={`h-3.5 w-3.5 flex-shrink-0 ${plan.highlighted ? "text-gold-light" : "text-primary"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full rounded-xl h-10 text-[13px] font-medium ${
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
      <footer className="border-t border-border/30 py-10 px-4 relative z-10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md gradient-wine flex items-center justify-center">
              <Wine className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm text-foreground font-sans tracking-tight">WineVault</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 WineVault. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
