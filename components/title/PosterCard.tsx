"use client";

import Image from "next/image";
import Link from "next/link";
import { m } from "framer-motion";
import { Film } from "lucide-react";
import type { SearchHit } from "@/lib/types";
import { titleHref } from "@/lib/slug";
import { tmdbImage } from "@/lib/images";
import { cn } from "@/lib/utils";

const providerLabels: Record<string, string> = {
  netflix: "N",
  prime: "P",
  jiohotstar: "H",
  jiocinema: "J",
  sonyliv: "S",
  zee5: "Z",
  apple: "A",
  mubi: "M",
  crunchyroll: "C",
  lionsgate: "L",
};

export type PosterCardProps = {
  title: SearchHit;
  priority?: boolean;
};

export function ProviderDots({ providers }: { providers: string[] }) {
  return (
    <div className="flex -space-x-1">
      {providers.slice(0, 4).map((provider) => (
        <span
          key={provider}
          className="flex size-6 items-center justify-center rounded-full border border-black bg-text-primary font-mono text-[10px] font-medium uppercase text-black"
          title={provider}
        >
          {providerLabels[provider] || provider.slice(0, 1)}
        </span>
      ))}
    </div>
  );
}

export function PosterCard({ title, priority = false }: PosterCardProps) {
  const image = tmdbImage(title.poster_w342, "w342");
  return (
    <m.article whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="group">
      <Link href={titleHref(title.type, title.tmdb_id, title.title)} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-[12px] border border-border-subtle bg-bg-elevated transition duration-150 ease-out group-hover:border-border-strong">
          {image ? (
            <Image
              src={image}
              alt={`${title.title}${title.year ? ` (${title.year})` : ""} poster`}
              fill
              sizes="(min-width:1280px) 240px, (min-width:640px) 200px, 45vw"
              quality={75}
              priority={priority}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-text-muted">
              <Film aria-hidden="true" className="size-10" />
            </div>
          )}
          {title.providers_in.length ? (
            <div className="absolute bottom-2 right-2">
              <ProviderDots providers={title.providers_in} />
            </div>
          ) : null}
        </div>
        <div className="mt-3 min-w-0">
          <h3 className={cn("truncate text-sm font-semibold text-text-primary")}>{title.title}</h3>
          <p className="mt-1 font-mono text-xs text-text-muted">{title.year || "TBA"}</p>
        </div>
      </Link>
    </m.article>
  );
}
