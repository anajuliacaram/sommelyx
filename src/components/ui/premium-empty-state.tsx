import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiModalActionButton } from "@/components/ai-flow/ModalLayout";

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
                "relative flex flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] px-4 py-7 text-center lg:py-8",
                className
            )}
        >
            <motion.div
                animate={reducedMotion ? {} : { y: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-3 flex h-10 w-10 items-center justify-center"
            >
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-[14px] border border-[rgba(123,30,43,0.10)] bg-[rgba(123,30,43,0.06)]">
                    <Icon className="w-4.5 h-4.5 text-[#7B1E2B]" strokeWidth={1.5} />
                </div>
            </motion.div>

            <h3 className="relative z-10 mb-1 text-[15px] font-semibold tracking-[-0.01em] text-[#1A1713]">
                {title}
            </h3>
            <p className="relative z-10 mb-4 max-w-[340px] text-[12.5px] leading-5 text-[#6B6258]">
                {description}
            </p>

            <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
                {primaryAction && (
                    <AiModalActionButton
                        variant="primary"
                        onClick={primaryAction.onClick}
                        className="w-full sm:w-auto"
                    >
                        {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
                        {primaryAction.label}
                    </AiModalActionButton>
                )}
                {secondaryAction && (
                    <AiModalActionButton
                        variant="outline"
                        onClick={secondaryAction.onClick}
                        className="w-full sm:w-auto"
                    >
                        {secondaryAction.label}
                    </AiModalActionButton>
                )}
            </div>
        </motion.div>
    );
}
