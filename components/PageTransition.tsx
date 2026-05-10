"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pathname}
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
