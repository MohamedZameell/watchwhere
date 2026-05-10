import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, MapPinned, Search } from "lucide-react";
import { SearchBar } from "@/components/ui/SearchBar";
import { PosterGrid } from "@/components/title/PosterGrid";
import { Card } from "@/components/ui/Card";
import { getTrending } from "@/lib/tmdb";
import type { SearchHit } from "@/lib/types";

export const metadata: Metadata = {
  title: "Watchwhere - Where to Watch in India",
  description: "Search movies, TV shows, and anime to find where they are streaming in India.",
};

function toHit(item: Awaited<ReturnType<typeof getTrending>>[number]): SearchHit {
  return {
    id: `${item.type}-${item.tmdb_id}`,
    tmdb_id: item.tmdb_id,
    type: item.type,
    title: item.title,
    year: item.year,
    poster_w342: item.poster_w342,
    providers_in: item.providers_in,
  };
}

async function trendingTitles() {
  try {
    const titles = await getTrending("day", "IN", 3600);
    return titles.slice(0, 10).map(toHit);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const trending = await trendingTitles();

  return (
    <div>
      <section className="container-page grid min-h-[calc(100dvh-64px)] content-center gap-10 py-16">
        <div className="max-w-4xl">
          <p className="mb-5 font-mono text-xs font-medium uppercase text-accent">Where to watch in India</p>
          <h1 className="tracking-display max-w-4xl text-balance font-display text-5xl font-bold leading-[0.96] text-text-primary sm:text-7xl">
            Find the right OTT link before the popcorn cools.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-text-secondary">
            Search movies, shows, and anime across Indian streaming platforms with typo-tolerant results and direct watch links.
          </p>
        </div>
        <div className="max-w-3xl">
          <SearchBar />
        </div>
      </section>

      <section className="container-page py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-medium uppercase text-text-muted">Live rail</p>
            <h2 className="tracking-display mt-2 text-balance font-display text-2xl font-semibold">Trending on OTT in India</h2>
          </div>
          <Link
            href="/browse"
            className="hidden h-10 items-center gap-2 rounded-[8px] border border-transparent px-3 text-sm font-medium text-text-secondary transition duration-150 ease-out hover:bg-bg-elevated hover:text-text-primary sm:inline-flex"
          >
            Browse all <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        {trending.length ? (
          <PosterGrid titles={trending} />
        ) : (
          <Card className="p-6 text-sm text-text-secondary">Trending titles appear here once TMDB credentials are configured.</Card>
        )}
      </section>

      <section className="container-page py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Search, title: "Search anything", text: "Typos are fine. Search by common titles, originals, or anime names." },
            { icon: MapPinned, title: "Check India availability", text: "Results focus on Indian OTT platforms, not generic global listings." },
            { icon: Clock, title: "Open the watch link", text: "Provider buttons take you straight to the canonical web destination." },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <item.icon aria-hidden="true" className="size-5 text-accent" />
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-pretty text-sm leading-6 text-text-secondary">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
