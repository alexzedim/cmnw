-- v6.19.3 contracts: item-leading index + quantity int -> bigint
--
-- Runbook (same format as v6192-professions-unique-index-reapply.sql):
-- paste the numbered sections into psql in order.
--
--   ssh cmnw 'docker exec -i postgres psql -U postgres -d cmnw'
--
-- Why:
--   1) getContracts (apps/api dma.service) reads EVERY contract of an item and
--      filters in JS: contracts has ~38M rows and no index leads with item_id,
--      so each uncached request is a full seq scan (~5.6 GB).
--   2) The gold contract build sums quantity over all realms (~4.4e9) which
--      overflows the int4 column -> PG 22003 (~48 log lines/day) and ZERO
--      gold (item_id = 1) rows in contracts.
--
-- Ordering constraint (synchronize is ON):
--   Run BOTH statements immediately before the Portainer "Pull and redeploy"
--   of stack 56. A v6.19.2 container booting after these DDLs would
--   synchronize the OLD entity (int, no index) and try to revert them.
--   CREATE INDEX CONCURRENTLY must run as a single -c statement (no
--   transaction block).

-- ---------------------------------------------------------------------------
-- 0) PRE-CHECKS (STOP if anything unexpected)
-- ---------------------------------------------------------------------------

-- Current state: expect data_type = integer, ~38.3M rows
SELECT data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts' AND column_name = 'quantity';

-- Existing indexes (expect only timestamp-leading ones + pk)
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'contracts';

-- ---------------------------------------------------------------------------
-- 1) ITEM-LEADING INDEX (CONCURRENTLY — run as ONE statement)
-- ---------------------------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix__contract__item_timestamp
  ON contracts (item_id, timestamp);

-- Must show indisvalid = t, indisready = t
SELECT indexrelid::regclass AS index, indisvalid, indisready
FROM pg_index
WHERE indexrelid = 'ix__contract__item_timestamp'::regclass;

-- Plan check: must show ix__contract__item_timestamp, not Seq Scan
EXPLAIN (COSTS OFF)
SELECT * FROM contracts WHERE item_id = 1 ORDER BY timestamp DESC;

-- ---------------------------------------------------------------------------
-- 2) QUANTITY INT -> BIGINT (quiet window, e.g. 04:00 UTC — never at
--    10:00/18:00 contract builds; ACCESS EXCLUSIVE lock, rewrites the table
--    and all indexes; contract reads block for the duration, ~minutes)
-- ---------------------------------------------------------------------------

ALTER TABLE contracts ALTER COLUMN quantity TYPE bigint;

-- Expect data_type = bigint
SELECT data_type FROM information_schema.columns
WHERE table_name = 'contracts' AND column_name = 'quantity';

-- ---------------------------------------------------------------------------
-- 3) POST-DEPLOY VERIFICATION (after v6.19.3 is live)
-- ---------------------------------------------------------------------------

-- Gold contracts must start appearing (was 0 rows)
SELECT count(*) FROM contracts WHERE item_id = 1;

-- No new 22003 ("integer out of range") in the Postgres log
-- docker logs postgres 2>&1 | grep 22003

-- getContracts uses the new index (api query log / EXPLAIN below)
EXPLAIN (COSTS OFF)
SELECT * FROM contracts
WHERE item_id = 6948 AND timestamp >= 1764451200000 AND timestamp <= 1764537600000
ORDER BY timestamp DESC LIMIT 1000;

-- ---------------------------------------------------------------------------
-- ROLLBACK (only if v6.19.3 must be reverted to v6.19.2)
-- ---------------------------------------------------------------------------
-- The v6.19.2 entity declares quantity as int and does NOT know the index;
-- its synchronize would (a) DROP ix__contract__item_timestamp and (b) try
-- ALTER quantity back to integer, which FAILS (boot loop) while values
-- > 2147483647 exist. Sequence:
--   1) DELETE FROM contracts WHERE item_id = 1;  -- drop gold contracts
--   2) ALTER TABLE contracts ALTER COLUMN quantity TYPE integer;
--   3) docker tag ghcr.io/alexzedim/core:v6.19.2 ghcr.io/alexzedim/core:latest
--      and redeploy stack 56 with re-pull OFF.
-- The index may also be dropped manually first (DROP INDEX CONCURRENTLY
-- ix__contract__item_timestamp) or left for v6.19.2 synchronize to remove.
