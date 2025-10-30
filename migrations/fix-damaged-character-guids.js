const { Client } = require('pg');

const client = new Client({
  host: '128.0.0.255',
  port: 5432,
  user: 'core',
  password: 'geWNb5a1I2lnmNTsXn0iyHvTybUCRJCo',
  database: 'cmnw',
  ssl: false
});

/**
 * Converts a string to kebab-case (lowercase with dashes)
 */
function toSlug(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Creates correct GUID from name and realm
 */
function toGuid(name, realm) {
  return toSlug(`${name}@${realm}`);
}

async function fixDamagedCharacterGuids() {
  let totalFixed = 0;
  let totalErrors = 0;
  let batchSize = 0;

  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Get all characters with damaged GUIDs
    console.log('Fetching characters with damaged GUIDs...');
    const damagedResult = await client.query(`
      SELECT guid, name, realm, id
      FROM characters 
      WHERE guid NOT LIKE '%@%' AND guid LIKE '%-%'
      ORDER BY id
    `);
    
    console.log(`Found ${damagedResult.rows.length} characters with damaged GUIDs\n`);
    
    if (damagedResult.rows.length === 0) {
      console.log('No damaged GUIDs found. Exiting.');
      return;
    }

    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting GUID fixes...\n');
    console.log('Progress: [ID] Old GUID -> New GUID');
    console.log('-'.repeat(80));

    for (const character of damagedResult.rows) {
      try {
        const correctGuid = toGuid(character.name, character.realm);
        
        // Check if correct GUID already exists (collision)
        const existingResult = await client.query(
          'SELECT id FROM characters WHERE guid = $1 AND id != $2',
          [correctGuid, character.id]
        );

        if (existingResult.rows.length > 0) {
          console.log(`⚠ [${character.id}] Collision detected: ${character.guid} -> ${correctGuid} (GUID already exists, skipping)`);
          totalErrors++;
          continue;
        }

        // Update the GUID
        await client.query(
          'UPDATE characters SET guid = $1 WHERE id = $2',
          [correctGuid, character.id]
        );

        // Also update related tables
        await client.query(
          'UPDATE characters_guild_members SET character_guid = $1 WHERE character_guid = $2',
          [correctGuid, character.guid]
        );

        await client.query(
          'UPDATE characters_guilds_logs SET character_guid = $1 WHERE character_guid = $2',
          [correctGuid, character.guid]
        );

        totalFixed++;
        batchSize++;

        if (batchSize % 100 === 0) {
          console.log(`✓ [${character.id}] ${character.guid} -> ${correctGuid}`);
          console.log(`  Progress: ${totalFixed}/${damagedResult.rows.length} fixed`);
        }

      } catch (error) {
        console.error(`✗ [${character.id}] Failed to fix ${character.guid}: ${error.message}`);
        totalErrors++;
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total characters processed: ${damagedResult.rows.length}`);
    console.log(`✓ Successfully fixed: ${totalFixed}`);
    console.log(`✗ Errors/Collisions: ${totalErrors}`);
    console.log('='.repeat(80));

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('\n✗ MIGRATION FAILED - Transaction rolled back');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   CHARACTER GUID MIGRATION SCRIPT                         ║');
console.log('║   Fixes GUIDs from dash format to correct @-sign format   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

fixDamagedCharacterGuids().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
