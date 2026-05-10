import { gzipSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { inngest } from "@/inngest/client";
import { popularTitles } from "@/lib/meili";
import { titleHref } from "@/lib/slug";
import { getSiteUrl } from "@/lib/utils";

function xml(urls: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((url) => `<url><loc>${url}</loc></url>`)
    .join("")}</urlset>`;
}

function indexXml(urls: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((url) => `<sitemap><loc>${url}</loc></sitemap>`)
    .join("")}</sitemapindex>`;
}

export const buildSitemap = inngest.createFunction(
  { id: "build-sitemap", triggers: [{ cron: "30 21 * * *" }] },
  async ({ step }) => {
    const chunks = await step.run("build sitemap chunks", async () => {
      const site = getSiteUrl();
      const titles = await popularTitles(10000);
      const urls = titles.map((title) => `${site}${titleHref(title.type, title.tmdb_id, title.title)}`);
      const result: string[][] = [];
      for (let index = 0; index < urls.length; index += 50000) result.push(urls.slice(index, index + 50000));
      return result.length ? result : [[`${site}/`]];
    });

    const published = await step.run("publish sitemap chunks", async () => {
      const site = getSiteUrl();
      const locations: string[] = [];
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        for (let index = 0; index < chunks.length; index += 1) {
          const key = `sitemaps/sitemap-${index}.xml.gz`;
          const blob = await put(key, gzipSync(xml(chunks[index])), {
            access: "public",
            contentType: "application/xml",
          });
          locations.push(blob.url);
        }
      } else {
        console.warn("[stub-disabled] BLOB_READ_WRITE_TOKEN missing; writing sitemaps to public/sitemaps.");
        const dir = path.join(process.cwd(), "public", "sitemaps");
        await mkdir(dir, { recursive: true });
        for (let index = 0; index < chunks.length; index += 1) {
          const file = `sitemap-${index}.xml.gz`;
          await writeFile(path.join(dir, file), gzipSync(xml(chunks[index])));
          locations.push(`${site}/sitemaps/${file}`);
        }
      }
      await writeFile(path.join(process.cwd(), "public", "sitemap.xml"), indexXml(locations));
      return locations;
    });
    return { chunks: published.length };
  },
);
