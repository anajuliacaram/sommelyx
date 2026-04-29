import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Wine, Sparkles, TrendingUp, Clock, AlertTriangle, ChefHat, Star } from "@/icons/lucide";
import { BrandName } from "@/components/BrandName";
import { formatMotionNumber, useCountUp } from "@/lib/motion";
import { designSystem } from "@/styles/designSystem";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

type TabKey = "dashboard" | "adega" | "harmonizar";

const tabs: { key: TabKey; label: string; icon: typeof LayoutDashboard; accent: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, accent: "#3F5E3B" },
  { key: "adega", label: "Adega", icon: Wine, accent: "#3F5E3B" },
  { key: "harmonizar", label: "Harmonizar", icon: Sparkles, accent: "#3F5E3B" },
];

const browserFrame = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,247,242,1) 100%)",
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 42px 110px -44px rgba(44,20,31,0.36), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-black/[0.06]">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/85" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]/85" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/85" />
      </div>
      <div className="flex-1 mx-2 px-3 py-1 rounded-md text-[10.5px] font-medium text-[#5F5F5F] bg-[#F4F1EC] border border-black/[0.04] truncate text-center">
        {url}
      </div>
      <div className="w-12" />
    </div>
  );
}

function AnimatedMetric({
  value,
  suffix,
  prefix = "",
  decimals = 0,
  tightSuffix = false,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  tightSuffix?: boolean;
}) {
  const animated = useCountUp(value, { duration: 700 });
  const formatted = formatMotionNumber(animated, decimals);
  return (
    <>
      {prefix}
      {formatted}
      {suffix ? (
        <span className={tightSuffix ? "text-[10px] font-medium text-[#5F5F5F]" : "ml-1 text-[10px] font-medium text-[#5F5F5F]"}>
          {suffix}
        </span>
      ) : null}
    </>
  );
}

