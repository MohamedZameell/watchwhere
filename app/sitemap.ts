import type { MetadataRoute } from "next";
import { popularTitles } from "@/lib/meili";
import { titleHref } from "@/lib/slug";
import { getSiteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const staticUrls = ["/", "/about", "/browse", "/search"].map((path) => ({
    url: `${site}${path}`,
    lastModified: new Date(),
  }));

  const titles = await popularTitles(1000).catch(() => []);
  const titleUrls = titles.map((title) => ({
    url: `${site}${titleHref(title.type, title.tmdb_id, title.title)}`,
    lastModified: new Date(),
  }));

  return [...staticUrls, ...titleUrls];
}
