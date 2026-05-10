import type { Provider, TitleDetail } from "@/lib/types";
import { getSiteUrl } from "@/lib/utils";

function watchActions(providers: Provider[]) {
  return providers.map((provider) => ({
    "@type": "WatchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: provider.link,
      actionPlatform: [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform",
        "http://schema.org/AndroidPlatform",
        "http://schema.org/IOSPlatform",
      ],
    },
    expectsAcceptanceOf: {
      "@type": "Offer",
      category: provider.type,
      seller: {
        "@type": "Organization",
        name: provider.name,
      },
    },
  }));
}

export function movieJsonLd(movie: TitleDetail, providers: Provider[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    datePublished: movie.year ? `${movie.year}` : undefined,
    description: movie.overview,
    potentialAction: watchActions(providers),
  };
}

export function tvJsonLd(tv: TitleDetail, providers: Provider[]) {
  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: tv.title,
    datePublished: tv.year ? `${tv.year}` : undefined,
    description: tv.overview,
    potentialAction: watchActions(providers),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${getSiteUrl()}${item.path}`,
    })),
  };
}
