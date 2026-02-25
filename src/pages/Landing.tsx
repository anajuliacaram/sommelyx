import { motion } from "framer-motion";
import { Wine, BarChart3, Shield, Smartphone, Star, TrendingUp, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 18 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
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

/* ─── Dashboard Mockup ─── */
function DashboardMockup() {
  return (
    <motion.div
      className="relative mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6, duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Glow */}
      <div className="absolute -inset-16 rounded-[48px] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(143,45,86,0.08), transparent 70%)" }} />

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          transform: "perspective(1600px) rotateX(3deg)",
          transformOrigin: "center bottom",
          background: "linear-gradient(135deg, #FFFFFF 0%, #FAFAF9 100%)",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.02), 0 24px 80px -12px rgba(0,0,0,0.10), 0 8px 24px -4px rgba(0,0,0,0.05)",
        }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#FEFEFE" }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,95,87,0.7)" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,189,46,0.6)" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(39,201,63,0.6)" }} />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="h-5 w-52 rounded-full flex items-center justify-center" style={{ background: "#F5F5F4" }}>
              <span className="text-[9px] font-medium" style={{ color: "#9CA3AF" }}>app.sommelyx.com</span>
            </div>
          </div>
          <div className="w-14" />
        </div>

        {/* Mock content */}
        <div className="flex min-h-[280px]">
          <div className="w-44 p-3 space-y-1.5 hidden sm:block" style={{ borderRight: "1px solid rgba(0,0,0,0.05)", background: "#FEFEFE" }}>
            {["Início", "Meus Vinhos", "Números", "Config"].map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium"
                style={{
                  background: i === 0 ? "rgba(143,45,86,0.06)" : "transparent",
                  color: i === 0 ? "#8F2D56" : "#9CA3AF",
                  border: i === 0 ? "1px solid rgba(143,45,86,0.08)" : "1px solid transparent",
                }}
              >
                <div className="h-3 w-3 rounded" style={{ background: i === 0 ? "#8F2D56" : "#E5E7EB" }} />
                {label}
              </div>
            ))}
          </div>
          <div className="flex-1 p-5 space-y-4" style={{ background: "#F7F7F8" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: "#0F0F14" }}>Olá, Marcelo</div>
                <div className="text-[11px]" style={{ color: "#9CA3AF" }}>Resumo da sua adega</div>
              </div>
              <div className="h-8 px-4 rounded-lg flex items-center text-[11px] font-medium text-white" style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)" }}>
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
                <div key={i} className="p-3 rounded-xl space-y-1" style={{ background: "white", border: "1px solid rgba(0,0,0,0.05)" }}>
                  <div className="text-[10px] font-medium" style={{ color: "#9CA3AF" }}>{m.l}</div>
                  <div className="text-sm font-bold font-sans" style={{ color: "#0F0F14" }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl" style={{ background: "white", border: "1px solid rgba(0,0,0,0.05)" }}>
              <div className="text-[10px] font-medium mb-3" style={{ color: "#9CA3AF" }}>Evolução da Coleção</div>
              <div className="flex gap-1.5 items-end h-16">
                {[28, 45, 35, 62, 48, 70, 42, 58, 75, 52, 82, 65, 88, 72, 68, 90].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h * 0.65}%`,
                      background: i >= 13 ? "linear-gradient(to top, #8F2D56, #C44569)" : "#F0F0F2",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 left-[12%] right-[12%] h-16 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.04)", filter: "blur(24px)" }} />
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: "#F7F7F8", color: "#0F0F14" }}>
      {/* Noise */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.015,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 w-full z-50"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(14px) saturate(1.4)",
          borderBottom: "1px solid rgba(143,45,86,0.10)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.04)",
        }}
      >
        <div className="container mx-auto flex items-center justify-between h-[68px] px-5 lg:px-8">
          <a
            href="/"
            className="flex items-center gap-2.5 cursor-pointer transition-all duration-250 hover:brightness-110 hover:scale-[1.03]"
          >
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-16 w-16 object-contain" />
            <span className="text-[18px] font-extrabold tracking-tight font-sans" style={{ color: "#0F0F14", letterSpacing: "-0.025em" }}>
              Sommelyx
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium" style={{ letterSpacing: "0.2px" }}>
            <a href="#features" className="nav-link-premium" style={{ color: "#6B7280" }}>Funcionalidades</a>
            <a href="#pricing" className="nav-link-premium" style={{ color: "#6B7280" }}>Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="nav-link-premium text-[13px] h-10 px-5 font-medium" style={{ color: "#6B7280" }} onClick={() => navigate("/login")}>
              Entrar
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="text-[13px] h-11 px-6 text-white border-0 font-semibold"
                style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)", boxShadow: "0 4px 16px rgba(143,45,86,0.2)" }}
                onClick={() => navigate("/signup")}
              >
                Começar Grátis
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-36 pb-8 px-4 min-h-[92vh] flex flex-col justify-center">
        {/* Ambient radial gradients */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 25%, rgba(143,45,86,0.05), transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 80% 60%, rgba(224,122,95,0.03), transparent 60%)" }} />

        {/* CTA glow */}
        <div className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(143,45,86,0.06), transparent 70%)" }} />

        <div className="container mx-auto relative z-10 max-w-6xl">
          {/* Badge */}
          <motion.div className="flex justify-center mb-10" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold tracking-wide uppercase"
              style={{ border: "1px solid rgba(143,45,86,0.15)", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", color: "#8F2D56" }}
            >
              <Sparkles className="h-3 w-3" style={{ color: "#C9A86A" }} /> Wine Tech Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-center text-5xl sm:text-7xl md:text-[5.5rem] lg:text-[7rem] font-serif font-black leading-[0.92] mb-8"
            style={{ letterSpacing: "-0.04em", color: "#0F0F14" }}
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            <span className="block">Sua adega,</span>
            <span className="inline-block mt-1">
              <span className="italic text-gradient-wine">inteligente</span>
              <span className="italic text-gradient-wine">.</span>
            </span>
          </motion.h1>

          {/* Gold line */}
          <motion.div
            className="mx-auto mb-8"
            style={{ width: 120, height: 2, background: "linear-gradient(90deg, transparent, #C9A86A, transparent)" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.p
            className="text-center text-base sm:text-lg max-w-lg mx-auto mb-14 font-light"
            style={{ color: "#6B7280", lineHeight: 1.85 }}
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Gerencie sua coleção pessoal ou operação comercial com{" "}
            <span className="font-medium" style={{ color: "#0F0F14" }}>tecnologia de ponta</span> e insights que fazem a diferença.
          </motion.p>

          {/* CTAs */}
          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center items-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto text-[15px] px-10 h-[58px] font-semibold text-white border-0 rounded-[15px] group"
                onClick={() => navigate("/signup")}
                style={{
                  background: "linear-gradient(135deg, #8F2D56 0%, #C44569 45%, #E07A5F 100%)",
                  boxShadow: "0 12px 30px rgba(143,45,86,0.25), 0 2px 6px rgba(0,0,0,0.06)",
                  transition: "all 200ms ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 16px 40px rgba(143,45,86,0.35), 0 4px 10px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 12px 30px rgba(143,45,86,0.25), 0 2px 6px rgba(0,0,0,0.06)"; }}
              >
                <span className="flex items-center gap-2">
                  Começar Gratuitamente <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto text-[14px] px-8 h-[58px] font-medium rounded-[15px]"
                style={{
                  color: "#6B7280",
                  border: "1px solid rgba(143,45,86,0.2)",
                  background: "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(10px)",
                  transition: "all 200ms ease",
                }}
                onClick={() => navigate("/login")}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor = "rgba(143,45,86,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(143,45,86,0.2)"; }}
              >
                Já tenho conta →
              </Button>
            </motion.div>
          </motion.div>

          {/* Dashboard mockup */}
          <div className="mt-24 mb-8">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section
        className="relative z-10"
        style={{ borderTop: "1px solid rgba(0,0,0,0.05)", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)" }}
      >
        <div className="container mx-auto max-w-5xl">
          <motion.div className="grid grid-cols-2 md:grid-cols-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            {[
              { label: "Garrafas gerenciadas", value: "2.847" },
              { label: "Valor em adegas", value: "R$ 184k" },
              { label: "Avaliações feitas", value: "1.293" },
              { label: "Usuários ativos", value: "12.5k" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="px-6 py-8 text-center"
                style={{ borderRight: i < 3 ? "1px solid rgba(0,0,0,0.05)" : "none" }}
                variants={fadeUp}
              >
                <p className="text-xl font-bold font-sans tracking-tight" style={{ color: "#0F0F14" }}>{stat.value}</p>
                <p className="text-[11px] mt-1.5 font-medium" style={{ color: "#9CA3AF" }}>{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="relative py-24 md:py-28 px-4">
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-4 block" style={{ color: "#8F2D56" }}>
              Funcionalidades
            </span>
            <h2 className="text-3xl md:text-5xl lg:text-[3.5rem] font-serif font-bold tracking-tight max-w-2xl" style={{ lineHeight: "1.05", color: "#0F0F14" }}>
              Tudo para gerenciar
              <br />
              <span className="italic text-gradient-wine">seus vinhos</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="glass-card p-7 group cursor-default"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)", boxShadow: "0 4px 12px rgba(143,45,86,0.15)" }}
                >
                  <f.icon className="h-[18px] w-[18px] text-white" />
                </div>
                <h3 className="text-[17px] font-semibold mb-2.5 font-sans tracking-tight" style={{ color: "#0F0F14" }}>{f.title}</h3>
                <p className="text-[14px] leading-[1.75]" style={{ color: "#6B7280" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto max-w-5xl px-4">
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)" }} />
      </div>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="relative py-24 md:py-28 px-4">
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-4 block" style={{ color: "#8F2D56" }}>Planos</span>
            <h2 className="text-3xl md:text-5xl lg:text-[3.5rem] font-serif font-bold tracking-tight max-w-xl" style={{ lineHeight: "1.05", color: "#0F0F14" }}>
              Planos para cada
              <br />
              <span className="italic text-gradient-gold">necessidade</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`relative p-8 ${plan.highlighted ? "" : "glass-card"}`}
                style={plan.highlighted ? {
                  borderRadius: 18,
                  background: "linear-gradient(160deg, #8F2D56, #C44569)",
                  boxShadow: "0 16px 50px rgba(143,45,86,0.25), 0 8px 20px rgba(0,0,0,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                } : {}}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -6, transition: { duration: 0.22, ease: "easeOut" } }}
              >
                {plan.highlighted && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase"
                    style={{ background: "#C9A86A", color: "white" }}
                  >
                    Popular
                  </span>
                )}
                <h3 className="text-base font-bold font-sans mb-1 tracking-tight" style={{ color: plan.highlighted ? "white" : "#0F0F14" }}>
                  {plan.name}
                </h3>
                <p className="text-[12px] mb-6" style={{ color: plan.highlighted ? "rgba(255,255,255,0.65)" : "#9CA3AF" }}>
                  {plan.desc}
                </p>
                <div className="mb-7">
                  <span className="text-3xl font-bold font-sans tracking-tight" style={{ color: plan.highlighted ? "white" : "#0F0F14" }}>
                    {plan.price}
                  </span>
                  <span className="text-[12px] ml-1" style={{ color: plan.highlighted ? "rgba(255,255,255,0.55)" : "#9CA3AF" }}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-9">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px]" style={{ color: plan.highlighted ? "rgba(255,255,255,0.9)" : "#6B7280" }}>
                      <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: plan.highlighted ? "#D9BF8A" : "#8F2D56" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full h-[52px] text-[13px] font-semibold rounded-[14px] text-white border-0"
                    style={plan.highlighted ? {
                      background: "white",
                      color: "#8F2D56",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    } : {
                      background: "linear-gradient(135deg, #8F2D56, #C44569)",
                      boxShadow: "0 4px 16px rgba(143,45,86,0.15)",
                    }}
                    onClick={() => navigate("/signup")}
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-14 px-4 relative z-10" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-12 w-12 object-contain" />
            <span className="font-bold text-[14px] font-sans tracking-tight" style={{ color: "#0F0F14" }}>Sommelyx</span>
          </div>
          <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
            © 2026 Sommelyx. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
