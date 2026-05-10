import { after, NextResponse } from "next/server";
import { z } from "zod";
import { cached } from "@/lib/redis";
import { searchDidYouMean, searchTitles, type SearchOptions } from "@/lib/search";

export const runtime = "nodejs";

const searchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  type: z.enum(["movie", "tv", "anime", "all"]).default("all"),
  year: z.coerce.number().int().min(1888).max(2100).optional(),
  provider: z.string().trim().max(40).optional(),
});

function searchOpts(input: z.infer<typeof searchSchema>): SearchOptions {
  return {
    type: input.type === "all" ? undefined : input.type,
    year: input.year,
    provider: input.provider,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = searchSchema.safeParse({
    q: url.searchParams.get("q") || "",
    type: url.searchParams.get("type") || "all",
    year: url.searchParams.get("year") || undefined,
    provider: url.searchParams.get("provider") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ hits: [], totalHits: 0, processingTimeMs: 0 }, { status: 400 });
  }

  const input = parsed.data;
  if (!input.q) {
    return NextResponse.json({ hits: [], totalHits: 0, processingTimeMs: 0 });
  }

  const key = `search:v1:${input.q}:${input.type}:${input.year ?? ""}:${input.provider ?? ""}`;
  try {
    const result = await cached(
      key,
      60,
      async () => {
        const opts = searchOpts(input);
        const primary = await searchTitles(input.q, opts);
        if (primary.hits.length) return primary;
        return {
          ...primary,
          didYouMean: await searchDidYouMean(input.q, opts),
        };
      },
      { waitUntil: (promise) => after(() => promise) },
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { hits: [], totalHits: 0, processingTimeMs: 0, message: "Couldn't load watch info. Mind retrying?" },
      { status: 503 },
    );
  }
}
