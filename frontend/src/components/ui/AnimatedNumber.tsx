"use client";

import React, { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { formatNumber } from "@/lib/formatters";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 0.75,
  formatter,
  className,
}: AnimatedNumberProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (shouldReduceMotion) {
      return `${prefix}${formatter ? formatter(value) : formatNumber(value)}${suffix}`;
    }
    return `${prefix}0${suffix}`;
  });

  const prevValueRef = useRef(0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(`${prefix}${formatter ? formatter(value) : formatNumber(value)}${suffix}`);
      prevValueRef.current = value;
      return;
    }

    const start = prevValueRef.current;
    const end = value;

    const controls = animate(start, end, {
      duration,
      ease: [0.16, 1, 0.3, 1], // snappy technical deceleration
      onUpdate: (latest) => {
        const rounded = Math.round(latest);
        const formatted = formatter ? formatter(rounded) : formatNumber(rounded);
        setDisplayValue(`${prefix}${formatted}${suffix}`);
      },
    });

    prevValueRef.current = value;
    return () => controls.stop();
  }, [value, prefix, suffix, duration, formatter, shouldReduceMotion]);

  return <span className={className}>{displayValue}</span>;
}

