import { Variants, Transition } from "framer-motion";

export const motionDurations = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.35,
  medium: 0.5,
  deliberate: 0.8,
  slow: 1.2,
};

export const motionEasings = {
  standard: [0.2, 0.0, 0.0, 1.0] as const,
  decelerate: [0.0, 0.0, 0.2, 1.0] as const,
  accelerate: [0.4, 0.0, 1.0, 1.0] as const,
  emphasized: [0.2, 0.0, 0.0, 1.0] as const,
};

export const motionSprings = {
  snappy: { type: "spring", stiffness: 450, damping: 32 } as Transition,
  gentle: { type: "spring", stiffness: 280, damping: 26 } as Transition,
  interactive: { type: "spring", stiffness: 500, damping: 30 } as Transition,
  soft: { type: "spring", stiffness: 180, damping: 22 } as Transition,
};

export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDurations.normal, ease: motionEasings.decelerate },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: motionDurations.fast, ease: motionEasings.accelerate },
  },
};

export const fadeInScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { ...motionSprings.gentle },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: motionDurations.fast },
  },
};

export const staggerContainer = (staggerMs = 0.05, delayChildren = 0.02): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerMs,
      delayChildren,
    },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDurations.fast, ease: motionEasings.decelerate },
  },
};

export const panelTransition: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: motionDurations.medium, ease: motionEasings.decelerate },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.985,
    transition: { duration: motionDurations.fast, ease: motionEasings.accelerate },
  },
};

