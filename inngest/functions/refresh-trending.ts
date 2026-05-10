import { inngest } from "@/inngest/client";
import { bulkUpsert } from "@/lib/meili";
import { discoverTitles, getTrending, getMovie, getTv } from "@/lib/tmdb";
import { getShow } from "@/lib/streaming";
import { searchAnime } from "@/lib/anilist";
import { providerIdFromName } from "@/lib/providers";
import type { NormalizedTitleResult, TitleDoc } from "@/lib/types";

function docFromTitle(title: NormalizedTitleResult, providers: string[], anilistId: number | null): TitleDoc {
  return {
    id: `${title.type}-${title.tmdb_id}`,
    tmdb_id: title.tmdb_id,
    type: title.type,
    title: title.title,
    alt_titles: Array.from(new Set([title.title, title.original_title].filter(Boolean) as string[])),
    year: title.year,
    overview: title.overview,
    poster_w342: title.poster_w342,
    popularity: title.popularity,
    providers_in: providers,
    genres: title.genres,
    is_anime: title.is_anime,
    anilist_id: anilistId,
  };
}

export const refreshTrending = inngest.createFunction(
  { id: "refresh-trending", triggers: [{ cron: "0 */6 * * *" }] },
  async ({ step }) => {
    const titles = await step.run("pull tmdb rails", async () => {
      const [trending, movies, tv, nowPlaying] = await Promise.all([
        getTrending("day", "IN", 21600),
        discoverTitles("movie", { sort_by: "popularity.desc" }, 21600),
        discoverTitles("tv", { sort_by: "popularity.desc" }, 21600),
        discoverTitles("movie", { "primary_release_date.lte": new Date().toISOString().slice(0, 10) }, 21600),
      ]);
      return Array.from(new Map([...trending, ...movies, ...tv, ...nowPlaying].map((title) => [`${title.type}-${title.tmdb_id}`, title])).values());
    });

    const docs = await step.run("enrich docs", async () => {
      const enriched: TitleDoc[] = [];
      for (const title of titles) {
        const tmdbType = title.type === "movie" ? "movie" : "tv";
        await (tmdbType === "movie" ? getMovie(title.tmdb_id) : getTv(title.tmdb_id)).catch(() => null);
        const streaming = await getShow(tmdbType === "movie" ? "movie" : "series", title.tmdb_id).catch(() => []);
        const anilist = title.is_anime ? await searchAnime(title.title).then((items) => items[0]?.id ?? null).catch(() => null) : null;
        enriched.push(docFromTitle(title, Array.from(new Set(streaming.map((provider) => providerIdFromName(provider.name)))), anilist));
      }
      return enriched;
    });

    await step.run("upsert meili", async () => {
      for (let index = 0; index < docs.length; index += 500) {
        await bulkUpsert(docs.slice(index, index + 500));
      }
    });
    return { count: docs.length };
  },
);
