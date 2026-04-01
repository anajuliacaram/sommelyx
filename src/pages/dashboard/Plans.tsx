import { motion } from "framer-motion";
import { Check, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 12 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const plans = [
  {
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    desc: "Para colecionadores sérios",
    trial: "14 dias grátis",
    features: ["Garrafas ilimitadas", "Alertas de consumo ideal", "Insights e relatórios", "Exportação CSV"],
    highlighted: true,
    cta: "Começar 14 dias grátis",
  },
  {
    name: "Business",
    price: "R$ 99",
    period: "/mês",
    desc: "Para restaurantes, bares e lojas",
    trial: "14 dias grátis",
    features: ["Tudo do Pro", "Gestão de vendas e estoque", "Relatórios financeiros", "Curva ABC e giro"],
    cta: "Começar 14 dias grátis",
  },
];

export default function Plans() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Meu Plano</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua assinatura e recursos.</p>
      </motion.div>

      {/* Current plan badge */}
      <motion.div
        className="card-depth p-4 flex items-center justify-between"
        initial="hidden" animate="visible" variants={fadeUp} custom={1}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-wine flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground font-sans tracking-tight">Plano atual</h3>
              <Badge variant="outline" className="text-[10px] h-5 border-border/60 text-muted-foreground">Ativo</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Escolha seu plano — todos com 14 dias grátis</p>
          </div>
        </div>
        <Button variant="secondary" className="rounded-lg h-8 text-[11px] font-medium px-4">
          <Crown className="h-3 w-3 mr-1" /> Fazer Upgrade
        </Button>
      </motion.div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-2 gap-3 items-stretch max-w-2xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            className={`rounded-xl flex flex-col transition-all duration-200 relative ${
              plan.highlighted
                ? "p-5 md:p-6 gradient-wine text-primary-foreground shadow-wine glow-wine border border-wine-vivid/25"
                : "p-5 md:p-6 card-depth"
            }`}
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
          >
            {plan.highlighted && (
              <Badge className="mb-2 text-[10px] h-5 w-fit bg-primary-foreground/15 text-primary-foreground border-0">
                Recomendado
              </Badge>
            )}

            <h3 className="text-sm font-semibold font-sans tracking-tight">{plan.name}</h3>
            <p className={`text-[11px] mb-3 ${plan.highlighted ? "text-primary-foreground/55" : "text-muted-foreground"}`}>
              {plan.desc}
            </p>

            <div className="mb-1 border-b pb-4" style={{ borderColor: plan.highlighted ? "rgba(255,255,255,0.12)" : undefined }}>
              <span className="text-3xl font-black font-sans tracking-tighter">{plan.price}</span>
              <span className={`text-[11px] ml-1 ${plan.highlighted ? "text-primary-foreground/40" : "text-muted-foreground"}`}>
                {plan.period}
              </span>
            </div>
            <p className={`text-[10px] font-bold mb-3 tracking-wide ${plan.highlighted ? "text-gold-light" : "text-primary"}`}>
              ✦ {plan.trial}
            </p>

            <ul className="space-y-2 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12px]">
                  <Check className={`h-3 w-3 flex-shrink-0 ${plan.highlighted ? "text-gold-light" : "text-primary"}`} strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant={plan.highlighted ? "ghost" : "primary"}
              className={`mt-auto w-full rounded-lg h-9 text-[11px] font-semibold ${
                plan.highlighted ? "bg-primary-foreground text-primary hover:bg-primary-foreground/95" : ""
              }`}
            >
              {plan.cta}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
