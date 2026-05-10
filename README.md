<div align="center">

# Watchwhere

**Where to watch movies, TV, and anime in India — without opening every app.**

[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Postgres](https://img.shields.io/badge/Postgres-FTS%20%2B%20pg__trgm-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)](#)

Search a title — even with typos like *"morio movie"* or *"atack on titen"* — see which Indian OTT platform carries it, and click straight through to the watch page.

</div>

---

## Contents

- [Why](#why)
- [Quick start](#quick-start)
- [Environment](#environment)
- [What runs without which credential](#what-runs-without-which-credential)
- [How it works](#how-it-works)
- [Project layout](#project-layout)
- [Scripts](#scripts)
- [Acceptance checks](#acceptance-checks)
- [Deployment](#deployment)
- [Attribution](#attribution)

## Why

OTT discovery in India is fragmented across Netflix, Prime, JioHotstar, JioCinema, SonyLIV, Zee5, Apple TV+, MUBI, Crunchyroll, and Lionsgate Play. Watchwhere collapses the lookup into a single search box with typo tolerance, deep links to the canonical India URL per platform, and a clean "not on any OTT" state when nothing carries the title.

## Quick start

You need **Node 20+** and a Postgres database (free Neon project works perfectly). Two free credentials, that's it.

```bash
# 1. install
npm install

# 2. get a TMDB v4 read token (free, instant)
#    https://www.themoviedb.org/settings/api
# 3. create a free Neon Postgres project
#    https://console.neon.tech  -> copy the connection string

# 4. set up env
cp .env.example .env
# open .env and fill:
#   TMDB_READ_TOKEN=...          (or TMDB_API_KEY=... for v3)
#   DATABASE_URL=postgresql://...?sslmode=require

# 5. push the schema and seed (~10K titles, takes a few minutes)
npm run db:push
npm run seed

# 6. run
npm run dev
```

Open http://localhost:3000. Try `morio movie`, `atack on titen`, `oppenheimer`.

> **Want more titles?** `SEED_PAGES_PER_TYPE=500 npm run seed` indexes the full TMDB Discover hard cap (~20K titles).

## Environment

All vars live in `.env` (copy from `.env.example`).

| Variable | Required | Purpose |
| --- | --- | --- |
| `TMDB_READ_TOKEN` | yes | TMDB v4 Bearer token. Detail pages, posters, watch/providers (India). |
| `TMDB_API_KEY` | optional | v3 fallback if you have a v3 key instead. |
| `DATABASE_URL` | yes | Postgres connection string (Neon free tier works). Stores titles index, feedback, provider overrides. Must support the `pg_trgm` extension — Neon does. |
| `RAPIDAPI_KEY` | optional | [Streaming Availability](https://rapidapi.com/movieofthenight-com-movieofthenight-default/api/streaming-availability) for richer per-platform deep links. App falls back to TMDB + JustWatch links if missing. |
| `STREAMING_AVAILABILITY_HOST` | optional | Defaults to `streaming-availability.p.rapidapi.com`. |
| `UPSTASH_REDIS_REST_URL` | optional | Upstash REST URL. App uses an in-memory cache when absent. |
| `UPSTASH_REDIS_REST_TOKEN` | optional | Upstash REST token. |
| `INNGEST_EVENT_KEY` | optional | Required only when running Inngest crons (refresh-trending, refresh-deltas, build-sitemap). |
| `INNGEST_SIGNING_KEY` | optional | Same. |
| `BLOB_READ_WRITE_TOKEN` | optional | Vercel Blob for chunked sitemap uploads. Falls back to writing under `public/sitemaps/`. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Used in JSON-LD, OG, sitemap. Defaults to `http://localhost:3000`. |
| `SEED_PAGES_PER_TYPE` | optional | Seed cap. Defaults to 250 pages × 2 media types × 20 = ~10K titles. Max 500 (TMDB Discover hard cap). |

## What runs without which credential

The app is built so missing optional services degrade cleanly instead of crashing.

| Surface | TMDB | Postgres | RapidAPI | Upstash |
| --- | --- | --- | --- | --- |
| Search box | — | **required** | — | — |
| Trending rail / browse | **required** | — | — | — |
| Detail page metadata | **required** | — | — | — |
| Per-provider deep links | (JustWatch fallback) | — | preferred | — |
| Feedback form | — | persists | — | — |
| Stale-while-revalidate cache | — | — | — | warm cache |
| Inngest crons | **required** | **required** | optional | recommended |

## How it works

1. **Index** — `scripts/seed-titles.ts` pulls the top popular titles for India from TMDB Discover (configurable via `SEED_PAGES_PER_TYPE`, default 250 pages × 2 = ~10K titles, max 500 = ~20K) plus two curated entries (Super Mario, Attack on Titan), normalises into a flat `TitleDoc`, and bulk-upserts into Postgres in 200-row batches.
2. **Search** — Node route `/api/search` validates with Zod, caches at 60s in Redis (in-memory fallback), and runs a hybrid Postgres query: `tsvector` full-text match on `title + alt_titles + overview` (`websearch_to_tsquery`, `english` config) **OR** `pg_trgm` similarity ≥ 0.18 on title or alt-titles for typo tolerance. Ranking blends `ts_rank_cd` and trigram similarity, tie-broken by popularity. On zero hits it runs a relaxed trigram-only pass and returns a `didYouMean` suggestion.
3. **Detail** — `/movie/[slug]`, `/tv/[slug]`, `/anime/[slug]` (SSR + 6h ISR). Slug format `{tmdb_id}-{kebab-title}`. The route fans out to TMDB (with `append_to_response=watch/providers,external_ids,images,credits,videos,recommendations`), Streaming Availability, and AniList in parallel via `Promise.allSettled`, merges into a single `TitleDetail` DTO, and renders Hero / ProviderList / CastStrip / Trailer / Seasons / Recommendations.
4. **Providers** — `lib/providers.ts` prefers Streaming Availability links (real per-platform India URLs) and falls back to JustWatch search URLs for any TMDB-listed provider missing a real link, tagging them `viaJustWatch`.
5. **Crons** — Inngest runs `refresh-trending` every 6h, `refresh-deltas` nightly at 02:00 IST, and `build-sitemap` nightly at 03:00 IST.
6. **SEO** — JSON-LD `Movie`/`TVSeries` + `WatchAction` per provider with `EntryPoint`/`actionPlatform` for "Where to watch" rich results, plus `BreadcrumbList`. Sitemap includes top 1,000 titles by popularity (full chunked output is the cron's job).

## Project layout

```
app/                         App Router pages + route handlers
  api/search/route.ts        Edge search (Meili + Redis SWR)
  api/title/[type]/[id]      TMDB+Streaming+AniList merge
  api/feedback/route.ts      Rate-limited feedback insert
  api/inngest/route.ts       Inngest function endpoint
  movie/[slug]/page.tsx      SSR + ISR detail
  tv/[slug]/page.tsx
  anime/[slug]/page.tsx
  search/page.tsx            SSR results grid + filters
  browse/page.tsx            Curated rails
  about/page.tsx             Attribution + feedback
  sitemap.ts, robots.ts
components/
  ui/                        Button, Input, Modal, Sheet, … + SearchBar
  title/                     PosterCard, Hero, ProviderList, CastStrip, …
lib/
  tmdb.ts streaming.ts anilist.ts meili.ts redis.ts providers.ts
  title-detail.ts seo.ts slug.ts types.ts
db/                          Drizzle schema + lazy client
inngest/functions/           refresh-trending, refresh-deltas, build-sitemap
scripts/seed-titles.ts       Idempotent seeder (TMDB -> Postgres)
db/setup.sql                 Search extensions + indexes (pg_trgm, tsvector)
data/provider-overrides.json Per-title link overrides
public/logos/                Provider monogram SVGs (placeholder marks)
public/attribution/          TMDB + JustWatch logos
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server. |
| `npm run build` | Production build. |
| `npm run start` | Production server (post-`build`). |
| `npm run lint` | ESLint with Next + TS rules. |
| `npm run typecheck` | `tsc --noEmit`, strict mode. |
| `npm run db:push` | Push the Drizzle schema to Postgres (creates `titles`, `feedback`, `provider_overrides`). |
| `npm run db:generate` | Generate a new migration from schema changes. |
| `npm run seed` | Apply `db/setup.sql` (extensions, tsvector, indexes) then index titles from TMDB. |

## Acceptance checks

Once env + Meili are live and seed has finished:

- [ ] `GET /api/search?q=morio%20movie` → top hit is **The Super Mario Bros. Movie**.
- [ ] `GET /api/search?q=atack%20on%20titen` → top hit is **Attack on Titan**.
- [ ] `/movie/872585-oppenheimer` lists at least one Indian OTT with a working deep link.
- [ ] A title not available in India (e.g. an obscure test ID) renders the `UnavailableBanner` cleanly.
- [ ] `/sitemap.xml` returns 200 and contains indexed titles.
- [ ] Lighthouse on a detail page: Performance ≥ 90, SEO 100, Accessibility ≥ 95.
- [ ] About page shows the verbatim TMDB + JustWatch + AniList attribution lines.
- [ ] 375 px viewport: every page is usable end-to-end.

## Deployment

The cleanest target is Vercel:

1. Create the project and push this repo.
2. Set every env var listed above. Use Meili Cloud for `MEILI_HOST`, Upstash for Redis, Neon for Postgres, Inngest Cloud for `INNGEST_*`, and Vercel Blob for chunked sitemap output.
3. Add a one-shot deploy hook that runs `npm run seed:meili` against the production Meili instance, or trigger the `refresh-trending` Inngest function once.
4. Point your domain to the deployment and update `NEXT_PUBLIC_SITE_URL`.

Other hosts (Cloudflare, Fly, self-hosted) work too — the search route is Edge-runtime, everything else is standard Node.

## Attribution

> "This product uses the TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB."
>
> "Streaming availability data powered by JustWatch."
>
> "Anime metadata via AniList."

Provider logos shipped here are clean monogram placeholders (`data/provider-overrides.json` notes this); replace with licensed vector marks before any public launch.

---

<sub>Built with Claude Code and Codex.</sub>
