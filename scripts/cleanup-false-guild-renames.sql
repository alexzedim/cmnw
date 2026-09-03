-- Cleanup: false guild rename events, round 2 (revised).
--
-- Class A — cosmetic differences: detectAndLogChanges compared guild names with a strict
-- `!==`, but the stored name is capitalize(slug) or externally-cased (WoW Progress JSON,
-- addon scans, guid re-splits) while the Blizzard summary returns canonical casing and
-- spacing. The first successful summary logged the difference as a rename ("Just-for-fun"
-- -> "Just for Fun"). Equal slugs mean equal guids, so these never re-pointed logs:
-- plain DELETE, no restoration.
--
-- Class B — cross-guild steals: the event claims guild X was previously named Y, but Y is
-- a different, still-existing guild (different Blizzard id) — e.g. 'Корпорация Зла' ->
-- 'Депортация' on депортация@gordunni, where корпорация-зла@gordunni exists separately.
-- Created by the pre-2026-09-01 getLogStatusForNewGuild bug (findOneBy({ id: null, realm })
-- matched an arbitrary same-realm guild) and by pre-gate main-path scans. The round-1
-- cleanup missed every multi-word victim because it built the victim guid as
-- lower(original) || '@' || realm — with a space, not the dash guids use
-- ('корпорация зла@gordunni' never matched 'корпорация-зла@gordunni'). This revision
-- slugifies the victim name. Each steal also re-pointed the victim's logs to the stealer;
-- single-victim steals that happened at guild creation are restored automatically,
-- multi-victim ones are listed for review in section 4.
--
-- All sections are idempotent — re-running after a partial execution is safe.
-- Run order: section 1 (pre-checks) -> section 2 (transaction) -> section 3 (verification)
--            -> section 4 (review list).

-- =============================================================================
-- 1. PRE-CHECKS (read-only)
-- =============================================================================

