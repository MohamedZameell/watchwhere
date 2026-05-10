import type { Metadata } from "next";
import { DetailPage } from "@/components/title/DetailPage";
import { tmdbImage } from "@/lib/images";
import { parseSlug } from "@/lib/slug";
import { getTitleDetail } from "@/lib/title-detail";

export const revalidate = 21600;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = parseSlug(slug).id;
  if (!id) return {};
  const title = await getTitleDetail("movie", id).catch(() => null);
  if (!title) return {};
  const image = tmdbImage(title.backdrop_path, "w780") || undefined;
  return {
    title: `${title.title}${title.year ? ` (${title.year})` : ""} - Where to Watch in India | Watchwhere`,
    description: title.overview,
    openGraph: { images: image ? [image] : undefined },
  };
}

export default async function MoviePage({ params }: PageProps) {
  const { slug } = await params;
  return <DetailPage type="movie" slug={slug} />;
}