/* ── DASHBOARD MOCK ── */
function DashboardMock() {
  const kpis: Array<{ label: string; value: number; suffix?: string; trend: string; color: string; prefix?: string; decimals?: number; tightSuffix?: boolean }> = [
    { label: "Estoque", value: 128, suffix: "un.", trend: "+12", color: "#7B1E2B" },
    { label: "Valor", value: 92, suffix: "k", trend: "+8%", color: "#5F6F52", prefix: "R$ ", tightSuffix: true },
    { label: "Giro", value: 37, suffix: "%", trend: "+4%", color: "#B8860B", tightSuffix: true },
    { label: "Reposição", value: 6, suffix: "itens", trend: "urgente", color: "#7B1E2B" },
  ];

  return (
    <div className="p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#5F5F5F]">Painel executivo</p>
          <p className="text-[16px] font-semibold tracking-tight text-[#1A1A1A]">Olá, J.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.10em] text-wine bg-[rgba(123,30,43,0.08)] border border-[rgba(123,30,43,0.14)]">
            Comercial
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className="motion-card-hover motion-enter rounded-xl p-3"
            style={{ ...designSystem.glassCard, animationDelay: `${index * 110}ms` }}
          >
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.10em] text-[#5F5F5F]">{kpi.label}</p>
            <p className="mt-1 text-[14px] font-semibold tracking-tight text-[#1A1A1A]">
              <AnimatedMetric value={kpi.value} suffix={kpi.suffix} prefix={kpi.prefix} tightSuffix={kpi.tightSuffix} />
            </p>
            <p className="mt-0.5 text-[9px] font-semibold" style={{ color: kpi.color }}>{kpi.trend}</p>
          </div>
        ))}
      </div>

      {/* Chart + List */}
      <div className="grid grid-cols-12 gap-2.5">
        <div className="col-span-7 rounded-xl p-3" style={designSystem.glassCard}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.10em] text-[#5F5F5F]">Vendas — 6 meses</p>
            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[#2E5E3E]">
              <TrendingUp className="h-2.5 w-2.5" /> 37%
            </span>
          </div>
          <div className="grid grid-cols-12 items-end gap-1 h-16">
            {[4, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16].map((h, i) => (
              <div
                key={i}
                className="motion-chart-bar rounded-sm"
                style={{
                  height: `${h * 4}px`,
                  background: i === 11 ? "#7B1E2B" : "rgba(123,30,43,0.55)",
                  animationDelay: `${i * 55}ms`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="col-span-5 rounded-xl p-3" style={designSystem.glassCard}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.10em] text-[#5F5F5F] mb-2">Reposição</p>
          <div className="space-y-1.5">
            {[
              { name: "Brunello 2018", qty: 1 },
              { name: "Barolo Riserva", qty: 2 },
              { name: "Champagne Brut", qty: 2 },
            ].map((r) => (
              <div key={r.name} className="flex items-center gap-1.5">
                <AlertTriangle className="h-2.5 w-2.5 text-wine shrink-0" />
                <p className="flex-1 truncate text-[10.5px] font-medium text-[#1A1A1A]">{r.name}</p>
                <span className="text-[9.5px] font-semibold text-wine">{r.qty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ADEGA MOCK ── */
function AdegaMock() {
  const wines = [
    { name: "Brunello di Montalcino", producer: "Biondi-Santi", year: 2018, qty: 2, type: "Tinto", color: "#7B1E2B", rating: 4.8, status: "Janela ideal" },
    { name: "Champagne Brut Réserve", producer: "Bollinger", year: 2019, qty: 8, type: "Espumante", color: "#B8860B", rating: 4.6, status: "Ótimo" },
    { name: "Sancerre", producer: "Henri Bourgeois", year: 2022, qty: 5, type: "Branco", color: "#C5B358", rating: 4.4, status: "Beber em breve" },
    { name: "Barolo Riserva", producer: "Vietti", year: 2016, qty: 1, type: "Tinto", color: "#7B1E2B", rating: 4.9, status: "Estoque baixo" },
  ];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#5F5F5F]">Minha adega</p>
          <p className="text-[16px] font-semibold tracking-tight text-[#1A1A1A]">128 garrafas · R$ 92k</p>
        </div>
        <div className="flex gap-1.5">
          {["Tinto", "Branco", "Espumante"].map((t) => (
            <span key={t} className="rounded-full px-2.5 py-1 text-[9px] font-semibold text-[#5F5F5F] bg-white/80 border border-black/[0.06]">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {wines.map((w) => (
          <div key={w.name} className="flex items-center gap-3 rounded-xl p-2.5" style={designSystem.glassCard}>
            {/* Bottle silhouette */}
            <div className="relative h-12 w-3 shrink-0">
              <div className="absolute bottom-0 inset-x-0 h-10 rounded-sm" style={{ background: w.color }} />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2.5 w-1.5 rounded-t-sm" style={{ background: w.color, opacity: 0.7 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-semibold tracking-tight text-[#1A1A1A] truncate">{w.name}</p>
              <p className="text-[10px] text-[#5F5F5F] truncate">{w.producer} · {w.year}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#B8860B]">
                <Star className="h-2.5 w-2.5 fill-current" /> {w.rating}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                style={{
                  background: w.status === "Estoque baixo" ? "rgba(123,30,43,0.10)" : w.status === "Beber em breve" ? "rgba(198,167,104,0.14)" : "rgba(95,111,82,0.10)",
                  color: w.status === "Estoque baixo" ? "#7B1E2B" : w.status === "Beber em breve" ? "#B8860B" : "#5F6F52",
                }}
              >
                {w.status}
              </span>
              <span className="text-[11px] font-semibold tabular-nums text-[#1A1A1A] w-5 text-right">{w.qty}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── HARMONIZAR MOCK ── */
function HarmonizarMock() {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(198,167,104,0.14)", border: "1px solid rgba(198,167,104,0.28)" }}>
          <ChefHat className="h-4 w-4" style={{ color: "#B8860B" }} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#5F5F5F]">Inteligência Sommelyx</p>
          <p className="text-[14px] font-semibold tracking-tight text-[#1A1A1A]">Harmonização para "Risoto de funghi"</p>
        </div>
      </div>

      {/* Dish input pill */}
      <div className="rounded-xl p-3 mb-3 bg-[#F4F1EC] border border-black/[0.05]">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.10em] text-[#5F5F5F] mb-1">Prato</p>
        <p className="text-[12px] font-medium text-[#1A1A1A]">Risoto de funghi porcini com parmesão envelhecido</p>
      </div>

      {/* Suggestions */}
      <div className="space-y-2">
        {[
          { wine: "Barolo Riserva 2016", producer: "Vietti", score: 96, why: "Taninos firmes equilibram a cremosidade; notas terrosas dialogam com o funghi.", color: "#2E5E3E" },
          { wine: "Brunello di Montalcino 2018", producer: "Biondi-Santi", score: 92, why: "Estrutura e elegância sustentam a untuosidade do prato.", color: "#5F6F52" },
          { wine: "Chianti Classico Gran Selezione 2019", producer: "Castello di Ama", score: 87, why: "Acidez vibrante refresca o paladar entre garfadas.", color: "#B8860B" },
        ].map((s) => (
          <div key={s.wine} className="rounded-xl p-3" style={designSystem.glassCard}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold tracking-tight text-[#1A1A1A] truncate">{s.wine}</p>
                <p className="text-[10px] text-[#5F5F5F] truncate">{s.producer}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="h-1.5 w-12 rounded-full bg-black/[0.06] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: s.color }} />
                </div>
                <span className="text-[10.5px] font-bold tabular-nums" style={{ color: s.color }}>{s.score}</span>
              </div>
            </div>
            <p className="text-[10.5px] leading-snug text-[#5F5F5F]">{s.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingShowcase() {
  const [active, setActive] = useState<TabKey>("dashboard");
  const activeTab = tabs.find((t) => t.key === active)!;

  return (
    <section className="relative px-4 sm:px-8 pt-3 pb-7 z-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="text-center mx-auto max-w-2xl mb-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-wine mb-3">
            Por dentro do produto
          </span>
          <h2 className="text-[26px] sm:text-[34px] font-semibold tracking-[-0.02em] text-[#1A1A1A] leading-[1.1]">
            Veja o <BrandName className="text-[26px] sm:text-[34px]" /> em ação
          </h2>
          <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-[#5F5F5F]">
            Três telas que mostram o nível de clareza e densidade do produto.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex justify-center mb-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
        >
          <div className="inline-flex gap-1 p-1 rounded-2xl bg-white/70 backdrop-blur-md border border-black/[0.06] shadow-sm">
            {tabs.map((t) => {
              const isActive = t.key === active;
              return (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors"
                  style={{
                    color: isActive ? "#fff" : "#5F5F5F",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="showcase-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: t.accent }}
                      transition={{ type: "spring", stiffness: 360, damping: 32 }}
                    />
                  )}
                  <t.icon className="relative z-10 h-3.5 w-3.5" />
                  <span className="relative z-10">{t.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Browser frame */}
        <motion.div
          className="relative mx-auto rounded-3xl overflow-hidden"
          style={browserFrame}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Soft glow per active tab */}
          <div
            className="pointer-events-none absolute -inset-x-10 -top-10 h-32 opacity-45"
            style={{
              background: `radial-gradient(ellipse at center top, ${activeTab.accent}33, transparent 60%)`,
            }}
          />
          <div className="pointer-events-none absolute left-6 top-7 h-20 w-20 rounded-[24px] border border-white/50 bg-white/30 blur-[1px] opacity-70 shadow-[0_14px_28px_-18px_rgba(44,20,31,0.18)]" />
          <div className="pointer-events-none absolute right-8 bottom-8 h-24 w-24 rounded-[24px] border border-white/50 bg-white/24 blur-[1px] opacity-50 shadow-[0_14px_28px_-18px_rgba(44,20,31,0.18)]" />

          <BrowserChrome url={`sommelyx.com/dashboard/${active}`} />

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {active === "dashboard" && <DashboardMock />}
              {active === "adega" && <AdegaMock />}
              {active === "harmonizar" && <HarmonizarMock />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Caption */}
        <motion.p
          className="mt-4 text-center text-[12px] text-[#5F5F5F] italic"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={3}
        >
          Demonstração visual do produto · dados ilustrativos
        </motion.p>
      </div>
    </section>
  );
}
