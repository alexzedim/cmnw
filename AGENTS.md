# CMNW - AI Agent Instructions

> **CMNW (Community Network)** - NestJS microservices platform for World of Warcraft OSINT and market analytics.

## Project Info

- **Version**: 6.10.13
- **Framework**: NestJS 11.x with TypeScript 5.9.3
- **Runtime**: Node.js >=24.0.0, pnpm 10.32.1
- **Databases**: PostgreSQL (TypeORM), Redis
- **Message Queue**: BullMQ

---

## Build & Dev Commands

```bash
# Install dependencies
pnpm install

# Build all services
pnpm build:all

# Build single service
nest build {service}

# Development with watch
nest start {service} --watch

# Lint & Format
pnpm lint
pnpm format

# Docker build
pnpm docker:build
```

---

## Architecture

### Microservices (13 apps)

| Service       | Port | Purpose                      |
| ------------- | ---- | ---------------------------- |
| core          | 3000 | Realms, Keys, Auth           |
| api           | 8080 | REST Gateway + Swagger       |
| osint         | 3000 | Character/Guild intelligence |
| dma           | 3004 | Auction house monitoring     |
| market        | 3002 | XVA calculations             |
| characters    | -    | Player profiles              |
| guilds        | -    | Guild analytics              |
| analytics     | -    | Metrics aggregation          |
| ladder        | -    | Leaderboards                 |
| valuations    | -    | Financial modeling           |
| warcraft-logs | -    | Raid analytics               |
| wow-progress  | -    | Progress tracking            |
| tests         | -    | E2E tests                    |

### Shared Libraries

| Library            | Purpose                                                                              |
| ------------------ | ------------------------------------------------------------------------------------ |
| @app/resources     | DTOs, queues, constants, utils, guards, types, services, transformers, enums, errors |
| @app/configuration | Centralized config (postgres, redis, osint, dma, s3, blizzard)                       |
| @app/pg            | PostgreSQL entities (26 tables) and enums                                            |
| @app/logger        | Structured logging with Loki integration                                             |
| @app/s3            | AWS S3 storage integration                                                           |

#### @app/resources Structure

The primary shared library containing all domain-specific types, DTOs, constants, and utilities.

```
libs/resources/src/
├── constants/       # Application constants (osint, dma, core, api, http, status)
├── dao/             # Data Access Objects (character, market, analytics, realms, keys)
├── dto/             # Data Transfer Objects (account, analytics, auth, character, contracts, discord, guild, item, queue, realm, search, wow)
├── enums/           # Application enums (analytics)
├── errors/          # Custom errors (rate-limit)
├── guard/           # NestJS Guards (api, community, dma, osint, profession)
├── queues/          # BullMQ queue configurations (characters, guilds, profile, auctions, items, valuations, realms)
├── services/        # Shared services (blizzard-api)
├── swagger/         # Swagger decorators and validators
├── transformers/    # Data transformers
├── types/           # TypeScript types (auth, queue, osint, community, api, dma, worker, http, evaluation, analytics, app, ladder)
└── utils/           # Utility functions (helpers, cipher, headers, percentile, character-status, axios-retry, concurrency, circuit-breaker)
```

**Key Exports:**

```typescript
// Constants
import { MAX_LEVEL, OSINT_CHARACTER_LIMIT, FACTION, ACTION_LOG, OSINT_SOURCE } from '@app/resources/constants';

// Utilities
import {
  toSlug,
  toGuid,
  toDate,
  toGold,
  delay,
  delayWithJitter,
  setStatusString,
  getStatusString,
} from '@app/resources/utils';
import { CircuitBreaker, ConcurrencyLimiter, retryWithBackoff } from '@app/resources/utils';

// Types
import { CharacterMessageDto, GuildMessageDto, AuctionMessageDto } from '@app/resources/dto';
import { IBlizzardConfig, IWorkerConfig } from '@app/resources/types';

// Guards
import { OsintGuard, ApiGuard, CommunityGuard, DmaGuard, ProfessionGuard } from '@app/resources/guard';

// Queues
import { charactersQueue, guildsQueue, auctionsQueue } from '@app/resources/queues';

// Enums
import { CMNW_ENTITY_ENUM, CMNW_QUEUE_ENUM } from '@app/resources/enums';
```

