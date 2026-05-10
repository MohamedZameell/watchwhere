"use client";

import { useState, type ReactNode } from "react";

export type TooltipProps = {
  label: string;
  children: ReactNode;
};

export function Tooltip({ label, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible ? (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-border-default bg-bg-overlay px-2 py-1 text-xs text-text-primary">
          {label}
        </span>
      ) : null}
    </span>
  );
}
