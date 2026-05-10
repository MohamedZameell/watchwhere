import { NextResponse } from "next/server";
import { z } from "zod";
import { getMovie, getTv } from "@/lib/tmdb";
import { getShow } from "@/lib/streaming";
import { cached } from "@/lib/redis";
import { groupProviders, mergeProviders } from "@/lib/providers";
import { parseSlug } from "@/lib/slug";
import type { Provider, TitleType, TmdbIndiaProviders } from "@/lib/types";

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

type ProviderDetail = {
  title?: string;
  name?: string;
  "watch/providers"?: {
    results?: {
      IN?: TmdbIndiaProviders;
    };
  };
};

async function getAvailability(type: TitleType, id: number) {
  const tmdbType = type === "movie" ? "movie" : "tv";
  const [detail, streaming] = await Promise.all([
    tmdbType === "movie" ? getMovie(id, 3600) : getTv(id, 3600),
    getShow(tmdbType === "movie" ? "movie" : "series", id),
  ]);
  const tmdb = detail as ProviderDetail;
  const providers = mergeProviders(tmdb["watch/providers"]?.results?.IN, streaming as Provider[], tmdb.title || tmdb.name);
  return { providers, providers_grouped: groupProviders(providers) };
}

export async function GET(_request: Request, context: { params: Promise<{ type: string; id: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ message: "Couldn't load watch info. Mind retrying?" }, { status: 400 });
  }
  const result = await cached(`availability:v1:${params.data.type}:${params.data.id}`, 3600, () =>
    getAvailability(params.data.type as TitleType, params.data.id),
  );
  return NextResponse.json(result);
}
