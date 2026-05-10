"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Film, Search } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { ProviderDots } from "@/components/title/PosterCard";
import { tmdbImage } from "@/lib/images";
import { titleHref } from "@/lib/slug";
import type { SearchResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
};

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [delay, value]);
  return debounced;
}

function renderHighlighted(value: string, fallback: string) {
  if (!value) return fallback;
  const nodes: ReactNode[] = [];
  const regex = /<mark>(.*?)<\/mark>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value))) {
    if (match.index > lastIndex) nodes.push(value.slice(lastIndex, match.index));
    nodes.push(
      <mark key={`${match.index}-${match[1]}`} className="bg-accent/25 text-text-primary">
        {match[1]}
      </mark>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < value.length) nodes.push(value.slice(lastIndex));
  return nodes.length ? nodes : fallback;
}

export function SearchBar({ defaultValue = "", autoFocus = false, className }: SearchBarProps) {
  const router = useRouter();
  const listboxId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(value.trim(), 200);

  const query = useQuery({
    queryKey: ["search", debounced],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`);
      if (!response.ok) throw new Error("Couldn't load watch info. Mind retrying?");
      return (await response.json()) as SearchResponse;
    },
    enabled: debounced.length > 0,
    staleTime: 60_000,
  });

  const hits = useMemo(() => query.data?.hits.slice(0, 8) || [], [query.data?.hits]);
  const hasQuery = value.trim().length > 0;
  const showPanel = open && (hasQuery || query.isFetching);

  function openHit(index: number) {
    const hit = hits[index];
    if (hit) {
      router.push(titleHref(hit.type, hit.tmdb_id, hit.title));
    } else if (value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        leadingIcon={<Search aria-hidden="true" className="size-5" />}
        value={value}
        autoFocus={autoFocus}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-activedescendant={hits[active] ? `${listboxId}-${active}` : undefined}
        placeholder="Search movies, shows, anime"
        className="h-14 rounded-[6px] pr-11 text-base"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => Math.min(current + 1, Math.max(hits.length - 1, 0)));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            openHit(active);
          }
        }}
      />
      {query.isFetching ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Spinner className="size-4" />
        </div>
      ) : null}
      {showPanel ? (
        <div className="elevated-inset absolute z-40 mt-2 w-full overflow-hidden rounded-[12px] border border-border-default bg-bg-overlay">
          <div id={listboxId} role="listbox" className="max-h-[420px] overflow-y-auto p-2">
            {!hasQuery ? <p className="px-3 py-4 text-sm text-text-secondary">Try a movie, show, or anime title.</p> : null}
            {hasQuery && !query.isFetching && hits.length === 0 ? (
              <EmptyState
                className="min-h-36 border-transparent bg-transparent p-4"
                title="Nothing matched. Try fewer words or check spelling."
                action={
                  query.data?.didYouMean ? (
                    <Link
                      href={`/search?q=${encodeURIComponent(query.data.didYouMean.title)}`}
                      className="rounded-[8px] border border-border-default bg-bg-elevated px-3 py-2 text-sm font-medium text-text-primary transition duration-150 ease-out hover:border-border-strong"
                    >
                      Did you mean {query.data.didYouMean.title}?
                    </Link>
                  ) : null
                }
              />
            ) : null}
            {hits.map((hit, index) => {
              const image = tmdbImage(hit.poster_w342, "w92");
              return (
                <button
                  id={`${listboxId}-${index}`}
                  key={hit.id}
                  role="option"
                  aria-selected={active === index}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[8px] p-2 text-left transition duration-150 ease-out",
                    active === index ? "bg-bg-elevated" : "hover:bg-bg-elevated",
                  )}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => openHit(index)}
                >
                  <span className="relative flex h-12 w-8 shrink-0 overflow-hidden rounded-[6px] border border-border-subtle bg-bg-elevated">
                    {image ? (
                      <Image src={image} alt={`${hit.title}${hit.year ? ` (${hit.year})` : ""} poster`} fill sizes="32px" quality={75} className="object-cover" />
                    ) : (
                      <Film aria-hidden="true" className="m-auto size-4 text-text-muted" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {renderHighlighted(hit._formatted?.title || hit.title, hit.title)}
                    </span>
                    <span className="mt-1 block font-mono text-xs uppercase text-text-muted">
                      {hit.type} {hit.year ? `- ${hit.year}` : ""}
                    </span>
                  </span>
                  <ProviderDots providers={hit.providers_in} />
                </button>
              );
            })}
          </div>
          {hasQuery ? (
            <Link
              href={`/search?q=${encodeURIComponent(value.trim())}`}
              className="flex items-center justify-between border-t border-border-subtle px-4 py-3 text-sm font-medium text-text-primary transition duration-150 ease-out hover:bg-bg-elevated"
            >
              <span>See all results</span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
