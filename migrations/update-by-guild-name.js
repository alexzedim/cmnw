const { Client } = require('pg');
require('dotenv').config({ quiet: true });

async function updateByGuildName() {
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

    // Check remaining characters
    console.log('Checking remaining characters without @ in guild_guid...');
    const checkResult = await client.query(`
      SELECT COUNT(*) as count
      FROM characters
      WHERE guild_guid IS NOT NULL 
        AND guild_guid NOT LIKE '%@%'
        AND guild IS NOT NULL
        AND realm IS NOT NULL;
    `);
    console.log(`Found ${checkResult.rows[0].count} characters to update\n`);

    // Preview matches by slug-based matching
    console.log('Preview of guild name + realm matches (first 10):');
    const previewResult = await client.query(`
      SELECT 
        c.guid as character_guid,
        c.name as character_name,
        c.guild as guild_name,
        c.realm,
        c.guild_guid as old_guild_guid,
        g.guid as new_guild_guid,
        g.name as guild_name_in_db
      FROM characters c
      JOIN guilds g ON g.guid = LOWER(REGEXP_REPLACE(c.guild, '\\s+', '-', 'g')) || '@' || c.realm
      WHERE c.guild_guid IS NOT NULL 
        AND c.guild_guid NOT LIKE '%@%'
        AND c.guild IS NOT NULL
        AND c.realm IS NOT NULL
      LIMIT 10;
    `);
    console.table(previewResult.rows);

    // Update using constructed guild guid from guild name
    console.log('\nUpdating characters by constructing guild guid from name + realm...');
    const updateResult = await client.query(`
      UPDATE characters c
      SET guild_guid = g.guid,
          guild_id = g.id
      FROM guilds g
      WHERE g.guid = LOWER(REGEXP_REPLACE(c.guild, '\\s+', '-', 'g')) || '@' || c.realm
        AND c.guild_guid IS NOT NULL
        AND c.guild_guid NOT LIKE '%@%'
        AND c.guild IS NOT NULL
        AND c.realm IS NOT NULL;
    `);
    console.log(`✓ Updated ${updateResult.rowCount} characters\n`);

    // Final verification
    console.log('Final verification...');
    const finalResult = await client.query(`
      SELECT 
        COUNT(*) as total_with_guild_guid,
        COUNT(CASE WHEN guild_guid LIKE '%@%' THEN 1 END) as with_at,
        COUNT(CASE WHEN guild_guid NOT LIKE '%@%' THEN 1 END) as without_at,
        ROUND(100.0 * COUNT(CASE WHEN guild_guid LIKE '%@%' THEN 1 END) / COUNT(*), 2) as percentage_with_at
      FROM characters 
      WHERE guild_guid IS NOT NULL;
    `);
    console.table(finalResult.rows);

    // Check what's left
    console.log('\nAnalyzing remaining characters without @:');
    const remainingAnalysis = await client.query(`
      SELECT 
        COUNT(*) as count,
        COUNT(CASE WHEN guild IS NULL THEN 1 END) as missing_guild_name,
        COUNT(CASE WHEN guild_id IS NULL THEN 1 END) as missing_guild_id,
        COUNT(CASE WHEN realm IS NULL THEN 1 END) as missing_realm
      FROM characters
      WHERE guild_guid IS NOT NULL 
        AND guild_guid NOT LIKE '%@%';
    `);
    console.table(remainingAnalysis.rows);

    // Sample of what remains
    console.log('\nSample of remaining characters (first 10):');
    const sampleResult = await client.query(`
      SELECT 
        guid,
        name,
        guild,
        guild_id,
        guild_guid,
        realm,
        CASE 
          WHEN guild IS NULL THEN 'Missing guild name'
          WHEN realm IS NULL THEN 'Missing realm'
          ELSE 'Guild not in database'
        END as reason
      FROM characters
      WHERE guild_guid IS NOT NULL 
        AND guild_guid NOT LIKE '%@%'
      LIMIT 10;
    `);
    console.table(sampleResult.rows);

    console.log('\n✓ Update completed successfully!');

  } catch (error) {
    console.error('✗ Update failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

updateByGuildName();
