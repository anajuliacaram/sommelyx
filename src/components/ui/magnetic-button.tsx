import * as React from "react";
import { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

interface MagneticButtonProps {
    children: React.ReactElement;
    disabled?: boolean;
}

export function MagneticButton({ children, disabled }: MagneticButtonProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isPressing, setIsPressing] = useState(false);
    const [isFinePointer, setIsFinePointer] = useState(false);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        const mediaQuery = window.matchMedia("(pointer: fine)");
        setIsFinePointer(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
    const smoothX = useSpring(x, springConfig);
    const smoothY = useSpring(y, springConfig);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled || reducedMotion || !isFinePointer) return;
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current!.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);

        // Limit to max 8px for a subtle, premium feel
        x.set(Math.max(-8, Math.min(8, middleX * 0.15)));
        y.set(Math.max(-8, Math.min(8, middleY * 0.15)));
    };

    const reset = () => {
        setIsPressing(false);
        x.set(0);
        y.set(0);
    };

    if (reducedMotion) {
        return <>{children}</>;
    }

    return (
        <motion.div
            ref={ref}
            onPointerMove={handlePointerMove}
            onPointerLeave={reset}
            onPointerDown={() => setIsPressing(true)}
            onPointerUp={() => setIsPressing(false)}
            onPointerCancel={reset}
            animate={{
                scale: isPressing && !disabled ? 0.98 : 1,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
                x: smoothX,
                y: smoothY,
                willChange: "transform",
            }}
            className={`inline-block ${isPressing ? "saturate-[0.9] opacity-95 transition-opacity duration-150" : ""}`}
        >
            {React.cloneElement(children, {
                // Ensure native active states don't conflict, and drastically reduce shadow on press
                className: `${children.props.className} active:scale-100 ${isPressing ? 'shadow-none' : ''}`
            })}
        </motion.div>
    );
}
