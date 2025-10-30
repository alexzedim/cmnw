const { Client } = require('pg');
require('dotenv').config({ quiet: true });

async function cleanupInvalidGuildRefs() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Check remaining characters with invalid guild_guid format
    console.log('Analyzing characters with invalid guild_guid...');
    const analysisResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT c.guild_guid) as unique_guild_guids,
        COUNT(DISTINCT c.guild) as unique_guild_names
      FROM characters c
      WHERE c.guild_guid IS NOT NULL 
        AND c.guild_guid NOT LIKE '%@%';
    `);
    console.table(analysisResult.rows);

    // Check if these guilds exist
    console.log('\nChecking if these guild guids exist in guilds table...');
    const existsCheckResult = await client.query(`
      SELECT 
        COUNT(*) as characters_with_invalid_guild_guid,
        COUNT(DISTINCT g.guid) as guilds_found_in_db
      FROM characters c
      LEFT JOIN guilds g ON g.guid = LOWER(REGEXP_REPLACE(c.guild, '\\s+', '-', 'g')) || '@' || c.realm
      WHERE c.guild_guid IS NOT NULL 
        AND c.guild_guid NOT LIKE '%@%';
    `);
    console.table(existsCheckResult.rows);

    console.log('\nThese characters reference guilds that do not exist in the guilds table.');
    console.log('Options:');
    console.log('1. Set guild_guid to NULL (keep guild name for future indexing)');
    console.log('2. Keep as-is and wait for guild indexing');
    console.log('\nRecommendation: Set guild_guid to NULL but keep guild name and guild_id.');
    console.log('When these guilds are indexed, they will be automatically linked.\n');

    // Sample of characters that would be affected
    console.log('Sample of characters with non-existent guilds (first 10):');
    const sampleResult = await client.query(`
      SELECT 
        c.guid,
        c.name,
        c.guild as guild_name,
        c.guild_guid,
        c.guild_id,
        c.realm,
        LOWER(REGEXP_REPLACE(c.guild, '\\s+', '-', 'g')) || '@' || c.realm as expected_guild_guid
      FROM characters c
      LEFT JOIN guilds g ON g.guid = LOWER(REGEXP_REPLACE(c.guild, '\\s+', '-', 'g')) || '@' || c.realm
      WHERE c.guild_guid IS NOT NULL 
        AND c.guild_guid NOT LIKE '%@%'
        AND g.guid IS NULL
      LIMIT 10;
    `);
    console.table(sampleResult.rows);

    // Update: Set guild_guid to NULL for non-existent guilds, but keep guild name
    console.log('\nSetting guild_guid to NULL for guilds not in database...');
    console.log('(This will preserve guild name and guild_id for future linking)\n');
    
    const updateResult = await client.query(`
      UPDATE characters c
      SET guild_guid = NULL
      WHERE c.guild_guid IS NOT NULL 
        AND c.guild_guid NOT LIKE '%@%'
        AND NOT EXISTS (
          SELECT 1 FROM guilds g 
          WHERE g.guid = LOWER(REGEXP_REPLACE(c.guild, '\\s+', '-', 'g')) || '@' || c.realm
        );
    `);
    console.log(`✓ Set guild_guid to NULL for ${updateResult.rowCount} characters\n`);

    // Final verification
    console.log('Final verification...');
    const finalResult = await client.query(`
      SELECT 
        COUNT(*) as total_characters,
        COUNT(CASE WHEN guild IS NOT NULL THEN 1 END) as with_guild_name,
        COUNT(CASE WHEN guild_guid IS NOT NULL THEN 1 END) as with_guild_guid,
        COUNT(CASE WHEN guild_guid LIKE '%@%' THEN 1 END) as guild_guid_with_at,
        COUNT(CASE WHEN guild_guid NOT LIKE '%@%' THEN 1 END) as guild_guid_without_at,
        ROUND(100.0 * COUNT(CASE WHEN guild_guid LIKE '%@%' THEN 1 END) / NULLIF(COUNT(CASE WHEN guild_guid IS NOT NULL THEN 1 END), 0), 2) as percentage_correct_format
      FROM characters;
    `);
    console.table(finalResult.rows);

    console.log('\n✓ Cleanup completed successfully!');
    console.log('\nNote: Characters with guild names but NULL guild_guid will be automatically');
    console.log('linked when their guilds are indexed in the future.');

  } catch (error) {
    console.error('✗ Cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

cleanupInvalidGuildRefs();
