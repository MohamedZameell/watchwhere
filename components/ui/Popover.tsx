"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PopoverProps = {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Popover({ trigger, children, className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="rounded-[8px]"
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={id}
          className={cn(
            "elevated-inset absolute right-0 z-40 mt-2 min-w-52 rounded-[8px] border border-border-default bg-bg-overlay p-2",
            className,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
