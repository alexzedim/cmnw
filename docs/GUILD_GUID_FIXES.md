# Guild GUID Format Fixes - Service Layer

## Issue
Several services were using `toSlug()` instead of `toGuid()` for character guids, which corrupted the `@` separator by converting it to `-`.

## Root Cause
`toSlug()` converts ALL special characters (including `@`) to dashes, while `toGuid()` preserves the `@` separator between name and realm.

**Correct:**
```typescript
toGuid(name, realm) // → "name@realm"
```

**Incorrect:**
```typescript
toSlug(`${name}@${realm}`) // → "name-realm" ❌
```

## Files Fixed

### 1. ✅ `apps/warcraft-logs/src/warcraft-logs.service.ts`
**Line:** 571
**Before:**
```typescript
guid: toSlug(`${character.name}@${character.server}`),
```
**After:**
```typescript
guid: toGuid(character.name, character.server),
```

### 2. ✅ `apps/wow-progress/src/services/wow-progress.lfg.service.ts`
**Line:** 315
**Before:**
```typescript
const guid = toSlug(`${name}@${realm}`);
```
**After:**
```typescript
const guid = toGuid(name, realm);
```
**Also Added:** `toGuid` to imports (line 25)

### 3. ✅ `apps/osint/src/services/guild-roster.service.ts`
**Line:** 93
**Before:**
```typescript
const guid = toSlug(`${member.character.name}@${realmSlug}`);
```
**After:**
```typescript
const guid = toGuid(member.character.name, realmSlug);
```

### 4. ✅ `apps/osint/src/services/character-lifecycle.service.ts`
**Line:** 117 (Fixed earlier)
**Before:**
```typescript
if (hasGuildGuid) characterNew.guildGuid = toSlug(character.guildGuid);
```
**After:**
```typescript
if (hasGuildGuid) characterNew.guildGuid = character.guildGuid;
```

## Services Already Correct

### ✅ `apps/wow-progress/src/services/wow-progress.ranks.service.ts`
**Line:** 542
```typescript
const guildGuid = toGuid(obj.name, realmSlug); // ✅ Correct
```

### ✅ `apps/guilds/src/guilds.service.ts`
**Lines:** 279, 284, 298
```typescript
toGuid(guildEntry.guild.name, guildEntry.guild.realm.slug) // ✅ Correct
```

### ✅ `apps/osint/src/workers/guilds.worker.ts`
**Line:** 171 (error handling)
```typescript
const guid = job.data?.name && job.data?.realm ? `${job.data.name}@${job.data.realm}` : 'unknown'; // ✅ Correct
```

## Verification

All services now correctly use `toGuid(name, realm)` which produces the format: `{slug}@{realm}`

**Examples:**
```typescript
toGuid("Танцы в трусиках", "gordunni") → "танцы-в-трусиках@gordunni" ✅
toGuid("Reddit", "stormscale")        → "reddit@stormscale" ✅
toGuid("Bloody Tearz", "dalaran")     → "bloody-tearz@dalaran" ✅
```

## Impact

- ✅ All new character and guild records will use correct `@` format
- ✅ Services will no longer corrupt guids when queuing jobs
- ✅ Database integrity maintained going forward
- ✅ Existing data already migrated (see `FINAL_REPORT.md`)

## Testing

To verify these services are working correctly:
1. Start warcraft-logs service - check character queue guids
2. Start wow-progress services - check guild and character queue guids
3. Start osint workers - check guild roster character guids

All should contain `@` separator, not `-`.

## Related Documentation

- `docs/FOREIGN_KEY_POLICY.md` - Foreign key policy decision
- `migrations/FINAL_REPORT.md` - Database migration results
- `libs/resources/src/utils/converters.ts` - `toGuid()` implementation
