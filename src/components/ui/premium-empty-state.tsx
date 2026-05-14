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
                "premium-card-surface flex flex-col items-center justify-center overflow-hidden px-6 py-12 text-center relative lg:py-16",
                className
            )}
        >
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-full max-h-[280px] w-full max-w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-copper/[0.08] via-[#7B1E2B]/[0.05] to-transparent blur-[60px]" />

            <motion.div
                animate={reducedMotion ? {} : { y: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-6 flex h-14 w-14 items-center justify-center"
            >
                <div className="pointer-events-none absolute inset-0 rounded-full bg-copper/[0.12] blur-lg" />
                <div className="premium-chip-surface relative z-10 flex h-11 w-11 items-center justify-center rounded-[16px] border-white/55 bg-white/74">
                    <Icon className="w-4.5 h-4.5 text-copper" strokeWidth={1.5} />
                </div>
            </motion.div>

            <h3 className="relative z-10 mb-1.5 font-serif text-[20px] font-semibold tracking-[-0.02em] text-[#1A1713]">
                {title}
            </h3>
            <p className="relative z-10 mb-6 max-w-[340px] text-[13px] leading-relaxed text-[rgba(58,51,39,0.66)]">
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
