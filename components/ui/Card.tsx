import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("elevated-inset rounded-[12px] border border-border-subtle bg-bg-elevated", className)}
      {...props}
    />
  );
}
