-- Migration to fix guild guid format from {name}-{realm} to {slug}@{realm}
-- This script converts guild name to slug format and adds @ separator before realm

-- Step 1: Preview the changes (run this first to verify)
SELECT 
    guid AS old_guid,
    LOWER(REGEXP_REPLACE(name, '\s+', '-', 'g')) || '@' || realm AS new_guid,
    name,
    realm
FROM guilds
LIMIT 10;

-- Step 2: Update all guild guids to correct format
-- This converts spaces to dashes, lowercases the name, and adds @ separator
UPDATE guilds
SET guid = LOWER(REGEXP_REPLACE(name, '\s+', '-', 'g')) || '@' || realm
WHERE guid NOT LIKE '%@%';

-- Step 3: Update related tables - characters_guilds_members
UPDATE characters_guilds_members cgm
SET guild_guid = g.guid
FROM guilds g
WHERE cgm.guild_guid = REPLACE(g.guid, '@', '-')
  AND g.guid LIKE '%@%';

-- Step 4: Update related tables - characters_guilds_logs
UPDATE characters_guilds_logs cgl
SET guild_guid = g.guid
FROM guilds g  
WHERE cgl.guild_guid = REPLACE(g.guid, '@', '-')
  AND g.guid LIKE '%@%';

-- Step 5: Verify the changes
SELECT 
    COUNT(*) as total_guilds,
    COUNT(CASE WHEN guid LIKE '%@%' THEN 1 END) as guilds_with_at,
    COUNT(CASE WHEN guid NOT LIKE '%@%' THEN 1 END) as guilds_without_at
FROM guilds;

-- Step 6: Show sample of updated records
SELECT guid, name, realm
FROM guilds
WHERE guid LIKE '%@%'
LIMIT 20;
