import { motion } from "framer-motion";
import { Wine, Search, Bell, StickyNote, Upload, LayoutGrid, ArrowRight, Check, Sparkles } from "lucide-react";
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
  { icon: Wine, title: "O que abrir hoje", desc: "Sugestões pelo momento ideal de consumo e suas preferências." },
  { icon: LayoutGrid, title: "Sua adega em ordem", desc: "Saiba quantas garrafas tem e onde estão (prateleira, caixa, posição)." },
  { icon: Bell, title: "Alertas inteligentes", desc: "Beber agora, estoque baixo e lembretes do que vale priorizar." },
  { icon: Search, title: "Busca e filtros rápidos", desc: "Encontre em segundos por uva, país, estilo e faixa de preço." },
  { icon: StickyNote, title: "Notas de degustação", desc: "Registre notas, avaliações e harmonizações pra não esquecer." },
  { icon: Upload, title: "Importe sua lista", desc: "Comece rápido importando CSV/planilha. Sem retrabalho." },
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
    cta: "Iniciar teste grátis por 7 dias",
    highlighted: true,
  },
  {
    name: "Business",
    price: "R$ 99",
    period: "/mês",
    desc: "Para operações comerciais",
    features: ["Tudo do Pro", "Multiusuário (até 10)", "Gestão de vendas", "Relatórios financeiros", "Cadastro de clientes", "Suporte prioritário"],
    cta: "Iniciar teste grátis por 7 dias",
    highlighted: false,
  },
];

