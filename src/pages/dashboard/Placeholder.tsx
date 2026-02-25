import { motion } from "framer-motion";
import { Construction } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <motion.div
      className="glass rounded-2xl p-12 text-center"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Construction className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-bold text-foreground font-sans mb-2">{title}</h2>
      <p className="text-muted-foreground">Em breve! Esta funcionalidade está sendo desenvolvida.</p>
    </motion.div>
  );
}
