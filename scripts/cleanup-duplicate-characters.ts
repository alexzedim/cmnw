import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { CharactersEntity } from '@app/pg';

/**
 * Script to remove duplicate character entries from the database
 * Keeps the latest record (by updated_at timestamp) for each unique GUID
 *
 * Usage: npx ts-node scripts/cleanup-duplicate-characters.ts
 */

const dbConfig: PostgresConnectionOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cmnw',
  entities: [CharactersEntity],
  synchronize: false,
  logging: false,
};

async function cleanupDuplicateCharacters(): Promise<void> {
  const dataSource = new DataSource(dbConfig);

  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    console.log('✓ Connected to database');

    // Get count of duplicates before cleanup
    const duplicatesBefore = await dataSource.query(`
      SELECT guid, COUNT(*) as count
      FROM characters
      GROUP BY guid
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    console.log(`\nFound ${duplicatesBefore.length} GUIDs with duplicates:`);
    duplicatesBefore.forEach((row: any, index: number) => {
      console.log(`  ${index + 1}. ${row.guid} - ${row.count} entries`);
    });

    if (duplicatesBefore.length === 0) {
      console.log('\n✓ No duplicates found!');
      await dataSource.destroy();
      return;
    }

    // Execute cleanup - keep only the latest record per GUID
    console.log('\nRemoving duplicate entries, keeping latest record per GUID...');
    const deleteResult = await dataSource.query(`
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

    console.log(`✓ Deleted ${deleteResult.length} duplicate records`);

    // Verify cleanup
    const duplicatesAfter = await dataSource.query(`
      SELECT guid, COUNT(*) as count
      FROM characters
      GROUP BY guid
      HAVING COUNT(*) > 1
    `);

    if (duplicatesAfter.length === 0) {
      console.log('✓ All duplicates successfully removed!\n');
    } else {
      console.log(`⚠ Warning: ${duplicatesAfter.length} GUIDs still have duplicates:`);
      duplicatesAfter.forEach((row: any) => {
        console.log(`  - ${row.guid} - ${row.count} entries`);
      });
    }

    // Get character count
    const totalCount = await dataSource.query('SELECT COUNT(*) FROM characters');
    console.log(`Total characters in database: ${totalCount[0].count}`);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

cleanupDuplicateCharacters();
