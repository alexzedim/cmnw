const { Client } = require('pg');
require('dotenv').config({ quiet: true });

async function checkAllForeignKeys() {
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

    // Get all tables
    console.log('=== ALL TABLES IN DATABASE ===\n');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`Found ${tablesResult.rows.length} tables:\n`);
    tablesResult.rows.forEach((row, i) => console.log(`${i + 1}. ${row.table_name}`));
    console.log('\n');

    // Check existing foreign keys
    console.log('=== EXISTING FOREIGN KEY CONSTRAINTS ===\n');
    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `);

    if (fkResult.rows.length === 0) {
      console.log('❌ No foreign key constraints found!\n');
    } else {
      console.table(fkResult.rows);
      console.log(`\nTotal: ${fkResult.rows.length}\n`);
    }

    // Check all columns that look like foreign keys
    console.log('=== POTENTIAL FOREIGN KEY COLUMNS (by naming convention) ===\n');
    const potentialFKResult = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        CASE 
          WHEN column_name LIKE '%_id' AND column_name != 'uuid' THEN 
            REGEXP_REPLACE(column_name, '_id$', 's')
          WHEN column_name LIKE '%_guid' THEN
            REGEXP_REPLACE(column_name, '_guid$', 's')
          WHEN column_name = 'realm' THEN 'realms'
          ELSE NULL
        END as potential_reference_table
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          column_name LIKE '%_id' OR 
          column_name LIKE '%_guid' OR
          column_name = 'realm'
        )
        AND column_name NOT IN ('uuid', 'created_by', 'updated_by')
      ORDER BY table_name, column_name;
    `);
    console.table(potentialFKResult.rows);
    console.log(`\nTotal potential foreign key columns: ${potentialFKResult.rows.length}\n`);

    // Specific relationship checks
    console.log('=== DETAILED RELATIONSHIP ANALYSIS ===\n');

    // 1. Characters relationships
    console.log('1. CHARACTERS TABLE');
    const charRelations = await client.query(`
      SELECT 
        'guild_id -> guilds.id' as relationship,
        COUNT(*) as total_records,
        COUNT(c.guild_id) as with_foreign_key,
        COUNT(g.id) as matching_records,
        COUNT(c.guild_id) - COUNT(g.id) as orphaned
      FROM characters c
      LEFT JOIN guilds g ON c.guild_id = g.id
      WHERE c.guild_id IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'guild_guid -> guilds.guid' as relationship,
        COUNT(*) as total_records,
        COUNT(c.guild_guid) as with_foreign_key,
        COUNT(g.guid) as matching_records,
        COUNT(c.guild_guid) - COUNT(g.guid) as orphaned
      FROM characters c
      LEFT JOIN guilds g ON c.guild_guid = g.guid
      WHERE c.guild_guid IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'realm -> realms.slug' as relationship,
        COUNT(*) as total_records,
        COUNT(c.realm) as with_foreign_key,
        COUNT(r.slug) as matching_records,
        COUNT(c.realm) - COUNT(r.slug) as orphaned
      FROM characters c
      LEFT JOIN realms r ON c.realm = r.slug
      WHERE c.realm IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'realm_id -> realms.id' as relationship,
        COUNT(*) as total_records,
        COUNT(c.realm_id) as with_foreign_key,
        COUNT(r.id) as matching_records,
        COUNT(c.realm_id) - COUNT(r.id) as orphaned
      FROM characters c
      LEFT JOIN realms r ON c.realm_id = r.id
      WHERE c.realm_id IS NOT NULL;
    `);
    console.table(charRelations.rows);

    // 2. Guild Members relationships
    console.log('\n2. CHARACTERS_GUILD_MEMBERS TABLE');
    const memberRelations = await client.query(`
      SELECT 
        'guild_guid -> guilds.guid' as relationship,
        COUNT(*) as total_records,
        COUNT(cgm.guild_guid) as with_foreign_key,
        COUNT(g.guid) as matching_records,
        COUNT(cgm.guild_guid) - COUNT(g.guid) as orphaned
      FROM characters_guild_members cgm
      LEFT JOIN guilds g ON cgm.guild_guid = g.guid
      
      UNION ALL
      
      SELECT 
        'character_guid -> characters.guid' as relationship,
        COUNT(*) as total_records,
        COUNT(cgm.character_guid) as with_foreign_key,
        COUNT(c.guid) as matching_records,
        COUNT(cgm.character_guid) - COUNT(c.guid) as orphaned
      FROM characters_guild_members cgm
      LEFT JOIN characters c ON cgm.character_guid = c.guid
      
      UNION ALL
      
      SELECT 
        'realm -> realms.slug' as relationship,
        COUNT(*) as total_records,
        COUNT(cgm.realm) as with_foreign_key,
        COUNT(r.slug) as matching_records,
        COUNT(cgm.realm) - COUNT(r.slug) as orphaned
      FROM characters_guild_members cgm
      LEFT JOIN realms r ON cgm.realm = r.slug;
    `);
    console.table(memberRelations.rows);

    // 3. Items relationships (mounts, pets, market, pricing)
    console.log('\n3. ITEMS-RELATED TABLES');
    const itemRelations = await client.query(`
      SELECT 
        'characters_mounts.item_id -> items.id' as relationship,
        COUNT(*) as total_records,
        COUNT(cm.item_id) as with_foreign_key,
        COUNT(i.id) as matching_records,
        COUNT(cm.item_id) - COUNT(i.id) as orphaned
      FROM characters_mounts cm
      LEFT JOIN items i ON cm.item_id = i.id
      WHERE cm.item_id IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'market.item_id -> items.id' as relationship,
        COUNT(*) as total_records,
        COUNT(m.item_id) as with_foreign_key,
        COUNT(i.id) as matching_records,
        COUNT(m.item_id) - COUNT(i.id) as orphaned
      FROM market m
      LEFT JOIN items i ON m.item_id = i.id
      WHERE m.item_id IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'pricing.item_id -> items.id' as relationship,
        COUNT(*) as total_records,
        COUNT(p.item_id) as with_foreign_key,
        COUNT(i.id) as matching_records,
        COUNT(p.item_id) - COUNT(i.id) as orphaned
      FROM pricing p
      LEFT JOIN items i ON p.item_id = i.id
      WHERE p.item_id IS NOT NULL;
    `);
    console.table(itemRelations.rows);

    // 4. Guilds relationships
    console.log('\n4. GUILDS TABLE');
    const guildRelations = await client.query(`
      SELECT 
        'realm -> realms.slug' as relationship,
        COUNT(*) as total_records,
        COUNT(g.realm) as with_foreign_key,
        COUNT(r.slug) as matching_records,
        COUNT(g.realm) - COUNT(r.slug) as orphaned
      FROM guilds g
      LEFT JOIN realms r ON g.realm = r.slug
      WHERE g.realm IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'realm_id -> realms.id' as relationship,
        COUNT(*) as total_records,
        COUNT(g.realm_id) as with_foreign_key,
        COUNT(r.id) as matching_records,
        COUNT(g.realm_id) - COUNT(r.id) as orphaned
      FROM guilds g
      LEFT JOIN realms r ON g.realm_id = r.id
      WHERE g.realm_id IS NOT NULL;
    `);
    console.table(guildRelations.rows);

    // Summary
    console.log('\n=== SUMMARY ===\n');
    console.log('Current State:');
    console.log('- Foreign Key Constraints:', fkResult.rows.length);
    console.log('- Potential FK Columns:', potentialFKResult.rows.length);
    console.log('\nRecommendation: Define foreign keys for data integrity');

  } catch (error) {
    console.error('✗ Check failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

checkAllForeignKeys();