#### @app/configuration Structure

Environment-based configuration modules using NestJS ConfigService.

```
libs/configuration/src/
├── interfaces/      # TypeScript interfaces for all configs
├── blizzard.config.ts      # Blizzard API config
├── cmnw.config.ts          # Core CMNW config
├── dma.config.ts           # DMA service config
├── loki.config.ts          # Loki logging config
├── osint.config.ts         # OSINT service config
├── postgres.config.ts      # PostgreSQL connection config
├── queue.config.ts         # BullMQ queue config
├── redis.config.ts         # Redis connection config
├── s3.config.ts           # AWS S3 config
├── valuations.config.ts    # Valuations service config
├── worker.config.ts        # Worker configuration
└── core.config.ts          # Core service config
```

**Key Exports:**

```typescript
import {
  coreConfig,
  postgresConfig,
  redisConfig,
  osintConfig,
  dmaConfig,
  blizzardConfig,
  workerConfig,
  queueConfig,
} from '@app/configuration';
```

#### @app/pg Structure

PostgreSQL TypeORM entities and enums.

```
libs/pg/src/
├── entity/          # TypeORM entities (characters, guilds, realms, keys, items, auctions, valuations, etc.)
└── enum/            # Database enums (entity, auth-provider)
```

**Key Exports:**

```typescript
import { CharactersEntity, GuildsEntity, RealmsEntity, KeysEntity, ItemsEntity, AuctionsEntity } from '@app/pg';

import { CMNW_ENTITY_ENUM, CMNW_QUEUE_ENUM, AUTH_PROVIDER_ENUM } from '@app/pg';
```

#### @app/logger Structure

Structured logging service with Loki integration and context-aware logging.

```
libs/logger/src/
├── logger.module.ts     # NestJS module
├── logger.service.ts    # Main LoggerService
├── logger.guard.ts      # Request-scoped logging guard
├── logger.type.ts       # Logger types and interfaces
└── logger.worker.ts     # Worker-specific logging utilities
```

**Key Exports:**

```typescript
import { LoggerService } from '@app/logger';
import { LoggerModule } from '@app/logger';

// Usage
private readonly logger = new Logger(CharacterService.name, { timestamp: true });
this.logger.error({ logTag: 'ERROR', errorOrException: error });
this.logger.info({ logTag: 'INFO', data: { count: 10 } });
```

#### @app/s3 Structure

AWS S3 storage integration for file operations.

```
libs/s3/src/
├── s3.module.ts     # NestJS module
├── s3.service.ts    # S3 operations service
└── interfaces/      # S3 type definitions
```

**Key Exports:**

```typescript
import { S3Service } from '@app/s3';
import { S3Module } from '@app/s3';
```

---

## Library Usage Priority

When implementing features, use libraries in this priority order:

1. **@app/resources** (Highest Priority)
   - Always check `@app/resources` first for existing types, DTOs, constants, utils, guards
   - Before creating new `const`, `enum`, `type`, `interface`, or utility functions, ALWAYS check if they exist in `@app/resources`
   - If needed, add new exports to `@app/resources` rather than creating them in service-specific locations

2. **@app/pg**
   - Use TypeORM entities from `@app/pg` for all database operations
   - Use entity enums (`CMNW_ENTITY_ENUM`) for table name references

3. **@app/configuration**
   - Use config modules for all environment-dependent settings
   - Never hardcode configuration values

4. **@app/logger**
   - Use `LoggerService` for all logging operations
   - Always use structured logging with `{ logTag, ...data }` format

5. **@app/s3** (Lowest Priority)
   - Use for file storage operations when needed

**Rule**: If something can be reused across services, it belongs in `@app/resources` or `@app/pg`. Only create service-specific code when it truly cannot be shared.

---

## Code Style

### Naming Conventions

