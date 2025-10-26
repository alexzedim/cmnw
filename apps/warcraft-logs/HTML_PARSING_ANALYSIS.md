# Warcraft Logs HTML Parsing Analysis

## Summary
After analyzing multiple Warcraft Logs report pages, we determined that **HTML parsing is not viable** for extracting character rosters due to the site's architecture.

## Findings

### 1. Single Page Application Architecture
- Warcraft Logs uses a React-based SPA
- Initial HTML contains minimal data
- Character rosters are loaded asynchronously via JavaScript/API calls

### 2. Available Data in Static HTML
The initial HTML only contains:
- **Report Creator Name**: Found in `.report-title-details-text .gold.bold`
- **Guild/Team Name**: Found in `.guild-reports-guildName`
- **UI Placeholders**: Empty divs and script tags for dynamic loading

Example from `sample-report-1.html`:
```html
<div class="report-title-details-text">
  Created by <span class="gold bold">Throttledown</span> on...
</div>
```

### 3. Character Data Loading
Character data is loaded via:
- JavaScript bundles (`report.021d945d5e0ff3cd.js`)
- API calls to WarcraftLogs GraphQL endpoint
- Dynamic DOM manipulation after page load

The `initialData` object in HTML shows:
```javascript
"characters":null,
"guilds":null
```

### 4. Current Working Solution
The existing `getCharactersFromLogs()` method in `warcraft-logs.service.ts` already correctly uses the GraphQL API:

```typescript
query {
  reportData {
    report (code: "${logId}") {
      rankedCharacters {
        name
        server { slug, normalizedName }
      }
      masterData {
        actors {
          type
          name
          server
        }
      }
    }
  }
}
```

This approach:
✅ Gets full character roster with realms
✅ Filters playable characters (type === 'Player')
✅ Removes duplicates
✅ Works within API quota limits

## Recommendation

**Continue using the existing API-based approach** (`getCharactersFromLogs`). It's the only reliable method to get complete character data.

For API quota management:
1. Implement caching of report data
2. Add exponential backoff for rate limits
3. Consider batch processing during off-peak hours
4. Use the existing `getLogsFromPage()` method to discover new logs efficiently

## HTML Parsing Method (Limited Use)

I've added `getCharactersFromReportHtml()` as a fallback that extracts only:
- Report creator name
- Guild name (if not "Personal Logs")

**⚠️ This method does NOT provide:**
- Full character roster
- Character realms
- Character classes/specs
- Pet filtering

Use only as a last resort when API is unavailable.

## Test Files Generated
- `sample-report-1.html` - Downloaded HTML for analysis
- `sample-report-2.html` - Additional sample
- `test-parse-report.ts` - Test script showing various parsing attempts

These files demonstrate why HTML parsing is insufficient.
