import { motion } from "framer-motion";
import {
    ShoppingCart, Users, FileText,
    ArrowLeft, LayoutDashboard, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { WineMesh } from "@/components/WineMesh";

interface PlaceholderPageProps {
    title: string;
    icon: "sales" | "registers" | "reports";
    description: string;
}

const config = {
    sales: { icon: ShoppingCart, color: "#8c2044", label: "Gestão de Vendas" },
    registers: { icon: Users, color: "#c9a86a", label: "Base de Clientes" },
    reports: { icon: FileText, color: "#4d2b52", label: "Inteligência & Relatórios" },
};

export default function InventoryPlaceholder({ title, icon, description }: PlaceholderPageProps) {
    const navigate = useNavigate();
    const active = config[icon];
    const Icon = active.icon;

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] relative overflow-hidden px-6 pb-12">
            {/* Ambient BG */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at center, rgba(140,32,68,0.03) 0%, transparent 70%)" }} />

            <WineMesh variant="empty-state" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-12 max-w-lg w-full text-center relative z-10 flex flex-col items-center border-white/40 ring-1 ring-black/[0.03]"
            >
                {/* Glass Orb */}
                <motion.div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-8 relative"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-xl border border-white/40 shadow-premium" />
                    <div className="absolute inset-0 rounded-full opacity-5" style={{ backgroundColor: active.color }} />
                    <Icon className="h-9 w-9 relative z-10" style={{ color: active.color }} />
                </motion.div>

                <h1 className="text-3xl font-serif font-black italic tracking-tight mb-4 text-foreground">{title}</h1>
                <p className="text-muted-foreground font-medium leading-relaxed mb-10">
                    Esta funcionalidade é exclusiva para o plano <span className="font-bold text-primary">Sommelyx Pro</span> e está sendo preparada para revolucionar sua operação. <br /><br /> {description}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <Button variant="primary" className="flex-1 h-12 rounded-2xl font-bold shadow-float" onClick={() => navigate("/dashboard")}>
                        <LayoutDashboard className="h-4 w-4 mr-2" /> Voltar ao Painel
                    </Button>
                    <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-bold border border-border/70 bg-background/50 hover:bg-background" onClick={() => navigate("/dashboard/plans")}>
                        Ver Planos Pro
                    </Button>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12">
                <Button variant="ghost" className="h-9 px-3 text-[11px] font-black uppercase tracking-[0.2em]" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-3 w-3" /> Voltar
                </Button>
            </motion.div>
        </div>
    );
}
