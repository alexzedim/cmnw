-- ============================================================================
-- Delete Damaged GUID Rows
-- Removes rows with damaged GUIDs (using '-' instead of '@')
-- ============================================================================

\timing on

-- Show what will be deleted
SELECT 'Characters to be deleted:' as status, COUNT(*) as count
FROM characters 
WHERE guid NOT LIKE '%@%' AND guid LIKE '%-%';

SELECT 'Guild members to be deleted:' as status, COUNT(*) as count
FROM characters_guild_members 
WHERE character_guid NOT LIKE '%@%' AND character_guid LIKE '%-%';

SELECT 'Guild logs to be deleted:' as status, COUNT(*) as count
FROM characters_guilds_logs 
WHERE character_guid NOT LIKE '%@%' AND character_guid LIKE '%-%';

-- Ask for confirmation
SELECT 'Press Ctrl+C to cancel, or press Enter to continue...' as warning;

-- ====================
-- STEP 1: Delete from characters_guilds_logs first (references characters)
-- ====================
DELETE FROM characters_guilds_logs
WHERE character_guid NOT LIKE '%@%' 
  AND character_guid LIKE '%-%';

SELECT 'Guild logs deleted' as status;

-- ====================
-- STEP 2: Delete from characters_guild_members (references characters)
-- ====================
DELETE FROM characters_guild_members
WHERE character_guid NOT LIKE '%@%' 
  AND character_guid LIKE '%-%';

SELECT 'Guild members deleted' as status;

-- ====================
-- STEP 3: Delete from characters table
-- ====================
DELETE FROM characters
WHERE guid NOT LIKE '%@%' 
  AND guid LIKE '%-%';

SELECT 'Characters deleted' as status;

-- ====================
-- VERIFICATION
-- ====================
SELECT 'Remaining damaged GUIDs in characters:' as status, COUNT(*) as count
FROM characters 
WHERE guid NOT LIKE '%@%' AND guid LIKE '%-%';

SELECT 'Remaining damaged GUIDs in guild members:' as status, COUNT(*) as count
FROM characters_guild_members 
WHERE character_guid NOT LIKE '%@%' AND character_guid LIKE '%-%';

SELECT 'Remaining damaged GUIDs in guild logs:' as status, COUNT(*) as count
FROM characters_guilds_logs 
WHERE character_guid NOT LIKE '%@%' AND character_guid LIKE '%-%';

\timing off
