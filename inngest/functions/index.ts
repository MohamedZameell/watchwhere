import { refreshTrending } from "@/inngest/functions/refresh-trending";
import { refreshDeltas } from "@/inngest/functions/refresh-deltas";
import { buildSitemap } from "@/inngest/functions/build-sitemap";

export const functions = [refreshTrending, refreshDeltas, buildSitemap];
