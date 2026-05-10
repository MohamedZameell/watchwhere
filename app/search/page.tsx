import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "@/components/ui/SearchBar";
import { PosterGrid } from "@/components/title/PosterGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { searchDidYouMean, searchTitles } from "@/lib/meili";
import type { SearchHit, SearchResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Search - Watchwhere",
  description: "Search movies, shows, and anime by Indian streaming availability.",
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    year?: string;
    provider?: string;
  }>;
};

function makeFilter(params: Awaited<PageProps["searchParams"]>) {
  const filters: string[] = [];
  if (params.type && ["movie", "tv", "anime"].includes(params.type)) filters.push(`type = "${params.type}"`);
  if (params.year && /^\d{4}$/.test(params.year)) filters.push(`year = ${params.year}`);
  if (params.provider) filters.push(`providers_in = "${params.provider}"`);
  return filters.length ? filters.join(" AND ") : undefined;
}

async function getResults(params: Awaited<PageProps["searchParams"]>) {
  const q = (params.q || "").trim();
  const empty: SearchResponse = { hits: [] as SearchHit[], totalHits: 0, processingTimeMs: 0, didYouMean: null };
  if (!q) return empty;
  try {
    const results = await searchTitles(q, {
      filter: makeFilter(params),
      limit: 48,
      attributesToRetrieve: ["id", "tmdb_id", "type", "title", "year", "poster_w342", "providers_in"],
    });
    if (results.hits.length) return results;
    return {
      ...results,
      didYouMean: await searchDidYouMean(q, { filter: makeFilter(params) }),
    };
  } catch {
    return empty;
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const results = await getResults(params);

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <p className="font-mono text-xs font-medium uppercase text-text-muted">Search</p>
        <h1 className="tracking-display mt-3 text-balance font-display text-4xl font-bold sm:text-5xl">Find where it streams in India.</h1>
        <div className="mt-6">
          <SearchBar defaultValue={q} autoFocus={!q} />
        </div>
      </div>

      <form className="mt-8 flex flex-wrap items-center gap-3 rounded-[12px] border border-border-subtle bg-bg-elevated p-3">
        <input type="hidden" name="q" value={q} />
        <div className="flex items-center gap-2 pr-2 text-sm font-medium text-text-secondary">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters
        </div>
        <select
          name="type"
          defaultValue={params.type || "all"}
          className="h-10 rounded-[6px] border border-border-default bg-bg-overlay px-3 text-sm text-text-primary"
        >
          <option value="all">All types</option>
          <option value="movie">Movies</option>
          <option value="tv">TV</option>
          <option value="anime">Anime</option>
        </select>
        <input
          name="year"
          defaultValue={params.year || ""}
          inputMode="numeric"
          pattern="[0-9]{4}"
          placeholder="Year"
          className="h-10 w-28 rounded-[6px] border border-border-default bg-bg-overlay px-3 text-sm text-text-primary placeholder:text-text-muted"
        />
        <select
          name="provider"
          defaultValue={params.provider || ""}
          className="h-10 rounded-[6px] border border-border-default bg-bg-overlay px-3 text-sm text-text-primary"
        >
          <option value="">Any provider</option>
          <option value="netflix">Netflix</option>
          <option value="prime">Prime Video</option>
          <option value="jiohotstar">JioHotstar</option>
          <option value="jiocinema">JioCinema</option>
          <option value="sonyliv">SonyLIV</option>
          <option value="zee5">Zee5</option>
          <option value="apple">Apple TV+</option>
          <option value="mubi">MUBI</option>
          <option value="crunchyroll">Crunchyroll</option>
          <option value="lionsgate">Lionsgate Play</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-[8px] border border-accent bg-accent px-4 text-sm font-medium text-black transition duration-150 ease-out hover:border-accent-hover hover:bg-accent-hover"
        >
          Apply
        </button>
      </form>

      <div className="mt-8">
        {q && results.hits.length ? (
          <>
            <p className="mb-4 font-mono text-xs uppercase text-text-muted">
              {results.totalHits} result{results.totalHits === 1 ? "" : "s"} for {q}
            </p>
            <PosterGrid titles={results.hits} />
          </>
        ) : q ? (
          <EmptyState
            title="Nothing matched. Try fewer words or check spelling."
            action={
              results.didYouMean ? (
                <Link
                  href={`/search?q=${encodeURIComponent(results.didYouMean.title)}`}
                  className="rounded-[8px] border border-border-default bg-bg-overlay px-3 py-2 text-sm font-medium text-text-primary transition duration-150 ease-out hover:border-border-strong"
                >
                  Did you mean {results.didYouMean.title}?
                </Link>
              ) : null
            }
          />
        ) : (
          <EmptyState title="Try a movie, show, or anime title." />
        )}
      </div>
    </div>
  );
}
