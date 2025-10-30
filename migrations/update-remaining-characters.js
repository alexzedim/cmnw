const { Client } = require('pg');
require('dotenv').config({ quiet: true });

async function updateRemainingCharacters() {
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

    // First, let's see what we're working with
    console.log('Checking characters without @ in guild_guid...');
    const checkResult = await client.query(`
      SELECT COUNT(*) as count
      FROM characters
      WHERE guild_guid IS NOT NULL 
        AND guild_guid NOT LIKE '%@%'
        AND guild_id IS NOT NULL;
    `);
    console.log(`Found ${checkResult.rows[0].count} characters to update\n`);

    // Preview the update
    console.log('Preview of updates (first 5):');
    const previewResult = await client.query(`
      SELECT 
        c.guid as character_guid,
        c.name as character_name,
        c.guild as guild_name,
        c.guild_id,
        c.guild_guid as old_guild_guid,
        g.guid as new_guild_guid
      FROM characters c
      JOIN guilds g ON c.guild_id = g.id
      WHERE c.guild_guid IS NOT NULL 
        AND c.guild_guid NOT LIKE '%@%'
        AND c.guild_id IS NOT NULL
      LIMIT 5;
    `);
    console.table(previewResult.rows);

    // Update characters using guild_id
    console.log('\nUpdating characters by guild_id...');
    const updateByIdResult = await client.query(`
      UPDATE characters c
      SET guild_guid = g.guid
      FROM guilds g
      WHERE c.guild_id = g.id
        AND c.guild_guid IS NOT NULL
        AND c.guild_guid NOT LIKE '%@%'
        AND c.guild_id IS NOT NULL;
    `);
    console.log(`✓ Updated ${updateByIdResult.rowCount} characters by guild_id\n`);

    // Now handle characters without guild_id but with guild name
    console.log('Checking characters without guild_id but with guild name...');
    const checkNoIdResult = await client.query(`
      SELECT COUNT(*) as count
      FROM characters
      WHERE guild_guid IS NOT NULL 
        AND guild_guid NOT LIKE '%@%'
        AND guild_id IS NULL
        AND guild IS NOT NULL;
    `);
    console.log(`Found ${checkNoIdResult.rows[0].count} characters with guild name but no guild_id\n`);

    if (parseInt(checkNoIdResult.rows[0].count) > 0) {
      // Preview update by name matching
      console.log('Preview of name-based updates (first 5):');
      const previewNameResult = await client.query(`
        SELECT 
          c.guid as character_guid,
          c.name as character_name,
          c.guild as guild_name,
          c.realm,
          c.guild_guid as old_guild_guid,
          g.guid as new_guild_guid
        FROM characters c
        JOIN guilds g ON LOWER(g.name) = LOWER(c.guild) AND g.realm = c.realm
        WHERE c.guild_guid IS NOT NULL 
          AND c.guild_guid NOT LIKE '%@%'
          AND c.guild_id IS NULL
          AND c.guild IS NOT NULL
        LIMIT 5;
      `);
      console.table(previewNameResult.rows);

      // Update characters by guild name + realm
      console.log('\nUpdating characters by guild name + realm...');
      const updateByNameResult = await client.query(`
        UPDATE characters c
        SET guild_guid = g.guid,
            guild_id = g.id
        FROM guilds g
        WHERE LOWER(g.name) = LOWER(c.guild)
          AND g.realm = c.realm
          AND c.guild_guid IS NOT NULL
          AND c.guild_guid NOT LIKE '%@%'
          AND c.guild_id IS NULL
          AND c.guild IS NOT NULL;
      `);
      console.log(`✓ Updated ${updateByNameResult.rowCount} characters by guild name + realm\n`);
    }

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

    // Check remaining issues
    console.log('\nRemaining characters without @ (sample):');
    const remainingResult = await client.query(`
      SELECT 
        guid,
        name,
        guild,
        guild_id,
        guild_guid,
        realm
      FROM characters
      WHERE guild_guid IS NOT NULL 
        AND guild_guid NOT LIKE '%@%'
      LIMIT 10;
    `);
    console.table(remainingResult.rows);

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

updateRemainingCharacters();
