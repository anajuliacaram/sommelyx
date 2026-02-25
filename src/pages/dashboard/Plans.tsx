import { motion } from "framer-motion";
import { Check, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 15 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
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
    <div className="max-w-5xl mx-auto space-y-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">Meu Plano</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua assinatura e recursos disponíveis.</p>
      </motion.div>

      {/* Current plan badge */}
      <motion.div
        className="glass rounded-2xl p-6 flex items-center justify-between"
        initial="hidden" animate="visible" variants={fadeUp} custom={1}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-wine flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground font-sans">Plano Free</h3>
              <Badge variant="outline" className="text-xs">Ativo</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Trial de 14 dias do Pro disponível</p>
          </div>
        </div>
        <Button className="gradient-gold text-gold-foreground rounded-xl">
          <Crown className="h-4 w-4 mr-2" /> Fazer Upgrade
        </Button>
      </motion.div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            className={`rounded-2xl p-7 transition-all ${
              plan.highlighted
                ? "gradient-wine text-primary-foreground shadow-wine"
                : "glass"
            }`}
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
          >
            {plan.current && (
              <Badge variant="outline" className="mb-3 text-xs">Plano Atual</Badge>
            )}
            {plan.highlighted && (
              <Badge className="mb-3 text-xs bg-primary-foreground/20 text-primary-foreground border-0">
                Recomendado
              </Badge>
            )}
            <h3 className="text-xl font-bold font-sans">{plan.name}</h3>
            <p className={`text-sm mb-4 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {plan.desc}
            </p>
            <div className="mb-6">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className={`text-sm ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {plan.period}
              </span>
            </div>
            <ul className="space-y-2.5 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className={`h-4 w-4 flex-shrink-0 ${plan.highlighted ? "text-gold-light" : "text-primary"}`} />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.current ? "outline" : "default"}
              className={`w-full rounded-xl ${
                plan.highlighted ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""
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
