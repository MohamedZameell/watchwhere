import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  title: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("flex min-h-48 flex-col items-center justify-center gap-4 p-6 text-center", className)}>
      <SearchX aria-hidden="true" className="size-7 text-text-muted" />
      <p className="max-w-sm text-pretty text-sm text-text-secondary">{title}</p>
      {action}
    </Card>
  );
}
