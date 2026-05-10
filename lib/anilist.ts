import "server-only";

import { cached } from "@/lib/redis";
import { searchMulti } from "@/lib/tmdb";

const ANILIST = "https://graphql.anilist.co";

export type AniListTitle = {
  romaji: string | null;
  english: string | null;
  native: string | null;
};

export type AniListMedia = {
  id: number;
  idMal: number | null;
  title: AniListTitle;
  format: string | null;
  episodes: number | null;
  status: string | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  coverImage: { extraLarge: string | null };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  averageScore: number | null;
  popularity: number | null;
  relations: { nodes: AniListMediaRelation[] };
  characters: { nodes: AniListCharacter[] };
  externalLinks: AniListExternalLink[];
};

export type AniListMediaRelation = {
  id: number;
  title: AniListTitle;
  type: string | null;
  format: string | null;
};

export type AniListCharacter = {
  id: number;
  name: { full: string | null };
  image: { large: string | null };
};

export type AniListExternalLink = {
  site: string;
  url: string;
};

const mediaFields = `
  id
  idMal
  title { romaji english native }
  format
  episodes
  status
  startDate { year month day }
  coverImage { extraLarge }
  bannerImage
  description(asHtml: false)
  genres
  averageScore
  popularity
  relations { nodes { id title { romaji english native } type format } }
  characters(perPage: 8) { nodes { id name { full } image { large } } }
  externalLinks { site url }
`;

async function anilist<T>(query: string, variables: Record<string, unknown>) {
  const response = await fetch(ANILIST, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`AniList request failed: ${response.status}`);
  const data = (await response.json()) as { data: T; errors?: Array<{ message: string }> };
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data.data;
}

export async function searchAnime(query: string) {
  return cached(`anilist:search:${query}`, 86400, async () => {
    const data = await anilist<{ Page: { media: AniListMedia[] } }>(
      `query SearchAnime($search: String) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: ANIME, sort: POPULARITY_DESC) { ${mediaFields} }
        }
      }`,
      { search: query },
    );
    return data.Page.media;
  });
}

export async function getAnimeById(anilistId: number) {
  return cached(`anilist:id:${anilistId}`, 86400, async () => {
    const data = await anilist<{ Media: AniListMedia }>(
      `query AnimeById($id: Int) { Media(id: $id, type: ANIME) { ${mediaFields} } }`,
      { id: anilistId },
    );
    return data.Media;
  });
}

export async function findTmdbIdForAnilist(anilistId: number) {
  const anime = await getAnimeById(anilistId);
  const imdbLink = anime.externalLinks.find((link) => /imdb/i.test(link.site) || /imdb\.com/i.test(link.url));
  const imdbId = imdbLink?.url.match(/tt\d+/)?.[0];
  if (imdbId) {
    const { findByExternalId } = await import("@/lib/tmdb");
    const found = await findByExternalId("imdb_id", imdbId);
    const movie = (found as { movie_results?: Array<{ id: number }> }).movie_results?.[0];
    const tv = (found as { tv_results?: Array<{ id: number }> }).tv_results?.[0];
    if (movie?.id || tv?.id) return movie?.id || tv?.id || null;
  }
  const title = anime.title.english || anime.title.romaji || anime.title.native;
  if (!title) return null;
  const matches = await searchMulti(title, 1, 86400);
  return matches.find((match) => match.is_anime)?.tmdb_id || matches[0]?.tmdb_id || null;
}
