-- Idempotent search setup. Re-running is safe.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop earlier failed-attempt artifacts.
ALTER TABLE titles DROP COLUMN IF EXISTS search_vector;
DROP INDEX IF EXISTS titles_fts_idx;
DROP INDEX IF EXISTS titles_alt_trgm_idx;

-- Functional GIN index on a single denormalized text column. search_text is
-- populated at insert time with title + alt_titles + overview joined by spaces.
-- to_tsvector(regconfig, text) is strictly IMMUTABLE — Neon accepts this form.
CREATE INDEX IF NOT EXISTS titles_search_text_fts_idx ON titles
  USING gin(to_tsvector('english', search_text));

-- Trigram similarity for typo tolerance.
CREATE INDEX IF NOT EXISTS titles_title_trgm_idx       ON titles USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS titles_search_text_trgm_idx ON titles USING gin(search_text gin_trgm_ops);
