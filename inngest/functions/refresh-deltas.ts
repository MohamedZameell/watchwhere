import { inngest } from "@/inngest/client";
import { redis } from "@/lib/redis";

export const refreshDeltas = inngest.createFunction(
  { id: "refresh-deltas", triggers: [{ cron: "30 20 * * *" }] },
  async ({ step }) => {
    const cursor = await redis?.get<string>("cursor:streaming:in");
    const processed = await step.run("pull streaming changes", async () => {
      if (!process.env.RAPIDAPI_KEY) {
        console.warn("[stub-disabled] RAPIDAPI_KEY missing; streaming deltas skipped.");
        return 0;
      }
      let count = 0;
      let nextCursor: string | null | undefined = cursor;
      do {
        const url = new URL(`https://${process.env.STREAMING_AVAILABILITY_HOST || "streaming-availability.p.rapidapi.com"}/changes`);
        url.searchParams.set("country", "in");
        url.searchParams.set("change_type", "updated");
        if (nextCursor) url.searchParams.set("cursor", nextCursor);
        const response = await fetch(url, {
          headers: {
            "x-rapidapi-key": process.env.RAPIDAPI_KEY,
            "x-rapidapi-host": process.env.STREAMING_AVAILABILITY_HOST || "streaming-availability.p.rapidapi.com",
          },
        });
        if (!response.ok) break;
        const data = (await response.json()) as { nextCursor?: string; changes?: unknown[] };
        count += data.changes?.length || 0;
        nextCursor = data.nextCursor;
        if (nextCursor) await redis?.set("cursor:streaming:in", nextCursor);
      } while (nextCursor);
      return count;
    });
    return { processed };
  },
);
