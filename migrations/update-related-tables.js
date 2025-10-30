const { Client } = require('pg');
require('dotenv').config({ quiet: true });

async function updateRelatedTables() {
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

    // Update characters_guild_members
    console.log('Updating characters_guild_members...');
    const updateMembersResult = await client.query(`
      UPDATE characters_guild_members cgm
      SET guild_guid = g.guid
      FROM guilds g
      WHERE cgm.guild_guid = REPLACE(g.guid, '@', '-')
        AND g.guid LIKE '%@%';
    `);
    console.log(`✓ Updated ${updateMembersResult.rowCount} guild member records\n`);

    // Update characters_guilds_logs
    console.log('Updating characters_guilds_logs...');
    const updateLogsResult = await client.query(`
      UPDATE characters_guilds_logs cgl
      SET guild_guid = g.guid
      FROM guilds g  
      WHERE cgl.guild_guid = REPLACE(g.guid, '@', '-')
        AND g.guid LIKE '%@%';
    `);
    console.log(`✓ Updated ${updateLogsResult.rowCount} guild log records\n`);

    // Update characters table
    console.log('Updating characters...');
    const updateCharactersResult = await client.query(`
      UPDATE characters c
      SET guild_guid = g.guid
      FROM guilds g
      WHERE c.guild_guid = REPLACE(g.guid, '@', '-')
        AND g.guid LIKE '%@%';
    `);
    console.log(`✓ Updated ${updateCharactersResult.rowCount} character records\n`);

    console.log('✓ All related tables updated successfully!');

  } catch (error) {
    console.error('✗ Update failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

updateRelatedTables();
