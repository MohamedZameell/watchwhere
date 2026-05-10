import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { titles } from "@/db/schema";
import type { SearchHit, SearchResponse, TitleDoc, TitleType } from "@/lib/types";

export type SearchOptions = {
  type?: TitleType;
  year?: number;
  provider?: string;
  limit?: number;
};

type Row = {
  id: string;
  tmdb_id: number;
  type: TitleType;
  title: string;
  year: number | null;
  poster_w342: string | null;
  providers_in: string[];
  rank: number;
};

function emptyResponse(): SearchResponse {
  return { hits: [], totalHits: 0, processingTimeMs: 0 };
}

function rowsToHits(rows: Row[], q: string): SearchHit[] {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 1);
  return rows.map((row) => {
    let formatted = row.title;
    if (tokens.length) {
      const escaped = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const regex = new RegExp(`(${escaped.join("|")})`, "ig");
      formatted = row.title.replace(regex, "<mark>$1</mark>");
    }
    return {
      id: row.id,
      tmdb_id: row.tmdb_id,
      type: row.type,
      title: row.title,
      year: row.year,
      poster_w342: row.poster_w342,
      providers_in: row.providers_in || [],
      _formatted: { title: formatted },
    };
  });
}

export async function searchTitles(q: string, opts: SearchOptions = {}): Promise<SearchResponse> {
  const db = getDb();
  if (!db) return emptyResponse();
  const trimmed = q.trim();
  if (!trimmed) return emptyResponse();

  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
  const start = Date.now();
  const rows = (await db.execute(sql`
    WITH q AS (SELECT websearch_to_tsquery('english', ${trimmed}) AS tsq)
    SELECT
      id,
      tmdb_id,
      type,
      title,
      year,
      poster_w342,
      providers_in,
      GREATEST(
        ts_rank_cd(to_tsvector('english', search_text), (SELECT tsq FROM q)),
        similarity(title, ${trimmed}),
        similarity(search_text, ${trimmed})
      )::float AS rank
    FROM titles
    WHERE
      (
        to_tsvector('english', search_text) @@ (SELECT tsq FROM q)
        OR similarity(title, ${trimmed}) > 0.18
        OR similarity(search_text, ${trimmed}) > 0.18
      )
      AND (${opts.type ?? null}::text IS NULL OR type = ${opts.type ?? null})
      AND (${opts.year ?? null}::int IS NULL OR year = ${opts.year ?? null})
      AND (${opts.provider ?? null}::text IS NULL OR ${opts.provider ?? null} = ANY(providers_in))
    ORDER BY rank DESC, popularity DESC
    LIMIT ${limit}
  `)) as unknown as Row[];

  return {
    hits: rowsToHits(rows, trimmed),
    totalHits: rows.length,
    processingTimeMs: Date.now() - start,
  };
}

export async function searchDidYouMean(q: string, opts: SearchOptions = {}): Promise<SearchHit | null> {
  const db = getDb();
  if (!db) return null;
  const trimmed = q.trim();
  if (!trimmed) return null;

  const rows = (await db.execute(sql`
    SELECT
      id,
      tmdb_id,
      type,
      title,
      year,
      poster_w342,
      providers_in,
      GREATEST(
        similarity(title, ${trimmed}),
        similarity(search_text, ${trimmed})
      )::float AS rank
    FROM titles
    WHERE
      (
        similarity(title, ${trimmed}) > 0.1
        OR similarity(search_text, ${trimmed}) > 0.1
      )
      AND (${opts.type ?? null}::text IS NULL OR type = ${opts.type ?? null})
      AND (${opts.year ?? null}::int IS NULL OR year = ${opts.year ?? null})
      AND (${opts.provider ?? null}::text IS NULL OR ${opts.provider ?? null} = ANY(providers_in))
    ORDER BY rank DESC, popularity DESC
    LIMIT 1
  `)) as unknown as Row[];

  const hit = rowsToHits(rows, trimmed)[0];
  return hit || null;
}

export async function popularTitles(limit = 1000): Promise<SearchHit[]> {
  const db = getDb();
  if (!db) return [];
  const rows = (await db.execute(sql`
    SELECT id, tmdb_id, type, title, year, poster_w342, providers_in
    FROM titles
    ORDER BY popularity DESC
    LIMIT ${limit}
  `)) as unknown as Row[];
  return rows.map((row) => ({
    id: row.id,
    tmdb_id: row.tmdb_id,
    type: row.type,
    title: row.title,
    year: row.year,
    poster_w342: row.poster_w342,
    providers_in: row.providers_in || [],
  }));
}

export async function bulkUpsert(docs: TitleDoc[]): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL missing; cannot upsert titles.");
  if (!docs.length) return;
  for (let index = 0; index < docs.length; index += 200) {
    const chunk = docs.slice(index, index + 200);
    await db
      .insert(titles)
      .values(
        chunk.map((doc) => ({
          id: doc.id,
          tmdbId: doc.tmdb_id,
          type: doc.type,
          title: doc.title,
          altTitles: doc.alt_titles,
          searchText: [doc.title, ...doc.alt_titles, doc.overview].filter(Boolean).join(" "),
          year: doc.year,
          overview: doc.overview,
          posterW342: doc.poster_w342,
          popularity: doc.popularity,
          providersIn: doc.providers_in,
          genres: doc.genres,
          isAnime: doc.is_anime,
          anilistId: doc.anilist_id,
        })),
      )
      .onConflictDoUpdate({
        target: titles.id,
        set: {
          title: sql`excluded.title`,
          altTitles: sql`excluded.alt_titles`,
          searchText: sql`excluded.search_text`,
          year: sql`excluded.year`,
          overview: sql`excluded.overview`,
          posterW342: sql`excluded.poster_w342`,
          popularity: sql`excluded.popularity`,
          providersIn: sql`excluded.providers_in`,
          genres: sql`excluded.genres`,
          isAnime: sql`excluded.is_anime`,
          anilistId: sql`excluded.anilist_id`,
          updatedAt: sql`now()`,
        },
      });
  }
}
