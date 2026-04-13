import { motion } from "framer-motion";
import { Construction } from "@/icons/lucide";
import { WineMesh } from "@/components/WineMesh";

export default function Placeholder({ title }: { title: string }) {
  return (
    <motion.div
      className="editorial-hero p-10 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <WineMesh variant="empty-state" />
      <div className="relative z-10">
        <div className="w-10 h-10 rounded-lg bg-[hsl(0_0%_100%/0.06)] flex items-center justify-center mx-auto mb-4">
          <Construction className="h-5 w-5 text-copper" />
        </div>
        <h2 className="text-sm font-semibold text-[hsl(var(--cream-warm))] font-sans tracking-tight mb-1">{title}</h2>
        <p className="text-xs text-[hsl(var(--cream-warm)/0.5)]">Esta seção está sendo finalizada e estará disponível em breve.</p>
      </div>
    </motion.div>
  );
}
