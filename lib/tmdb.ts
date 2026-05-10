import "server-only";

import { cached } from "@/lib/redis";
import type { NormalizedTitleResult, TitleType, TmdbIndiaProviders } from "@/lib/types";

const TMDB_BASE = "https://api.themoviedb.org/3";

type TmdbListResult = {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  popularity?: number;
  genre_ids?: number[];
  origin_country?: string[];
};

type TmdbListResponse = {
  page: number;
  results: TmdbListResult[];
  total_pages: number;
  total_results: number;
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

export class TmdbRateLimitError extends Error {
  constructor() {
    super("TMDB rate limit exceeded.");
    this.name = "TmdbRateLimitError";
  }
}

function authHeaders() {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (process.env.TMDB_READ_TOKEN) {
    headers.authorization = `Bearer ${process.env.TMDB_READ_TOKEN}`;
  }
  return headers;
}

function withApiKey(url: URL) {
  if (!process.env.TMDB_READ_TOKEN && process.env.TMDB_API_KEY) {
    url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  }
}

async function tmdbFetch<T>(path: string, params: Record<string, string | number | undefined> = {}, revalidate = 3600) {
  const url = new URL(`${TMDB_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  withApiKey(url);

  const request = async () =>
    fetch(url, {
      headers: authHeaders(),
      next: { revalidate },
    });

  let response = await request();
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") || 1);
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 3) * 1000));
    response = await request();
    if (response.status === 429) {
      throw new TmdbRateLimitError();
    }
  }
  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function yearFrom(result: TmdbListResult) {
  const value = result.release_date || result.first_air_date;
  return value ? Number(value.slice(0, 4)) : null;
}

function typeFrom(result: TmdbListResult): TitleType | null {
  if (result.media_type === "movie") return "movie";
  if (result.media_type === "tv") return isAnimeLike(result) ? "anime" : "tv";
  return null;
}

function isAnimeLike(result: TmdbListResult) {
  return result.genre_ids?.includes(16) && result.origin_country?.some((country) => country === "JP");
}

function normalize(result: TmdbListResult): NormalizedTitleResult | null {
  const type = typeFrom(result);
  if (!type) return null;
  return {
    tmdb_id: result.id,
    type,
    title: result.title || result.name || "Untitled",
    original_title: result.original_title || result.original_name,
    year: yearFrom(result),
    overview: result.overview || "",
    poster_w342: result.poster_path || null,
    backdrop_path: result.backdrop_path || null,
    popularity: result.popularity || 0,
    genres: (result.genre_ids || []).map((id) => genreNames.get(id)).filter((name): name is string => Boolean(name)),
    providers_in: [],
    is_anime: type === "anime",
  };
}

export async function searchMulti(query: string, page = 1, revalidate = 3600) {
  return cached(`tmdb:search:${query}:${page}`, revalidate, async () => {
    const data = await tmdbFetch<TmdbListResponse>("/search/multi", {
      query,
      page,
      include_adult: "false",
      language: "en-US",
      region: "IN",
    }, revalidate);
    return data.results.map(normalize).filter((item): item is NormalizedTitleResult => Boolean(item));
  });
}

export async function getMovie(id: number, revalidate = 21600) {
  return cached(`tmdb:movie:${id}`, revalidate, () =>
    tmdbFetch(`/movie/${id}`, {
      append_to_response: "watch/providers,external_ids,images,credits,videos,recommendations",
      language: "en-US",
    }, revalidate),
  );
}

export async function getTv(id: number, revalidate = 21600) {
  return cached(`tmdb:tv:${id}`, revalidate, () =>
    tmdbFetch(`/tv/${id}`, {
      append_to_response: "watch/providers,external_ids,images,credits,videos,recommendations",
      language: "en-US",
    }, revalidate),
  );
}

export async function getWatchProviders(type: "movie" | "tv", id: number, revalidate = 21600) {
  return cached(`tmdb:providers:${type}:${id}`, revalidate, async () => {
    const data = await tmdbFetch<{ results?: { IN?: TmdbIndiaProviders } }>(`/${type}/${id}/watch/providers`, {}, revalidate);
    return data.results?.IN || null;
  });
}

export async function findByExternalId(source: "imdb_id" | "tvdb_id", id: string, revalidate = 86400) {
  return cached(`tmdb:find:${source}:${id}`, revalidate, () =>
    tmdbFetch(`/find/${id}`, { external_source: source }, revalidate),
  );
}

export async function getTrending(window: "day" | "week", region = "IN", revalidate = 3600) {
  return cached(`tmdb:trending:${window}:${region}`, revalidate, async () => {
    const data = await tmdbFetch<TmdbListResponse>(`/trending/all/${window}`, { region }, revalidate);
    return data.results.map(normalize).filter((item): item is NormalizedTitleResult => Boolean(item));
  });
}

export async function discover(params: { region?: "IN"; with_watch_providers?: string; sort_by?: string }, revalidate = 3600) {
  const region = params.region || "IN";
  return cached(`tmdb:discover:${JSON.stringify(params)}`, revalidate, async () => {
    const [movies, tv] = await Promise.all([
      tmdbFetch<TmdbListResponse>("/discover/movie", {
        watch_region: region,
        with_watch_providers: params.with_watch_providers,
        sort_by: params.sort_by || "popularity.desc",
      }, revalidate),
      tmdbFetch<TmdbListResponse>("/discover/tv", {
        watch_region: region,
        with_watch_providers: params.with_watch_providers,
        sort_by: params.sort_by || "popularity.desc",
      }, revalidate),
    ]);
    return [
      ...movies.results.map((result) => ({ ...result, media_type: "movie" as const })),
      ...tv.results.map((result) => ({ ...result, media_type: "tv" as const })),
    ].map(normalize).filter((item): item is NormalizedTitleResult => Boolean(item));
  });
}
