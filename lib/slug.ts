export function toSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function parseSlug(slug: string) {
  const match = slug.match(/^(\d+)(?:-|$)/);
  if (!match) {
    return { id: null, slug };
  }
  return { id: Number(match[1]), slug };
}

export function titleHref(type: "movie" | "tv" | "anime", tmdbId: number, title: string) {
  return `/${type}/${tmdbId}-${toSlug(title)}`;
}
