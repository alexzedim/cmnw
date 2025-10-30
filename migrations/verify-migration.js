const { Client } = require('pg');
require('dotenv').config({ quiet: true });

async function verifyMigration() {
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

    // Verify guilds table
    console.log('=== GUILDS TABLE ===');
    const guildsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN guid LIKE '%@%' THEN 1 END) as with_at,
        COUNT(CASE WHEN guid NOT LIKE '%@%' THEN 1 END) as without_at
      FROM guilds;
    `);
    console.table(guildsResult.rows);

    // Sample guilds
    const guildsSample = await client.query(`
      SELECT guid, name, realm FROM guilds LIMIT 5;
    `);
    console.log('Sample guilds:');
    console.table(guildsSample.rows);

    // Verify characters_guild_members
    console.log('\n=== CHARACTERS_GUILD_MEMBERS TABLE ===');
    const membersResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN guild_guid LIKE '%@%' THEN 1 END) as with_at,
        COUNT(CASE WHEN guild_guid NOT LIKE '%@%' THEN 1 END) as without_at
      FROM characters_guild_members;
    `);
    console.table(membersResult.rows);

    // Verify characters table
    console.log('\n=== CHARACTERS TABLE ===');
    const charactersResult = await client.query(`
      SELECT 
        COUNT(*) as total_with_guild,
        COUNT(CASE WHEN guild_guid LIKE '%@%' THEN 1 END) as with_at,
        COUNT(CASE WHEN guild_guid NOT LIKE '%@%' THEN 1 END) as without_at
      FROM characters WHERE guild_guid IS NOT NULL;
    `);
    console.table(charactersResult.rows);

    // Sample characters with guilds
    const charactersSample = await client.query(`
      SELECT guid, name, guild, guild_guid
      FROM characters 
      WHERE guild_guid IS NOT NULL
      LIMIT 5;
    `);
    console.log('Sample characters with guilds:');
    console.table(charactersSample.rows);

    console.log('\n✓ Migration verification complete!');

  } catch (error) {
    console.error('✗ Verification failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

verifyMigration();
