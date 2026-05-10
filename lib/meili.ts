import { MeiliSearch, type SearchParams } from "meilisearch";
import type { SearchHit, SearchResponse, TitleDoc } from "@/lib/types";

const host = process.env.MEILI_HOST || "http://localhost:7700";
const masterKey = process.env.MEILI_MASTER_KEY || process.env.MEILI_SEARCH_KEY || "";
const searchKey = process.env.MEILI_SEARCH_KEY || masterKey;

export const meili = new MeiliSearch({ host, apiKey: masterKey });
export const searchClient = new MeiliSearch({ host, apiKey: searchKey });

export const TITLES_INDEX = "titles";

export async function ensureIndex() {
  try {
    await meili.getIndex(TITLES_INDEX);
  } catch {
    await meili.createIndex(TITLES_INDEX, { primaryKey: "id" });
  }

  const index = meili.index<TitleDoc>(TITLES_INDEX);
  await index.updateSettings({
    searchableAttributes: ["title", "alt_titles", "overview"],
    filterableAttributes: ["type", "year", "providers_in", "genres", "is_anime"],
    sortableAttributes: ["popularity", "year"],
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness", "popularity:desc"],
    typoTolerance: { minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
    synonyms: {
      mcu: ["marvel cinematic universe"],
      lotr: ["lord of the rings"],
      got: ["game of thrones"],
      aot: ["attack on titan", "shingeki no kyojin"],
      jjk: ["jujutsu kaisen"],
    },
    stopWords: ["the", "a", "an"],
    faceting: { maxValuesPerFacet: 100 },
  });
  return index;
}

export async function bulkUpsert(docs: TitleDoc[]) {
  const index = await ensureIndex();
  return index.addDocuments(docs, { primaryKey: "id" });
}

export async function searchTitles(q: string, opts: SearchParams = {}): Promise<SearchResponse> {
  const index = searchClient.index<SearchHit>(TITLES_INDEX);
  const result = await index.search(q, {
    limit: 24,
    attributesToRetrieve: ["id", "tmdb_id", "type", "title", "year", "poster_w342", "providers_in"],
    attributesToHighlight: ["title"],
    highlightPreTag: "<mark>",
    highlightPostTag: "</mark>",
    ...opts,
  });
  return {
    hits: result.hits,
    totalHits: result.estimatedTotalHits || result.hits.length,
    processingTimeMs: result.processingTimeMs,
  };
}

export async function searchDidYouMean(q: string, opts: SearchParams = {}) {
  const index = searchClient.index<SearchHit>(TITLES_INDEX);
  const result = await index.search(q, {
    limit: 1,
    attributesToRetrieve: ["id", "tmdb_id", "type", "title", "year", "poster_w342", "providers_in"],
    attributesToHighlight: ["title"],
    highlightPreTag: "<mark>",
    highlightPostTag: "</mark>",
    sort: ["popularity:desc"],
    ...opts,
    typoTolerance: {
      minWordSizeForTypos: {
        oneTypo: 2,
        twoTypos: 4,
      },
    },
  } as SearchParams & {
    typoTolerance: { minWordSizeForTypos: { oneTypo: number; twoTypos: number } };
  });
  return result.hits[0] || null;
}

export async function popularTitles(limit = 1000) {
  const index = searchClient.index<SearchHit>(TITLES_INDEX);
  const result = await index.search("", {
    limit,
    sort: ["popularity:desc"],
    attributesToRetrieve: ["id", "tmdb_id", "type", "title", "year", "poster_w342", "providers_in"],
  });
  return result.hits;
}
