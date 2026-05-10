"use client";

import { ArrowUpRight } from "lucide-react";
import { Flag } from "lucide-react";
import { useState } from "react";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Provider } from "@/lib/types";
import type { TitleDetail } from "@/lib/types";

export function ProviderButton({ provider, title }: { provider: Provider; title: TitleDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-w-64 items-center rounded-[8px] border border-border-default bg-bg-elevated transition duration-150 ease-out hover:border-border-strong">
      <a href={provider.link} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3 p-3">
        <img src={provider.logoSrc} alt="" className="size-10 rounded-[8px]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-primary">{provider.name}</span>
          {provider.viaJustWatch ? <span className="mt-1 block text-xs text-text-muted">via JustWatch</span> : null}
        </span>
        <ArrowUpRight aria-hidden="true" className="size-4 text-text-secondary" />
      </a>
      <Button size="icon" variant="ghost" aria-label={`Report ${provider.name} link`} onClick={() => setOpen(true)} className="mr-2">
        <Flag aria-hidden="true" className="size-4" />
      </Button>
      <Modal open={open} onOpenChange={setOpen} title={`Report ${provider.name}`}>
        <FeedbackForm tmdbId={title.tmdb_id} type={title.type} providerId={provider.id} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
