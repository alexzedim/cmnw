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
pnpm install
pnpm build:all
nest build {service}
nest start {service} --watch
pnpm lint
pnpm format
pnpm test
pnpm test:watch
pnpm test:cov
jest --forceExit -- test/path/to/file.spec.ts
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

### Shared Libraries (5 libs)

| Library            | Purpose                                |
| ------------------ | -------------------------------------- |
| @app/resources     | DTOs, queues, constants, utils, guards |
| @app/configuration | Centralized config                     |
| @app/pg            | PostgreSQL entities and enums          |
| @app/logger        | Structured logging with Loki           |
| @app/s3            | AWS S3 storage integration             |

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

### Code Rules

- Max line length: 120
- Single quotes, trailing commas, semicolons required
- Boolean prefixes: `is`, `has`, `should` (e.g., `isValid`, `hasGuild`)
- No comments unless explicitly requested
- Early returns over deep nesting

### Import Order

```typescript
// 1. External packages (@nestjs/*, typeorm, etc.)
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 2. Shared libraries (@app/*)
import { coreConfig } from '@app/configuration';
import { CharactersEntity } from '@app/pg';
import { toSlug, toGuid } from '@app/resources';

// 3. Local imports (../services)
import { CharacterService } from '../services';
```

---

## Library Usage Priority

1. **@app/resources** - Types, DTOs, constants, utils, guards, queues
2. **@app/pg** - TypeORM entities, entity enums (CMNW_ENTITY_ENUM)
3. **@app/configuration** - Environment config (postgres, redis, blizzard, etc.)
4. **@app/logger** - LoggerService with structured logging
5. **@app/s3** - File storage operations

**Rule**: If something can be reused, put it in `@app/resources` or `@app/pg`.

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

### TypeORM Entity (SnakeNamingStrategy)

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

### BullMQ Worker

```typescript
@Injectable()
export class CharactersWorker {
  @Process({ name: 'character', concurrency: 5 })
  public async processCharacter(job: Job<CharacterMessageDto>): Promise<void> {
    try {
      await this.processCharacter(job.data);
    } catch (error) {
      this.logger.error({ logTag: 'ERROR', errorOrException: error });
      throw error;
    }
  }
}
```

---

## Common Utilities

```typescript
import { toSlug, toGuid, toDate, toGold, delay } from '@app/resources';

const guid = toGuid('PlayerName', 'RealmName'); // 'player-name@realm-name'
const slug = toSlug('Burning Legion'); // 'burning-legion'
const gold = toGold(50000); // 5.00g
await delay(5); // 5 seconds
```

---

## Error Handling

- Always re-throw errors for dead letter queue processing
- Use structured logging: `this.logger.error({ logTag: 'ERROR', errorOrException: error })`
- Use `this.logger.info({ logTag: 'INFO', data: { count: 10 } })` for data

---

## Testing Policy

> **NEVER implement or run tests unless explicitly requested by the user.**

---

## Git Commit Policy

```bash
git commit -m "type(scope): description"
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

**Rules**:

1. Commit only staged changes
2. Split logical changes into separate commits
3. Never mix refactoring/formatting with features/bug fixes
4. Order commits logically
5. Short lowercased message, no description body

---

## Restricted Files

**Never access or modify**: `.env`, `pnpm-lock.yaml`, `node_modules/`, `dist/`, `.git/`

---

## Key Conventions

- **No database foreign keys** - Use GUID references only
- **GUID format**: `{name-slug}@{realm-slug}`
- **Path aliases** - Always use `@app/*` for shared libs
- **Reference implementation** - `apps/osint/`

---

## Platform

- **OS**: Windows 11
- **Shell**: PowerShell or CMD
- **Paths in code**: Forward slashes (`apps/osint/src`)
- **Paths in Windows commands**: Backslashes (`cd apps\osint`)
