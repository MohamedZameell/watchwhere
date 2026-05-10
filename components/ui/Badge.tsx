import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "accent" | "success" | "warning";
};

const tones = {
  default: "border-border-default bg-bg-elevated text-text-secondary",
  accent: "border-accent/40 bg-accent/10 text-accent",
  success: "border-success/35 bg-success/10 text-success",
  warning: "border-warning/35 bg-warning/10 text-warning",
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-[6px] border px-2 font-mono text-[11px] font-medium uppercase leading-none",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
