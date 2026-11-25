-- v6.19.3 market: partial index for the home backdrop tail
--
-- Runbook (same format as v6192-professions-unique-index-reapply.sql):
-- paste the numbered sections into psql in order.
--
--   ssh cmnw 'docker exec -i postgres psql -U postgres -d cmnw'
--
-- Why: GET /api/app/backdrop/flows orders market by valid_from DESC — a full
-- parallel seq scan of the 22 GB heap per uncached request (Redis cache with
-- a 300s TTL ships in the same release; this index makes the miss itself
-- cheap). The query is scoped to live orders (valid_to IS NULL), so the
-- partial index covers it with ~2.3M entries instead of all ~92M rows.
--
-- Ordering constraint (synchronize is ON): run BEFORE the v6.19.3 redeploy,
-- immediately prior to it — a v6.19.2 boot after creation would synchronize
-- the OLD entity (no such index) and drop it. CREATE INDEX CONCURRENTLY must
-- run as a single -c statement (no transaction block).

-- ---------------------------------------------------------------------------
-- 0) PRE-CHECKS
-- ---------------------------------------------------------------------------

-- Expect only the four existing market indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'market' ORDER BY indexname;

-- ---------------------------------------------------------------------------
-- 1) INDEX SWAP-IN (CONCURRENTLY — run as ONE statement)
-- ---------------------------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix__market__live_recent
  ON market (valid_from) WHERE valid_to IS NULL;

-- Must show indisvalid = t, indisready = t
SELECT indexrelid::regclass AS index, indisvalid, indisready
FROM pg_index
WHERE indexrelid = 'ix__market__live_recent'::regclass;

-- Size sanity: expect roughly the size of ix__market__live (~260 MB)
SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE relname = 'market' AND indexrelname = 'ix__market__live_recent';

-- Plan check: must show ix__market__live_recent (backward scan), no Seq Scan
EXPLAIN (COSTS OFF)
SELECT m.order_id, m.item_id, m.quantity, i.name
FROM market m
LEFT JOIN items i ON i.id = m.item_id
WHERE m.valid_to IS NULL
ORDER BY m.valid_from DESC
LIMIT 10;

-- ANALYZE so the planner picks the new index immediately
ANALYZE market;

-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- DROP INDEX CONCURRENTLY ix__market__live_recent;
-- (or leave it: a v6.19.2 boot drops it via synchronize on its own)
