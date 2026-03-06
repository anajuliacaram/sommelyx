import { motion } from "framer-motion";
import { Wine, Search, Bell, StickyNote, Upload, LayoutGrid, ArrowRight, Check, ShieldCheck, BarChart4, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MagneticButton } from "@/components/ui/magnetic-button";

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

const features = [
  { icon: LayoutGrid, title: "Controle de Estoque", desc: "Localização exata, volume e mapa da sua adega em tempo real." },
  { icon: BarChart4, title: "Gestão Comercial", desc: "Visão estratégica sobre valor investido, giro e rentabilidade." },
  { icon: Wine, title: "Janela de Consumo", desc: "Nunca perca o auge de um vinho. Alertas e sugestões inteligentes." },
  { icon: StickyNote, title: "Cadastro Técnico", desc: "Fichas completas com uva, safra, produtor e notas de degustação." },
  { icon: Search, title: "Inteligência de Adega", desc: "Filtros rápidos para encontrar a garrafa perfeita em segundos." },
  { icon: ShieldCheck, title: "Insights & Relatórios", desc: "Entenda o perfil da sua coleção e tome decisões de compra melhores." },
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

/* ─── Premium Dashboard Representation ─── */
function HeroComposition() {
  return (
    <motion.div
      className="relative w-full h-full min-h-[400px] lg:min-h-[600px] flex items-center justify-center lg:justify-end"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Ambient glowing orbs */}
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-[#8F2D56]/20 to-[#C44569]/5 blur-[80px]" />
      <div className="absolute bottom-[10%] left-[20%] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-[#8C2044]/15 to-transparent blur-[60px]" />

      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-full max-w-[600px] perspective-1000"
      >
        <div
          className="relative rounded-[24px] bg-white/80 backdrop-blur-3xl border border-black/[0.04] p-6 shadow-2xl shadow-[#8C2044]/10 transform rotate-y-[-10deg] rotate-x-[5deg] translate-z-10"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Top Bar of Mockup */}
          <div className="flex items-center justify-between mb-8 border-b border-black/[0.04] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5 opacity-40">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              </div>
              <div className="h-6 px-3 bg-black/[0.03] rounded-full flex items-center">
                <span className="text-[10px] font-black tracking-widest text-[#0F0F14]/40 uppercase">Adega Principal</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8F2D56] to-[#C44569] flex items-center justify-center text-white shadow-md shadow-[#8F2D56]/20">
              <span className="text-[11px] font-bold">SO</span>
            </div>
          </div>

          {/* Cards inside Mockup */}
          <div className="grid grid-cols-2 gap-4 mb-4" style={{ transform: "translateZ(30px)" }}>
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-black/[0.03] relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-[#8F2D56]/5 to-transparent rounded-bl-full pointer-events-none" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block mb-2">Total em Estoque</span>
              <span className="text-3xl font-serif font-bold text-[#0F0F14] tracking-tight">2.14k</span>
              <span className="text-[12px] font-medium text-[#8F2D56] flex items-center gap-1 mt-1">+12 garrafas este mês</span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1A1A24] to-[#0F0F14] shadow-premium shadow-black/20 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full opacity-50 pointer-events-none" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 block mb-2">Patrimônio Líquido</span>
              <span className="text-3xl font-serif font-bold tracking-tight text-white/95">R$ 142k</span>
              <span className="text-[12px] font-medium text-white/40 flex items-center gap-1 mt-1">Atualizado hoje</span>
            </div>
          </div>

          {/* List Mockup */}
          <div className="space-y-3" style={{ transform: "translateZ(15px)" }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#0F0F14] block mt-6 mb-2">Janela de Consumo: Beber Agora</span>
            {[
              { name: "Château Margaux 2015", tag: "Tinto", alert: "Auge" },
              { name: "Sassicaia 2018", tag: "Tinto", alert: "Evoluindo" },
              { name: "Dom Pérignon 2012", tag: "Espumante", alert: "Auge" },
            ].map((w, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-black/[0.02] border border-white/40 shadow-sm hover:bg-black/[0.04] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center border border-black/[0.05]">
                    <Wine className="w-4 h-4 text-[#8C2044]" />
                  </div>
                  <div>
                    <span className="block text-[13px] font-bold text-[#0F0F14]">{w.name}</span>
                    <span className="text-[11px] font-medium text-muted-foreground">{w.tag}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="h-6 text-[9px] bg-[#8C2044]/10 text-[#8C2044] border-none uppercase tracking-wider">{w.alert}</Badge>
              </div>
            ))}
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden premium-noise selection:bg-[#8F2D56]/20 selection:text-[#0F0F14] bg-[#FAFAFA] text-[#0F0F14]">

      {/* ─── HEADER ─── */}
      <motion.header
        className="fixed top-0 w-full z-50 px-6 py-5 bg-white/70 backdrop-blur-2xl border-b border-black/[0.03]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <a
            href="/"
            className="flex items-center gap-3 transition-opacity duration-300 hover:opacity-80"
          >
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-[36px] sm:h-[44px] w-auto object-contain" />
            <span className="text-[20px] sm:text-[22px] font-black tracking-tight font-sans hidden xsm:block text-[#0F0F14]" style={{ letterSpacing: "-0.04em" }}>
              Sommelyx
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              className="text-[13px] font-bold px-6 h-11 transition-all hover:bg-black/[0.03] rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/login")}
            >
              Entrar
            </Button>
            <MagneticButton>
              <Button
                className="px-6 sm:px-8 h-11 sm:h-12 text-[12px] sm:text-[13px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-md shadow-[#8F2D56]/15 hover:shadow-lg hover:shadow-[#8F2D56]/25 border border-[#8F2D56]/10 text-white"
                style={{ background: "linear-gradient(135deg, hsl(var(--wine)) 0%, hsl(var(--wine-vivid)) 100%)" }}
                onClick={() => navigate("/signup")}
              >
                Começar Grátis
              </Button>
            </MagneticButton>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-36 lg:pt-48 pb-16 lg:pb-32 px-6 overflow-hidden min-h-screen flex items-center">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="container mx-auto relative z-10 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">

            {/* Headline Block (Left) */}
            <div className="flex-1 max-w-2xl pt-10 lg:pt-0">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="mb-6 flex items-center gap-3">
                <Badge variant="outline" className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest border-[#8C2044]/20 text-[#8C2044] bg-[#8C2044]/5">Inteligência Estratégica</Badge>
              </motion.div>

              <motion.h1
                className="text-left font-serif font-bold text-[#0F0F14]"
                style={{ fontSize: "clamp(48px, 6vw, 84px)", lineHeight: 1, letterSpacing: "-0.04em" }}
                initial="hidden" animate="visible" variants={fadeUp} custom={1}
              >
                Sua adega, <br />
                <span className="italic text-gradient-wine font-serif block mt-1">inteligente.</span>
              </motion.h1>

              <motion.p
                className="text-left text-lg sm:text-[19px] max-w-[560px] mt-8 font-medium text-muted-foreground"
                style={{ lineHeight: 1.6 }}
                initial="hidden" animate="visible" variants={fadeUp} custom={2}
              >
                Gestão técnica, operação comercial e inteligência de estoque em uma plataforma pensada para quem trata o vinho com seriedade e sofisticação.
              </motion.p>

              <motion.div
                className="mt-10 flex flex-col sm:flex-row items-center gap-4"
                initial="hidden" animate="visible" variants={fadeUp} custom={3}
              >
                <MagneticButton>
                  <Button
                    className="w-full sm:w-auto px-10 h-14 text-[14px] font-black uppercase tracking-widest rounded-[16px] transition-all shadow-[0_8px_20px_rgba(140,32,68,0.2)] hover:shadow-[0_12px_24px_rgba(140,32,68,0.3)] text-white"
                    style={{ background: "linear-gradient(135deg, hsl(var(--wine)) 0%, hsl(var(--wine-vivid)) 100%)" }}
                    onClick={() => navigate("/signup")}
                  >
                    Começar Grátis
                  </Button>
                </MagneticButton>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto px-8 h-14 text-[14px] font-bold rounded-[16px] border-black/10 hover:bg-black/5 hover:text-foreground transition-all group"
                >
                  Ver Demonstração <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>

              <motion.div
                className="mt-10 flex items-center gap-6"
                initial="hidden" animate="visible" variants={fadeUp} custom={4}
              >
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden"><img src="https://i.pravatar.cc/100?img=1" alt="Avatar" className="w-full h-full object-cover" /></div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-300 overflow-hidden"><img src="https://i.pravatar.cc/100?img=5" alt="Avatar" className="w-full h-full object-cover" /></div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-400 overflow-hidden"><img src="https://i.pravatar.cc/100?img=8" alt="Avatar" className="w-full h-full object-cover" /></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#0F0F14]">Mais de 12.000 usuários</span>
                  <span className="text-[12px] font-medium text-muted-foreground flex items-center gap-1">
                    <Check className="h-3 w-3 text-green-500" /> Sem complicação. Mais controle.
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Visual Composition (Right) */}
            <div className="flex-1 w-full max-w-2xl lg:max-w-none">
              <HeroComposition />
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ 2. FEATURES ═══════════════ */}
      <section id="features" className="relative py-24 px-6 border-t border-black/[0.04] bg-white">
        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="max-w-2xl">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 block text-[#8C2044]">
                Arquitetura do Sistema
              </span>
              <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight text-[#0F0F14] leading-[1.1]">
                Um ecossistema completo <span className="italic text-gradient-wine">para sua coleção</span>
              </h2>
            </div>
            <p className="text-[16px] text-muted-foreground max-w-md font-medium">Nossa plataforma combina ferramentas de gestão robustas com uma interface elegante e analítica avançada.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group cursor-default p-8 rounded-[24px] bg-[#FAFAFA] border border-black/[0.04] hover:bg-white transition-colors duration-300 relative overflow-hidden"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{
                  y: -4,
                  boxShadow: "0 24px 48px -12px rgba(0,0,0,0.06)",
                  borderColor: "rgba(140, 32, 68, 0.15)"
                }}
              >
                <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-[#8F2D56]/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-6 bg-white shadow-sm border border-black/[0.03] group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
                  <f.icon className="h-6 w-6 text-[#8F2D56]" strokeWidth={1.5} />
                </div>
                <h3 className="text-[18px] font-bold mb-3 font-sans tracking-tight text-[#0F0F14]">{f.title}</h3>
                <p className="text-[15px] leading-[1.6] text-muted-foreground font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 4. STATS ═══════════════ */}
      <section className="relative z-10 py-20 border-y border-black/[0.04] bg-[#0F0F14] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
        <div className="absolute top-[-50%] left-[-10%] w-[50%] h-[200%] bg-gradient-to-br from-[#8C2044]/20 to-transparent blur-[120px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            {[
              { label: "Garrafas gerenciadas", value: "248k+" },
              { label: "Valor em adegas", value: "R$ 42M+" },
              { label: "Produtores base", value: "14.200" },
              { label: "Usuários ativos", value: "12.5k" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center relative md:border-r border-white/10 last:border-0"
                variants={fadeUp}
              >
                <p className="text-4xl md:text-5xl font-black font-serif tracking-tight text-white mb-2">{stat.value}</p>
                <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-white/50">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ 5. PRICING ═══════════════ */}
      <section id="pricing" className="relative py-24 px-6 bg-[#FAFAFA]">
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="mb-16 text-center max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 block text-[#8C2044]">Acesso Premium</span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-[#0F0F14] leading-[1.1]">
              Planos desenhados <span className="italic text-gradient-wine">para sua coleção</span>
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-center">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`relative p-8 md:p-10 rounded-[32px] overflow-hidden ${plan.highlighted ? "lg:py-14" : ""}`}
                style={plan.highlighted ? {
                  background: "linear-gradient(160deg, #0F0F14 0%, #1A1A24 100%)",
                  boxShadow: "0 30px 60px rgba(0,0,0,0.15)",
                  border: "1px solid rgba(255,255,255,0.08)",
                } : {
                  background: "white",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.03)",
                }}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 p-8">
                    <span className="px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-[#8F2D56] to-[#C44569] text-white shadow-lg shadow-[#8C2044]/20">
                      Recomendado
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-serif font-bold mb-2 tracking-tight" style={{ color: plan.highlighted ? "white" : "#0F0F14" }}>
                  {plan.name}
                </h3>
                <p className="text-[14px] mb-8 font-medium" style={{ color: plan.highlighted ? "rgba(255,255,255,0.5)" : "#6B7280" }}>
                  {plan.desc}
                </p>
                <div className="mb-10 flex items-baseline gap-1">
                  <span className="text-5xl font-black font-sans tracking-tighter" style={{ color: plan.highlighted ? "white" : "#0F0F14" }}>
                    {plan.price}
                  </span>
                  <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: plan.highlighted ? "rgba(255,255,255,0.4)" : "#9CA3AF" }}>
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-4 mb-10 min-h-[160px]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[14px] font-medium" style={{ color: plan.highlighted ? "rgba(255,255,255,0.8)" : "#4B5563" }}>
                      <Check className="h-5 w-5 flex-shrink-0" style={{ color: plan.highlighted ? "#C44569" : "#8C2044" }} strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full h-14 rounded-[16px] text-[13px] font-bold uppercase tracking-[0.1em] transition-all ${plan.highlighted
                      ? "bg-white text-[#0F0F14] hover:bg-white/90 shadow-[0_8px_20px_rgba(255,255,255,0.1)] hover:shadow-white/20"
                      : "bg-black/5 text-[#0F0F14] hover:bg-black/10 shadow-none border border-black/5"
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

      {/* ─── 6. FOOTER ─── */}
      <footer className="py-12 px-6 relative z-10 bg-white border-t border-black/[0.04]">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-8 w-auto object-contain grayscale opacity-80" />
            <span className="font-bold text-[18px] font-sans tracking-tight text-[#0F0F14]">Sommelyx</span>
          </div>
          <div className="flex items-center gap-8 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
            <a href="#features" className="hover:text-[#0F0F14] transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-[#0F0F14] transition-colors">Planos</a>
            <button onClick={() => navigate("/login")} className="hover:text-[#0F0F14] transition-colors cursor-pointer bg-transparent border-0 font-bold uppercase tracking-wider">Acesso Privado</button>
          </div>
          <p className="text-[12px] font-medium text-muted-foreground">
            © {new Date().getFullYear()} Sommelyx. Inteligência em cada taça.
          </p>
        </div>
      </footer>
    </div>
  );
}
