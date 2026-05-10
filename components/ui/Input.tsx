"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, leadingIcon, ...props }, ref) => (
  <div className="relative">
    {leadingIcon ? (
      <div className="pointer-events-none absolute left-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-text-muted">
        {leadingIcon}
      </div>
    ) : null}
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[6px] border border-border-default bg-bg-elevated px-3 text-sm text-text-primary transition duration-150 ease-out placeholder:text-text-muted hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
        leadingIcon && "pl-10",
        className,
      )}
      {...props}
    />
  </div>
));

Input.displayName = "Input";
