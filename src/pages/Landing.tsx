import { motion } from "framer-motion";
import { Wine, BarChart3, Shield, Smartphone, Star, TrendingUp, Users, Zap, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
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

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Wine className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold font-serif text-foreground">WineVault</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Entrar</Button>
            <Button size="sm" className="gradient-wine text-primary-foreground shadow-wine" onClick={() => navigate("/signup")}>
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium gradient-gold text-gold-foreground mb-6">
              <Zap className="h-3 w-3" /> Plataforma Inteligente de Gestão de Vinhos
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-foreground leading-tight mb-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Sua adega, <br />
            <span className="text-gradient-gold">inteligente.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Gerencie sua coleção pessoal ou operação comercial de vinhos com
            tecnologia de ponta, design premium e insights que fazem a diferença.
          </motion.p>

          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <Button size="lg" className="gradient-wine text-primary-foreground shadow-wine text-base px-8 h-12" onClick={() => navigate("/signup")}>
              Começar Gratuitamente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 h-12 border-border" onClick={() => navigate("/login")}>
              Já tenho conta
            </Button>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            className="mt-16 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="glass rounded-3xl p-8 md:p-12 shadow-2xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Garrafas", value: "2.847", icon: Wine },
                  { label: "Valor Total", value: "R$ 184k", icon: TrendingUp },
                  { label: "Avaliações", value: "1.293", icon: Star },
                  { label: "Usuários", value: "12.5k", icon: Users },
                ].map((stat, i) => (
                  <motion.div key={stat.label} className="text-center" initial="hidden" animate="visible" variants={fadeUp} custom={i + 5}>
                    <stat.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Tudo que você precisa para gerenciar vinhos
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Da adega pessoal à operação comercial, uma plataforma completa.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="glass rounded-2xl p-6 hover:shadow-lg transition-all duration-300 group"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div className="w-12 h-12 rounded-xl gradient-wine flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 font-sans">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Planos para cada necessidade
            </h2>
            <p className="text-muted-foreground text-lg">
              Comece grátis e evolua conforme sua adega cresce.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`rounded-2xl p-8 transition-all duration-300 ${
                  plan.highlighted
                    ? "gradient-wine text-primary-foreground shadow-wine scale-105 relative"
                    : "glass hover:shadow-lg"
                }`}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold gradient-gold text-gold-foreground">
                    Mais Popular
                  </span>
                )}
                <h3 className="text-xl font-bold font-sans mb-1">{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.desc}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className={`h-4 w-4 flex-shrink-0 ${plan.highlighted ? "text-gold-light" : "text-primary"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                      : "gradient-wine text-primary-foreground"
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
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wine className="h-5 w-5 text-primary" />
            <span className="font-serif font-bold text-foreground">WineVault</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 WineVault. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
