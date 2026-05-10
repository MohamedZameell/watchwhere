import { NextResponse } from "next/server";
import { z } from "zod";
import { parseSlug } from "@/lib/slug";
import { getTitleDetail } from "@/lib/title-detail";
import type { TitleType } from "@/lib/types";

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

export async function GET(_request: Request, context: { params: Promise<{ type: string; id: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ message: "We couldn't find that title." }, { status: 400 });
  }
  const type = params.data.type as TitleType;
  const id = params.data.id;
  const detail = await getTitleDetail(type, id);
  return NextResponse.json(detail);
}
