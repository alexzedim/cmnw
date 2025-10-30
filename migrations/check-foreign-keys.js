const { Client } = require('pg');
require('dotenv').config({ quiet: true });

async function checkForeignKeys() {
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

    // Check all foreign key constraints
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
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    if (fkResult.rows.length === 0) {
      console.log('❌ No foreign key constraints found!\n');
    } else {
      console.table(fkResult.rows);
      console.log(`\nTotal foreign keys: ${fkResult.rows.length}\n`);
    }

    // Check guild-related relationships that SHOULD exist
    console.log('=== POTENTIAL GUILD RELATIONSHIPS ===\n');
    
    console.log('1. Characters -> Guilds');
    const charGuildCheck = await client.query(`
      SELECT 
        COUNT(DISTINCT c.guild_guid) as unique_guild_guids_in_characters,
        COUNT(DISTINCT g.guid) as matching_guilds,
        COUNT(DISTINCT c.guild_guid) - COUNT(DISTINCT g.guid) as orphaned_references
      FROM characters c
      LEFT JOIN guilds g ON c.guild_guid = g.guid
      WHERE c.guild_guid IS NOT NULL;
    `);
    console.table(charGuildCheck.rows);

    console.log('\n2. Characters Guild Members -> Guilds');
    const memberGuildCheck = await client.query(`
      SELECT 
        COUNT(DISTINCT cgm.guild_guid) as unique_guild_guids_in_members,
        COUNT(DISTINCT g.guid) as matching_guilds,
        COUNT(DISTINCT cgm.guild_guid) - COUNT(DISTINCT g.guid) as orphaned_references
      FROM characters_guild_members cgm
      LEFT JOIN guilds g ON cgm.guild_guid = g.guid;
    `);
    console.table(memberGuildCheck.rows);

    console.log('\n3. Characters Guild Members -> Characters');
    const memberCharCheck = await client.query(`
      SELECT 
        COUNT(DISTINCT cgm.character_guid) as unique_char_guids_in_members,
        COUNT(DISTINCT c.guid) as matching_characters,
        COUNT(DISTINCT cgm.character_guid) - COUNT(DISTINCT c.guid) as orphaned_references
      FROM characters_guild_members cgm
      LEFT JOIN characters c ON cgm.character_guid = c.guid;
    `);
    console.table(memberCharCheck.rows);

    console.log('\n4. Characters Guilds Logs -> Guilds');
    const logsGuildCheck = await client.query(`
      SELECT 
        COUNT(DISTINCT cgl.guild_guid) as unique_guild_guids_in_logs,
        COUNT(DISTINCT g.guid) as matching_guilds,
        COUNT(DISTINCT cgl.guild_guid) - COUNT(DISTINCT g.guid) as orphaned_references
      FROM characters_guilds_logs cgl
      LEFT JOIN guilds g ON cgl.guild_guid = g.guid
      WHERE cgl.guild_guid IS NOT NULL;
    `);
    console.table(logsGuildCheck.rows);

    console.log('\n5. Characters Guilds Logs -> Characters');
    const logsCharCheck = await client.query(`
      SELECT 
        COUNT(DISTINCT cgl.character_guid) as unique_char_guids_in_logs,
        COUNT(DISTINCT c.guid) as matching_characters,
        COUNT(DISTINCT cgl.character_guid) - COUNT(DISTINCT c.guid) as orphaned_references
      FROM characters_guilds_logs cgl
      LEFT JOIN characters c ON cgl.character_guid = c.guid
      WHERE cgl.character_guid IS NOT NULL;
    `);
    console.table(logsCharCheck.rows);

    // Check indexes
    console.log('\n=== INDEXES ON GUID COLUMNS ===\n');
    const indexResult = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (indexdef LIKE '%guild_guid%' OR indexdef LIKE '%character_guid%')
      ORDER BY tablename, indexname;
    `);
    console.table(indexResult.rows);

  } catch (error) {
    console.error('✗ Check failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

checkForeignKeys();
