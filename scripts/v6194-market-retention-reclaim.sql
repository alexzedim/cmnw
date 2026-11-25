-- v6.19.4 market: reclaim the table from expired rows (copy live rows, swap)
--
-- Runbook (same format as recreate-market-interval.sql and the v6192/v6193
-- scripts): paste the numbered sections into psql in order.
--
--   ssh cmnw 'docker exec -i postgres psql -U postgres -d cmnw'
--
-- Why:
--   deleteExpiredMarketData removed one 50k batch per hour since the v6.18.0
--   cutover, so the 48h retention was never enforced: market holds ~83.7M rows
--   (22 GB heap + 15 GB indexes) of which ~75M are past the cutoff (oldest
--   valid_to = 2026-10-11). Every full scan pays for them. Deleting 75M rows in
--   batches would dirty the whole heap and all indexes on a disk that already
--   writes 170 GB/day, and still needs a VACUUM FULL afterwards. Copying the
--   live rows reads the heap once (~22 GB), writes a few GB and the table is
--   compact immediately.
--
-- Cost: ~22 GB read once, ~3-6 GB written (heap + indexes + WAL), stack dma
--   (Portainer stack 52) stopped for the duration of phase 1 — minutes.
--
-- Preconditions (STOP if any is false):
--   1) v6.19.3 (or later) is running on ALL three stacks. A v6.19.2 container
--      booting after this swap would synchronize the OLD entities.
--   2) The window is away from hh:00 UTC (gold cron) and 02:00 UTC (nightly
--      analytics read market for ~75 minutes).
--   3) At least 20 GB free on /mnt:   df -h /mnt
--   4) Nothing else writes to market: only stack 52 does (dma-dma-1/2,
--      dma-market-1). Readers (cmnw-api, analytics) are not stopped — they are
--      blocked only for the milliseconds of phase 2.
--
-- Effect on the pipeline: auctions and commodity jobs queue in BullMQ while
--   the stack is down; both workers re-index on boot
--   (onApplicationBootstrap), the gold cron catches up on its next tick or on
--   boot when no gold snapshot exists for the current hour.

-- ---------------------------------------------------------------------------
-- 0) PRE-CHECKS
-- ---------------------------------------------------------------------------

-- Running version of every backend container must be v6.19.3 or later:
--   docker inspect dma-market-1 dma-dma-1 dma-dma-2 cmnw-api core analytics
--     --format '{{.Name}} {{index .Config.Labels "org.opencontainers.image.version"}}'

SELECT pg_size_pretty(pg_relation_size('market')) AS heap,
       pg_size_pretty(pg_indexes_size('market')) AS indexes,
       (SELECT reltuples::bigint FROM pg_class WHERE oid = 'market'::regclass) AS reltuples;

SELECT indexname FROM pg_indexes WHERE tablename = 'market' ORDER BY indexname;
-- Expect: ix__market__live, ix__market__live_recent (from v6.19.3),
--         ix__market__reconstruction, ix__market__ttl, pk__market

-- Retention hours of the market app (MARKET_RETENTION_HOURS, default 48)
--   docker exec dma-market-1 printenv MARKET_RETENTION_HOURS

-- ---------------------------------------------------------------------------
-- 1) FREEZE WRITERS: Portainer -> Stacks -> dma (52) -> Stop
-- ---------------------------------------------------------------------------
-- "Stop" is compose-down: all three containers are removed, the definition
-- stays. BullMQ keeps the pending jobs.
--   docker ps --filter name=dma-   -> must be empty

-- ---------------------------------------------------------------------------
-- 2) PHASE 1 — copy (readers keep working; no locks on market)
-- ---------------------------------------------------------------------------

SET maintenance_work_mem = '256MB';
SET work_mem = '64MB';

CREATE TABLE market_new (LIKE market INCLUDING DEFAULTS INCLUDING CONSTRAINTS)
  WITH (fillfactor = 90);

-- One pass over the heap (22 GB, 1-2 minutes). Rows alive at "now": still
-- listed, or closed inside the retention window.
INSERT INTO market_new
SELECT * FROM market
WHERE valid_to IS NULL OR valid_to >= (extract(epoch FROM now()) * 1000)::bigint - 48 * 3600 * 1000;
-- ^ replace 48 with MARKET_RETENTION_HOURS if it differs

SELECT count(*) AS rows_kept FROM market_new;

ALTER TABLE market_new
  ADD CONSTRAINT pk__market_new PRIMARY KEY (connected_realm_id, order_id, type, valid_from);

CREATE INDEX ix__market__reconstruction_new ON market_new (item_id, connected_realm_id, valid_from);
CREATE INDEX ix__market__ttl_new ON market_new (valid_to) WHERE valid_to IS NOT NULL;
CREATE INDEX ix__market__live_new ON market_new (connected_realm_id) WHERE valid_to IS NULL;
-- Only when ix__market__live_recent exists on market (v6.19.3 DDL applied):
CREATE INDEX ix__market__live_recent_new ON market_new (valid_from) WHERE valid_to IS NULL;

