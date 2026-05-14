import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AiProgressiveLoaderProps {
  steps: string[];
  /** Time in ms between step transitions (default 2500) */
  interval?: number;
  /** Optional subtitle shown below the current step */
  subtitle?: string;
}

export function AiProgressiveLoader({ steps, interval = 2500, subtitle }: AiProgressiveLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (steps.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, interval);
    return () => clearInterval(timer);
  }, [steps.length, interval]);

  // Reset when steps change
  useEffect(() => {
    setCurrentStep(0);
  }, [steps]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(58,51,39,0.08)] bg-transparent">
          <div className="h-1.5 w-1.5 rounded-full bg-[#7B1E2B]/70" />
        </div>
        <div className="min-h-[36px] min-w-0 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18 }}
            className="text-[13px] font-semibold leading-snug text-[#1A1713]"
          >
            {steps[currentStep]}
          </motion.p>
        </AnimatePresence>
        {subtitle && (
          <p className="mt-0.5 text-[11.5px] leading-4 text-[#6B6258]">{subtitle}</p>
        )}
        </div>
      </div>
      <div className="h-px w-full overflow-hidden rounded-full bg-black/5">
        <motion.div
          className="h-full bg-[#7B1E2B]/60"
          animate={{ width: `${Math.max(18, ((currentStep + 1) / Math.max(steps.length, 1)) * 100)}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
