import { motion } from "framer-motion";
import { Wine, Search, Bell, StickyNote, Upload, LayoutGrid, ArrowRight, Check, ShieldCheck, BarChart4 } from "lucide-react";
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
      className="relative w-full h-full min-h-[460px] lg:min-h-[600px] flex items-center justify-center lg:justify-end mt-12 lg:mt-0"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Ambient glowing reflections */}
      <div className="absolute top-[6%] right-[0%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-[#8F2D56]/28 via-[#C44569]/16 to-transparent blur-[92px]" />
      <div className="absolute bottom-[-2%] left-[6%] w-[340px] h-[340px] rounded-full bg-gradient-to-br from-[#8C2044]/24 to-transparent blur-[88px]" />
      <div className="absolute top-[24%] right-[18%] w-[200px] h-[200px] rounded-full bg-white/35 blur-[70px]" />
      {/* Ambient glowing orbs - Increased intensity for presence */}
      <div className="absolute top-[6%] right-[2%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-[#8F2D56]/35 via-[#B23A68]/18 to-[#F2C3D4]/5 blur-[96px]" />
      <div className="absolute bottom-[-6%] left-[2%] w-[340px] h-[340px] rounded-full bg-gradient-to-br from-[#5A1834]/28 via-[#8C2044]/16 to-transparent blur-[90px]" />
      <div className="absolute inset-x-[16%] bottom-[10%] h-[120px] bg-gradient-to-r from-transparent via-[#B23A68]/20 to-transparent blur-[42px]" />

      <motion.div
        animate={{ y: [-12, 12, -12] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-full max-w-[660px] perspective-1000 pl-4 lg:pl-0"
      >
        <div className="pointer-events-none absolute -inset-x-12 bottom-[-70px] h-24 bg-gradient-to-r from-transparent via-[#8C2044]/25 to-transparent blur-2xl" />
        <div
          className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-white/88 via-[#fffafc]/80 to-[#f8f5f7]/88 backdrop-blur-3xl border border-white/60 p-8 shadow-[0_55px_120px_-30px_rgba(140,32,68,0.36)] transform lg:rotate-y-[-12deg] lg:rotate-x-[7deg] translate-z-10"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/70 to-transparent" />
          <div className="pointer-events-none absolute -right-14 top-14 h-48 w-32 rotate-[28deg] bg-white/45 blur-xl" />

          {/* Top Bar of Mockup */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.85),transparent_42%),radial-gradient(circle_at_82%_90%,rgba(178,58,104,0.14),transparent_46%)] pointer-events-none" />
          <div className="absolute inset-x-8 top-2 h-24 bg-gradient-to-b from-white/70 to-transparent blur-xl pointer-events-none" />
          {/* Top Bar of Mockup */}
          <div className="relative z-10 flex items-center justify-between mb-8 border-b border-[#8C2044]/14 pb-5">
            <div className="flex items-center gap-4">
              <div className="flex gap-2 opacity-50">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-sm" />
              </div>
              <div className="h-7 px-4 bg-white/70 rounded-full flex items-center border border-[#8C2044]/10 shadow-inner">
                <span className="text-[11px] font-black tracking-widest text-[#461326]/70 uppercase">Visão Resumo</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7A2348] to-[#4A1028] flex items-center justify-center text-white shadow-lg shadow-[#8C2044]/30">
              <div className="h-7 px-4 bg-[#8C2044]/8 rounded-full flex items-center border border-[#8C2044]/15">
                <span className="text-[11px] font-black tracking-widest text-[#5A1834]/75 uppercase">Visão Resumo</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5A1834] to-[#8C2044] flex items-center justify-center text-white shadow-[0_12px_22px_rgba(90,24,52,0.35)]">
              <span className="text-[12px] font-bold tracking-widest">SM</span>
            </div>
          </div>

          {/* Cards inside Mockup */}
          <div className="grid grid-cols-2 gap-5 mb-5" style={{ transform: "translateZ(40px)" }}>
            <div className="p-6 rounded-[20px] bg-white/90 shadow-[0_10px_30px_rgba(90,24,52,0.08)] border border-[#8C2044]/10 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-[#8F2D56]/5 to-transparent rounded-bl-[100px] pointer-events-none" />
              <span className="text-[11px] uppercase font-bold tracking-widest text-[#9CA3AF] block mb-3">Garrafas Acervo</span>
              <span className="text-4xl font-serif font-black text-[#0F0F14] tracking-tight">2.14k</span>
              <span className="text-[13px] font-bold text-[#8C2044] flex items-center gap-1.5 mt-2 bg-[#8C2044]/10 w-fit px-2 py-0.5 rounded-md">+42 entrada</span>
            </div>

            <div className="p-6 rounded-[20px] bg-gradient-to-br from-[#5A1834] via-[#7A1F47] to-[#A02E5C] shadow-[0_16px_40px_rgba(90,24,52,0.35)] text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-white/25 to-transparent rounded-bl-[100px] opacity-70 pointer-events-none" />
              <span className="text-[11px] uppercase font-bold tracking-widest text-white/50 block mb-3">Patrimônio Líquido</span>
              <span className="text-4xl font-serif font-black tracking-tight text-white/95">R$ 142k</span>
              <span className="text-[13px] font-medium text-white/40 flex items-center gap-1.5 mt-2">Atualizado há 2h</span>
            </div>
          </div>

          {/* List Mockup */}
          <div className="space-y-3.5 bg-white/55 p-5 rounded-[20px] border border-[#8C2044]/10 backdrop-blur-sm" style={{ transform: "translateZ(20px)" }}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[12px] font-black uppercase tracking-widest text-[#0F0F14]">Beber Agora</span>
              <span className="text-[11px] font-bold text-[#8C2044] hover:underline cursor-pointer">Ver todas</span>
            </div>
            {[
              { name: "Château Margaux 2015", tag: "Bordeaux, FR", alert: "Auge (1 un)", color: "border-[#8C2044]/30 bg-[#8C2044]/5 text-[#8C2044]" },
              { name: "Sassicaia 2018", tag: "Toscana, IT", alert: "Evoluindo (3 un)", color: "border-[#0F0F14]/20 bg-white text-[#0F0F14]" },
              { name: "Dom Pérignon 2012", tag: "Champagne, FR", alert: "Auge (6 un)", color: "border-[#0F0F14]/20 bg-white text-[#0F0F14]" },
            ].map((w, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/80 border border-[#8C2044]/10 shadow-[0_6px_20px_rgba(112,31,62,0.12)] hover:border-[#8C2044]/35 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#fbf5f8] flex items-center justify-center border border-[#8C2044]/10 group-hover:scale-105 transition-transform">
                    <Wine className="w-5 h-5 text-[#8C2044]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="block text-[14px] font-bold text-[#0F0F14]">{w.name}</span>
                    <span className="text-[12px] font-medium text-muted-foreground mt-0.5 block">{w.tag}</span>
                  </div>
                </div>
                <div className={`h-7 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center rounded-lg border ${w.color}`}>
                  {w.alert}
                </div>
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
    <div className="min-h-screen overflow-hidden premium-noise selection:bg-[#8F2D56]/20 selection:text-[#0F0F14] bg-[radial-gradient(circle_at_12%_-8%,rgba(173,69,104,0.18),transparent_40%),radial-gradient(circle_at_82%_6%,rgba(255,255,255,0.85),transparent_35%),#f6f3f5] text-[#0F0F14]">

      {/* ─── HEADER ─── */}
      <motion.header
        className="fixed top-0 w-full z-50 px-6 py-5 lg:py-6 bg-[#FFF8FB]/78 backdrop-blur-2xl border-b border-[#8C2044]/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <a
            href="/"
            className="flex items-center gap-3 transition-opacity duration-300 hover:opacity-80"
          >
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-[44px] sm:h-[58px] w-auto object-contain" />
            <span className="text-[22px] sm:text-[26px] font-black tracking-tight font-sans hidden xsm:block text-[#0F0F14]" style={{ letterSpacing: "-0.04em" }}>
              Sommelyx
            </span>
          </a>

          <div className="flex items-center gap-3 sm:gap-6">
            <MagneticButton>
              <Button
                variant="ghost"
                className="text-[13px] font-semibold px-5 h-11 transition-all hover:bg-black/[0.03] rounded-2xl text-muted-foreground hover:text-foreground inline-flex"
                onClick={() => navigate("/login")}
              >
                Entrar
              </Button>
            </MagneticButton>
            <MagneticButton>
              <Button
                className="px-6 sm:px-9 h-11 sm:h-12 text-[12px] font-black uppercase tracking-[0.13em] rounded-2xl transition-all shadow-[0_10px_22px_-12px_rgba(140,32,68,0.28)] hover:shadow-[0_16px_30px_-16px_rgba(140,32,68,0.36)] bg-[#0F0F14] hover:bg-[#202028] text-white"
                onClick={() => navigate("/signup")}
              >
                Começar Grátis
              </Button>
            </MagneticButton>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-36 lg:pt-48 pb-16 lg:pb-32 px-6 min-h-screen flex items-center overflow-visible">
        <div className="absolute inset-x-0 top-0 h-[76%] bg-[radial-gradient(circle_at_18%_22%,rgba(143,45,86,0.16),transparent_46%),radial-gradient(circle_at_82%_18%,rgba(196,69,105,0.14),transparent_42%),linear-gradient(180deg,rgba(255,246,251,0.8),transparent_72%)] pointer-events-none" />
        {/* Subtle grid pattern background for density */}
        <div className="absolute inset-0 z-0 opacity-[0.28] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(88,20,46,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(88,20,46,0.07) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
        <div className="absolute top-[-12%] left-[-12%] w-[46vw] h-[46vw] rounded-full bg-[#8C2044]/14 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-30%] right-[-10%] w-[44vw] h-[44vw] rounded-full bg-[#e8cfda]/35 blur-[140px] pointer-events-none" />

        <div className="container mx-auto relative z-10 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">

            {/* Headline Block (Left) - Increased size and presence */}
            <div className="flex-1 max-w-2xl pt-10 lg:pt-0">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="mb-8 flex items-center gap-3">
                <div className="h-8 px-4 rounded-full bg-[#8C2044]/8 border border-[#8C2044]/18 shadow-[0_8px_18px_rgba(140,32,68,0.08)] flex items-center justify-center">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#8C2044]">Inteligência Estratégica</span>
                </div>
              </motion.div>

              <motion.h1
                className="text-left font-serif font-black text-[#0F0F14]"
                style={{ fontSize: "clamp(56px, 7vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.04em" }}
                initial="hidden" animate="visible" variants={fadeUp} custom={1}
              >
                Sua adega, <br />
                <span className="italic text-gradient-wine font-serif block mt-2">inteligente.</span>
              </motion.h1>

              <motion.p
                className="text-left text-lg sm:text-[20px] max-w-[580px] mt-10 font-medium text-[#4B5563]"
                style={{ lineHeight: 1.6 }}
                initial="hidden" animate="visible" variants={fadeUp} custom={2}
              >
                Gestão técnica implacável, operação comercial ágil e inteligência de estoque em um ambiente estruturado para quem trata o vinho com rigor.
              </motion.p>

              <motion.div
                className="mt-12 flex flex-col sm:flex-row items-center gap-5"
                initial="hidden" animate="visible" variants={fadeUp} custom={3}
              >
                <MagneticButton>
                  <Button
                    className="group relative isolate w-full sm:w-auto px-14 h-[68px] text-[14px] font-black uppercase tracking-[0.16em] rounded-[20px] transition-all text-white hover:-translate-y-1.5 shadow-[0_18px_40px_rgba(122,35,72,0.44)] hover:shadow-[0_24px_52px_rgba(122,35,72,0.52)] border border-white/25"
                    style={{ background: "linear-gradient(130deg, #a83866 0%, #7f1e44 42%, #5c1632 100%)" }}
                    onClick={() => navigate("/signup")}
                  >
                    <span className="pointer-events-none absolute inset-[1px] rounded-[18px] bg-gradient-to-b from-white/30 via-transparent to-transparent" />
                    <span className="pointer-events-none absolute -inset-x-5 top-1/2 h-12 -translate-y-1/2 bg-white/20 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
                    Começar Grátis
                  </Button>
                </MagneticButton>
              </motion.div>

              <motion.div
                className="mt-7 flex items-center gap-6 pt-6"
                initial="hidden" animate="visible" variants={fadeUp} custom={4}
              >
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-[#FAFAFA] bg-slate-200 overflow-hidden"><img src="https://i.pravatar.cc/100?img=11" alt="Avatar" className="w-full h-full object-cover" /></div>
                  <div className="w-10 h-10 rounded-full border-2 border-[#FAFAFA] bg-slate-300 overflow-hidden"><img src="https://i.pravatar.cc/100?img=12" alt="Avatar" className="w-full h-full object-cover" /></div>
                  <div className="w-10 h-10 rounded-full border-2 border-[#FAFAFA] bg-slate-400 overflow-hidden"><img src="https://i.pravatar.cc/100?img=13" alt="Avatar" className="w-full h-full object-cover" /></div>
                  <div className="w-10 h-10 rounded-full border-2 border-[#FAFAFA] bg-[#0F0F14] flex items-center justify-center text-[10px] font-bold text-white">+2k</div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-[#0F0F14]">Junte-se a gestores e colecionadores</span>
                  <span className="text-[12px] font-medium text-[#7B6A73] flex items-center gap-1.5 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-[#8C2044]" /> Sem implantação complexa.
                  </span>
                  <span className="text-[12px] text-[#8C2044]/75 font-semibold mt-1">Configuração guiada e acesso imediato ao painel.</span>
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
      <section id="features" className="relative py-28 px-6 border-t border-black/[0.04] bg-white">
        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="max-w-3xl">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 block text-[#8C2044]">
                Excelência Operacional
              </span>
              <h2 className="text-4xl md:text-6xl font-serif font-black tracking-tight text-[#0F0F14] leading-[1.05]">
                Um ecossistema desenhado <br className="hidden md:block" /><span className="italic text-gradient-wine">para a sua coleção</span>
              </h2>
            </div>
            <p className="text-[17px] text-[#6B7280] max-w-md font-medium leading-relaxed">Nossa plataforma combina ferramentas de gestão robustas com uma interface elegante e analítica avançada.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group cursor-default p-10 rounded-[32px] bg-[#FAFAFA] border border-black/[0.04] hover:bg-white transition-colors duration-300 relative overflow-hidden"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{
                  y: -6,
                  boxShadow: "0 30px 60px -15px rgba(0,0,0,0.08)",
                  borderColor: "rgba(140, 32, 68, 0.2)"
                }}
              >
                <div className="absolute right-0 top-0 w-40 h-40 bg-gradient-to-bl from-[#8F2D56]/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-8 bg-white shadow-sm border border-black/[0.04] group-hover:scale-110 group-hover:shadow-md transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
                  <f.icon className="h-7 w-7 text-[#8C2044]" strokeWidth={1.5} />
                </div>
                <h3 className="text-[20px] font-bold mb-3 font-sans tracking-tight text-[#0F0F14]">{f.title}</h3>
                <p className="text-[15px] leading-[1.6] text-[#6B7280] font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 4. STATS ═══════════════ */}
      <section className="relative z-10 py-24 border-y border-black/[0.04] bg-[#0F0F14] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
        <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-gradient-to-bl from-[#8C2044]/30 to-transparent blur-[140px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-0" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            {[
              { label: "Garrafas estocadas", value: "320k+" },
              { label: "Valor em acervos", value: "R$ 48M+" },
              { label: "Produtores base", value: "14.2k" },
              { label: "Decisões seguras", value: "99%" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center relative md:border-r border-white/10 last:border-0"
                variants={fadeUp}
              >
                <p className="text-4xl md:text-6xl font-black font-serif tracking-tight text-white mb-3" style={{ textShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>{stat.value}</p>
                <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/50">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ 5. PRICING ═══════════════ */}
      <section id="pricing" className="relative py-28 px-6 bg-[#FAFAFA]">
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="mb-20 text-center max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 block text-[#8C2044]">Acesso Premium</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black tracking-tight text-[#0F0F14] leading-[1.05]">
              Planos desenhados <br className="hidden md:block" /> <span className="italic text-gradient-wine">para sua coleção</span>
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`relative p-8 md:p-10 rounded-[36px] overflow-hidden flex flex-col ${plan.highlighted ? "lg:py-14" : ""}`}
                style={plan.highlighted ? {
                  background: "linear-gradient(160deg, #2B0F1F 0%, #4A1932 52%, #6A2143 100%)",
                  boxShadow: "0 28px 60px rgba(74,25,50,0.26), 0 1px 0 rgba(255,255,255,0.18) inset",
                  border: "1px solid rgba(255,255,255,0.16)",
                } : {
                  background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 100%)",
                  border: "1px solid rgba(15, 15, 20, 0.07)",
                  boxShadow: "0 16px 42px -16px rgba(15,15,20,0.11), 0 1px 0 rgba(255,255,255,0.7) inset",
                }}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                whileHover={{ y: -6, transition: { duration: 0.35 } }}
              >
                <div
                  className="pointer-events-none absolute inset-x-8 top-0 h-14 rounded-b-[28px]"
                  style={{
                    background: plan.highlighted
                      ? "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 90%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 95%)",
                  }}
                />

                {plan.highlighted && (
                  <div className="absolute top-0 right-0 p-7 md:p-8">
                    <span className="px-[18px] py-2 rounded-full text-[10px] font-black tracking-[0.16em] uppercase bg-gradient-to-r from-[#EAB3C8]/85 via-[#E39AB7]/85 to-[#D1739A]/85 text-[#3B1326] border border-white/45 shadow-[0_10px_24px_rgba(17,7,12,0.25)] backdrop-blur-sm">
                      Recomendado
                    </span>
                  </div>
                )}

                <h3 className="text-[28px] font-serif font-black mb-2 tracking-tight" style={{ color: plan.highlighted ? "white" : "#0F0F14" }}>
                  {plan.name}
                </h3>
                <p className="text-[15px] mb-8 font-medium" style={{ color: plan.highlighted ? "rgba(255,255,255,0.6)" : "#6B7280" }}>
                  {plan.desc}
                </p>
                <div className="mb-8 flex items-baseline gap-1.5 border-b border-black/[0.04] pb-8" style={plan.highlighted ? { borderColor: "rgba(255,255,255,0.15)" } : {}}>
                  <span className="text-6xl font-black font-sans tracking-tighter" style={{ color: plan.highlighted ? "white" : "#0F0F14" }}>
                    {plan.price}
                  </span>
                  <span className="text-[14px] font-bold uppercase tracking-wider" style={{ color: plan.highlighted ? "rgba(255,255,255,0.4)" : "#9CA3AF" }}>
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-3.5 mb-10 min-h-[188px]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[15px] leading-relaxed font-medium" style={{ color: plan.highlighted ? "rgba(255,255,255,0.92)" : "#4B5563" }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: plan.highlighted ? "rgba(255, 225, 236, 0.2)" : "rgba(140,32,68,0.1)", boxShadow: plan.highlighted ? "0 2px 8px rgba(255,193,218,0.25)" : "none" }}>
                        <Check className="h-3 w-3" style={{ color: plan.highlighted ? "#FFD3E4" : "#8C2044" }} strokeWidth={3} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`mt-auto w-full min-h-[60px] md:min-h-[62px] rounded-[20px] px-4 sm:px-5 md:px-6 whitespace-normal sm:whitespace-nowrap text-center text-[11px] sm:text-[11.5px] md:text-[12.5px] font-extrabold tracking-[0.015em] md:tracking-[0.04em] leading-tight transition-all duration-300 ${plan.highlighted
                    ? "bg-white text-[#3B1326] hover:bg-[#FFF7FA] border border-white/70 shadow-[0_16px_36px_rgba(20,8,14,0.3)] hover:shadow-[0_20px_38px_rgba(20,8,14,0.35)] hover:-translate-y-0.5"
                    : "bg-[#FAFAFA] text-[#18181B] hover:bg-white shadow-[0_8px_16px_rgba(15,15,20,0.06)] hover:shadow-[0_12px_24px_rgba(15,15,20,0.1)] border border-black/10"
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
      <footer className="py-14 px-6 relative z-10 bg-white border-t border-black/[0.04]">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-[36px] w-auto object-contain grayscale opacity-60" />
            <span className="font-black text-[20px] font-sans tracking-tight text-[#0F0F14]">Sommelyx</span>
          </div>
          <div className="flex items-center gap-8 text-[13px] font-bold uppercase tracking-widest text-[#6B7280]">
            <a href="#features" className="hover:text-[#0F0F14] transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-[#0F0F14] transition-colors">Planos</a>
            <button onClick={() => navigate("/login")} className="hover:text-[#0F0F14] transition-colors cursor-pointer bg-transparent border-0 font-bold uppercase tracking-widest">Acesso Privado</button>
          </div>
          <p className="text-[13px] font-medium text-[#9CA3AF]">
            © {new Date().getFullYear()} Sommelyx. Inteligência em cada taça.
          </p>
        </div>
      </footer>
    </div>
  );
}
