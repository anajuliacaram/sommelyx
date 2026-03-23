import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PremiumEmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    primaryAction?: {
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function PremiumEmptyState({
    icon: Icon,
    title,
    description,
    primaryAction,
    secondaryAction,
    className
}: PremiumEmptyStateProps) {
    const reducedMotion = useReducedMotion();

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                "flex flex-col items-center justify-center p-12 lg:p-20 text-center rounded-[32px] bg-white/40 backdrop-blur-3xl border border-black/[0.04] shadow-sm relative overflow-hidden",
                className
            )}
        >
            {/* Background elegant gradient */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[400px] max-h-[400px] bg-gradient-to-br from-[#8C2044]/5 to-transparent blur-[80px] rounded-full pointer-events-none" />

            <motion.div
                animate={reducedMotion ? {} : { y: [-4, 4, -4] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex items-center justify-center w-24 h-24 mb-8"
            >
                <div className="absolute inset-0 bg-[#8C2044]/10 rounded-full blur-xl pointer-events-none" />
                <div className="relative z-10 w-16 h-16 rounded-[24px] bg-gradient-to-br from-white to-[#F7F7F8] shadow-[0_8px_16px_-6px_rgba(0,0,0,0.1)] border border-black/[0.04] flex items-center justify-center">
                    <Icon className="w-7 h-7 text-[#8C2044]" strokeWidth={1.5} />
                </div>
            </motion.div>

            <h3 className="text-[28px] font-serif font-black text-foreground tracking-tight mb-3">
                {title}
            </h3>
            <p className="text-[16px] text-muted-foreground font-medium max-w-[400px] leading-relaxed mb-10">
                {description}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                {primaryAction && (
                    <Button
                        onClick={primaryAction.onClick}
                        className="h-12 px-8 rounded-xl text-[14px] font-bold uppercase tracking-wider gradient-wine text-white shadow-float transition-all hover:shadow-wine"
                    >
                        {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
                        {primaryAction.label}
                    </Button>
                )}
                {secondaryAction && (
                    <Button
                        variant="outline"
                        onClick={secondaryAction.onClick}
                        className="h-12 px-8 rounded-xl text-[14px] font-bold uppercase tracking-wider border-border hover:bg-foreground hover:text-background shadow-sm transition-all"
                    >
                        {secondaryAction.label}
                    </Button>
                )}
            </div>
        </motion.div>
    );
}
