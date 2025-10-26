import axios from 'axios';
import * as cheerio from 'cheerio';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

interface CharacterInfo {
  name: string;
  realm: string;
}

async function parseWarcraftLogsReport(logId: string): Promise<CharacterInfo[]> {
  try {
    console.log(`📡 Fetching report: ${logId}`);
    const url = `https://www.warcraftlogs.com/reports/${logId}`;
    
    const response = await axios.get<string>(url, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });

    console.log(`✓ Page loaded (${response.data.length} bytes)`);
    
    const $ = cheerio.load(response.data);
    const characters = new Map<string, CharacterInfo>();

    // Method 1: Look for character-details class
    console.log('\n🔍 Method 1: Searching for .character-details');
    $('.character-details').each((idx, element) => {
      console.log(`  Found element ${idx}:`, $(element).attr('class'));
      const text = $(element).text();
      console.log(`    Text content: ${text.substring(0, 100)}`);
    });

    // Method 2: Look for any links containing character info
    console.log('\n🔍 Method 2: Searching for character links in page');
    $('a[href*="character"]').each((idx, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      if (idx < 10) { // Log first 10
        console.log(`  Link ${idx}: ${text} -> ${href}`);
      }
    });

    // Method 3: Look for data attributes
    console.log('\n🔍 Method 3: Searching for data-character-* attributes');
    $('[data-character-name], [data-character-server]').each((idx, element) => {
      const name = $(element).attr('data-character-name');
      const server = $(element).attr('data-character-server');
      if (idx < 10) {
        console.log(`  Character ${idx}: ${name} @ ${server}`);
      }
    });

    // Method 4: Look in tables
    console.log('\n🔍 Method 4: Searching for tables with character data');
    $('table tbody tr').slice(0, 10).each((idx, row) => {
      const cells = $(row).find('td');
      if (cells.length > 0) {
        console.log(`  Row ${idx}:`, cells.map((i, cell) => $(cell).text().trim().substring(0, 30)).get().join(' | '));
      }
    });

    // Method 5: Look for any script tags with character data
    console.log('\n🔍 Method 5: Searching for JSON/script data');
    $('script').each((idx, script) => {
      const content = $(script).html();
      if (content) {
        // Look for initialData or bootstrap patterns
        const initialDataMatch = content.match(/initialData\s*:\s*(\{[\s\S]+?\})(?:,\s*\w+:|\s*\})/i);
        if (initialDataMatch) {
          console.log(`  Script ${idx} has initialData!`);
          try {
            const jsonStr = initialDataMatch[1];
            console.log('    Attempting to parse JSON (first 1000 chars):', jsonStr.substring(0, 1000));
            
            // Try to find character/actor data within it
            if (jsonStr.includes('actors') || jsonStr.includes('characters') || jsonStr.includes('masterData')) {
              console.log('    ✅ Contains actor/character data!');
            }
          } catch (e) {
            console.log('    Parse failed:', e.message);
          }
        }
        
        // Look for reportData patterns
        const reportDataMatch = content.match(/reportData["']?\s*:\s*\{[\s\S]{0,5000}/i);
        if (reportDataMatch) {
          console.log(`  Script ${idx} has reportData (first 800 chars):`);
          console.log(reportDataMatch[0].substring(0, 800));
        }
        
        // Look for window assignments
        const windowMatch = content.match(/window\[['"]([^'"]+)['"]]\s*=\s*\{[\s\S]{0,500}/g);
        if (windowMatch && windowMatch.length > 0) {
          windowMatch.slice(0, 2).forEach((match, i) => {
            console.log(`  Script ${idx} window assignment ${i} (first 400 chars):`);
            console.log(match.substring(0, 400));
          });
        }
      }
    });

    // Method 6: Look for specific div structures
    console.log('\n🔍 Method 6: Searching for div structures with character info');
    $('div[class*="character"], div[class*="player"], div[class*="actor"]').slice(0, 10).each((idx, element) => {
      console.log(`  Div ${idx}: class="${$(element).attr('class')}" text="${$(element).text().trim().substring(0, 50)}"`);
    });

    console.log('\n📊 Total unique characters found:', characters.size);
    return Array.from(characters.values());

  } catch (error) {
    console.error('❌ Error parsing report:', error.message);
    if (axios.isAxiosError(error)) {
      console.error('  Status:', error.response?.status);
      console.error('  Data:', error.response?.data?.substring(0, 200));
    }
    throw error;
  }
}

async function getRecentLogIds(): Promise<string[]> {
  try {
    console.log('📡 Fetching recent log IDs from zone reports page...');
    const url = 'https://www.warcraftlogs.com/zone/reports';
    
    const response = await axios.get<string>(url, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const logIds: string[] = [];

    // Look for report links
    $('a[href*="/reports/"]').each((idx, element) => {
      const href = $(element).attr('href');
      if (href) {
        const match = href.match(/\/reports\/([A-Za-z0-9]{16})/);
        if (match && match[1]) {
          logIds.push(match[1]);
        }
      }
    });

    // Remove duplicates
    const uniqueLogIds = [...new Set(logIds)];
    console.log(`✓ Found ${uniqueLogIds.length} unique log IDs\n`);
    
    return uniqueLogIds.slice(0, 5); // Return first 5 for testing
  } catch (error) {
    console.error('❌ Error fetching log IDs:', error.message);
    return ['JxbGh3cWF71YHzTD']; // Fallback to example
  }
}

// Main execution
(async () => {
  const logIds = await getRecentLogIds();
  
  console.log(`🧪 Testing with ${logIds.length} log IDs:`, logIds.join(', '), '\n');
  console.log('='.repeat(80), '\n');

  for (let i = 0; i < logIds.length; i++) {
    const logId = logIds[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 Test ${i + 1}/${logIds.length}: ${logId}`);
    console.log('='.repeat(80));
    
    try {
      const characters = await parseWarcraftLogsReport(logId);
      console.log('\n✅ Results:', JSON.stringify(characters, null, 2));
    } catch (error) {
      console.error('\n❌ Failed:', error.message);
    }
    
    // Small delay between requests
    if (i < logIds.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next request...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 Testing complete');
})();
