<div align="center">
  <a href="https://cmnw.me/" target="blank">
    <img src="https://user-images.githubusercontent.com/907696/221422670-61897db8-4bbc-4436-969f-bdc5cf194275.svg" width="200" alt="CMNW Logo" />
  </a>

  <h1>🎯 CMNW</h1>
  <p><em>Intelligence Always Wins</em></p>

  <p>
    <a href="https://cmnw.me/"><img src="https://img.shields.io/badge/🌐_Website-cmnw.me-blue?style=for-the-badge" alt="Website"></a>
    <a href="https://github.com/alexzedim/cmnw/blob/master/LICENSE"><img src="https://img.shields.io/badge/📄_License-MPL_2.0-green?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/alexzedim/cmnw/releases"><img src="https://img.shields.io/badge/🚀_Version-6.10.9-orange?style=for-the-badge" alt="Version"></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS">
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB">
    <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis">
    <img src="https://img.shields.io/badge/BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white" alt="BullMQ">
    <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  </p>
</div>

---

## 📖 About

**CMNW** is a sophisticated NestJS-based microservices platform specializing in **Open Source Intelligence (OSINT)** and **Data Market Analysis (DMA)** for World of Warcraft. Built on a distributed architecture with 13 microservices and 7 shared libraries, CMNW provides comprehensive intelligence gathering, real-time market analytics, and advanced financial valuations using XVA-based pricing models.

### 🎯 Key Features

- 🕵️ **Advanced OSINT Capabilities**: Comprehensive character and guild intelligence gathering with Battle.net API integration
- 📊 **Real-Time Market Analysis**: Auction house monitoring with historical price tracking and trend detection
- 💰 **XVA Financial Valuations**: Sophisticated pricing engine with risk assessment and portfolio analytics
- 🔄 **Distributed Job Processing**: BullMQ-based message queuing with Redis, priority queues, and retry mechanisms
- 🐳 **Cloud-Native Architecture**: Full Docker containerization with multi-platform support (ARM64 & x64)
- 🔒 **Enterprise Authentication**: Battle.net OAuth and Discord OAuth integration via Passport
- 📈 **Monitoring & Observability**: Prometheus metrics, Loki logging, and Bull Board queue monitoring
- 🧪 **Comprehensive Testing**: Jest unit tests, Playwright E2E tests, and extensive mock data

---

## 🏗️ Architecture

<div align="center">
  <img alt="CMNW Ignition" src=".images/ignition.png" width="100%"/>
  <p><em>Microservices Architecture Overview</em></p>
</div>

### 🧩 Microservices

CMNW operates as a **pnpm monorepo** with 13 specialized microservices:

| Service              | Port | Description                | Key Features                                                    |
| -------------------- | ---- | -------------------------- | --------------------------------------------------------------- |
| 🎯 **Core**          | 3000 | Central management service | Realms & Keys management, Authentication, System configuration  |
| 🌐 **API Gateway**   | 8080 | REST API gateway           | Request routing, Swagger docs at `/api/docs`, Rate limiting     |
| 🕵️ **OSINT**         | 3000 | Intelligence gathering     | 3 workers (characters, guilds, profile), Battle.net integration |
| 📊 **DMA**           | 3004 | Data Market Analysis       | 2 workers (auctions, items), Real-time AH monitoring            |
| 💰 **Market**        | 3002 | Market operations          | XVA calculations, Contracts, Gold tracking, Evaluation          |
| 👤 **Characters**    | -    | Character management       | Player profiles, Statistics tracking, Entity indexing           |
| 🏰 **Guilds**        | -    | Guild analytics            | Member tracking, Roster management, Activity logs               |
| 📈 **Analytics**     | -    | Metrics aggregation        | Character/Guild/Market/Contract metrics services                |
| 🏆 **Ladder**        | -    | Ranking system             | Competitive rankings, Leaderboards                              |
| 🧪 **Tests**         | -    | Testing infrastructure     | E2E tests, Mock data, Benchmarking                              |
| 📊 **Warcraft Logs** | -    | Raid analytics             | Combat log parsing, Performance metrics                         |
| 🌍 **WoW Progress**  | -    | Progress tracking          | Guild progression, Raid completion tracking                     |
| 💎 **Valuations**    | -    | Financial modeling         | XVA calculations, Risk assessments, Portfolio analytics         |

