# CMNW Documentation

Comprehensive documentation for the CMNW (Commonwealth) project - a NestJS-based OSINT data aggregation system for World of Warcraft.

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Database & Data Integrity](#database--data-integrity)
- [Queue Monitoring](#queue-monitoring)
- [Service Documentation](#service-documentation)
- [Migrations & Fixes](#migrations--fixes)
- [Historical Documentation](#historical-documentation)

---

## Getting Started

### Quick Reference
- **Project Rules**: [`../WARP.md`](../WARP.md) - Project-specific rules and conventions
- **Main README**: [`../README.md`](../README.md) - Project overview and setup

### Key Technologies
- **Framework**: NestJS (Node.js microservices)
- **Databases**: PostgreSQL (TypeORM), MongoDB (Mongoose)
- **Queues**: BullMQ with Redis
- **Storage**: AWS S3
- **Monitoring**: Prometheus + Grafana

---

## Architecture

### Database & Data Integrity

#### [Foreign Key Policy](FOREIGN_KEY_POLICY.md)
**Decision: NO database-level foreign keys**

For OSINT data aggregation, foreign keys would be problematic because:
- External data control (Blizzard API)
- Out-of-order data arrival
- Historical preservation requirements
- High-throughput ingestion needs

**Expected orphan rate**: 7-8% (normal for this use case)

#### [Guild GUID Fixes](GUILD_GUID_FIXES.md)
Service layer fixes to ensure correct `{slug}@{realm}` format for guild guids.

**Fixed Services**:
- `warcraft-logs.service.ts` - Character guid from GraphQL API
- `wow-progress.lfg.service.ts` - Character guid from LFG scraping
- `guild-roster.service.ts` - Character guid from guild roster

---

## Queue Monitoring

Comprehensive guides for monitoring BullMQ job queues and worker performance.

### Quick Reference
- **[Quick Status Reference](QUICK_STATUS_REFERENCE.md)** - Status code cheat sheet (1-page)
- **[Queue Monitoring Quickstart](QUEUE_MONITORING_QUICKSTART.md)** - Essential commands and queries

### Complete Guides
- **[Queue Monitoring Guide](QUEUE_MONITORING_GUIDE.md)** - Full monitoring setup with Prometheus/Grafana
- **[Job Status Monitoring](JOB_STATUS_MONITORING.md)** - Status codes and Prometheus queries
- **[Worker ID Implementation](WORKER_ID_IMPLEMENTATION.md)** - Worker identification system

**Key Metrics**:
- Job processing rates (jobs/sec)
- Queue health (active, waiting, failed)
- Worker performance by ID
- Status code distribution

---

## Service Documentation

### Warcraft Logs Integration
Located in [`warcraft-logs/`](warcraft-logs/)

- **[Fights API Integration](warcraft-logs/FIGHTS_API_INTEGRATION.md)** - Internal API for character roster
- **[HTML Parsing Analysis](warcraft-logs/HTML_PARSING_ANALYSIS.md)** - Fallback HTML parsing approach
- **[Implementation Summary](warcraft-logs/IMPLEMENTATION_SUMMARY.md)** - Complete integration overview

**Features**:
- Adaptive rate limiting (2-30s delays)
- Dual API approach (Fights API + GraphQL fallback)
- Automatic retry with backoff
- Processes 1M+ characters from raid logs

---

## Migrations & Fixes

Located in [`migrations/`](migrations/)

### Guild GUID Format Migration (2025-10-30)

Complete migration fixing guild GUID format from `{name}-{realm}` to `{slug}@{realm}`.

- **[Final Report](migrations/FINAL_REPORT.md)** - Complete migration results
- **[Migration Summary](migrations/MIGRATION_SUMMARY.md)** - Initial migration overview

**Results**:
- ✅ 4,171,053 records updated (100% success)
- ✅ 251 guilds migrated
- ✅ 307,305 total records fixed
- ✅ Code fixes across 4 services

**Impact**:
- All guild lookups now use correct `@` separator
- Character-guild relationships properly maintained
- API queries work with cyrillic and special characters

---

## Historical Documentation

Archived in [`archive/`](archive/)

Previous refactoring efforts and migrations:

- [Constants Migration](archive/CONSTANTS_MIGRATION.md)
- [Entity-Based Refactoring](archive/ENTITY_BASED_REFACTORING.md)
- [Refactoring Complete](archive/REFACTORING_COMPLETE.md)
- [Refactoring Summary](archive/REFACTORING_SUMMARY.md)

---

## Contributing

### Documentation Standards

When adding new documentation:

1. **Location**:
   - General docs → `docs/`
   - Service-specific → `docs/{service-name}/`
   - Migration reports → `docs/migrations/`
   - Historical → `docs/archive/`

2. **Format**:
   - Use Markdown (.md)
   - Include table of contents for docs > 200 lines
   - Add dates to migration/fix documentation
   - Link to related documentation

3. **Naming**:
   - Use UPPERCASE for major documents (e.g., `FINAL_REPORT.md`)
   - Use kebab-case for guides (e.g., `queue-monitoring-guide.md`)
   - Keep README files as `README.md`

### Module-Specific READMEs

Some modules have their own README files:
- [`apps/api/src/auth/README.md`](../apps/api/src/auth/README.md) - OAuth authentication
- [`apps/api/src/queue/README.md`](../apps/api/src/queue/README.md) - Queue monitoring API

---

## Quick Links

### External Resources
- **Infrastructure**: Docker Compose in `/alexzedim/core` repository
- **Deployment**: `ssh root@128.0.0.255`
- **Homepage**: [https://cmnw.me](https://cmnw.me)

### Repository
- **GitHub**: [github.com/alexzedim/cmnw](https://github.com/alexzedim/cmnw)
- **License**: MPL 2.0

---

**Last Updated**: 2025-10-30
**Documentation Version**: 1.0
