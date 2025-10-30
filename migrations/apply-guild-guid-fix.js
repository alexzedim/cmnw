const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });

async function applyMigration() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  try {
    console.log('Connecting to PostgreSQL...');
    console.log(`Host: ${process.env.POSTGRES_HOST}`);
    console.log(`Database: ${process.env.POSTGRES_DB}`);
    console.log(`User: ${process.env.POSTGRES_USER}`);
    
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'fix-guild-guid-format.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    // Split by steps and execute relevant ones
    console.log('Step 1: Previewing changes...');
    const previewResult = await client.query(`
      SELECT 
        guid AS old_guid,
        LOWER(REGEXP_REPLACE(name, '\\s+', '-', 'g')) || '@' || realm AS new_guid,
        name,
        realm
      FROM guilds
      WHERE guid NOT LIKE '%@%'
      LIMIT 5;
    `);
    console.log('Sample of guilds to be updated:');
    console.table(previewResult.rows);

    // Count guilds to update
    const countResult = await client.query(`
      SELECT COUNT(*) as count FROM guilds WHERE guid NOT LIKE '%@%';
    `);
    const guildsToUpdate = parseInt(countResult.rows[0].count);
    console.log(`\nTotal guilds to update: ${guildsToUpdate}\n`);

    if (guildsToUpdate === 0) {
      console.log('✓ No guilds need updating. All guids are already in correct format.');
      await client.end();
      return;
    }

    // Update guilds
    console.log('Step 2: Updating guild guids...');
    const updateResult = await client.query(`
      UPDATE guilds
      SET guid = LOWER(REGEXP_REPLACE(name, '\\s+', '-', 'g')) || '@' || realm
      WHERE guid NOT LIKE '%@%';
    `);
    console.log(`✓ Updated ${updateResult.rowCount} guild records\n`);

    // Update characters_guild_members
    console.log('Step 3: Updating characters_guild_members...');
    const updateMembersResult = await client.query(`
      UPDATE characters_guild_members cgm
      SET guild_guid = g.guid
      FROM guilds g
      WHERE cgm.guild_guid = REPLACE(g.guid, '@', '-')
        AND g.guid LIKE '%@%';
    `);
    console.log(`✓ Updated ${updateMembersResult.rowCount} guild member records\n`);

    // Update characters_guilds_logs
    console.log('Step 4: Updating characters_guilds_logs...');
    const updateLogsResult = await client.query(`
      UPDATE characters_guilds_logs cgl
      SET guild_guid = g.guid
      FROM guilds g  
      WHERE cgl.guild_guid = REPLACE(g.guid, '@', '-')
        AND g.guid LIKE '%@%';
    `);
    console.log(`✓ Updated ${updateLogsResult.rowCount} guild log records\n`);

    // Verify changes
    console.log('Step 5: Verifying changes...');
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total_guilds,
        COUNT(CASE WHEN guid LIKE '%@%' THEN 1 END) as guilds_with_at,
        COUNT(CASE WHEN guid NOT LIKE '%@%' THEN 1 END) as guilds_without_at
      FROM guilds;
    `);
    console.table(verifyResult.rows);

    // Show sample of updated records
    console.log('\nStep 6: Sample of updated records:');
    const sampleResult = await client.query(`
      SELECT guid, name, realm
      FROM guilds
      WHERE guid LIKE '%@%'
      LIMIT 10;
    `);
    console.table(sampleResult.rows);

    console.log('\n✓ Migration completed successfully!');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

applyMigration();
