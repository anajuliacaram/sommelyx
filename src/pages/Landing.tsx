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
      className="relative mx-auto"
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="relative rounded-[24px] overflow-hidden shadow-2xl"
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.05)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.02), 0 32px 64px -16px rgba(140,32,68,0.12)",
        }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: "#FEFEFE" }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#27C93F" }} />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="h-6 w-64 rounded-full flex items-center justify-center" style={{ background: "#F3F4F6" }}>
              <span className="text-[10px] font-medium text-[#9CA3AF]">app.sommelyx.com</span>
            </div>
          </div>
        </div>

        {/* Mock content */}
        <div className="flex min-h-[400px]">
          {/* Sidebar */}
          <div className="w-52 p-4 space-y-1 hidden sm:block" style={{ borderRight: "1px solid rgba(0,0,0,0.04)", background: "#F9FAFB" }}>
            {["Overview", "Minha Adega", "Analytics", "Configurações"].map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[12px] font-semibold transition-colors"
                style={{
                  background: i === 0 ? "rgba(140,32,68,0.06)" : "transparent",
                  color: i === 0 ? "#8C2044" : "#6B7280",
                }}
              >
                <div className="h-4 w-4 rounded-md" style={{ background: i === 0 ? "#8C2044" : "#E5E7EB" }} />
                {label}
              </div>
            ))}
          </div>

          {/* Main Area */}
          <div className="flex-1 p-8 space-y-6" style={{ background: "#fff" }}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-[#0F0F14]">Boa tarde, Marcelo</h4>
                <p className="text-[12px] text-[#6B7280]">Aqui está o resumo da sua coleção premium.</p>
              </div>
              <div className="h-10 px-5 rounded-[12px] flex items-center text-[12px] font-bold text-white shadow-lg" style={{ background: "linear-gradient(135deg, #8C2044, #C44569)" }}>
                + Nova Garrafa
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { v: "2.482", l: "Garrafas" },
                { v: "R$ 142k", l: "Valor Total" },
                { v: "18", l: "Beber Agora" },
                { v: "42", l: "Favoritos" },
              ].map((m, i) => (
                <div key={i} className="p-4 rounded-[16px] space-y-1" style={{ background: "#F9FAFB", border: "1px solid rgba(0,0,0,0.03)" }}>
                  <div className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{m.l}</div>
                  <div className="text-xl font-bold text-[#0F0F14]">{m.v}</div>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-[20px]" style={{ background: "#F9FAFB", border: "1px solid rgba(0,0,0,0.03)" }}>
              <div className="flex justify-between items-center mb-6">
                <div className="text-[12px] font-bold text-[#0F0F14]">Distribuição por Região</div>
                <div className="text-[11px] font-medium text-[#8C2044]">Ver todos →</div>
              </div>
              <div className="flex gap-2 items-end h-24">
                {[45, 76, 52, 88, 62, 95, 70, 82, 100, 78, 92, 65, 84].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-[4px] transition-all duration-500"
                    style={{
                      height: `${h}%`,
                      background: i === 8 ? "linear-gradient(to top, #8C2044, #C44569)" : "rgba(140,32,68,0.1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
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
      <motion.nav
        className="fixed top-0 w-full z-50"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(14px) saturate(1.4)",
          borderBottom: "1px solid rgba(143,45,86,0.10)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.04)",
        }}
      >
        <div className="container mx-auto flex items-center justify-between h-[76px] px-8 lg:px-12">
          <a
            href="/"
            className="flex items-center gap-2.5 cursor-pointer transition-all duration-250 hover:brightness-110 hover:scale-[1.03]"
          >
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-10 w-auto object-contain" />
            <span className="text-[15px] font-extrabold tracking-tight font-sans" style={{ color: "#0F0F14", letterSpacing: "-0.025em" }}>
              Sommelyx
            </span>
          </a>
          <div className="hidden md:flex items-center gap-9 text-[13px] font-medium" style={{ letterSpacing: "0.2px" }}>
            <a href="#features" className="relative py-1 transition-colors duration-200 hover:text-[#8F2D56] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-[1.5px] after:bg-[#8F2D56] after:transition-all after:duration-200 hover:after:w-full" style={{ color: "#6B7280" }}>Funcionalidades</a>
            <a href="#pricing" className="relative py-1 transition-colors duration-200 hover:text-[#8F2D56] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-[1.5px] after:bg-[#8F2D56] after:transition-all after:duration-200 hover:after:w-full" style={{ color: "#6B7280" }}>Planos</a>
          </div>
          <div className="flex items-center gap-3.5">
            <button
              className="h-[44px] px-6 rounded-[14px] text-[14px] font-semibold cursor-pointer transition-all duration-200"
              style={{
                background: "rgba(143,45,86,0.06)",
                border: "1.5px solid rgba(143,45,86,0.2)",
                color: "#8F2D56",
                boxShadow: "0 2px 8px rgba(143,45,86,0.06)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(143,45,86,0.10)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(143,45,86,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(143,45,86,0.06)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(143,45,86,0.06)"; }}
              onClick={() => navigate("/login")}
            >
              Entrar
            </button>
            <button
              className="h-[44px] px-7 rounded-[14px] text-[14px] font-semibold text-white cursor-pointer border-0 transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #8F2D56, #C44569)",
                boxShadow: "0 4px 16px rgba(143,45,86,0.2)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(143,45,86,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(143,45,86,0.2)"; }}
              onClick={() => navigate("/signup")}
            >
              Começar Grátis
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-32 pb-4 px-4 flex flex-col justify-center" style={{ minHeight: "72vh" }}>
        {/* Ambient radial gradients */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 30%, rgba(143,45,86,0.08), transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 50%, rgba(224,122,95,0.04), transparent 60%)" }} />

        <div className="container mx-auto relative z-10 max-w-6xl">
          {/* Headline */}
          <motion.h1
            className="text-center font-serif font-black mb-6"
            style={{
              fontSize: "clamp(40px, 5vw, 64px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#0F0F14"
            }}
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            <span className="block">Sua adega,</span>
            <span className="inline-block mt-1">
              <span className="italic text-gradient-wine">inteligente</span>
              <span className="italic text-gradient-wine">.</span>
            </span>
          </motion.h1>

          <motion.p
            className="text-center text-lg sm:text-xl max-w-[640px] mx-auto mb-10 font-medium"
            style={{ color: "#374151", lineHeight: 1.6 }}
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Gerencie sua adega com inteligência — do controle pessoal à operação profissional, com{" "}
            <span className="font-bold" style={{ color: "#0F0F14" }}>insights que realmente fazem a diferença</span>.
          </motion.p>

          {/* CTAs */}
          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center items-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto text-[15px] px-10 h-[56px] font-semibold text-white border-0 rounded-[14px] group"
                onClick={() => navigate("/signup")}
                style={{
                  background: "linear-gradient(135deg, #8C2044 0%, #C44569 100%)",
                  boxShadow: "0 10px 25px rgba(140,32,68,0.2)",
                  transition: "all 250ms ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 14px 35px rgba(140,32,68,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 10px 25px rgba(140,32,68,0.2)"; }}
              >
                <span className="flex items-center gap-2">
                  Começar Gratuitamente <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <button
                className="w-full sm:w-auto text-[14px] px-8 h-[56px] font-semibold rounded-[14px] transition-all duration-200"
                style={{
                  color: "#4B5563",
                  border: "1.5px solid rgba(140,32,68,0.15)",
                  background: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(8px)",
                }}
                onClick={() => navigate("/login")}
                onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "rgba(140,32,68,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.8)"; e.currentTarget.style.borderColor = "rgba(140,32,68,0.15)"; }}
              >
                Já tenho conta →
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ 2. FEATURES ═══════════════ */}
      <section id="features" className="relative py-8 px-4">
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div className="mb-8 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 block" style={{ color: "#8C2044" }}>
              Funcionalidades
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mx-auto max-w-2xl" style={{ lineHeight: "1.1", color: "#0F0F14" }}>
              Tudo o que você precisa em
              <br />
              <span className="italic text-gradient-wine">um só lugar</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group cursor-default"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                style={{
                  borderRadius: 20,
                  padding: "32px",
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(10px)",
                  border: "1.5px solid rgba(140, 32, 68, 0.12)",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 30px rgba(140, 32, 68, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(140, 32, 68, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "rgba(140, 32, 68, 0.12)";
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: "rgba(140,32,68,0.08)" }}
                >
                  <f.icon className="h-6 w-6" style={{ color: "#8C2044" }} />
                </div>
                <h3 className="text-[18px] font-bold mb-3 font-sans tracking-tight" style={{ color: "#0F0F14" }}>{f.title}</h3>
                <p className="text-[15px] leading-[1.6]" style={{ color: "#4B5563" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 3. DASHBOARD MOCKUP ═══════════════ */}
      <section className="relative py-8 px-4 overflow-hidden">
        <div className="container mx-auto max-w-[1200px] mt-4 relative">
          {/* Glass backdrop behind */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] pointer-events-none opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(140,32,68,0.15) 0%, transparent 70%)",
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
                  className="w-full h-[52px] text-[14px] font-bold rounded-[14px] transition-all duration-200"
                  style={plan.highlighted ? {
                    background: "#fff",
                    color: "#8C2044",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  } : {
                    background: "rgba(140,32,68,0.06)",
                    color: "#8C2044",
                    border: "1.5px solid rgba(140,32,68,0.2)",
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
