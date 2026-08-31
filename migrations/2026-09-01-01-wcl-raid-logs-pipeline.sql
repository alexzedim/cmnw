-- Migration: 2026-09-01-01 warcraft-logs pipeline status machine
--
-- Problem:
--   characters_raid_logs has no processing status: is_indexed was set to true
--   even when the roster fetch failed (transport was Cloudflare-challenged for
--   Node TLS since ~2026-06; discovery has produced nothing since 2026-06-01),
--   silently burning logs as "done". log_id has 12,279 duplicate groups and no
--   unique constraint, so concurrent discovery paths could double-insert.
--
-- What this does:
--   Dedups log_id (keeps the newest created row per group), replaces the plain
--   log_id index with a unique one (the new discovery path relies on
--   ON CONFLICT DO NOTHING), and adds the pipeline columns:
--     status       discovered -> downloaded -> parsed | not_found | failed
--     source       payload origin: fights (browser) | graphql (safe-switch)
--     payload      raw report payload (jsonb, lz4), downloaded exactly once
--     attempts     retry budget for failed downloads
--     last_error / last_error_at
--     started_at   report start time
--   Existing rows are backfilled as 'parsed' (legacy harvested rows, no payload).
--
-- Notes:
--   ~337k rows, ~12k duplicate deletes. Run off-peak with workers stopped.
--   jsonb COMPRESSION lz4 requires PostgreSQL 14+.
--
--   psql "$DATABASE_URL" -f migrations/2026-09-01-01-wcl-raid-logs-pipeline.sql

BEGIN;

DELETE FROM characters_raid_logs a
USING characters_raid_logs b
WHERE a.log_id = b.log_id
  AND (a.created_at, a.uuid) < (b.created_at, b.uuid);

DROP INDEX IF EXISTS ix__characters_raid__log_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq__characters_raid__log_id
  ON characters_raid_logs (log_id);

ALTER TABLE characters_raid_logs
  ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'parsed',
  ADD COLUMN IF NOT EXISTS source varchar(16) NULL,
  ADD COLUMN IF NOT EXISTS payload jsonb NULL COMPRESSION lz4,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS ix__characters_raid__status
  ON characters_raid_logs (status);

COMMIT;
