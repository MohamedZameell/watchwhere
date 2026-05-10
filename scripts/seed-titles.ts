import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { bulkUpsert } from "@/lib/search";
import type { TitleDoc } from "@/lib/types";

async function ensureSchema() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing.");
  const sqlPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "setup.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    await client.unsafe(sql);
    console.log("Schema setup applied.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

const TMDB_BASE = "https://api.themoviedb.org/3";

type TmdbListResult = {
  id: number;
  media_type?: "movie" | "tv";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
  popularity?: number;
  genre_ids?: number[];
  origin_country?: string[];
};

type TmdbListResponse = {
  results: TmdbListResult[];
};

type ProviderGroup = {
  provider_id: number;
  provider_name: string;
};

type ProviderResponse = {
  results?: {
    IN?: {
      flatrate?: ProviderGroup[];
      rent?: ProviderGroup[];
      buy?: ProviderGroup[];
      free?: ProviderGroup[];
      ads?: ProviderGroup[];
    };
  };
};

const genreNames = new Map<number, string>([
  [16, "Animation"],
  [28, "Action"],
  [12, "Adventure"],
  [35, "Comedy"],
  [80, "Crime"],
  [99, "Documentary"],
  [18, "Drama"],
  [10751, "Family"],
  [14, "Fantasy"],
  [36, "History"],
  [27, "Horror"],
  [10402, "Music"],
  [9648, "Mystery"],
  [10749, "Romance"],
  [878, "Science Fiction"],
  [10770, "TV Movie"],
  [53, "Thriller"],
  [10752, "War"],
  [37, "Western"],
  [10759, "Action & Adventure"],
  [10762, "Kids"],
  [10763, "News"],
  [10764, "Reality"],
  [10765, "Sci-Fi & Fantasy"],
  [10766, "Soap"],
  [10767, "Talk"],
  [10768, "War & Politics"],
]);

const providerAliases: Array<[RegExp, string]> = [
  [/netflix/i, "netflix"],
  [/amazon|prime/i, "prime"],
  [/hotstar|disney/i, "jiohotstar"],
  [/jio.?cinema/i, "jiocinema"],
  [/sony/i, "sonyliv"],
  [/zee/i, "zee5"],
  [/apple/i, "apple"],
  [/mubi/i, "mubi"],
  [/crunchyroll/i, "crunchyroll"],
  [/lionsgate/i, "lionsgate"],
];

function headers() {
  const result: Record<string, string> = { accept: "application/json" };
  if (process.env.TMDB_READ_TOKEN) result.authorization = `Bearer ${process.env.TMDB_READ_TOKEN}`;
  return result;
}

function url(path: string, params: Record<string, string | number | undefined> = {}) {
  const next = new URL(`${TMDB_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) next.searchParams.set(key, String(value));
  });
  if (!process.env.TMDB_READ_TOKEN && process.env.TMDB_API_KEY) {
    next.searchParams.set("api_key", process.env.TMDB_API_KEY);
  }
  return next;
}

async function tmdb<T>(path: string, params: Record<string, string | number | undefined> = {}, attempt = 0): Promise<T> {
  const delays = [1200, 3000, 7000, 15000];
  try {
    const response = await fetch(url(path, params), { headers: headers() });
    if (response.status === 429 && attempt < delays.length) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      return tmdb<T>(path, params, attempt + 1);
    }
    if (!response.ok) throw new Error(`TMDB ${path} failed with ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    if (attempt < delays.length) {
      console.warn(`[tmdb retry ${attempt + 1}] ${path}: ${(error as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      return tmdb<T>(path, params, attempt + 1);
    }
    throw error;
  }
}

function providerId(name: string) {
  return providerAliases.find(([pattern]) => pattern.test(name))?.[1] || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function providersFor(type: "movie" | "tv", id: number) {
  const data = await tmdb<ProviderResponse>(`/${type}/${id}/watch/providers`);
  const india = data.results?.IN;
  if (!india) return [];
  return Array.from(
    new Set(
      [...(india.flatrate || []), ...(india.rent || []), ...(india.buy || []), ...(india.free || []), ...(india.ads || [])]
        .map((provider) => providerId(provider.provider_name)),
    ),
  );
}

function year(result: TmdbListResult) {
  const date = result.release_date || result.first_air_date;
  return date ? Number(date.slice(0, 4)) : null;
}

function isAnime(result: TmdbListResult) {
  return Boolean(result.genre_ids?.includes(16) && result.origin_country?.includes("JP"));
}

async function toDoc(input: TmdbListResult & { media_type: "movie" | "tv" }): Promise<TitleDoc> {
  const anime = isAnime(input);
  const title = input.title || input.name || "Untitled";
  const original = input.original_title || input.original_name;
  const type = anime ? "anime" : input.media_type;
  return {
    id: `${type}-${input.id}`,
    tmdb_id: input.id,
    type,
    title,
    alt_titles: Array.from(new Set([title, original, anime ? "anime" : ""].filter(Boolean) as string[])),
    year: year(input),
    overview: input.overview || "",
    poster_w342: input.poster_path || null,
    popularity: input.popularity || 0,
    providers_in: await providersFor(input.media_type, input.id),
    genres: (input.genre_ids || []).map((id) => genreNames.get(id)).filter((name): name is string => Boolean(name)),
    is_anime: anime,
    anilist_id: null,
  };
}

async function collectPopular(mediaType: "movie" | "tv", pages: number) {
  const results: Array<TmdbListResult & { media_type: "movie" | "tv" }> = [];
  for (let page = 1; page <= pages; page += 1) {
    const data = await tmdb<TmdbListResponse>(`/discover/${mediaType}`, {
      page,
      watch_region: "IN",
      sort_by: "popularity.desc",
      include_adult: "false",
    });
    results.push(...data.results.map((result) => ({ ...result, media_type: mediaType })));
  }
  return results;
}

async function collectCurated() {
  const queries = ["The Super Mario Bros. Movie", "Attack on Titan"];
  const found: Array<TmdbListResult & { media_type: "movie" | "tv" }> = [];
  for (const query of queries) {
    const data = await tmdb<TmdbListResponse>("/search/multi", { query, include_adult: "false", region: "IN" });
    for (const result of data.results) {
      if (result.media_type === "movie" || result.media_type === "tv") {
        found.push({ ...result, media_type: result.media_type });
        break;
      }
    }
  }
  return found;
}

async function main() {
  if (!process.env.TMDB_READ_TOKEN && !process.env.TMDB_API_KEY) {
    throw new Error("Set TMDB_READ_TOKEN or TMDB_API_KEY before seeding.");
  }

  await ensureSchema();

  const pagesPerType = Math.min(Number(process.env.SEED_PAGES_PER_TYPE) || 250, 500);
  console.log(`Seeding up to ${pagesPerType * 2 * 20} titles (${pagesPerType} pages x 2 media types x 20 results).`);

  const curated = await collectCurated();
  const curatedDocs = await Promise.all(curated.map(toDoc));
  await bulkUpsert(curatedDocs);
  console.log(`Upserted curated titles: ${curatedDocs.length}`);

  const titles = [...curated, ...(await collectPopular("movie", pagesPerType)), ...(await collectPopular("tv", pagesPerType))];
  const unique = Array.from(new Map(titles.map((title) => [`${title.media_type}-${title.id}`, title])).values());
  const docs: TitleDoc[] = [];

  for (let index = 0; index < unique.length; index += 8) {
    const chunk = unique.slice(index, index + 8);
    docs.push(...(await Promise.all(chunk.map(toDoc))));
    console.log(`Prepared ${docs.length}/${unique.length}`);
  }

  for (let index = 0; index < docs.length; index += 500) {
    await bulkUpsert(docs.slice(index, index + 500));
    console.log(`Upserted ${Math.min(index + 500, docs.length)}/${docs.length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
