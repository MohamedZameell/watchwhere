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
  total_pages?: number;
  total_results?: number;
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

type Bucket = {
  name: string;
  mediaType: "movie" | "tv";
  pages: number;
  params: Record<string, string | number>;
};

const BUCKETS: Bucket[] = [
  // Global popular as carried in India — mostly Hollywood + Bollywood
  { name: "global movies", mediaType: "movie", pages: 250, params: { watch_region: "IN", sort_by: "popularity.desc" } },
  { name: "global tv",     mediaType: "tv",    pages: 250, params: { watch_region: "IN", sort_by: "popularity.desc" } },

  // Tamil — deep coverage (TMDB hard cap = ~500 pages = up to 10K per media type)
  { name: "tamil movies",  mediaType: "movie", pages: 500, params: { with_original_language: "ta", sort_by: "popularity.desc" } },
  { name: "tamil tv",      mediaType: "tv",    pages: 500, params: { with_original_language: "ta", sort_by: "popularity.desc" } },

  // English — deep coverage on top of what global already pulled
  { name: "english movies", mediaType: "movie", pages: 500, params: { with_original_language: "en", sort_by: "popularity.desc" } },
  { name: "english tv",     mediaType: "tv",    pages: 500, params: { with_original_language: "en", sort_by: "popularity.desc" } },

  // Malayalam — popular only
  { name: "malayalam movies", mediaType: "movie", pages: 75, params: { with_original_language: "ml", sort_by: "popularity.desc" } },
  { name: "malayalam tv",     mediaType: "tv",    pages: 25, params: { with_original_language: "ml", sort_by: "popularity.desc" } },

  // Hindi — popular only (already heavily represented in global)
  { name: "hindi movies", mediaType: "movie", pages: 75, params: { with_original_language: "hi", sort_by: "popularity.desc" } },
  { name: "hindi tv",     mediaType: "tv",    pages: 25, params: { with_original_language: "hi", sort_by: "popularity.desc" } },
];

async function collectBucket(bucket: Bucket) {
  const results: Array<TmdbListResult & { media_type: "movie" | "tv" }> = [];
  for (let page = 1; page <= bucket.pages; page += 1) {
    const data = await tmdb<TmdbListResponse>(`/discover/${bucket.mediaType}`, {
      page,
      include_adult: "false",
      ...bucket.params,
    });
    if (!data.results.length) break;
    results.push(...data.results.map((result) => ({ ...result, media_type: bucket.mediaType })));
    if (data.total_pages && page >= data.total_pages) break;
  }
  console.log(`  ${bucket.name}: collected ${results.length} entries`);
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

  const totalPages = BUCKETS.reduce((sum, bucket) => sum + bucket.pages, 0);
  console.log(`Seeding from ${BUCKETS.length} buckets, up to ${totalPages * 20} entries before dedup.`);

  const curated = await collectCurated();
  const curatedDocs = await Promise.all(curated.map(toDoc));
  await bulkUpsert(curatedDocs);
  console.log(`Upserted curated titles: ${curatedDocs.length}`);

  const collected: Array<TmdbListResult & { media_type: "movie" | "tv" }> = [...curated];
  for (const bucket of BUCKETS) {
    collected.push(...(await collectBucket(bucket)));
  }

  const unique = Array.from(new Map(collected.map((title) => [`${title.media_type}-${title.id}`, title])).values());
  console.log(`Unique entries after dedup: ${unique.length}`);
  const docs: TitleDoc[] = [];

  for (let index = 0; index < unique.length; index += 8) {
    const chunk = unique.slice(index, index + 8);
    docs.push(...(await Promise.all(chunk.map(toDoc))));
    if (docs.length % 200 === 0 || docs.length === unique.length) {
      console.log(`Prepared ${docs.length}/${unique.length}`);
    }
    if (docs.length >= 200) {
      await bulkUpsert(docs.splice(0, docs.length));
    }
  }
  if (docs.length) {
    await bulkUpsert(docs);
  }
  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