| Type       | Convention       | Example                |
| ---------- | ---------------- | ---------------------- |
| Files      | kebab-case       | `character.service.ts` |
| Classes    | PascalCase       | `CharacterService`     |
| Variables  | camelCase        | `characterEntity`      |
| Constants  | UPPER_SNAKE_CASE | `MAX_LEVEL`            |
| DB columns | snake_case       | `guild_guid`           |

### Import Order

```typescript
// 1. External packages
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 2. Shared libraries (@app/*)
import { coreConfig } from '@app/configuration';
import { CharactersEntity } from '@app/pg';
import { toSlug, toGuid } from '@app/resources';

// 3. Local imports
import { CharacterService } from '../services';
```

---

## Key Patterns

### NestJS Service

```typescript
@Injectable()
export class CharacterService {
  private readonly logger = new Logger(CharacterService.name, { timestamp: true });

  constructor(
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
  ) {}

  async findByGuid(guid: string): Promise<CharactersEntity> {
    return this.charactersRepository.findOne({ where: { guid } });
  }
}
```

### BullMQ Worker

```typescript
@Injectable()
export class CharactersWorker {
  @Process({ name: 'character', concurrency: 5 })
  public async processCharacter(job: Job<CharacterMessageDto>): Promise<void> {
    try {
      await this.processCharacter(job.data);
    } catch (error) {
      this.logger.error(`Failed: ${error.message}`);
      throw error;
    }
  }
}
```

### TypeORM Entity

```typescript
@Index('ix__characters__guild_guid', ['guildGuid'], {})
@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS })
export class CharactersEntity {
  @PrimaryColumn({ type: 'varchar' })
  guid: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'int', name: 'realm_id', nullable: false })
  realmId: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
```

---

## Common Utilities

```typescript
import { toSlug, toGuid, toDate, toGold, delay } from '@app/resources';

// GUID: {slug}@{realm}
const guid = toGuid('PlayerName', 'RealmName'); // 'player-name@realm-name'

// Slug conversion
const slug = toSlug('Burning Legion'); // 'burning-legion'

// Date parsing
const date = toDate(1234567890000);

// Copper to gold
const gold = toGold(50000); // 5.00

// Delay
await delay(5); // 5 seconds
```

---

## Testing Policy

> **IMPORTANT**: NEVER implement or run tests unless explicitly requested by the user. Never add or plan test implementation in code or plans until told directly to do so.

---

## Git Commit Policy

Use conventional commits:

```bash
git commit -m "type(scope): description"
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

**Rules**:

1. Commit only staged changes
2. Split logical changes into separate commits - each commit should represent one logical change that could be reverted independently
3. Never mix refactoring, formatting, or cleanup changes with new features or bug fixes in the same commit
4. Order commits logically so each builds on the previous one
5. Use short lowercased commit message, with no description body

---

## Restricted Files

**Never access or modify**:

- `.env` files (secrets)
- `pnpm-lock.yaml` (managed by pnpm)
- `node_modules/`
- `dist/`
- `.git/`

---

## Platform Notes

- **OS**: Windows 11
- **Shell**: PowerShell or CMD
- **Paths in code**: Forward slashes (`apps/osint/src`)
- **Paths in Windows commands**: Backslashes (`cd apps\osint`)

```powershell
# Environment variables
$env:NODE_ENV = "development"

# Directory operations
Get-ChildItem  # List files
Set-Location apps\core  # Change directory
```

---

## Key Conventions

- **No database foreign keys** - Use GUID references only
- **SnakeNamingStrategy** - TypeScript camelCase, DB snake_case
- **GUID format**: `{name-slug}@{realm-slug}`
- **Path aliases**: Always use `@app/*` for shared libs
- **No comments** in code unless explicitly requested
- **Early returns** over deep nesting
- **Boolean prefixes**: `is`, `has`, `should` (e.g., `isValid`, `hasGuild`)

---

## Reference Implementation

When in doubt, refer to `apps/osint/` as the reference implementation for:

- Worker patterns
- Service structure
- Module organization
- Error handling
