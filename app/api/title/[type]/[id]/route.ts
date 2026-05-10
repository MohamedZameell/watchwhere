import { NextResponse } from "next/server";
import { z } from "zod";
import { cached } from "@/lib/redis";
import { getMovie, getTv } from "@/lib/tmdb";
import { getShow } from "@/lib/streaming";
import { mergeProviders, groupProviders } from "@/lib/providers";
import { parseSlug } from "@/lib/slug";
import { searchAnime, type AniListMedia } from "@/lib/anilist";
import type { Provider, SearchHit, TitleDetail, TitleType, TmdbIndiaProviders } from "@/lib/types";

export const runtime = "nodejs";

const paramsSchema = z.object({
  type: z.enum(["movie", "tv", "anime"]),
  id: z.string().transform((value, ctx) => {
    const parsed = parseSlug(value);
    if (!parsed.id || parsed.id < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid title id." });
      return z.NEVER;
    }
    return parsed.id;
  }),
});

type TmdbDetail = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  vote_average?: number;
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  genres?: Array<{ name: string }>;
  credits?: {
    cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null }>;
  };
  videos?: {
    results?: Array<{ site: string; type: string; key: string; official?: boolean }>;
  };
  seasons?: Array<{ season_number: number; episode_count: number; air_date?: string | null }>;
  recommendations?: {
    results?: Array<{
      id: number;
      title?: string;
      name?: string;
      release_date?: string;
      first_air_date?: string;
      poster_path?: string | null;
    }>;
  };
  "watch/providers"?: {
    results?: {
      IN?: TmdbIndiaProviders;
    };
  };
};

function yearFrom(detail: TmdbDetail) {
  const date = detail.release_date || detail.first_air_date;
  return date ? Number(date.slice(0, 4)) : null;
}

function titleFrom(detail: TmdbDetail) {
  return detail.title || detail.name || "Untitled";
}

function trailerFrom(detail: TmdbDetail) {
  const trailer = detail.videos?.results?.find((video) => video.site === "YouTube" && video.type === "Trailer" && video.official)
    || detail.videos?.results?.find((video) => video.site === "YouTube" && video.type === "Trailer");
  return trailer ? { youtubeKey: trailer.key } : null;
}

function recommendationsFrom(detail: TmdbDetail, type: TitleType): SearchHit[] {
  return (detail.recommendations?.results || []).slice(0, 12).map((item) => ({
    id: `${type}-${item.id}`,
    tmdb_id: item.id,
    type,
    title: item.title || item.name || "Untitled",
    year: item.release_date || item.first_air_date ? Number((item.release_date || item.first_air_date || "").slice(0, 4)) : null,
    poster_w342: item.poster_path || null,
    providers_in: [],
  }));
}

async function animeForDetail(detail: TmdbDetail): Promise<AniListMedia | null> {
  const title = titleFrom(detail);
  const matches = await searchAnime(title);
  const imdb = (detail as { external_ids?: { imdb_id?: string | null } }).external_ids?.imdb_id;
  if (imdb) {
    const byExternal = matches.find((item) => item.externalLinks.some((link) => link.url.includes(imdb)));
    if (byExternal) return byExternal;
  }
  return matches[0] || null;
}

export async function buildTitleDetail(type: TitleType, id: number): Promise<TitleDetail> {
  const tmdbType = type === "movie" ? "movie" : "tv";
  const settled = await Promise.allSettled([
    tmdbType === "movie" ? getMovie(id) : getTv(id),
    getShow(tmdbType === "movie" ? "movie" : "series", id),
  ]);

  if (settled[0].status === "rejected") throw settled[0].reason;
  const detail = settled[0].value as TmdbDetail;
  const streamingProviders = settled[1].status === "fulfilled" ? settled[1].value : [];
  const anilist = type === "anime" ? await animeForDetail(detail).catch(() => null) : null;
  const providers = mergeProviders(detail["watch/providers"]?.results?.IN, streamingProviders as Provider[], titleFrom(detail));

  return {
    tmdb_id: detail.id,
    type,
    title: titleFrom(detail),
    original_title: detail.original_title || detail.original_name || null,
    year: yearFrom(detail),
    runtime: detail.runtime || detail.episode_run_time?.[0] || null,
    rating: typeof detail.vote_average === "number" ? Math.round(detail.vote_average * 10) / 10 : null,
    overview: detail.overview || "",
    backdrop_path: detail.backdrop_path || null,
    poster_path: detail.poster_path || null,
    genres: (detail.genres || []).map((genre) => genre.name),
    cast: (detail.credits?.cast || []).slice(0, 8).map((person) => ({
      id: person.id,
      name: person.name,
      character: person.character || "",
      profile_path: person.profile_path || null,
    })),
    trailer: trailerFrom(detail),
    seasons: tmdbType === "tv"
      ? (detail.seasons || []).map((season) => ({
          number: season.season_number,
          episodes: season.episode_count,
          air_date: season.air_date || null,
        }))
      : undefined,
    providers,
    providers_grouped: groupProviders(providers),
    recommendations: recommendationsFrom(detail, type),
    anilist: anilist
      ? {
          id: anilist.id,
          characters: anilist.characters.nodes,
          relations: anilist.relations.nodes,
          externalLinks: anilist.externalLinks,
        }
      : undefined,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ type: string; id: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ message: "We couldn't find that title." }, { status: 400 });
  }
  const type = params.data.type as TitleType;
  const id = params.data.id;
  const detail = await cached(`title:v1:${type}:${id}`, 21600, () => buildTitleDetail(type, id));
  return NextResponse.json(detail);
}
