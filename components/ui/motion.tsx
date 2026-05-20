"use client";

import { motion, useReducedMotion, type MotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li";
} & Omit<MotionProps, "children">;

export const Reveal = forwardRef<HTMLDivElement, RevealProps>(function Reveal(
  { children, delay = 0, className, as = "div", ...rest },
  ref
) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, ease: [0.21, 0.7, 0.3, 1], delay }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
});
