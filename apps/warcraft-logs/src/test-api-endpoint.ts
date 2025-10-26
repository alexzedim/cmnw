import axios from 'axios';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-GB,en;q=0.5',
  'X-Requested-With': 'XMLHttpRequest',
  'DNT': '1',
  'Sec-GPC': '1',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Referer': 'https://www.warcraftlogs.com/reports/',
};

interface FriendlyCharacter {
  id: number;
  guid: number;
  name: string;
  type: string;
  server: string;
  icon: string;
  specs?: Array<{ spec: string; count: number }>;
  minItemLevel?: number;
  maxItemLevel?: number;
  potionUse?: number;
  healthstoneUse?: number;
  fights?: Array<{ id: number }>;
}

interface FightsAndParticipantsResponse {
  fights: Array<any>;
  friendlies: FriendlyCharacter[];
  enemies: Array<any>;
  phases: Array<any>;
  start: number;
  end: number;
  owner: string;
  title: string;
  zone: number;
}

async function testFightsAndParticipantsAPI(logId: string): Promise<void> {
  try {
    console.log(`\n📡 Fetching fights and participants for log: ${logId}`);
    const url = `https://www.warcraftlogs.com/reports/fights-and-participants/${logId}/0`;
    
    const response = await axios.get<FightsAndParticipantsResponse>(url, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });

    console.log(`✓ Response received (${JSON.stringify(response.data).length} bytes)\n`);

    // Debug: Show the actual response structure
    console.log('🔍 Response keys:', Object.keys(response.data));
    console.log('🔍 Sample data:', JSON.stringify(response.data).substring(0, 500));
    console.log();

    // Extract basic report info
    console.log('📋 Report Info:');
    console.log(`  Title: ${response.data.title}`);
    console.log(`  Owner: ${response.data.owner}`);
    console.log(`  Zone: ${response.data.zone}`);
    console.log(`  Fights: ${response.data.fights?.length || 0}`);
    console.log();

    // Extract friendly characters (players)
    const friendlies = response.data.friendlies || [];
    console.log(`🔍 Total friendlies: ${friendlies.length}`);
    if (friendlies.length > 0) {
      console.log(`🔍 First friendly sample:`, JSON.stringify(friendlies[0], null, 2));
    }
    
    // Filter out NPCs and pets - players have class names as type (e.g., "Shaman", "Warrior")
    const players = friendlies.filter(f => f.type !== 'NPC' && f.server);
    
    console.log(`👥 Players Found: ${players.length}`);
    console.log('=' .repeat(80));
    
    players.forEach((player, idx) => {
      console.log(`\n${idx + 1}. ${player.name} @ ${player.server}`);
      console.log(`   Type: ${player.type}`);
      console.log(`   ID: ${player.id} | GUID: ${player.guid}`);
      console.log(`   Icon: ${player.icon}`);
      
      if (player.specs && player.specs.length > 0) {
        console.log(`   Specs: ${player.specs.map(s => `${s.spec} (${s.count})`).join(', ')}`);
      }
      
      if (player.minItemLevel || player.maxItemLevel) {
        console.log(`   iLevel: ${player.minItemLevel} - ${player.maxItemLevel}`);
      }
      
      if (player.fights) {
        console.log(`   Fights participated: ${player.fights.length}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Successfully extracted ${players.length} unique players with realms!`);
    
    // Show unique name-realm pairs
    console.log('\n📝 Character List (name @ realm):');
    players.forEach(p => {
      console.log(`  - ${p.name} @ ${p.server}`);
    });

    return;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (axios.isAxiosError(error)) {
      console.error('  Status:', error.response?.status);
      console.error('  Status Text:', error.response?.statusText);
    }
    throw error;
  }
}

// Test with multiple log IDs
const testLogIds = [
  'afwJNbm9CMGPFBW3', // From your example
  'JxbGh3cWF71YHzTD', // Original test log
  'G3ZMapzNxc16d9rh', // Another log
];

(async () => {
  for (let i = 0; i < testLogIds.length; i++) {
    const logId = testLogIds[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Test ${i + 1}/${testLogIds.length}: ${logId}`);
    console.log('='.repeat(80));
    
    try {
      await testFightsAndParticipantsAPI(logId);
    } catch (error) {
      console.error(`Failed for log ${logId}`);
    }
    
    if (i < testLogIds.length - 1) {
      console.log('\n⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 All tests complete!');
})();
