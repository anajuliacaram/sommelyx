import { motion } from "framer-motion";
import { MessageCircle, Lightbulb, Star, TrendingUp, ArrowRight } from "@/icons/lucide";

const communityItems = [
  {
    icon: Lightbulb,
    title: "Dica da semana",
    desc: "Vinhos do Douro combinam perfeitamente com pratos de inverno.",
    color: "#C9A86A",
    bg: "rgba(201,168,106,0.08)",
  },
  {
    icon: TrendingUp,
    title: "Tendência da sua adega",
    desc: "Tintos representam 68% da sua coleção. Que tal explorar brancos?",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
  },
  {
    icon: Star,
    title: "Harmonização popular",
    desc: "Malbec + churrasco é a combinação mais registrada esta semana.",
    color: "#E07A5F",
    bg: "rgba(224,122,95,0.08)",
  },
];

export function DashboardCommunityCard() {
  return (
    <motion.div
      className="glass-card p-5 relative overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#C9A86A]/5 to-transparent rounded-bl-full pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-4 w-4 text-[#C9A86A]" />
        <h3 className="text-sm font-bold font-sans text-foreground">Inspiração & Descoberta</h3>
      </div>

      <div className="space-y-3">
        {communityItems.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-2.5 rounded-xl transition-colors hover:bg-black/[0.015] cursor-pointer"
            style={{ border: "1px solid rgba(0,0,0,0.04)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: item.bg }}>
              <item.icon className="h-4 w-4" style={{ color: item.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
        <p className="text-[11px] text-muted-foreground text-center font-medium">
          Comunidade Sommelyx — em breve mais recursos de compartilhamento
        </p>
      </div>
    </motion.div>
  );
}
