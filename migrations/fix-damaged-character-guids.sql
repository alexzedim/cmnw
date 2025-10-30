-- ============================================================================
-- CHARACTER GUID MIGRATION - SQL ONLY VERSION
-- Fixes GUIDs from dash format (name-realm) to correct format (name@realm)
-- This is much faster than the Node.js version as it runs entirely in Postgres
-- ============================================================================

-- Start timing
\timing on

-- Show initial count
SELECT 'Initial count of damaged GUIDs:' as status, COUNT(*) as count
FROM characters 
WHERE guid NOT LIKE '%@%' AND guid LIKE '%-%';

-- ====================
-- STEP 1: Update characters table
-- ====================
UPDATE characters
SET guid = LOWER(name) || '@' || realm
WHERE guid NOT LIKE '%@%' 
  AND guid LIKE '%-%'
  AND NOT EXISTS (
    -- Prevent creating duplicate GUIDs
    SELECT 1 
    FROM characters c2 
    WHERE c2.guid = LOWER(characters.name) || '@' || characters.realm
      AND c2.id != characters.id
  );

SELECT 'Characters table updated' as status, ROW_COUNT() as rows_affected;

-- ====================
-- STEP 2: Update characters_guild_members table
-- ====================
UPDATE characters_guild_members cgm
SET character_guid = LOWER(c.name) || '@' || c.realm
FROM characters c
WHERE cgm.character_guid = c.guid || '-' || c.realm  -- Old format was using character's original GUID
  OR cgm.character_guid NOT LIKE '%@%'
  AND cgm.character_id = c.id;

SELECT 'Characters guild members table updated' as status, ROW_COUNT() as rows_affected;

-- ====================
-- STEP 3: Update characters_guilds_logs table  
-- ====================
UPDATE characters_guilds_logs cgl
SET character_guid = c.guid
FROM characters c
WHERE cgl.character_guid LIKE '%-%'
  AND cgl.character_guid NOT LIKE '%@%'
  AND (
    -- Try to match by extracting name from old GUID
    LOWER(SPLIT_PART(cgl.character_guid, '-', 1)) = LOWER(c.name)
    -- Additional safety: could add realm matching if needed
  );

SELECT 'Characters guilds logs table updated' as status, ROW_COUNT() as rows_affected;

-- ====================
-- VERIFICATION
-- ====================
SELECT 'Remaining damaged GUIDs:' as status, COUNT(*) as count
FROM characters 
WHERE guid NOT LIKE '%@%' AND guid LIKE '%-%';

-- Show sample of fixed GUIDs
SELECT 'Sample of fixed GUIDs:' as status;
SELECT guid, name, realm, updated_by
FROM characters 
WHERE guid LIKE '%@%'
ORDER BY updated_at DESC
LIMIT 10;

\timing off
