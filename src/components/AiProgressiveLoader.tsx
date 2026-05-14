import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine } from "@/icons/lucide";

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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(123,30,43,0.07)] text-primary/70">
          <Wine className="h-5 w-5" />
        </div>
        <div className="min-h-[40px] min-w-0 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-[15px] font-semibold leading-snug text-foreground"
          >
            {steps[currentStep]}
          </motion.p>
        </AnimatePresence>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        </div>
      </div>
      <div className="h-px w-full overflow-hidden rounded-full bg-black/5">
        <motion.div
          className="h-full bg-[linear-gradient(90deg,#7B1E2B,#C8A96A)]"
          animate={{ width: `${Math.max(18, ((currentStep + 1) / Math.max(steps.length, 1)) * 100)}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
