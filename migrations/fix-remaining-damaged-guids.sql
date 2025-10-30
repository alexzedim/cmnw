-- ============================================================================
-- Fix Remaining Damaged GUIDs
-- Updates characters_guild_members first, then characters table
-- ============================================================================

\timing on

-- Show initial counts
SELECT 'Initial damaged GUIDs in characters:' as status, COUNT(*) as count
FROM characters 
WHERE guid NOT LIKE '%@%' AND guid LIKE '%-%';

SELECT 'Initial damaged GUIDs in guild members:' as status, COUNT(*) as count
FROM characters_guild_members 
WHERE character_guid NOT LIKE '%@%' AND character_guid LIKE '%-%';

-- ====================
-- STEP 1: Update characters_guild_members table FIRST
-- Match by character_id and update the GUID
-- ====================
UPDATE characters_guild_members cgm
SET character_guid = LOWER(c.name) || '@' || c.realm
FROM characters c
WHERE cgm.character_id = c.id
  AND cgm.character_guid NOT LIKE '%@%' 
  AND cgm.character_guid LIKE '%-%';

SELECT 'Guild members updated:' as status;

-- ====================
-- STEP 2: Update characters table
-- Now safe to update without breaking FK relationships
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

SELECT 'Characters updated:' as status;

-- ====================
-- VERIFICATION
-- ====================
SELECT 'Remaining damaged GUIDs in characters:' as status, COUNT(*) as count
FROM characters 
WHERE guid NOT LIKE '%@%' AND guid LIKE '%-%';

SELECT 'Remaining damaged GUIDs in guild members:' as status, COUNT(*) as count
FROM characters_guild_members 
WHERE character_guid NOT LIKE '%@%' AND character_guid LIKE '%-%';

-- Show sample of fixed records
SELECT 'Sample fixed characters:' as status;
SELECT id, guid, name, realm 
FROM characters 
WHERE guid LIKE '%@%'
ORDER BY updated_at DESC
LIMIT 5;

\timing off
