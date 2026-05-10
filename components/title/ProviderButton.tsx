"use client";

import { ArrowUpRight } from "lucide-react";
import type { Provider } from "@/lib/types";

export function ProviderButton({ provider }: { provider: Provider }) {
  return (
    <a
      href={provider.link}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-56 items-center gap-3 rounded-[8px] border border-border-default bg-bg-elevated p-3 transition duration-150 ease-out hover:border-border-strong"
    >
      <img src={provider.logoSrc} alt="" className="size-10 rounded-[8px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">{provider.name}</span>
        {provider.viaJustWatch ? <span className="mt-1 block text-xs text-text-muted">via JustWatch</span> : null}
      </span>
      <ArrowUpRight aria-hidden="true" className="size-4 text-text-secondary" />
    </a>
  );
}
