import { motion } from "framer-motion";
import { Construction } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <motion.div
      className="card-depth p-10 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <Construction className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-base font-semibold text-foreground font-sans tracking-tight mb-1.5">{title}</h2>
      <p className="text-sm text-muted-foreground">Em breve — esta funcionalidade está sendo desenvolvida.</p>
    </motion.div>
  );
}
