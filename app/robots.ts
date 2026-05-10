import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${site}/sitemap.xml`,
  };
}
