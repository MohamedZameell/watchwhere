import overrides from "@/data/provider-overrides.json";
import type { Provider, TmdbIndiaProviders, TmdbWatchProvider } from "@/lib/types";

export type ProviderCatalogItem = {
  name: string;
  color: string;
  logoSrc: string;
  fallbackUrlTemplate: string;
  tmdbNames: string[];
};

export const providerCatalog: Record<string, ProviderCatalogItem> = {
  netflix: {
    name: "Netflix",
    color: "#e50914",
    logoSrc: "/logos/netflix.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["netflix"],
  },
  prime: {
    name: "Prime Video",
    color: "#00a8e1",
    logoSrc: "/logos/prime.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["amazon", "prime"],
  },
  jiohotstar: {
    name: "JioHotstar",
    color: "#0f6bff",
    logoSrc: "/logos/jiohotstar.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["hotstar", "disney"],
  },
  jiocinema: {
    name: "JioCinema",
    color: "#d9008d",
    logoSrc: "/logos/jiocinema.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["jio cinema", "jiocinema"],
  },
  sonyliv: {
    name: "SonyLIV",
    color: "#f2b705",
    logoSrc: "/logos/sonyliv.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["sony"],
  },
  zee5: {
    name: "Zee5",
    color: "#6d2bff",
    logoSrc: "/logos/zee5.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["zee"],
  },
  apple: {
    name: "Apple TV+",
    color: "#f5f5f7",
    logoSrc: "/logos/apple.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["apple"],
  },
  mubi: {
    name: "MUBI",
    color: "#001eff",
    logoSrc: "/logos/mubi.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["mubi"],
  },
  crunchyroll: {
    name: "Crunchyroll",
    color: "#f47521",
    logoSrc: "/logos/crunchyroll.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["crunchyroll"],
  },
  lionsgate: {
    name: "Lionsgate Play",
    color: "#111827",
    logoSrc: "/logos/lionsgate.svg",
    fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
    tmdbNames: ["lionsgate"],
  },
};

type OverrideFile = {
  [key: string]: unknown;
  links?: Record<string, string>;
};

const overrideData = overrides as OverrideFile;

export function providerIdFromName(name: string) {
  const normalized = name.toLowerCase();
  const match = Object.entries(providerCatalog).find(([, item]) =>
    item.tmdbNames.some((candidate) => normalized.includes(candidate)),
  );
  return match?.[0] || normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function providerMeta(id: string, fallbackName?: string) {
  return (
    providerCatalog[id] || {
      name: fallbackName || id,
      color: "#1c1c22",
      logoSrc: `/logos/${id}.svg`,
      fallbackUrlTemplate: "https://www.justwatch.com/in/search?q={title}",
      tmdbNames: [id],
    }
  );
}

function fallbackUrl(providerId: string, title = "") {
  const template = providerMeta(providerId).fallbackUrlTemplate;
  return template.replace("{title}", encodeURIComponent(title));
}

function tmdbGroupToProviders(
  providers: TmdbWatchProvider[] | undefined,
  type: Provider["type"],
  justWatchLink: string | undefined,
  title?: string,
) {
  return (providers || []).map((provider) => {
    const id = providerIdFromName(provider.provider_name);
    const meta = providerMeta(id, provider.provider_name);
    const overrideKey = `${id}:${title || ""}`;
    const overrideUrl = overrideData.links?.[overrideKey] || overrideData.links?.[id];
    return {
      id,
      name: meta.name,
      type,
      link: overrideUrl || justWatchLink || fallbackUrl(id, title),
      logoSrc: meta.logoSrc,
      viaJustWatch: true,
    } satisfies Provider;
  });
}

export function tmdbProvidersToFlat(tmdbProviders: TmdbIndiaProviders | null | undefined, title?: string) {
  if (!tmdbProviders) return [];
  return [
    ...tmdbGroupToProviders(tmdbProviders.flatrate, "subscription", tmdbProviders.link, title),
    ...tmdbGroupToProviders(tmdbProviders.rent, "rent", tmdbProviders.link, title),
    ...tmdbGroupToProviders(tmdbProviders.buy, "buy", tmdbProviders.link, title),
    ...tmdbGroupToProviders(tmdbProviders.free, "free", tmdbProviders.link, title),
    ...tmdbGroupToProviders(tmdbProviders.ads, "ads", tmdbProviders.link, title),
  ];
}

export function mergeProviders(
  tmdbProviders: TmdbIndiaProviders | null | undefined,
  streamingProviders: Provider[],
  title?: string,
) {
  const merged = new Map<string, Provider>();
  for (const provider of streamingProviders) {
    merged.set(`${provider.id}:${provider.type}`, provider);
  }
  for (const provider of tmdbProvidersToFlat(tmdbProviders, title)) {
    const key = `${provider.id}:${provider.type}`;
    if (!merged.has(key)) merged.set(key, provider);
  }
  return Array.from(merged.values());
}

export function groupProviders(providers: Provider[]) {
  return {
    subscription: providers.filter((provider) => provider.type === "subscription" || provider.type === "addon"),
    rent: providers.filter((provider) => provider.type === "rent"),
    buy: providers.filter((provider) => provider.type === "buy"),
    free: providers.filter((provider) => provider.type === "free"),
    ads: providers.filter((provider) => provider.type === "ads"),
  };
}
