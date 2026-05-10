const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbImage(path: string | null | undefined, size: "w92" | "w185" | "w342" | "w500" | "w780" | "original") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
