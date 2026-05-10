import type { Metadata } from "next";
import { PosterCard } from "@/components/title/PosterCard";
import { discoverTitles, getTrending } from "@/lib/tmdb";
import type { NormalizedTitleResult, SearchHit } from "@/lib/types";

export const metadata: Metadata = {
  title: "Browse - Watchwhere",
  description: "Browse trending and new streaming titles in India.",
};

function toHit(item: NormalizedTitleResult): SearchHit {
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

function sevenDaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

async function safeTitles(fetcher: () => Promise<NormalizedTitleResult[]>) {
  return fetcher().then((items) => items.map(toHit)).catch(() => []);
}

function Rail({ title, items }: { title: string; items: SearchHit[] }) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-3 md:gap-4">
        {items.map((item, index) => (
          <div key={item.id} className="w-[45vw] shrink-0 sm:w-[200px] xl:w-[240px]">
            <PosterCard title={item} priority={index < 4} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function BrowsePage() {
  const since = sevenDaysAgo();
  const [trending, newMovies, newTv, action, drama, comedy, anime, docs] = await Promise.all([
    safeTitles(() => getTrending("day", "IN", 21600)),
    safeTitles(() => discoverTitles("movie", { "primary_release_date.gte": since }, 21600)),
    safeTitles(() => discoverTitles("tv", { "first_air_date.gte": since }, 21600)),
    safeTitles(() => discoverTitles("movie", { with_genres: 28 }, 21600)),
    safeTitles(() => discoverTitles("movie", { with_genres: 18 }, 21600)),
    safeTitles(() => discoverTitles("movie", { with_genres: 35 }, 21600)),
    safeTitles(() => discoverTitles("tv", { with_genres: 16, with_origin_country: "JP" }, 21600)),
    safeTitles(() => discoverTitles("movie", { with_genres: 99 }, 21600)),
  ]);

  return (
    <div className="container-page grid gap-12 py-10">
      <div>
        <p className="font-mono text-xs font-medium uppercase text-text-muted">Browse</p>
        <h1 className="tracking-display mt-3 text-balance font-display text-4xl font-bold sm:text-5xl">
          What India is watching now.
        </h1>
      </div>
      <Rail title="Trending now" items={trending.slice(0, 18)} />
      <Rail title="New on OTT this week" items={[...newMovies, ...newTv].slice(0, 18)} />
      <Rail title="Action" items={action.slice(0, 18)} />
      <Rail title="Drama" items={drama.slice(0, 18)} />
      <Rail title="Comedy" items={comedy.slice(0, 18)} />
      <Rail title="Anime" items={anime.slice(0, 18)} />
      <Rail title="Documentary" items={docs.slice(0, 18)} />
    </div>
  );
}
