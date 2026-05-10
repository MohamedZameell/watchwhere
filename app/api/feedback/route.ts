import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { feedback } from "@/db/schema";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

const bodySchema = z.object({
  tmdbId: z.number().int().positive(),
  type: z.enum(["movie", "tv", "anime"]),
  providerId: z.string().max(32).optional(),
  issue: z.enum(["wrong-link", "missing", "other"]),
  note: z.string().max(1000).optional(),
  email: z.string().email().optional(),
});

const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
    })
  : null;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anon";
  if (limiter) {
    const result = await limiter.limit(ip);
    if (!result.success) {
      return NextResponse.json({ message: "Hold up — too many submissions. Try again in a minute." }, { status: 429 });
    }
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Couldn't send that. Mind retrying?" }, { status: 400 });
  }

  const db = getDb();
  const note = [parsed.data.note, parsed.data.email ? `email: ${parsed.data.email}` : ""].filter(Boolean).join("\n");
  if (db) {
    await db.insert(feedback).values({
      tmdbId: parsed.data.tmdbId,
      type: parsed.data.type,
      providerId: parsed.data.providerId,
      issue: parsed.data.issue,
      note: note || null,
      ip,
    });
  }
  return NextResponse.json({ ok: true });
}
