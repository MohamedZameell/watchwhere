import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const titles = pgTable(
  "titles",
  {
    id: text("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    type: varchar("type", { length: 8 }).notNull(),
    title: text("title").notNull(),
    altTitles: text("alt_titles").array().notNull().default(sql`'{}'::text[]`),
    year: integer("year"),
    overview: text("overview").notNull().default(""),
    posterW342: text("poster_w342"),
    popularity: doublePrecision("popularity").notNull().default(0),
    providersIn: text("providers_in").array().notNull().default(sql`'{}'::text[]`),
    genres: text("genres").array().notNull().default(sql`'{}'::text[]`),
    isAnime: boolean("is_anime").notNull().default(false),
    anilistId: integer("anilist_id"),
    searchText: text("search_text").notNull().default(""),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("titles_tmdb_type_idx").on(t.tmdbId, t.type),
    index("titles_popularity_idx").on(t.popularity),
    index("titles_type_idx").on(t.type),
  ],
);

export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  tmdbId: integer("tmdb_id").notNull(),
  type: varchar("type", { length: 8 }).notNull(),
  providerId: varchar("provider_id", { length: 32 }),
  issue: varchar("issue", { length: 24 }).notNull(),
  note: text("note"),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providerOverrides = pgTable(
  "provider_overrides",
  {
    tmdbId: integer("tmdb_id").notNull(),
    type: varchar("type", { length: 8 }).notNull(),
    providerId: varchar("provider_id", { length: 32 }).notNull(),
    overrideUrl: text("override_url").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.tmdbId, t.type, t.providerId] }) }),
);
