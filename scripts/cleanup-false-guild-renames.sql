-- Cleanup: false guild rename events (Bug: getLogStatusForNewGuild matched an arbitrary
-- same-realm guild when the creating message carried no Blizzard guild id; TypeORM <=0.3.28
-- silently dropped the null `id` condition). Each false event also re-pointed the victim
-- guild's pre-existing logs to the new guild via updateGuildGuidForAllLogs.
--
-- A rename event is provably false when the guild named in `original` still exists as a row
-- (lower(original)@realm) with a DIFFERENT Blizzard id than the event's guild: a real rename
-- keeps the same Blizzard guild id.
--
-- Run order: section 1 (pre-checks) -> section 2 (transaction) -> section 3 (verification)
--            -> section 4 (review list) -> section 5 (drops), only after you are satisfied.

-- =============================================================================
-- 1. PRE-CHECKS (read-only)
-- =============================================================================

-- 1.1 Baseline for the investigated guilds
SELECT guild_guid, action, count(*)
FROM characters_guilds_logs
WHERE guild_guid IN (
  'private-initiative@gordunni',
  'райдо@howling-fjord',
  'брутфорс@gordunni',
  'экзорсус@howling-fjord'
)
GROUP BY 1, 2 ORDER BY 1, 2;

-- 1.2 Total false NAME events to delete (expected ~29062)
WITH false_events AS (
  SELECT ev.uuid
  FROM characters_guilds_logs ev
  JOIN guilds g ON g.guid = ev.guild_guid
  JOIN guilds o ON o.guid = lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2)
  WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id
)
SELECT count(*) AS false_events_to_delete FROM false_events;

-- 1.3 Logs that the transaction below will restore to victims (single-victim, new-path only)
WITH false_events AS (
  SELECT ev.uuid, ev.guild_guid, ev.created_at AS event_at,
         lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2) AS victim_guid,
         g.created_at AS guild_created
  FROM characters_guilds_logs ev
  JOIN guilds g ON g.guid = ev.guild_guid
  JOIN guilds o ON o.guid = lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2)
  WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id
),
per_guild AS (
  SELECT guild_guid, count(DISTINCT victim_guid) AS victims
  FROM false_events GROUP BY guild_guid
),
safe_events AS (
  SELECT DISTINCT ON (guild_guid) guild_guid, victim_guid, event_at, uuid AS event_uuid
  FROM false_events fe
  JOIN per_guild pg ON pg.guild_guid = fe.guild_guid
  WHERE pg.victims = 1 AND fe.event_at < fe.guild_created + interval '5 seconds'
  ORDER BY guild_guid, event_at
)
SELECT count(*) AS logs_to_restore
FROM characters_guilds_logs l
JOIN safe_events se ON l.guild_guid = se.guild_guid
WHERE l.uuid <> se.event_uuid AND l.created_at < se.event_at;

-- =============================================================================
-- 2. TRANSACTION: restore stolen logs, then delete false rename events
-- =============================================================================

BEGIN;

WITH false_events AS (
  SELECT ev.uuid, ev.guild_guid, ev.created_at AS event_at,
         lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2) AS victim_guid,
         g.created_at AS guild_created
  FROM characters_guilds_logs ev
  JOIN guilds g ON g.guid = ev.guild_guid
  JOIN guilds o ON o.guid = lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2)
  WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id
),
per_guild AS (
  SELECT guild_guid, count(DISTINCT victim_guid) AS victims
  FROM false_events GROUP BY guild_guid
),
safe_events AS (
  SELECT DISTINCT ON (guild_guid) guild_guid, victim_guid, event_at, uuid AS event_uuid
  FROM false_events fe
  JOIN per_guild pg ON pg.guild_guid = fe.guild_guid
  WHERE pg.victims = 1 AND fe.event_at < fe.guild_created + interval '5 seconds'
  ORDER BY guild_guid, event_at
)
UPDATE characters_guilds_logs l
SET guild_guid = se.victim_guid
FROM safe_events se
WHERE l.guild_guid = se.guild_guid
  AND l.uuid <> se.event_uuid
  AND l.created_at < se.event_at;

