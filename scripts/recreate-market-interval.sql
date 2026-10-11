-- Recreate `market` as an interval (delta) table.
--
-- The old schema stored one row per order per snapshot (dense snapshots):
-- ~70M inserts + ~70M deletes per day, 47 GB / 88M live rows, one giant
-- DELETE every 12h, autovacuum storms — the SSD killer.
--
-- The new schema stores one row per order VERSION with a validity interval:
--   alive at realm R's snapshot T  <=>  valid_from <= T AND (valid_to IS NULL OR valid_to > T)
-- Unchanged orders cost zero writes per snapshot; time_left is a mutable
-- non-versioned column updated in place (HOT).
--
-- The old table is DROPPED (approved destructive cutover). Chart/analytics
-- history rebuilds over the retention window (48h of ingestion).
--
-- Companion table `market_snapshots` records the per-realm snapshot timeline
-- (connected_realm_id, timestamp, source) — the source of chart X-axes.
--
-- Run order: section 1 (pre-checks) -> section 2 (transaction) -> section 3 (verification).
-- Section 2 is NOT idempotent (DROP TABLE): run exactly once, inside the
-- cutover window (dma + market apps stopped, DDL, deploy all apps, start).

-- =============================================================================
-- 1. PRE-CHECKS (read-only)
-- =============================================================================

-- 1.1 Confirm the OLD dense schema is still in place (has `timestamp` column).
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'market'
ORDER BY ordinal_position;

-- 1.2 Old table size / row count (baseline for the acceptance comparison).
SELECT reltuples::bigint AS approx_rows, pg_size_pretty(pg_total_relation_size('market')) AS total_size
FROM pg_class
WHERE relname = 'market';

-- 1.3 Make sure the new tables do not exist yet.
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('market', 'market_snapshots');

-- =============================================================================
-- 2. TRANSACTION (run ONCE inside the cutover window)
-- =============================================================================

BEGIN;

DROP TABLE market;

CREATE TABLE market (
  connected_realm_id integer     NOT NULL,
  order_id           varchar     NOT NULL,
  type               varchar     NOT NULL,
  valid_from         bigint      NOT NULL,
  valid_to           bigint      NULL,
  attr_hash          integer     NOT NULL,
  item_id            integer     NOT NULL,
  price              real        NOT NULL,
  bid                real        NULL,
  context            integer     NULL,
  bonus_list         integer[]   NULL,
  modifiers          jsonb       NULL,
  pet_list           jsonb       NULL,
  quantity           integer     NULL DEFAULT 1,
  value              real        NULL,
  time_left          varchar     NULL,
  faction            varchar     NULL,
  counterparty       varchar     NULL,
  is_online          boolean     NULL,
  -- fillfactor leaves page headroom so time_left updates stay HOT
  -- (no indexed column changes -> no index churn)
  CONSTRAINT pk__market PRIMARY KEY (connected_realm_id, order_id, type, valid_from)
) WITH (fillfactor = 90);

-- Snapshot reconstruction for charts/contracts/percentiles:
--   WHERE item_id = ? AND connected_realm_id = ? AND valid_from <= T
--         AND (valid_to IS NULL OR valid_to > T)
CREATE INDEX ix__market__reconstruction
  ON market (item_id, connected_realm_id, valid_from);

-- TTL batched deletes scan this
CREATE INDEX ix__market__ttl
  ON market (valid_to)
  WHERE valid_to IS NOT NULL;

-- Per-cycle diff: index-only scan of a realm's live rows for change
-- detection (order_id, type, attr_hash are version-immutable).
-- time_left is deliberately NOT included: INCLUDE columns join the index
-- attr bitmap and would disable HOT updates for time_left flips. The diff
-- reads time_left from the heap — a read, not a write.
CREATE INDEX ix__market__live
  ON market (connected_realm_id)
  INCLUDE (order_id, type, attr_hash)
  WHERE valid_to IS NULL;

CREATE TABLE market_snapshots (
  connected_realm_id integer NOT NULL,
  timestamp          bigint  NOT NULL,
  source             varchar NOT NULL,
  CONSTRAINT pk__market_snapshots PRIMARY KEY (connected_realm_id, timestamp)
);

CREATE INDEX ix__market_snapshots__source
  ON market_snapshots (source);

COMMIT;

-- =============================================================================
-- 3. VERIFICATION (read-only)
-- =============================================================================

-- 3.1 New structure: interval columns present, old ones gone.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'market'
ORDER BY ordinal_position;

-- 3.2 Indexes: composite PK + 3 indexes incl. partial covering live index.
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('market', 'market_snapshots')
ORDER BY tablename, indexname;

-- 3.3 Fillfactor applied.
SELECT reloptions FROM pg_class WHERE relname = 'market';
