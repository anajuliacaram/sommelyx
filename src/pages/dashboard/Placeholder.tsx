import { motion } from "framer-motion";
import { Construction } from "@/icons/lucide";
import { WineMesh } from "@/components/WineMesh";

export default function Placeholder({ title }: { title: string }) {
  return (
    <motion.div
      className="card-depth p-10 text-center relative overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <WineMesh variant="empty-state" />
      <div className="relative z-10">
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Construction className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="text-sm font-semibold text-foreground font-sans tracking-tight mb-1">{title}</h2>
        <p className="text-xs text-muted-foreground">Esta seção está sendo finalizada e estará disponível em breve.</p>
      </div>
    </motion.div>
  );
}
