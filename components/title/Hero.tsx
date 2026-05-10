"use client";

import Image from "next/image";
import { m } from "framer-motion";
import { Calendar, Clock, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { tmdbImage } from "@/lib/images";
import type { TitleDetail } from "@/lib/types";

export function Hero({ title }: { title: TitleDetail }) {
  const [expanded, setExpanded] = useState(false);
  const backdrop = tmdbImage(title.backdrop_path, "original");
  const poster = tmdbImage(title.poster_path, "w500");
  return (
    <section className="relative min-h-[560px] overflow-hidden">
      {backdrop ? (
        <Image src={backdrop} alt="" fill priority quality={75} sizes="100vw" className="object-cover opacity-45" />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,11,13,0.12),#0b0b0d_88%)]" />
      <div className="container-page relative grid gap-8 pb-10 pt-20 md:grid-cols-[240px_1fr] md:pt-28">
        <div className="hidden md:block">
          <div className="sticky top-24 aspect-[2/3] overflow-hidden rounded-[12px] border border-border-default bg-bg-elevated">
            {poster ? (
              <Image src={poster} alt={`${title.title}${title.year ? ` (${title.year})` : ""} poster`} fill quality={75} sizes="240px" className="object-cover" />
            ) : null}
          </div>
        </div>
        <div className="max-w-3xl self-end">
          <h1 className="tracking-display text-balance font-display text-4xl font-bold leading-none text-text-primary md:text-[56px]">
            {title.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            {title.year ? <span className="inline-flex items-center gap-1"><Calendar aria-hidden="true" className="size-4" />{title.year}</span> : null}
            {title.runtime ? <span className="inline-flex items-center gap-1"><Clock aria-hidden="true" className="size-4" />{title.runtime}m</span> : null}
            {title.rating ? <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-4" />{title.rating}</span> : null}
            {title.genres.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}
          </div>
          <m.div animate={{ height: expanded ? "auto" : 104 }} transition={{ duration: 0.2 }} className="mt-5 overflow-hidden">
            <p className="text-pretty text-base leading-7 text-text-secondary">{title.overview}</p>
          </m.div>
          {title.overview.length > 260 ? (
            <Button variant="ghost" size="sm" className="mt-2 px-0" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Read less" : "Read more"}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
