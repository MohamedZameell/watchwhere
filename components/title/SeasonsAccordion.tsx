"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { TitleDetail } from "@/lib/types";

export function SeasonsAccordion({ seasons = [] }: { seasons?: NonNullable<TitleDetail["seasons"]> }) {
  const [open, setOpen] = useState<number | null>(seasons[0]?.number ?? null);
  if (!seasons.length) return null;
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">Seasons</h2>
      <div className="grid gap-2">
        {seasons.map((season) => (
          <div key={season.number} className="rounded-[8px] border border-border-subtle bg-bg-elevated">
            <button
              type="button"
              className="flex w-full items-center justify-between p-4 text-left"
              onClick={() => setOpen((value) => (value === season.number ? null : season.number))}
            >
              <span className="font-medium">Season {season.number}</span>
              <ChevronDown aria-hidden="true" className="size-4 text-text-secondary" />
            </button>
            {open === season.number ? (
              <div className="border-t border-border-subtle px-4 py-3 text-sm text-text-secondary">
                {season.episodes} episodes{season.air_date ? ` · ${season.air_date}` : ""}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
