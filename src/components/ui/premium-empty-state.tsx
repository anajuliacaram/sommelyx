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
                "flex flex-col items-center justify-center py-16 lg:py-20 px-8 text-center rounded-xl bg-card/60 border border-border/25 relative overflow-hidden",
                className
            )}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[280px] max-h-[280px] bg-gradient-to-br from-primary/[0.04] to-transparent blur-[60px] rounded-full pointer-events-none" />

            <motion.div
                animate={reducedMotion ? {} : { y: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex items-center justify-center w-16 h-16 mb-8"
            >
                <div className="absolute inset-0 bg-primary/[0.04] rounded-full blur-lg pointer-events-none" />
                <div className="relative z-10 w-12 h-12 rounded-lg bg-card border border-border/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary/70" strokeWidth={1.5} />
                </div>
            </motion.div>

            <h3 className="font-serif text-[22px] font-semibold text-foreground tracking-[-0.01em] mb-2">
                {title}
            </h3>
            <p className="text-[14px] text-muted-foreground max-w-[340px] leading-relaxed mb-8">
                {description}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
                {primaryAction && (
                    <Button
                        variant="primary"
                        onClick={primaryAction.onClick}
                        size="lg"
                    >
                        {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
                        {primaryAction.label}
                    </Button>
                )}
                {secondaryAction && (
                    <Button
                        variant="outline"
                        onClick={secondaryAction.onClick}
                        size="lg"
                    >
                        {secondaryAction.label}
                    </Button>
                )}
            </div>
        </motion.div>
    );
}