ANALYZE market_new;

-- The new table must not contain expired rows
SELECT count(*) AS must_be_zero FROM market_new
WHERE valid_to IS NOT NULL AND valid_to < (extract(epoch FROM now()) * 1000)::bigint - 48 * 3600 * 1000;

-- ---------------------------------------------------------------------------
-- 3) PHASE 2 — swap (one transaction, ACCESS EXCLUSIVE for milliseconds)
-- ---------------------------------------------------------------------------

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE market RENAME TO market_legacy;
ALTER TABLE market_legacy RENAME CONSTRAINT pk__market TO pk__market_legacy;
ALTER INDEX ix__market__reconstruction RENAME TO ix__market__reconstruction_legacy;
ALTER INDEX ix__market__ttl RENAME TO ix__market__ttl_legacy;
ALTER INDEX ix__market__live RENAME TO ix__market__live_legacy;
-- Only when it exists:
ALTER INDEX ix__market__live_recent RENAME TO ix__market__live_recent_legacy;

ALTER TABLE market_new RENAME TO market;
ALTER TABLE market RENAME CONSTRAINT pk__market_new TO pk__market;
ALTER INDEX ix__market__reconstruction_new RENAME TO ix__market__reconstruction;
ALTER INDEX ix__market__ttl_new RENAME TO ix__market__ttl;
ALTER INDEX ix__market__live_new RENAME TO ix__market__live;
-- Only when it was created in phase 1:
ALTER INDEX ix__market__live_recent_new RENAME TO ix__market__live_recent;

COMMIT;

-- If phase 2 fails on lock_timeout (a reader held the table): nothing changed,
--   the transaction is rolled back. Retry it; if it keeps failing, run
--   section 6) ROLLBACK and start the stack.

-- ---------------------------------------------------------------------------
-- 4) PHASE 3 — restart writers and verify
-- ---------------------------------------------------------------------------

-- Portainer -> Stacks -> dma (52) -> Start. It boots the image tagged
--   ghcr.io/alexzedim/dma:latest on the host.

-- Index names must be exactly what the entities declare (synchronize drops
-- unknown ones); the boot log must not report any DDL.
SELECT indexname FROM pg_indexes WHERE tablename = 'market' ORDER BY indexname;
SELECT indexname FROM pg_indexes WHERE tablename = 'market_legacy' ORDER BY indexname;

SELECT pg_size_pretty(pg_relation_size('market')) AS heap,
       (SELECT reltuples::bigint FROM pg_class WHERE oid = 'market'::regclass) AS reltuples;

-- Pipeline is producing again (values move within 10 minutes)
SELECT to_char(to_timestamp(max(auctions_timestamp) / 1000.0) AT TIME ZONE 'UTC', 'HH24:MI:SS') AS auctions,
       to_char(to_timestamp(max(commodities_timestamp) / 1000.0) AT TIME ZONE 'UTC', 'HH24:MI:SS') AS commodities
FROM realms;

-- ---------------------------------------------------------------------------
-- 5) CLEANUP — only after the stack ran cleanly for at least one hour
-- ---------------------------------------------------------------------------

DROP TABLE market_legacy;
-- Frees ~37 GB immediately. Redis cursor of the TTL job needs no reset: kept
-- rows have valid_to above it (or NULL).

-- ---------------------------------------------------------------------------
-- 6) ROLLBACK (before section 5; stack dma must still be stopped)
-- ---------------------------------------------------------------------------

BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE market RENAME TO market_new;
ALTER TABLE market_new RENAME CONSTRAINT pk__market TO pk__market_new;
ALTER INDEX ix__market__reconstruction RENAME TO ix__market__reconstruction_new;
ALTER INDEX ix__market__ttl RENAME TO ix__market__ttl_new;
ALTER INDEX ix__market__live RENAME TO ix__market__live_new;
-- Only when it was swapped:
ALTER INDEX ix__market__live_recent RENAME TO ix__market__live_recent_new;
ALTER TABLE market_legacy RENAME TO market;
ALTER TABLE market RENAME CONSTRAINT pk__market_legacy TO pk__market;
ALTER INDEX ix__market__reconstruction_legacy RENAME TO ix__market__reconstruction;
ALTER INDEX ix__market__ttl_legacy RENAME TO ix__market__ttl;
ALTER INDEX ix__market__live_legacy RENAME TO ix__market__live;
-- Only when it was swapped:
ALTER INDEX ix__market__live_recent_legacy RENAME TO ix__market__live_recent;
COMMIT;
DROP TABLE market_new;
-- Writes are lost only if the stack was already started after the swap.
