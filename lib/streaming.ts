import "server-only";

import { cached } from "@/lib/redis";
import { providerIdFromName, providerMeta } from "@/lib/providers";
import type { Provider } from "@/lib/types";

const HOST = process.env.STREAMING_AVAILABILITY_HOST || "streaming-availability.p.rapidapi.com";
const BASE = `https://${HOST}`;

export class StreamingQuotaExceededError extends Error {
  constructor() {
    super("Streaming Availability quota exhausted.");
    this.name = "StreamingQuotaExceededError";
  }
}

type StreamingOption = {
  service?: { id?: string; name?: string };
  type?: string;
  link?: string;
  videoLink?: string;
  quality?: string;
  expiresSoon?: boolean;
  expiresOn?: string;
};

type StreamingShow = {
  streamingOptions?: {
    in?: StreamingOption[];
  };
};

type StreamingSearchResponse = {
  shows?: StreamingShow[];
};

function providerType(type: string | undefined): Provider["type"] {
  if (type === "rent" || type === "buy" || type === "free" || type === "addon") return type;
  if (type === "ads") return "ads";
  return "subscription";
}

function quality(value: string | undefined): Provider["quality"] | undefined {
  if (value === "sd" || value === "hd" || value === "qhd" || value === "uhd") return value;
  return undefined;
}

function normalizeOption(option: StreamingOption): Provider | null {
  const name = option.service?.name || option.service?.id;
  if (!name || !option.link) return null;
  const id = providerIdFromName(option.service?.id || name);
  const meta = providerMeta(id, name);
  return {
    id,
    name: meta.name,
    type: providerType(option.type),
    link: option.link,
    videoLink: option.videoLink,
    quality: quality(option.quality),
    expiresOn: option.expiresOn,
    logoSrc: meta.logoSrc,
  };
}

async function streamingFetch<T>(path: string, params: Record<string, string | number | undefined> = {}, retry = true) {
  if (!process.env.RAPIDAPI_KEY) {
    console.warn(`[stub-disabled] RAPIDAPI_KEY missing; Streaming Availability skipped for ${path}.`);
    return null;
  }
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    headers: {
      "x-rapidapi-key": process.env.RAPIDAPI_KEY,
      "x-rapidapi-host": HOST,
      accept: "application/json",
    },
    next: { revalidate: 21600 },
  });
  if (response.status === 429) {
    if (!retry) throw new StreamingQuotaExceededError();
    const retryAfter = Number(response.headers.get("retry-after") || 1);
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 5) * 1000));
    return streamingFetch<T>(path, params, false);
  }
  if (!response.ok) throw new Error(`Streaming Availability request failed: ${response.status}`);
  return (await response.json()) as T;
}

export async function getShow(type: "movie" | "series", tmdbId: number) {
  return cached(`streaming:show:${type}:${tmdbId}`, 21600, async () => {
    const data = await streamingFetch<StreamingShow>("/shows/find", {
      country: "in",
      tmdb_id: tmdbId,
      output_language: "en",
      show_type: type,
    });
    return (data?.streamingOptions?.in || []).map(normalizeOption).filter((item): item is Provider => Boolean(item));
  });
}

export async function searchByTitle(query: string, country = "in") {
  return cached(`streaming:search:${country}:${query}`, 21600, async () => {
    const data = await streamingFetch<StreamingSearchResponse>("/shows/search/title", {
      country,
      title: query,
      output_language: "en",
    });
    return data?.shows || [];
  });
}
