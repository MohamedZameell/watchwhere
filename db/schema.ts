import { integer, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

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
