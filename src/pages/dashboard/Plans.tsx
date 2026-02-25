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
    name: "Free",
    price: "R$ 0",
    period: "/mês",
    desc: "Para começar a organizar",
    features: ["Até 50 garrafas", "Dashboard básico", "Notas de degustação", "1 usuário"],
    current: true,
  },
  {
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    desc: "Para colecionadores sérios",
    features: ["Garrafas ilimitadas", "Analytics avançado", "Wishlist & harmonização", "Alertas inteligentes", "Exportação CSV"],
    highlighted: true,
  },
  {
    name: "Business",
    price: "R$ 99",
    period: "/mês",
    desc: "Para operações comerciais",
    features: ["Tudo do Pro", "Multiusuário (até 10)", "Gestão de vendas", "Relatórios financeiros", "Cadastro de clientes", "Suporte prioritário"],
  },
];

export default function Plans() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Meu Plano</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua assinatura e recursos.</p>
      </motion.div>

      {/* Current plan badge */}
      <motion.div
        className="card-depth p-5 flex items-center justify-between"
        initial="hidden" animate="visible" variants={fadeUp} custom={1}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-wine flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground font-sans tracking-tight">Plano Free</h3>
              <Badge variant="outline" className="text-[10px] h-5 border-border/50 text-muted-foreground">Ativo</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Trial de 14 dias do Pro disponível</p>
          </div>
        </div>
        <Button className="gradient-gold text-gold-foreground rounded-lg h-8 text-xs font-medium btn-gold-glow px-4">
          <Crown className="h-3.5 w-3.5 mr-1.5" /> Fazer Upgrade
        </Button>
      </motion.div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            className={`rounded-xl p-6 transition-all duration-200 relative ${
              plan.highlighted
                ? "gradient-wine text-primary-foreground shadow-wine glow-wine border border-wine-vivid/20"
                : "card-depth"
            }`}
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
          >
            {plan.current && (
              <Badge variant="outline" className="mb-3 text-[10px] h-5 border-border/50 text-muted-foreground">Plano Atual</Badge>
            )}
            {plan.highlighted && (
              <Badge className="mb-3 text-[10px] h-5 bg-primary-foreground/15 text-primary-foreground border-0">
                Recomendado
              </Badge>
            )}
            <h3 className="text-base font-semibold font-sans tracking-tight">{plan.name}</h3>
            <p className={`text-xs mb-4 ${plan.highlighted ? "text-primary-foreground/55" : "text-muted-foreground"}`}>
              {plan.desc}
            </p>
            <div className="mb-5">
              <span className="text-2xl font-bold font-sans tracking-tight">{plan.price}</span>
              <span className={`text-xs ml-1 ${plan.highlighted ? "text-primary-foreground/55" : "text-muted-foreground"}`}>
                {plan.period}
              </span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs">
                  <Check className={`h-3.5 w-3.5 flex-shrink-0 ${plan.highlighted ? "text-gold-light" : "text-primary"}`} />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.current ? "outline" : "default"}
              className={`w-full rounded-lg h-9 text-xs font-medium ${
                plan.highlighted
                  ? "bg-primary-foreground text-wine hover:bg-primary-foreground/90 btn-gold-glow"
                  : plan.current
                    ? "border-border/50 text-muted-foreground"
                    : "gradient-wine text-primary-foreground btn-glow"
              }`}
              disabled={plan.current}
            >
              {plan.current ? "Plano Atual" : "Selecionar Plano"}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