### 📚 Shared Libraries

7 shared libraries provide common functionality across microservices:

- **[@app/configuration](libs/configuration)** - Centralized configuration management
- **[@app/logger](libs/logger)** - Structured logging with Loki integration
- **[@app/pg](libs/pg)** - PostgreSQL connection and TypeORM utilities
- **[@app/mongo](libs/mongo)** - MongoDB connection and Mongoose schemas
- **[@app/resources](libs/resources)** - Shared resources and constants
- **[@app/bullmq](libs/bullmq)** - BullMQ job queue patterns with Redis
- **[@app/s3](libs/s3)** - AWS S3 storage integration

---

## 🛠️ Technology Stack

### 🎯 Backend Framework

- **[NestJS](https://nestjs.com)** 11.1.9 - Progressive Node.js framework
- **TypeScript** 5.9.3 - Type-safe JavaScript development
- **Node.js** >=24.0.0 - JavaScript runtime
- **RxJS** 7.8.2 - Reactive programming with observables

### 🗄️ Data Layer

- **PostgreSQL** 17.4 - Primary relational database with SnakeNamingStrategy
- **MongoDB** - Document store with Mongoose 9.0.1
- **Redis** 7.4.3 - In-memory caching and session storage
- **TypeORM** 0.3.28 - Database ORM with migration support

### 🔄 Message Queuing

- **BullMQ** 5.66.0 - Redis-based job queue with priority support and retry mechanisms
- **Bull Board** 6.15.0 - Queue monitoring dashboard

### 🔌 External Integrations

- **[@alexzedim/blizzapi](https://www.npmjs.com/package/@alexzedim/blizzapi)** 2.7.0 - Battle.net API client
- **Warcraft Logs API** - Combat log analytics
- **Raider.IO API** - Mythic+ and raid progress
- **AWS S3** - Object storage with @aws-sdk/client-s3@3.948.0

### 🔐 Authentication & Security

- **Passport** 0.7.0 - Authentication middleware
- **Battle.net OAuth** - Blizzard authentication
- **Discord OAuth** - Discord integration via passport-discord@0.1.4

### 🐳 DevOps & Deployment

- **Docker** - Containerization with multi-platform builds
- **GitHub Actions** - CI/CD pipeline with self-hosted runners
- **pnpm** 10.28.1 - Fast, disk space efficient package manager

### 🔧 Development Tools

- **Jest** 30.2.0 - Testing framework with comprehensive coverage
- **Playwright** 1.57.0 - End-to-end testing automation
- **ESLint & Prettier** - Code quality and formatting
- **Swagger/OpenAPI** - API documentation with @nestjs/swagger@11.2.3

### 📊 Monitoring & Observability

- **Prometheus** - Metrics collection with @willsoto/nestjs-prometheus@6.0.2
- **Loki** - Log aggregation
- **Bull Board** - Queue monitoring and management

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >=24.0.0
- **pnpm** >=10.0.0 (managed via corepack)
- **Docker** & **Docker Compose**
- **PostgreSQL** 17+
- **MongoDB** (latest)
- **Redis** 7.4+

> **Note**: This project uses **pnpm 10.28.1**. The correct version is managed via corepack and specified in [`package.json`](package.json).

### 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/alexzedim/cmnw.git
cd cmnw

# Enable corepack for pnpm version management
corepack enable

# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env
cp .env.docker.example .env.docker
```

### 🐳 Docker Development Setup

Start infrastructure services and microservices using Docker Compose:

```bash
# Start database services (PostgreSQL, MongoDB, Redis)
docker-compose -f docker-compose.db.yml up -d

# Start core services
docker-compose -f docker-compose.core.yml up -d

# Start OSINT services
docker-compose -f docker-compose.osint.yml up -d

# Start DMA services
docker-compose -f docker-compose.dma.yml up -d

# Start analytics services
docker-compose -f docker-compose.analytics.yml up -d

# Or start all development services
docker-compose -f docker-compose.dev.yml up -d
```

### 🛠️ Local Development

```bash
# Build all microservices
pnpm build:all

# Start development server with watch mode
pnpm start:dev

# Run specific microservice
nest start core --watch
nest start api --watch
nest start osint --watch
nest start dma --watch
nest start market --watch

# Start with debug mode
pnpm start:debug
```

### 🌐 Access Points

After starting the services:

- **API Gateway**: http://localhost:8080
- **Swagger Documentation**: http://localhost:8080/api/docs
- **Bull Board**: http://localhost:8080/queues
- **Core Service**: http://localhost:3000
- **Market Service**: http://localhost:3002
- **DMA Service**: http://localhost:3004

---

## 💼 Core Modules

### 🕵️ OSINT (Open Source Intelligence)

Comprehensive character and guild intelligence gathering with Battle.net API integration:

**Architecture:**

- **3 Specialized Workers**: [`characters.worker.ts`](apps/osint/src/workers/characters.worker.ts), [`guilds.worker.ts`](apps/osint/src/workers/guilds.worker.ts), [`profile.worker.ts`](apps/osint/src/workers/profile.worker.ts)
- **BullMQ Integration**: Priority queues with Redis and retry mechanisms
- **Real-time Updates**: Character lifecycle tracking and entity indexing

**Key Features:**

- **Character Analysis**: Player profiles, equipment, achievements, professions
- **Guild Monitoring**: Member tracking via [`guild-member.service.ts`](apps/osint/src/services/guild-member.service.ts), roster management, activity logs
- **Raid Progress**: Warcraft Logs and Raider.IO integration
- **Collection System**: Character collection management via [`character-collection.service.ts`](apps/osint/src/services/character-collection.service.ts)

**Services:**

- [`character.service.ts`](apps/osint/src/services/character.service.ts) - Character data processing
- [`guild.service.ts`](apps/osint/src/services/guild.service.ts) - Guild data aggregation
- [`character-lifecycle.service.ts`](apps/osint/src/services/character-lifecycle.service.ts) - Lifecycle management
- [`guild-roster.service.ts`](apps/osint/src/services/guild-roster.service.ts) - Roster synchronization

### 📊 DMA (Data Market Analysis)

Real-time auction house monitoring and market intelligence:

**Architecture:**

- **2 Specialized Workers**: [`auctions.worker.ts`](apps/dma/src/workers/auctions.worker.ts), [`items.worker.ts`](apps/dma/src/workers/items.worker.ts)
- **High-Frequency Updates**: Real-time auction house snapshots
- **Historical Analysis**: Price trend detection and forecasting

**Key Features:**

- **Price Tracking**: Historical price analysis with technical indicators
- **Market Charts**: Interactive price visualization
- **Cross-Realm Analysis**: Server population and pricing comparisons
- **Commodity Monitoring**: Server-wide commodity price tracking
- **Item Intelligence**: Item metadata and pricing calculations

### 💰 Market & Valuations Engine

<div align="center">
  <img alt="Valuations Schema" src=".images/valuations_a9.png" width="80%"/>
  <p><em>XVA-based Pricing Engine Schema</em></p>
</div>

Advanced financial modeling with XVA (X-Value Adjustments) calculations:

**Services:**

- [`xva.service.ts`](apps/market/src/services/xva.service.ts) - XVA calculations engine
- [`contracts.service.ts`](apps/market/src/services/contracts.service.ts) - Contract management
- [`gold.service.ts`](apps/market/src/services/gold.service.ts) - Gold price tracking
- [`evaluation.service.ts`](apps/market/src/services/evaluation.service.ts) - Asset evaluation
- [`auctions.service.ts`](apps/market/src/services/auctions.service.ts) - Auction processing
- [`items.service.ts`](apps/market/src/services/items.service.ts) - Item valuation

**Key Features:**

- **Risk Assessment**: Credit, funding, and capital value adjustments
- **Price Discovery**: Dynamic pricing based on market conditions
- **Portfolio Analytics**: Multi-asset risk and return analysis
- **Crafting Economics**: Disenchanting, milling, prospecting calculations via [`disenchanting.libs.ts`](apps/market/src/libs/disenchanting.libs.ts), [`milling.libs.ts`](apps/market/src/libs/milling.libs.ts), [`prospecting.libs.ts`](apps/market/src/libs/prospecting.libs.ts)

### 📈 Analytics & Monitoring

Comprehensive metrics aggregation and monitoring:

**Services:**

- [`character-metrics.service.ts`](apps/analytics/src/services/character-metrics.service.ts) - Character analytics
- [`guild-metrics.service.ts`](apps/analytics/src/services/guild-metrics.service.ts) - Guild analytics
- [`market-metrics.service.ts`](apps/analytics/src/services/market-metrics.service.ts) - Market analytics
- [`contract-metrics.service.ts`](apps/analytics/src/services/contract-metrics.service.ts) - Contract analytics

**Monitoring:**

- **Prometheus Metrics**: Custom metrics collection
- **Queue Monitoring**: Bull Board dashboard at `/queues`
- **Worker Statistics**: Real-time worker performance tracking via [`worker-stats.listener.ts`](apps/osint/src/listeners/worker-stats.listener.ts)

---

## 🧪 Testing

### 🎯 Test Suite

Comprehensive testing infrastructure with **[Jest](https://jestjs.io)** 30.2.0 and **[Playwright](https://playwright.dev)** 1.57.0:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run tests in watch mode
pnpm test:watch

# Run tests with debugging
pnpm test:debug
```

### 📋 Test Coverage

Extensive test suites with mock data:

- 🕵️ **[OSINT Tests](apps/tests/test/tests.osint.spec.ts)** with **[Mock Data](apps/tests/mocks/osint.mock.ts)**
- 📊 **[DMA Tests](apps/tests/test/tests.dma.spec.ts)** with **[Mock Data](apps/tests/mocks/dma.mock.ts)**
- 🎯 **[Core Tests](apps/tests/test/tests.core.spec.ts)** for essential services
- 🌐 **[Community Tests](apps/tests/test/tests.community.spec.ts)** for social features
- 🔄 **[Worker Tests](apps/tests/test/tests.worker.spec.ts)** with **[Mock Data](apps/tests/mocks/worker.mock.ts)**

### 🧪 Test Services

Dedicated testing microservice with:

- **[Benchmark Suite](apps/tests/src/tests.bench.ts)** - Performance benchmarking
- **[Queue Testing](apps/tests/src/tests.characters.queue.service.ts)** - BullMQ queue testing
- **[Worker Testing](apps/tests/src/tests.worker.ts)** - Worker performance testing

---

## 🚀 Deployment

### 🔄 CI/CD Pipeline

Automated deployment via **GitHub Actions** with self-hosted runners:

**Workflows:**

- ✅ Docker Image Builds (ARM64 & x64)
- ✅ Automated Testing (Jest + Playwright)
- ✅ Security Scanning
- ✅ Multi-environment Deployment
- ✅ Container Registry Publishing

### 🐳 Production Deployment

**1. Environment Setup:**

```bash
# Configure production environment
cp .env.production .env

# Set deployment secrets
export ENC_PASSWORD="your_encryption_key"
export BNET_CLIENT_ID="your_client_id"
export BNET_CLIENT_SECRET="your_client_secret"
```

**2. Container Registry:**

```bash
# Build multi-platform images
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/alexzedim/cmnw:6.10.9 \
  -t ghcr.io/alexzedim/cmnw:latest \
  --push .

# Pull images on production server
docker pull ghcr.io/alexzedim/cmnw:latest
```

**3. Service Orchestration:**

```bash
# Deploy infrastructure
docker-compose -f docker-compose.db.yml up -d

# Deploy core services
docker-compose -f docker-compose.core.yml up -d

# Deploy OSINT services
docker-compose -f docker-compose.osint.yml up -d

# Deploy DMA services
docker-compose -f docker-compose.dma.yml up -d

# Deploy analytics services
docker-compose -f docker-compose.analytics.yml up -d
```

**4. Health Checks:**

```bash
# Verify service health
curl http://localhost:8080/health
curl http://localhost:3000/health
curl http://localhost:3002/health
curl http://localhost:3004/health
```

---

## 📚 API Documentation

### 🌐 REST API Endpoints

The **API Gateway** (port 8080) provides comprehensive REST API access:

**OSINT Endpoints:**

- `GET /osint/character/:realm/:name` - Character intelligence
- `GET /osint/guild/:realm/:name` - Guild intelligence
- `GET /osint/realm/:slug` - Realm information

**DMA Endpoints:**

- `GET /dma/auctions/:connectedRealmId` - Auction house data
- `GET /dma/items/:itemId` - Item market data
- `GET /dma/commodities` - Commodity prices

**Market Endpoints:**

- `GET /market/contracts` - Active contracts
- `GET /market/gold/:region` - Gold prices
- `GET /market/evaluation/:itemId` - Item evaluation

**Queue Monitoring:**

- `GET /queues` - Bull Board dashboard
- `GET /queue/metrics` - Queue metrics
- `GET /queue/workers` - Worker status

### 📖 Interactive Documentation

**Swagger/OpenAPI** documentation available at:

- **Development**: http://localhost:8080/api/docs
- **Production**: https://api.cmnw.me/docs

The API documentation is automatically generated from NestJS decorators and includes:

- 📝 Request/Response schemas
- 🔐 Authentication requirements
- 🧪 Interactive API testing
- 📊 Model definitions

---

## 🔧 Development Workflow

### 📦 Package Management

```bash
# Install dependencies
pnpm install

# Add dependency to specific workspace
pnpm add <package> --filter @app/osint

# Update dependencies
pnpm update

# Clean install
pnpm clean-install
```

### 🏗️ Building

```bash
# Build all microservices
pnpm build:all

# Build specific service
nest build core
nest build api
nest build osint
nest build dma
nest build market
```

### 🔍 Code Quality

```bash
# Lint and fix code
pnpm lint

# Format code
pnpm format

# Type checking
tsc --noEmit
```

### 🐛 Debugging

```bash
# Start with debugger
pnpm start:debug

# Debug specific service
nest start osint --debug --watch

# Debug tests
pnpm test:debug
```

---

## 📊 Monitoring & Observability

### 📈 Metrics Collection

**Prometheus Integration:**

- Custom metrics via [@willsoto/nestjs-prometheus](https://www.npmjs.com/package/@willsoto/nestjs-prometheus)@6.0.2
- Service health metrics
- Queue performance metrics
- Database connection pool metrics

**Metrics Endpoints:**

- `GET /metrics` - Prometheus metrics
- `GET /health` - Health check endpoint

### 📝 Logging

**Structured Logging:**

- Centralized logging via [@app/logger](libs/logger)
- Loki integration for log aggregation
- Contextual logging with request tracing
- Log levels: error, warn, info, debug, verbose

### 🔍 Queue Monitoring

**Bull Board Dashboard:**

- Real-time queue monitoring at `/queues`
- Job status tracking
- Failed job inspection
- Queue metrics and statistics
- Worker performance monitoring

### 🎯 Worker Statistics

Real-time worker performance tracking:

- Job processing rates
- Success/failure ratios
- Average processing times
- Queue depth monitoring

---

## 🤝 Contributing

We welcome contributions from developers experienced in:

- 🎯 **Microservices Architecture** - NestJS, distributed systems
- 🕵️ **Intelligence Gathering Systems** - OSINT, data aggregation
- 📊 **Financial Data Analysis** - XVA calculations, risk modeling
- 🎮 **Gaming API Integration** - Battle.net, Warcraft Logs, Raider.IO
- 🔒 **Security & Authentication** - OAuth, JWT, API security
- 🐳 **DevOps & Infrastructure** - Docker, Kubernetes, CI/CD

### 📋 How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### 🐛 Issues & Feature Requests

- 🐛 **Bug Reports**: [Create an issue](https://github.com/alexzedim/cmnw/issues)
- 💡 **Feature Requests**: [Start a discussion](https://github.com/alexzedim/cmnw/discussions)
- 📖 **Documentation**: Help improve our docs
- 🧪 **Testing**: Expand test coverage

### 📝 Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Use conventional commit messages
- Ensure all tests pass before submitting PR

---

## 📄 License

This project is licensed under the **Mozilla Public License 2.0** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <h3>🌟 Built with ❤️ by <a href="https://github.com/alexzedim">@alexzedim</a></h3>
  
  <p>
    <a href="https://cmnw.me/">🌐 Website</a> •
    <a href="https://github.com/alexzedim/cmnw/issues">🐛 Issues</a> •
    <a href="https://github.com/alexzedim/cmnw/discussions">💬 Discussions</a> •
    <a href="https://twitter.com/alexzedim">🐦 Twitter</a>
  </p>
  
  <p><em>"Intelligence Always Wins" 🎯</em></p>
</div>
