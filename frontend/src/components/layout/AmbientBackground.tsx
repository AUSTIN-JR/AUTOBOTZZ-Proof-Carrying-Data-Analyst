"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function AmbientBackground() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-40"
    >
      {/* Subtle technical coordinate grid */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"
        style={{
          maskImage: "radial-gradient(ellipse 65% 55% at 50% 25%, #000 60%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 25%, #000 60%, transparent 100%)",
        }}
      />

      {/* Very faint, slow technical ambient glow drift - disabled on reduced motion */}
      {!shouldReduceMotion && (
        <motion.div
          animate={{
            x: ["-5%", "5%", "-5%"],
            y: ["-3%", "3%", "-3%"],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-[20%] left-[20%] w-[55vw] h-[45vh] rounded-full bg-primary/[0.025] blur-[100px]"
        />
      )}
    </div>
  );
}

