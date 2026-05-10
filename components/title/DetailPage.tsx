import { notFound } from "next/navigation";
import { AnimeBlock } from "@/components/title/AnimeBlock";
import { CastStrip } from "@/components/title/CastStrip";
import { Hero } from "@/components/title/Hero";
import { PosterGrid } from "@/components/title/PosterGrid";
import { ProviderList } from "@/components/title/ProviderList";
import { SeasonsAccordion } from "@/components/title/SeasonsAccordion";
import { getTitleDetail } from "@/lib/title-detail";
import { parseSlug } from "@/lib/slug";
import { breadcrumbJsonLd, movieJsonLd, tvJsonLd } from "@/lib/seo";
import type { TitleType } from "@/lib/types";

export async function DetailPage({ type, slug }: { type: TitleType; slug: string }) {
  const parsed = parseSlug(slug);
  if (!parsed.id) notFound();
  const title = await getTitleDetail(type, parsed.id).catch(() => null);
  if (!title) notFound();
  const isAnimeFilm =
    type === "anime" && (!title.seasons || title.seasons.length === 0) && (title.runtime ?? 0) > 0;
  const jsonLd = [
    type === "movie" || isAnimeFilm
      ? movieJsonLd(title, title.providers)
      : tvJsonLd(title, title.providers),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: title.title, path: `/${type}/${slug}` },
    ]),
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero title={title} />
      <div className="container-page grid gap-10 py-10">
        <ProviderList title={title} />
        <CastStrip cast={title.cast} />
        {title.trailer ? (
          <section>
            <h2 className="mb-4 text-xl font-semibold">Trailer</h2>
            <div className="aspect-video overflow-hidden rounded-[12px] border border-border-subtle bg-bg-elevated">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${title.trailer.youtubeKey}`}
                title={`${title.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        ) : null}
        {type === "tv" ? <SeasonsAccordion seasons={title.seasons} /> : null}
        {type === "anime" ? <AnimeBlock anilist={title.anilist} /> : null}
        {title.recommendations.length ? (
          <section>
            <h2 className="mb-4 text-xl font-semibold">More like this</h2>
            <PosterGrid titles={title.recommendations} />
          </section>
        ) : null}
      </div>
    </>
  );
}
