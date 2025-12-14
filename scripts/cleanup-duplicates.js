require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'cmnw',
});

async function cleanupDuplicates() {
  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // ==================== CLEANUP CHARACTERS TABLE ====================
    console.log('=== Cleaning up CHARACTERS table ===\n');

    const charDupsBefore = await client.query(`
      SELECT guid, COUNT(*) as count
      FROM characters
      GROUP BY guid
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    console.log(`Found ${charDupsBefore.rows.length} character GUIDs with duplicates:`);
    charDupsBefore.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.guid} - ${row.count} entries`);
    });

    if (charDupsBefore.rows.length > 0) {
      console.log('\nRemoving duplicate character entries...');
      const charDeleteResult = await client.query(`
        WITH ranked_characters AS (
          SELECT
            uuid,
            guid,
            ROW_NUMBER() OVER (PARTITION BY guid ORDER BY updated_at DESC, uuid DESC) as rn
          FROM characters
        )
        DELETE FROM characters
        WHERE uuid IN (
          SELECT uuid FROM ranked_characters WHERE rn > 1
        )
        RETURNING guid, uuid
      `);

      console.log(`✓ Deleted ${charDeleteResult.rows.length} duplicate character records\n`);
    } else {
      console.log('✓ No character duplicates found\n');
    }

    // Get character count
    const charTotalCount = await client.query('SELECT COUNT(*) FROM characters');
    console.log(`Total characters in database: ${charTotalCount.rows[0].count}\n`);

    // ==================== CLEANUP GUILDS TABLE ====================
    console.log('=== Cleaning up GUILDS table ===\n');

    const guildDupsBefore = await client.query(`
      SELECT guid, COUNT(*) as count
      FROM guilds
      GROUP BY guid
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    console.log(`Found ${guildDupsBefore.rows.length} guild GUIDs with duplicates:`);
    guildDupsBefore.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.guid} - ${row.count} entries`);
    });

    if (guildDupsBefore.rows.length > 0) {
      console.log('\nRemoving duplicate guild entries...');
      const guildDeleteResult = await client.query(`
        WITH ranked_guilds AS (
          SELECT
            uuid,
            guid,
            ROW_NUMBER() OVER (PARTITION BY guid ORDER BY updated_at DESC, uuid DESC) as rn
          FROM guilds
        )
        DELETE FROM guilds
        WHERE uuid IN (
          SELECT uuid FROM ranked_guilds WHERE rn > 1
        )
        RETURNING guid, uuid
      `);

      console.log(`✓ Deleted ${guildDeleteResult.rows.length} duplicate guild records\n`);
    } else {
      console.log('✓ No guild duplicates found\n');
    }

    // Get guild count
    const guildTotalCount = await client.query('SELECT COUNT(*) FROM guilds');
    console.log(`Total guilds in database: ${guildTotalCount.rows[0].count}\n`);

    console.log('✓ Deduplication completed successfully!');
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

cleanupDuplicates();
