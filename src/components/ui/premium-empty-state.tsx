import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                "flex flex-col items-center justify-center p-10 lg:p-16 text-center rounded-2xl bg-card/60 backdrop-blur-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_-16px_rgba(15,15,20,0.08)] relative overflow-hidden",
                className
            )}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[360px] max-h-[360px] bg-gradient-to-br from-wine/[0.06] to-transparent blur-[80px] rounded-full pointer-events-none" />

            <motion.div
                animate={reducedMotion ? {} : { y: [-3, 3, -3] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex items-center justify-center w-20 h-20 mb-6"
            >
                <div className="absolute inset-0 bg-wine/[0.06] rounded-full blur-xl pointer-events-none" />
                <div className="relative z-10 w-14 h-14 rounded-xl bg-card shadow-[0_2px_8px_-2px_rgba(15,15,20,0.08)] border border-border/40 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-wine" strokeWidth={1.5} />
                </div>
            </motion.div>

            <h3 className="text-[24px] font-serif font-bold text-foreground tracking-tight mb-2">
                {title}
            </h3>
            <p className="text-[14px] text-muted-foreground font-medium max-w-[380px] leading-relaxed mb-8">
                {description}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
                {primaryAction && (
                    <Button
                        variant="primary"
                        onClick={primaryAction.onClick}
                        className="h-10 px-7 rounded-xl text-[13px] font-bold uppercase tracking-[0.08em] shadow-float"
                    >
                        {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
                        {primaryAction.label}
                    </Button>
                )}
                {secondaryAction && (
                    <Button
                        variant="ghost"
                        onClick={secondaryAction.onClick}
                        className="h-10 px-7 rounded-xl text-[13px] font-bold uppercase tracking-[0.08em] border border-border/40 bg-background/50 hover:bg-background shadow-sm"
                    >
                        {secondaryAction.label}
                    </Button>
                )}
            </div>
        </motion.div>
    );
}
