import * as React from "react";
import { useRef, useState, useEffect, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumKpiCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

function useRadialGradient(smoothX: MotionValue<number>, smoothY: MotionValue<number>) {
    return useTransform(
        [smoothX, smoothY],
        ([x, y]: number[]) =>
            `radial-gradient(150px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)`
    );
}

export function PremiumKpiCard({ children, className, onClick }: PremiumKpiCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isPressing, setIsPressing] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isFinePointer, setIsFinePointer] = useState(false);
    const reducedMotion = useReducedMotion();

    const x = useMotionValue(0.5);
    const y = useMotionValue(0.5);

    const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };
    const smoothX = useSpring(x, springConfig);
    const smoothY = useSpring(y, springConfig);

    const rotateX = useTransform(smoothY, [0, 1], [3, -3]);
    const rotateY = useTransform(smoothX, [0, 1], [-3, 3]);
    const gradientBg = useRadialGradient(smoothX, smoothY);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(pointer: fine)");
        setIsFinePointer(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (reducedMotion || !isFinePointer) return;
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current!.getBoundingClientRect();
        x.set((clientX - left) / width);
        y.set((clientY - top) / height);
    };

    const handlePointerEnter = () => {
        if (reducedMotion || !isFinePointer) return;
        setIsHovering(true);
    };

    const handlePointerLeave = () => {
        setIsHovering(false);
        setIsPressing(false);
        x.set(0.5);
        y.set(0.5);
    };

    const interactive = !reducedMotion && isFinePointer;

    return (
        <motion.div
            ref={ref}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={() => setIsPressing(true)}
            onPointerUp={() => setIsPressing(false)}
            onPointerCancel={handlePointerLeave}
            onClick={onClick}
            animate={{
                scale: isPressing ? 0.99 : 1,
                y: isHovering && interactive ? -2 : 0,
                boxShadow: isHovering && interactive
                    ? "0 12px 32px -14px rgba(44,20,31,0.12), 0 0 0 1px rgba(255,255,255,0.35)"
                    : "0 8px 32px -16px rgba(44,20,31,0.08), 0 0 0 1px rgba(255,255,255,0.35)"
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={interactive ? {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                transformPerspective: 1000,
                willChange: "transform, box-shadow",
            } : {}}
            className={cn(
                "glass-card relative rounded-2xl p-3.5 cursor-default transition-colors",
                onClick && "cursor-pointer",
                className
            )}
        >
            {interactive && isHovering && (
                <motion.div
                    className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-18 mix-blend-overlay"
                    style={{ background: gradientBg }}
                />
            )}
            <div style={{ transform: interactive ? "translateZ(20px)" : "none" }}>
                {children}
            </div>
        </motion.div>
    );
}
