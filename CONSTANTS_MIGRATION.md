# Constants and Types Migration

This document describes the migration of constants and types from worker files to the proper shared library location.

## Migration Summary

### Constants Moved

**From:** `apps/osint/src/workers/guilds.worker.constants.ts`  
**To:** `libs/resources/src/constants/osint.constants.ts`

#### Added Constants:

```typescript
export const GUILD_WORKER_CONSTANTS = {
  ROSTER_CONCURRENCY: 20,
  NOT_EU_REGION_STATUS_CODE: 305,
  ERROR_STATUS_CODE: 500,
  SUCCESS_STATUS_CODE: 200,
  TOO_MANY_REQUESTS_STATUS_CODE: 429,
  
  PROGRESS: {
    INITIAL: 5,
    AFTER_AUTH: 10,
    AFTER_SUMMARY: 25,
    AFTER_ROSTER: 50,
    AFTER_DIFF: 90,
    COMPLETE: 100,
  },
  
  QUEUE_PRIORITY: {
    GUILD_MASTER: 2,
  },
} as const;

export const GUILD_SUMMARY_KEYS = ['id', 'name', 'achievement_points'] as const;
```

### Types Already in Correct Location

The following types were already properly organized in `libs/resources/src/types/`:

#### `osint.type.ts`
- `GuildExistsOrCreate` - Guild entity creation result
- `CharacterExistsOrCreate` - Character entity creation result
- `WowProgressProfile` - WowProgress profile data
- `WarcraftLogsProfile` - WarcraftLogs profile data
- `CharactersHashType` - Character hash field types

#### `osint.interface.ts`
- `IGuildSummary` - Guild summary data from Blizzard API
- `IGuildRoster` - Guild roster data
- `ICharacterGuildMember` - Guild member data
- Various other OSINT-related interfaces

#### `queue.type.ts` & `queue.interface.ts`
- `GuildJobQueue` - Guild worker queue job data
- `CharacterJobQueue` - Character worker queue job data
- Other queue-related types

## Import Changes

### Before Migration

```typescript
// In worker services
import { GUILD_WORKER_CONSTANTS, GUILD_SUMMARY_KEYS } from '../guilds.worker.constants';
```

### After Migration

```typescript
// In worker services
import { GUILD_WORKER_CONSTANTS, GUILD_SUMMARY_KEYS } from '@app/resources';
```

## Files Updated

1. ✅ `libs/resources/src/constants/osint.constants.ts` - Added new constants
2. ✅ `apps/osint/src/workers/services/guild-summary.service.ts` - Updated imports
3. ✅ `apps/osint/src/workers/services/guild-member.service.ts` - Updated imports
4. ✅ `apps/osint/src/workers/guilds.worker.constants.ts` - **REMOVED** (no longer needed)
5. ✅ `apps/osint/REFACTORING_SUMMARY.md` - Updated documentation

## Benefits

### 1. **Centralized Configuration**
All OSINT-related constants are now in one place: `libs/resources/src/constants/osint.constants.ts`

### 2. **Reusability**
Constants can be used across multiple applications/modules:
- OSINT worker services
- API endpoints
- Tests
- Other microservices

### 3. **Maintainability**
- Single source of truth for values
- Changes propagate automatically
- No duplicate constants
- Easier to track constant usage

### 4. **Type Safety**
Using `as const` ensures TypeScript treats these as literal types, providing better type checking.

### 5. **Proper Structure**
Follows the monorepo pattern where shared resources live in `/libs/resources`

## Constants Organization in `/libs/resources/src/constants/`

```
constants/
├── index.ts (exports all)
├── osint.constants.ts (OSINT/WoW-related constants)
├── api.constants.ts (API-related constants)
├── core.constants.ts (Core application constants)
├── dma.constants.ts (DMA-specific constants)
├── http.constants.ts (HTTP status codes, etc.)
└── status-labels.constants.ts (Status label mappings)
```

## Types Organization in `/libs/resources/src/types/`

```
types/
├── index.ts (exports all)
├── osint/
│   ├── osint.interface.ts (OSINT interfaces)
│   ├── osint.type.ts (OSINT type aliases)
│   └── index.ts
├── queue/
│   ├── queue.interface.ts (Queue job interfaces)
│   ├── queue.type.ts (Queue type aliases)
│   └── index.ts
├── worker/
│   ├── worker.interface.ts (Worker interfaces)
│   └── index.ts
└── ... (other domain types)
```

## Usage Examples

### Importing Constants

```typescript
import { 
  GUILD_WORKER_CONSTANTS, 
  GUILD_SUMMARY_KEYS,
  OSINT_GM_RANK,
  ACTION_LOG,
  OSINT_SOURCE 
} from '@app/resources';

// Use in code
const concurrency = GUILD_WORKER_CONSTANTS.ROSTER_CONCURRENCY;
const isGM = member.rank === OSINT_GM_RANK;
const progress = GUILD_WORKER_CONSTANTS.PROGRESS.INITIAL;
```

### Importing Types

```typescript
import { 
  GuildExistsOrCreate,
  IGuildSummary,
  IGuildRoster,
  GuildJobQueue 
} from '@app/resources';

// Use in code
const result: GuildExistsOrCreate = await this.guildExistOrCreate(args);
```

## Migration Checklist

- [x] Move constants to `/libs/resources/src/constants/osint.constants.ts`
- [x] Update imports in service files
- [x] Remove old constants file
- [x] Update documentation
- [x] Verify types are in correct location
- [ ] Run tests to ensure everything works
- [ ] Commit changes with descriptive message

## Recommended Commit Message

```
refactor(osint): move guild worker constants to libs/resources

- Move GUILD_WORKER_CONSTANTS and GUILD_SUMMARY_KEYS to libs/resources/src/constants/osint.constants.ts
- Update imports in guild-summary.service.ts and guild-member.service.ts
- Remove apps/osint/src/workers/guilds.worker.constants.ts
- Centralize constants for better reusability and maintainability
- All types already properly organized in libs/resources/src/types/

BREAKING CHANGE: Import path changed from './guilds.worker.constants' to '@app/resources'
```

## Testing

After migration, verify:

```bash
# Build the project
pnpm build

# Run tests
pnpm test guild-summary.service.spec.ts
pnpm test guild-member.service.spec.ts

# Lint check
pnpm lint
```

## Future Considerations

1. Consider extracting other worker-specific constants to shared location
2. Evaluate if progress values should be configurable via environment variables
3. Document any additional worker constants that might need migration
4. Consider creating a constants migration guide for other workers
