export type TitleType = "movie" | "tv" | "anime";

export type WatchProviderId =
  | "netflix"
  | "prime"
  | "jiohotstar"
  | "jiocinema"
  | "sonyliv"
  | "zee5"
  | "apple"
  | "mubi"
  | "crunchyroll"
  | "lionsgate"
  | string;

export type ProviderKind = "subscription" | "rent" | "buy" | "free" | "ads" | "addon";

export type Provider = {
  id: WatchProviderId;
  name: string;
  type: ProviderKind;
  link: string;
  videoLink?: string;
  quality?: "sd" | "hd" | "qhd" | "uhd";
  expiresOn?: string;
  logoSrc: string;
  viaJustWatch?: boolean;
};

export type TitleDoc = {
  id: string;
  tmdb_id: number;
  type: TitleType;
  title: string;
  alt_titles: string[];
  year: number | null;
  overview: string;
  poster_w342: string | null;
  popularity: number;
  providers_in: string[];
  genres: string[];
  is_anime: boolean;
  anilist_id: number | null;
};

export type SearchHit = Pick<
  TitleDoc,
  "id" | "tmdb_id" | "type" | "title" | "year" | "poster_w342" | "providers_in"
> & {
  _formatted?: {
    title?: string;
  };
};

export type SearchResponse = {
  hits: SearchHit[];
  totalHits: number;
  processingTimeMs: number;
  didYouMean?: SearchHit | null;
};

export type NormalizedTitleResult = {
  tmdb_id: number;
  type: TitleType;
  title: string;
  original_title?: string;
  year: number | null;
  overview: string;
  poster_w342: string | null;
  backdrop_path: string | null;
  popularity: number;
  genres: string[];
  providers_in: string[];
  is_anime: boolean;
};

export type TmdbWatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

export type TmdbIndiaProviders = {
  link?: string;
  flatrate?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
};