-- 1.1 Class A: NAME events whose names are equal after slug normalization
--    (lowercase, whitespace collapsed — mirrors @app/resources toSlug)
SELECT count(*) AS class_a_cosmetic_events
FROM characters_guilds_logs
WHERE action = 'NAME' AND guild_guid IS NOT NULL
  AND lower(regexp_replace(regexp_replace(regexp_replace(trim(original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    = lower(regexp_replace(regexp_replace(regexp_replace(trim(updated), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''));

-- 1.2 Class B: NAME events whose original name belongs to a different, still-existing
--    guild on the same realm (slugified victim guid, Blizzard id mismatch)
SELECT count(*) AS class_b_steal_events, count(DISTINCT ev.guild_guid) AS stealer_guilds
FROM characters_guilds_logs ev
JOIN guilds g ON g.guid = ev.guild_guid
JOIN guilds o ON o.guid = lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
  || '@' || split_part(ev.guild_guid, '@', 2)
WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id;

-- 1.3 Class B logs to restore automatically (single victim, steal at guild creation)
WITH false_events AS (
  SELECT ev.uuid, ev.guild_guid, ev.created_at AS event_at,
         lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
           || '@' || split_part(ev.guild_guid, '@', 2) AS victim_guid,
         g.created_at AS guild_created
  FROM characters_guilds_logs ev
  JOIN guilds g ON g.guid = ev.guild_guid
  JOIN guilds o ON o.guid = lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    || '@' || split_part(ev.guild_guid, '@', 2)
  WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id
),
per_guild AS (
  SELECT guild_guid, count(DISTINCT victim_guid) AS victims
  FROM false_events GROUP BY 1
),
safe_events AS (
  SELECT DISTINCT ON (fe.guild_guid) fe.guild_guid AS guild_guid, fe.victim_guid, fe.event_at, fe.uuid AS event_uuid
  FROM false_events fe
  JOIN per_guild pg ON pg.guild_guid = fe.guild_guid
  WHERE pg.victims = 1 AND fe.event_at < fe.guild_created + interval '5 seconds'
  ORDER BY fe.guild_guid, fe.event_at
)
SELECT count(*) AS logs_to_restore
FROM characters_guilds_logs l
JOIN safe_events se ON l.guild_guid = se.guild_guid
WHERE l.uuid <> se.event_uuid AND l.created_at < se.event_at;

-- 1.4 Eyeball sample of class B
SELECT ev.guild_guid, ev.original, ev.updated, ev.created_at
FROM characters_guilds_logs ev
JOIN guilds g ON g.guid = ev.guild_guid
JOIN guilds o ON o.guid = lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
  || '@' || split_part(ev.guild_guid, '@', 2)
WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id
ORDER BY ev.created_at DESC
LIMIT 50;

-- =============================================================================
-- 2. TRANSACTION: restore stolen logs, then delete false rename events
-- =============================================================================

BEGIN;

-- 2.1 Restore logs stolen by single-victim, at-creation steals back to the victim
WITH false_events AS (
  SELECT ev.uuid, ev.guild_guid, ev.created_at AS event_at,
         lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
           || '@' || split_part(ev.guild_guid, '@', 2) AS victim_guid,
         g.created_at AS guild_created
  FROM characters_guilds_logs ev
  JOIN guilds g ON g.guid = ev.guild_guid
  JOIN guilds o ON o.guid = lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    || '@' || split_part(ev.guild_guid, '@', 2)
  WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id
),
per_guild AS (
  SELECT guild_guid, count(DISTINCT victim_guid) AS victims
  FROM false_events GROUP BY 1
),
safe_events AS (
  SELECT DISTINCT ON (fe.guild_guid) fe.guild_guid AS guild_guid, fe.victim_guid, fe.event_at, fe.uuid AS event_uuid
  FROM false_events fe
  JOIN per_guild pg ON pg.guild_guid = fe.guild_guid
  WHERE pg.victims = 1 AND fe.event_at < fe.guild_created + interval '5 seconds'
  ORDER BY fe.guild_guid, fe.event_at
)
UPDATE characters_guilds_logs l
SET guild_guid = se.victim_guid
FROM safe_events se
WHERE l.guild_guid = se.guild_guid
  AND l.uuid <> se.event_uuid
  AND l.created_at < se.event_at;

-- 2.2 Delete class A: cosmetic-only differences
DELETE FROM characters_guilds_logs
WHERE action = 'NAME'
  AND guild_guid IS NOT NULL
  AND lower(regexp_replace(regexp_replace(regexp_replace(trim(original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    = lower(regexp_replace(regexp_replace(regexp_replace(trim(updated), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''));

-- 2.3 Delete class B: cross-guild steals
DELETE FROM characters_guilds_logs ev
USING guilds g, guilds o
WHERE ev.action = 'NAME'
  AND ev.guild_guid IS NOT NULL
  AND g.guid = ev.guild_guid
  AND o.guid = lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    || '@' || split_part(ev.guild_guid, '@', 2)
  AND o.id IS DISTINCT FROM g.id;

-- Check the reported row counts against section 1, then:
COMMIT;
-- or ROLLBACK; if anything looks off.

-- =============================================================================
-- 3. VERIFICATION (after commit)
-- =============================================================================

-- 3.1 No slug-equal NAME events remain (expected 0)
SELECT count(*) AS remaining_class_a
FROM characters_guilds_logs
WHERE action = 'NAME' AND guild_guid IS NOT NULL
  AND lower(regexp_replace(regexp_replace(regexp_replace(trim(original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    = lower(regexp_replace(regexp_replace(regexp_replace(trim(updated), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''));

-- 3.2 No cross-guild steal NAME events remain (expected 0)
SELECT count(*) AS remaining_class_b
FROM characters_guilds_logs ev
JOIN guilds g ON g.guid = ev.guild_guid
JOIN guilds o ON o.guid = lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
  || '@' || split_part(ev.guild_guid, '@', 2)
WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id;

-- 3.3 Overall NAME event health after cleanup
SELECT count(*) AS remaining_name_events, count(DISTINCT guild_guid) AS guilds_with_renames
FROM characters_guilds_logs
WHERE action = 'NAME' AND guild_guid IS NOT NULL;

-- 3.4 Spot-check previously affected guild pages
SELECT guild_guid, original, updated, created_at
FROM characters_guilds_logs
WHERE guild_guid IN ('департация@gordunni', 'депортация@gordunni') AND action = 'NAME';

-- =============================================================================
-- 4. REVIEW LIST: multi-victim stealer guilds excluded from auto-restore
--    (logs between two steals are timestamp-ambiguous — decide manually)
-- =============================================================================

WITH false_events AS (
  SELECT ev.uuid, ev.guild_guid, ev.created_at AS event_at,
         lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
           || '@' || split_part(ev.guild_guid, '@', 2) AS victim_guid
  FROM characters_guilds_logs ev
  JOIN guilds g ON g.guid = ev.guild_guid
  JOIN guilds o ON o.guid = lower(regexp_replace(regexp_replace(regexp_replace(trim(ev.original), '\s+', '-', 'g'), '-{2,}', '-', 'g'), '^-', ''))
    || '@' || split_part(ev.guild_guid, '@', 2)
  WHERE ev.action = 'NAME' AND ev.guild_guid IS NOT NULL AND o.id IS DISTINCT FROM g.id
),
per_guild AS (
  SELECT guild_guid, count(DISTINCT victim_guid) AS victims
  FROM false_events GROUP BY 1
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
