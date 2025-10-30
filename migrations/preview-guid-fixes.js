const { Client } = require('pg');

const client = new Client({
  host: '128.0.0.255',
  port: 5432,
  user: 'core',
  password: 'geWNb5a1I2lnmNTsXn0iyHvTybUCRJCo',
  database: 'cmnw',
  ssl: false
});

function toSlug(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toGuid(name, realm) {
  return toSlug(`${name}@${realm}`);
}

async function previewGuidFixes() {
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    const damagedResult = await client.query(`
      SELECT guid, name, realm, id, created_by, updated_by
      FROM characters 
      WHERE guid NOT LIKE '%@%' AND guid LIKE '%-%'
      ORDER BY id
      LIMIT 50
    `);
    
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║   GUID FIX PREVIEW (First 50 records)                             ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`Total damaged GUIDs found: ${damagedResult.rows.length}\n`);
    
    let collisions = 0;
    
    for (const char of damagedResult.rows) {
      const correctGuid = toGuid(char.name, char.realm);
      
      // Check for collision
      const existingResult = await client.query(
        'SELECT id FROM characters WHERE guid = $1 AND id != $2',
        [correctGuid, char.id]
      );

      const hasCollision = existingResult.rows.length > 0;
      
      console.log(`ID: ${char.id}`);
      console.log(`  Current: ${char.guid}`);
      console.log(`  New:     ${correctGuid}`);
      console.log(`  Name: ${char.name}, Realm: ${char.realm}`);
      console.log(`  Created by: ${char.created_by}`);
      console.log(`  Updated by: ${char.updated_by}`);
      
      if (hasCollision) {
        console.log(`  ⚠️  COLLISION: This GUID already exists!`);
        collisions++;
      }
      
      console.log('');
    }

    // Get total count by source
    const statsResult = await client.query(`
      SELECT created_by, COUNT(*) as count
      FROM characters 
      WHERE guid NOT LIKE '%@%' AND guid LIKE '%-%'
      GROUP BY created_by
      ORDER BY count DESC
    `);

    console.log('═'.repeat(70));
    console.log('STATISTICS BY SOURCE:');
    console.log('═'.repeat(70));
    statsResult.rows.forEach(row => {
      console.log(`${row.created_by}: ${row.count} characters`);
    });
    
    console.log('\n' + '═'.repeat(70));
    console.log(`⚠️  Potential collisions detected: ${collisions}`);
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

previewGuidFixes();
