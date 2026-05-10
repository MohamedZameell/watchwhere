import { after, NextResponse } from "next/server";
import { z } from "zod";
import { cached } from "@/lib/redis";
import { searchDidYouMean, searchTitles } from "@/lib/meili";

export const runtime = "edge";

const searchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  type: z.enum(["movie", "tv", "anime", "all"]).default("all"),
  year: z.coerce.number().int().min(1888).max(2100).optional(),
  provider: z.string().trim().max(40).optional(),
});

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function filters(input: z.infer<typeof searchSchema>) {
  const parts: string[] = [];
  if (input.type !== "all") parts.push(`type = "${input.type}"`);
  if (input.year) parts.push(`year = ${input.year}`);
  if (input.provider) parts.push(`providers_in = "${input.provider}"`);
  return parts.length ? parts.join(" AND ") : undefined;
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

  const key = `search:v1:${await sha256(JSON.stringify(input))}`;
  try {
    const result = await cached(
      key,
      60,
      async () => {
        const primary = await searchTitles(input.q, {
          filter: filters(input),
          limit: 24,
          showRankingScore: true,
        });
        if (primary.hits.length || !input.q) return primary;
        return {
          ...primary,
          didYouMean: await searchDidYouMean(input.q, { filter: filters(input) }),
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
