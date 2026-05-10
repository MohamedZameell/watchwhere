"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

export function Tabs({ items, defaultValue }: { items: TabItem[]; defaultValue?: string }) {
  const [active, setActive] = useState(defaultValue || items[0]?.id);
  const current = items.find((item) => item.id === active);
  return (
    <div>
      <div role="tablist" className="inline-flex rounded-[8px] border border-border-default bg-bg-elevated p-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active === item.id}
            className={cn(
              "h-8 rounded-[6px] px-3 text-sm font-medium text-text-secondary transition duration-150 ease-out",
              active === item.id && "bg-bg-overlay text-text-primary",
            )}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{current?.content}</div>
    </div>
  );
}
