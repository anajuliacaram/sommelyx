/**
 * Premium SaaS Motion Tokens
 * Standardized easing and durations for a high-end feel (Linear, Stripe level).
 */

export const PREMIUM_EASING = [0.22, 1, 0.36, 1]; // easeOutExpo-ish
export const STANDARD_DURATION = 0.18;
export const FAST_DURATION = 0.12;
export const SMOOTH_SPRING = { type: "spring", stiffness: 300, damping: 30 };

export const premiumMotion = {
    hover: {
        y: -2,
        scale: 1.01,
        transition: { duration: STANDARD_DURATION, ease: PREMIUM_EASING },
    },
    tap: {
        scale: 0.97,
        transition: { duration: FAST_DURATION, ease: PREMIUM_EASING },
    },
    fadeUp: {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: PREMIUM_EASING },
    },
    pageTransition: {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.22, ease: PREMIUM_EASING },
    },
};

/**
 * Standard hover styles to be used with framer-motion 'whileHover'
 */
export const btnHoverProps = {
    whileHover: { y: -2, scale: 1.01 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2, ease: PREMIUM_EASING },
};
