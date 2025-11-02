# B.net API Response Structures - Quick Reference

## File Locations

```
apps/market/src/services/__responses__/
├── profession-index.json         # GET /data/wow/profession/index
├── profession-detail.json        # GET /data/wow/profession/{id}
├── skill-tier-detail.json        # GET /data/wow/profession/{id}/skill-tier/{tierId}
├── structure-summary.json        # High-level overview
├── README.md                     # Full documentation
└── QUICK_REFERENCE.md           # This file
```

## Response Types (TypeScript)

```typescript
// Import from @app/resources
import {
  BnetProfessionIndexQueryResponse,
  BnetProfessionDetailQueryResponse,
  BnetSkillTierDetailQueryResponse,
  isResponseError,
} from '@app/resources';

// Or the interface versions
import {
  IBnetProfessionIndexResponse,
  IBnetProfessionDetailResponse,
  IBnetSkillTierDetailResponse,
} from '@app/resources';
```

## Common Usage Pattern

```typescript
import { BlizzAPI } from '@alexzedim/blizzapi';
import { isResponseError } from '@app/resources';

const bnetApi = new BlizzAPI({
  region: 'eu',
  clientId: process.env.BATTLENET_CLIENT_ID,
  clientSecret: process.env.BATTLENET_CLIENT_SECRET,
});

// Query with required namespace header
const response = await bnetApi.query<BnetProfessionIndexQueryResponse>(
  '/data/wow/profession/index',
  {
    timeout: 10000,
    headers: { 'Battlenet-Namespace': 'static-eu' },
  }
);

// Always check for errors
if (isResponseError(response)) {
  logger.error('API Error:', response);
  return;
}

// Now safely destructure
const { professions } = response;
```

## Response Structure Overview

### profession-index.json
```json
{
  "_links": { "self": { "href": "..." } },
  "professions": [
    { "id": 164, "name": "Blacksmithing", "key": { "href": "..." } },
    ...
  ]
}
```

### profession-detail.json
```json
{
  "_links": { "self": { "href": "..." } },
  "id": 164,
  "name": {
    "en_US": "Blacksmithing",
    "de_DE": "Schmiedekunst",
    ...
  },
  "type": { "type": "PROFESSION", "name": "Profession" },
  "skill_tiers": [
    {
      "id": 2396,
      "tier_number": 1,
      "name": { "en_US": "Classic", ... },
      "minimum_skill_level": 1,
      "maximum_skill_level": 75,
      "key": { "href": "..." }
    },
    ...
  ]
}
```

### skill-tier-detail.json
```json
{
  "_links": { "self": { "href": "..." } },
  "id": 2396,
  "tier_number": 1,
  "minimum_skill_level": 1,
  "maximum_skill_level": 75,
  "categories": [
    {
      "id": 133,
      "name": "Weapons",
      "key": { "href": "..." },
      "recipes": [
        { "id": 2657, "key": { "href": "..." } },
        { "id": 2658, "key": { "href": "..." } },
        ...
      ]
    },
    ...
  ]
}
```

## Key Constants

### Regions (Battlenet-Namespace header values)
- `static-eu` - Europe
- `static-us` - United States  
- `static-kr` - Korea
- `static-cn` - China

### Supported Locales
12 locales in multilingual name fields:
- `en_US`, `en_GB`, `de_DE`, `fr_FR`, `es_ES`, `es_MX`, `pt_BR`, `it_IT`, `ru_RU`, `ko_KR`, `zh_TW`, `zh_CN`

### Common Profession IDs
- `164` - Blacksmithing
- `165` - Leatherworking
- `171` - Alchemy
- `202` - Engineering
- (See profession-index.json for complete list)

## Test File

**Location:** `apps/market/src/services/pricing.service.spec.ts`

**Tests:**
1. ✓ Profession index response structure
2. ✓ Profession detail response structure
3. ✓ Skill tier detail response structure
4. ✓ Response structure summary

**Run tests:**
```bash
pnpm test --testPathPatterns="pricing"
```

## Error Handling

```typescript
// Import the guard
import { isResponseError } from '@app/resources';

const response = await bnetApi.query(endpoint, options);

if (isResponseError(response)) {
  // response is a ResponseError with status, message, etc.
  console.error(`Error ${response.status}: ${response.message}`);
  
  // Handle specific error codes
  if (response.status === 429) {
    // Rate limited - implement retry logic
  } else if (response.status === 404) {
    // Not found
  } else if (response.status === 401 || response.status === 403) {
    // Authentication/Authorization failed
  }
  return;
}

// response is now typed as the successful response
const data = response; // safely accessible
```

## Debugging Tips

### 1. Verify Response Structure
Compare actual API response against JSON files in this directory.

### 2. Check TypeScript Types
If type errors occur, verify against:
- `libs/resources/src/types/api/bnet-profession.interface.ts`
- The appropriate JSON file in this directory

### 3. Validate Namespace Header
```typescript
// Missing namespace header causes errors
❌ headers: { } // Wrong!
✅ headers: { 'Battlenet-Namespace': 'static-eu' } // Correct
```

### 4. Handle Rate Limiting
B.net has rate limits. Implement backoff:
```typescript
if (isResponseError(response) && response.status === 429) {
  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, 5000));
  // Retry query
}
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `Cannot destructure 'professions' of undefined` | Check for `isResponseError()` first |
| `Property does not exist on type 'ResponseError'` | Add type guard with `isResponseError()` |
| `401/403 Unauthorized` | Verify `BATTLENET_CLIENT_ID` and `BATTLENET_CLIENT_SECRET` env vars |
| `429 Rate Limited` | Implement exponential backoff retry logic |
| `404 Not Found` | Verify profession/tier ID exists in profession-index/detail |

## Related Code

- **Service:** `apps/market/src/services/pricing.service.ts`
- **Interfaces:** `libs/resources/src/types/api/bnet-profession.interface.ts`
- **Guard Functions:** `libs/resources/src/guard/api.guard.ts`
- **Constants:** `libs/resources/src/constants/`

## References

- [Full Documentation](./README.md)
- [B.net Developer Portal](https://develop.battle.net/)
- [WoW Game Data API Docs](https://develop.battle.net/documentation/world-of-warcraft/game-data-apis)