DELETE FROM characters_guilds_logs ev
USING guilds g, guilds o
WHERE ev.action = 'NAME'
  AND ev.guild_guid IS NOT NULL
  AND g.guid = ev.guild_guid
  AND o.guid = lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2)
  AND o.id IS DISTINCT FROM g.id;

-- Check the reported row counts against section 1, then:
COMMIT;
-- or ROLLBACK; if anything looks off.

-- =============================================================================
-- 3. VERIFICATION (after commit)
-- =============================================================================

-- 3.1 No detectable false events remain (expected 0)
SELECT count(*) AS remaining_false_events
FROM characters_guilds_logs ev
JOIN guilds g ON g.guid = ev.guild_guid
JOIN guilds o ON o.guid = lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2)
WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id;

-- 3.2 Investigated guilds: private-initiative should be empty,
--     райдо keeps everything except its 2 false NAME events
SELECT guild_guid, action, count(*)
FROM characters_guilds_logs
WHERE guild_guid IN (
  'private-initiative@gordunni',
  'райдо@howling-fjord',
  'брутфорс@gordunni',
  'экзорсус@howling-fjord'
)
GROUP BY 1, 2 ORDER BY 1, 2;

-- =============================================================================
-- 4. REVIEW LIST: multi-victim guilds excluded from auto-restore
--    (~617 guilds / ~1280 events; logs between two steals are timestamp-ambiguous)
-- =============================================================================

WITH false_events AS (
  SELECT ev.uuid, ev.guild_guid, ev.created_at AS event_at,
         lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2) AS victim_guid
  FROM characters_guilds_logs ev
  JOIN guilds g ON g.guid = ev.guild_guid
  JOIN guilds o ON o.guid = lower(ev.original) || '@' || split_part(ev.guild_guid, '@', 2)
  WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id
),
per_guild AS (
  SELECT guild_guid, count(DISTINCT victim_guid) AS victims
  FROM false_events GROUP BY guild_guid
)
SELECT fe.guild_guid,
       array_agg(DISTINCT fe.victim_guid ORDER BY fe.victim_guid) AS victims,
       count(*) FILTER (WHERE l.uuid IS NOT NULL AND l.created_at < min_event) AS logs_before_first_steal,
       count(*) FILTER (WHERE l.uuid IS NOT NULL AND l.created_at >= min_event) AS logs_after_first_steal
FROM false_events fe
JOIN per_guild pg ON pg.guild_guid = fe.guild_guid
CROSS JOIN LATERAL (SELECT min(fe2.event_at) AS min_event FROM false_events fe2 WHERE fe2.guild_guid = fe.guild_guid) m
LEFT JOIN characters_guilds_logs l ON l.guild_guid = fe.guild_guid AND l.action <> 'NAME'
WHERE pg.victims > 1
GROUP BY fe.guild_guid
ORDER BY logs_before_first_steal DESC;

-- =============================================================================
-- 5. DROP BACKFILL TABLES (run only after sections 2-4 are done and reviewed)
-- =============================================================================

DROP TABLE IF EXISTS backfill_guilds_20260825;
DROP TABLE IF EXISTS backfill_members_20260825;
DROP TABLE IF EXISTS backfill_guilds_v2_20260825;
DROP TABLE IF EXISTS backfill_members_v2_20260825;

-- =============================================================================
-- 6. OPTIONAL: realign character realm columns with the guid (guid is authoritative)
--    ~849k rows; large single write - batch by realm if needed
-- =============================================================================

-- UPDATE characters c
-- SET realm = r.slug, realm_id = r.id, realm_name = r.name
-- FROM realms r
-- WHERE r.slug = split_part(c.guid, '@', 2) AND c.realm IS DISTINCT FROM r.slug;