/* ─── Dashboard Mockup ─── */
function DashboardMockup() {
  return (
    <motion.div
      className="relative mx-auto max-w-[820px] px-4" // Reduced from 940px
      initial={{ opacity: 0, y: 24, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Radial glow behind preview */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] pointer-events-none z-0">
        <div className="absolute inset-0 opacity-40 animate-pulse-slow" style={{ background: "radial-gradient(circle at center, rgba(140,32,68,0.25) 0%, transparent 65%)" }} />
      </div>

      <motion.div
        className="relative z-10"
        animate={{ y: [0, -6, 0] }} // Subtle float
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="relative rounded-[24px] overflow-hidden shadow-float perspective-1000"
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.02), 0 40px 100px -20px rgba(140,32,68,0.2)",
          }}
        >
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-6 py-3.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: "#FEFEFE" }}>
            <div className="flex gap-1.5 grayscale opacity-30">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <div className="w-2 h-2 rounded-full bg-gray-400" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="h-5 w-48 rounded-full flex items-center justify-center bg-gray-50/50 border border-black/[0.02]">
                <span className="text-[9px] font-bold text-gray-300 tracking-tight uppercase">sommelyx.app</span>
              </div>
            </div>
          </div>

          {/* Mock content */}
          <div className="flex min-h-[380px]">
            {/* Sidebar */}
            <div className="w-48 p-4 space-y-1 hidden sm:block border-r border-black/[0.04] bg-gray-50/30">
              {["Overview", "Adega", "Analytics", "Settings"].map((label, i) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all"
                  style={{
                    background: i === 0 ? "white" : "transparent",
                    color: i === 0 ? "#8C2044" : "#9CA3AF",
                    boxShadow: i === 0 ? "0 2px 8px rgba(0,0,0,0.03)" : "none",
                  }}
                >
                  <div className="h-3 w-3 rounded-sm" style={{ background: i === 0 ? "#8C2044" : "#E5E7EB" }} />
                  {label}
                </div>
              ))}
            </div>

            {/* Main Area */}
            <div className="flex-1 p-6 space-y-6 bg-white overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold tracking-tight text-[#0F0F14]">Painel Sommelyx</h4>
                  <p className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-widest">Resumo do acervo</p>
                </div>
                <div className="h-8 px-4 rounded-lg flex items-center text-[11px] font-bold text-white shadow-premium gradient-wine">
                  + Adicionar
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { v: "2.8k", l: "Vinhos" },
                  { v: "R$ 180k", l: "Valor" },
                  { v: "14", l: "Alertas" },
                  { v: "98 pts", l: "Score" },
                ].map((m, i) => (
                  <div key={i} className="p-4 rounded-xl space-y-1 bg-gray-50/50 border border-black/[0.01]">
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{m.l}</div>
                    <div className="text-lg font-black text-[#0F0F14] tracking-tight">{m.v}</div>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-[20px] bg-gray-50/50 border border-black/[0.01]">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-[11px] font-black uppercase tracking-widest text-[#0F0F14]">Estoque por Região</div>
                </div>
                <div className="flex gap-2 items-end h-20">
                  {[40, 70, 50, 80, 60, 90, 65, 80, 100, 75, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md transition-all duration-700"
                      style={{
                        height: `${h}%`,
                        background: i === 8 ? "#8C2044" : "rgba(140,32,68,0.06)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden premium-noise" style={{ background: "#F7F7F8", color: "#0F0F14" }}>
      {/* Noise */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.015,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ─── HEADER ─── */}
      <motion.header
        className="fixed top-0 w-full z-50 px-6 py-6"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="container mx-auto flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2.5 transition-all duration-300 hover:opacity-80 active:scale-95"
          >
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-[32px] sm:h-[40px] w-auto object-contain" />
            <span className="text-[17px] sm:text-[19px] font-black tracking-tight font-sans hidden xsm:block" style={{ color: "#0F0F14", letterSpacing: "-0.04em" }}>
              Sommelyx
            </span>
          </a>

          <div className="flex items-center gap-4 sm:gap-6">
            <Button
              variant="outline"
              className="text-[14px] font-bold px-8 h-12 transition-all"
              onClick={() => navigate("/login")}
            >
              Entrar
            </Button>
            <Button
              variant="premium"
              className="px-10 h-14 sm:h-16 text-[15px] font-black uppercase tracking-widest shadow-float"
              onClick={() => navigate("/signup")}
            >
              Começar Grátis
            </Button>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-44 lg:pt-64 pb-12 px-6 overflow-hidden">
        {/* Ambient radial gradients */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 30%, rgba(143,45,86,0.06), transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(140,32,68,0.08), transparent 50%)" }} />

        <div className="container mx-auto relative z-10 max-w-7xl">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 lg:gap-24 mb-16">

            {/* Headline Block */}
            <div className="max-w-4xl">
              <motion.h1
                className="text-left font-serif font-black"
                style={{
                  fontSize: "clamp(46px, 8vw, 84px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.05em",
                  color: "#0F0F14"
                }}
                initial="hidden" animate="visible" variants={fadeUp} custom={1}
              >
                Sua adega, <br />
                <span className="italic text-gradient-wine font-serif block sm:inline mt-2">inteligente.</span>
              </motion.h1>

              <motion.p
                className="text-left text-base sm:text-lg max-w-[620px] mt-8 font-medium"
                style={{ color: "#4B5563", lineHeight: 1.55 }}
                initial="hidden" animate="visible" variants={fadeUp} custom={2}
              >
                Gerencie sua adega com perfeição técnica. Do controle pessoal à operação profissional, com{" "}
                <span className="font-bold inline-block text-[#0F0F14]">insights que realmente valorizam seu negócio.</span>
              </motion.p>
            </div>
          </div>

          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="w-full"
          >
            {/* The Dashboard Mockup is below this */}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ 2. FEATURES ═══════════════ */}
      <section id="features" className="relative py-4 px-4"> {/* Reduced from py-8 */}
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mb-6 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3 block" style={{ color: "#8C2044" }}>
              Funcionalidades
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight mx-auto max-w-2xl" style={{ lineHeight: "1.1", color: "#0F0F14" }}>
              Tudo o que você precisa em
              <br />
              <span className="italic text-gradient-wine">um só lugar</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group cursor-default"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{
                  y: -2,
                  scale: 1.01,
                  boxShadow: "0 20px 40px -10px rgba(140,32,68,0.12)",
                }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  borderRadius: 20,
                  padding: "24px",
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(140, 32, 68, 0.08)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(140,32,68,0.06)" }}
                >
                  <f.icon className="h-5 w-5" style={{ color: "#8C2044" }} />
                </div>
                <h3 className="text-[17px] font-bold mb-2 font-sans tracking-tight" style={{ color: "#0F0F14" }}>{f.title}</h3>
                <p className="text-[14px] leading-[1.6]" style={{ color: "#4B5563" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 3. DASHBOARD MOCKUP ═══════════════ */}
      <section className="relative py-4 px-4 overflow-hidden"> {/* Reduced from py-8 */}
        <div className="container mx-auto max-w-[1200px] mt-2 relative">
          {/* Glass backdrop behind */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] pointer-events-none opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(140,32,68,0.2) 0%, transparent 70%)",
              filter: "blur(60px)"
            }}
          />

          <div style={{ filter: "saturate(1.05) contrast(1.02)" }}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ═══════════════ 4. STATS ═══════════════ */}
      <section
        className="relative z-10 py-6"
        style={{ borderTop: "1px solid rgba(0,0,0,0.05)", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.4)" }}
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
                className="px-6 py-6 text-center"
                style={{ borderRight: i < 3 ? "1px solid rgba(0,0,0,0.05)" : "none" }}
                variants={fadeUp}
              >
                <p className="text-2xl font-bold font-sans tracking-tight" style={{ color: "#0F0F14" }}>{stat.value}</p>
                <p className="text-[12px] mt-1.5 font-medium uppercase tracking-wider" style={{ color: "#6B7280" }}>{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ 5. PRICING ═══════════════ */}
      <section id="pricing" className="relative py-12 px-4">
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mb-10 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 block" style={{ color: "#8C2044" }}>Planos</span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mx-auto" style={{ lineHeight: "1.1", color: "#0F0F14" }}>
              Escolha o plano ideal
              <br />
              <span className="italic text-gradient-gold">para a sua coleção</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`relative p-8 ${plan.highlighted ? "" : "glass-card"}`}
                style={plan.highlighted ? {
                  borderRadius: 20,
                  background: "linear-gradient(160deg, #8C2044, #C44569)",
                  boxShadow: "0 20px 50px rgba(140,32,68,0.25)",
                  border: "1px solid rgba(255,255,255,0.1)",
                } : {
                  borderRadius: 20,
                  border: "1.5px solid rgba(140, 32, 68, 0.12)",
                }}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -6 }}
              >
                {plan.highlighted && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                    style={{ background: "#C9A86A", color: "white" }}
                  >
                    Recomendado
                  </span>
                )}
                <h3 className="text-lg font-bold font-sans mb-1 tracking-tight" style={{ color: plan.highlighted ? "white" : "#0F0F14" }}>
                  {plan.name}
                </h3>
                <p className="text-[13px] mb-8" style={{ color: plan.highlighted ? "rgba(255,255,255,0.7)" : "#6B7280" }}>
                  {plan.desc}
                </p>
                <div className="mb-8">
                  <span className="text-4xl font-bold font-sans tracking-tight" style={{ color: plan.highlighted ? "white" : "#0F0F14" }}>
                    {plan.price}
                  </span>
                  <span className="text-sm ml-1" style={{ color: plan.highlighted ? "rgba(255,255,255,0.6)" : "#9CA3AF" }}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-4 mb-10">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[14px]" style={{ color: plan.highlighted ? "rgba(255,255,255,0.9)" : "#4B5563" }}>
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: plan.highlighted ? "#C9A86A" : "#8C2044" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-[56px] text-[14px] font-black uppercase tracking-widest transition-all"
                  variant={plan.highlighted ? "premium" : "outline"}
                  onClick={() => navigate("/signup")}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. FOOTER ─── */}
      <footer className="py-16 px-4 relative z-10" style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: "#fff" }}>
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-9 w-auto object-contain" />
            <span className="font-bold text-[15px] font-sans tracking-tight" style={{ color: "#0F0F14" }}>Sommelyx</span>
          </div>
          <div className="flex items-center gap-8 text-[13px] font-medium" style={{ color: "#6B7280" }}>
            <a href="#features" className="hover:text-[#8C2044] transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-[#8C2044] transition-colors">Planos</a>
            <button onClick={() => navigate("/login")} className="hover:text-[#8C2044] transition-colors cursor-pointer bg-transparent border-0 font-medium">Entrar</button>
          </div>
          <p className="text-[12px]" style={{ color: "#9CA3AF" }}>
            © {new Date().getFullYear()} Sommelyx. Inteligência em cada taça.
          </p>
        </div>
      </footer>
    </div>
  );
}
