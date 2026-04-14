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
                    ? "0 16px 34px -18px rgba(44,20,31,0.14), 0 0 0 1px rgba(255,255,255,0.42), inset 0 1px 0 rgba(255,255,255,0.32)"
                    : "0 10px 28px -18px rgba(44,20,31,0.08), 0 0 0 1px rgba(255,255,255,0.38), inset 0 1px 0 rgba(255,255,255,0.24)"
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
                "glass-card relative rounded-[18px] p-3.5 cursor-default transition-colors",
                onClick && "cursor-pointer",
                className
            )}
        >
            {interactive && isHovering && (
                <motion.div
                    className="pointer-events-none absolute inset-0 z-10 rounded-[18px] opacity-16 mix-blend-overlay"
                    style={{ background: gradientBg }}
                />
            )}
            <div style={{ transform: interactive ? "translateZ(20px)" : "none" }}>
                {children}
            </div>
        </motion.div>
    );
}
