import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "@/icons/lucide";

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
    <div className="flex flex-col items-center gap-4">
      {/* Animated icon */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-2xl bg-primary/8 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>

      {/* Step indicator dots */}
      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width: i === currentStep ? 16 : 6,
              backgroundColor: i <= currentStep
                ? 'hsl(var(--primary))'
                : 'hsl(var(--muted-foreground) / 0.15)',
            }}
          />
        ))}
      </div>

      {/* Animated step text */}
      <div className="text-center min-h-[40px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-sm font-medium text-foreground"
          >
            {steps[currentStep]}
          </motion.p>
        </AnimatePresence>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
