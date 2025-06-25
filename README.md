<div align="center">
  <a href="https://cmnw.me/" target="blank">
    <img src="https://user-images.githubusercontent.com/907696/221422670-61897db8-4bbc-4436-969f-bdc5cf194275.svg" width="200" alt="CMNW Logo" />
  </a>

  <h1>🎯 CMNW</h1>
  <p><em>Intelligence Always Wins</em></p>

  <p>
    <a href="https://cmnw.me/"><img src="https://img.shields.io/badge/🌐_Website-cmnw.me-blue?style=for-the-badge" alt="Website"></a>
    <a href="https://github.com/alexzedim/cmnw/blob/master/LICENSE"><img src="https://img.shields.io/badge/📄_License-MPL_2.0-green?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/alexzedim/cmnw/releases"><img src="https://img.shields.io/badge/🚀_Version-6.4.9-orange?style=for-the-badge" alt="Version"></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS">
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB">
    <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis">
    <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  </p>
</div>

---

## 📖 About

**CMNW** is a sophisticated intelligence platform built as a distributed microservices architecture, specializing in **Open Source Intelligence (OSINT)**, **Data Market Analysis (DMA)**, and **financial valuations**. The platform provides comprehensive analytics and intelligence gathering capabilities with real-time data processing.

### 🎯 Key Features

- 🕵️ **Advanced OSINT Capabilities**: Character and guild intelligence gathering from World of Warcraft
- 📊 **Market Data Analysis**: Real-time auction house monitoring and price analytics
- 💰 **Financial Valuations**: XVA-based pricing engine for market calculations
- 🔄 **Distributed Processing**: Queue-based job processing with BullMQ
- 🐳 **Cloud-Native**: Full Docker containerization with orchestrated deployment
- 🔒 **Enterprise Security**: Battle.net OAuth integration and secure API access

---

## 🏗️ Architecture

<div align="center">
  <img alt="CMNW Ignition" src=".images/ignition.png" width="100%"/>
  <p><em>Microservices Architecture Overview</em></p>
</div>

### 🧩 Microservices

| Service | Port | Description | Key Features |
|---------|------|-------------|-------------|
| 🎯 **Core** | - | Central management service | Realms & Keys management, Authentication |
| 🕵️ **OSINT** | 3000 | Intelligence gathering | Character/Guild profiling, Battle.net integration |
| 📊 **DMA** | - | Data Market Analysis | Auction house monitoring, Price analytics |
| 🏆 **Auctions** | 3002 | Auction processing | Real-time bidding data, Market trends |
| 👤 **Characters** | - | Character management | Player profiles, Statistics tracking |
| 🏰 **Guilds** | - | Guild analytics | Guild member tracking, Activity monitoring |
| 🎯 **Items** | - | Item intelligence | Item data processing, Pricing calculations |
| 💰 **Gold** | - | Currency tracking | Gold price monitoring, Exchange rates |
| 📈 **Valuations** | - | Financial modeling | XVA calculations, Risk assessments |
| 🌐 **Conglomerat** | - | API Gateway | Request routing, Authentication, Rate limiting |

---

## 🛠️ Technology Stack

### 🎯 Backend Framework
- **[NestJS](https://nestjs.com)** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript development
- **RxJS** - Reactive programming with observables

### 🗄️ Data Layer
- **PostgreSQL** - Primary relational database
- **MongoDB** - Document store for flexible data
- **Redis** - In-memory caching and session storage
- **TypeORM** - Database ORM with migration support

### 🔄 Message Queuing
- **BullMQ** - Distributed job queue processing
- **Redis** - Queue backend and pub/sub messaging

### 🐳 DevOps & Deployment
- **Docker** - Containerization platform
- **GitHub Actions** - CI/CD pipeline automation
- **Multi-platform builds** - ARM64 and x64 support

### 🔧 Development Tools
- **Jest** - Testing framework with comprehensive coverage
- **ESLint & Prettier** - Code quality and formatting
- **Swagger/OpenAPI** - API documentation
- **Playwright** - End-to-end testing automation

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Docker & Docker Compose
- PostgreSQL 17+
- Redis 7+

### 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/alexzedim/cmnw.git
cd cmnw

# Install dependencies
yarn install

# Copy environment configuration
cp .env.example .env
cp .env.docker.example .env.docker
```

### 🐳 Docker Development Setup

```bash
# Start core services (PostgreSQL, Redis)
docker-compose -f docker-compose.dev.yml up -d

# Or start specific service stacks
docker-compose -f docker-compose.core.yml up -d
docker-compose -f docker-compose.osint.yml up -d
docker-compose -f docker-compose.dma.yml up -d
```

### 🛠️ Local Development

```bash
# Build the project
yarn build

# Start development server
yarn start:dev

# Run specific microservice
nest start osint --watch
nest start dma --watch
```

---

## 💼 Core Modules

### 🕵️ OSINT (Open Source Intelligence)

Character and guild intelligence gathering with comprehensive profiling:

- **Character Analysis**: Battle.net API integration for player data
- **Guild Monitoring**: Member tracking and activity analysis
- **Raid Progress**: Warcraft Logs and Raider.IO integration
- **LFG System**: Looking for Guild matching algorithms

### 📊 DMA (Data Market Analysis)

Real-time auction house monitoring and market intelligence:

- **Price Tracking**: Historical price analysis and trend detection
- **Market Charts**: Interactive price visualization with technical indicators
- **Cross-Realm Analysis**: Server population and pricing comparisons
- **Commodity Monitoring**: Server-wide commodity price tracking

### 💰 Valuations Engine

<div align="center">
  <img alt="Valuations Schema" src=".images/valuations_a9.png" width="80%"/>
  <p><em>XVA-based Pricing Engine Schema</em></p>
</div>

Advanced financial modeling with XVA (X-Value Adjustments) calculations:

- **Risk Assessment**: Credit, funding, and capital value adjustments
- **Price Discovery**: Dynamic pricing based on market conditions
- **Portfolio Analytics**: Multi-asset risk and return analysis

---

## 🧪 Testing

### 🎯 Test Suite

Comprehensive testing with **[Jest](https://jestjs.io)** framework:

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:cov

# Run e2e tests
yarn test:e2e

# Watch mode for development
yarn test:watch
```

### 📋 Test Coverage

- 🕵️ **[OSINT Tests](apps/tests/test/tests.osint.spec.ts)** with **[Mock Data](apps/tests/mocks/osint.mock.ts)**
- 📊 **[DMA Tests](apps/tests/test/tests.dma.spec.ts)** with **[Mock Data](apps/tests/mocks/dma.mock.ts)**
- 🎯 **[Core Tests](apps/tests/test/tests.core.spec.ts)** for essential services
- 🌐 **[Community Tests](apps/tests/test/tests.community.spec.ts)** for social features

---

## 🚀 Deployment

### 🔄 CI/CD Pipeline

Automated deployment via **GitHub Actions** with multi-platform support:

```yaml
# Available workflows:
- Docker Image Builds (ARM64 & x64)
- Automated Testing
- Security Scanning
- Multi-environment Deployment
```

### 🐳 Production Deployment

1. **Environment Setup**:
   ```bash
   # Configure production environment
   cp .env.production .env
   
   # Set deployment secrets
   export CR_PAT="your_github_token"
   export ENC_PASSWORD="your_encryption_key"
   ```

2. **Container Registry**:
   ```bash
   # Build and push to GitHub Container Registry
   docker build -t ghcr.io/alexzedim/cmnw:latest .
   docker push ghcr.io/alexzedim/cmnw:latest
   ```

3. **Service Orchestration**:
   ```bash
   # Deploy service stack
   docker-compose -f docker-compose.prod.yml up -d
   ```

---

## 📚 API Documentation

### 🌐 Endpoints

- **OSINT API**: Character and guild intelligence endpoints
- **DMA API**: Market data and analytics endpoints  
- **Auth API**: Battle.net OAuth and authentication
- **Core API**: System management and configuration

### 📖 Interactive Documentation

Swagger/OpenAPI documentation available at:
- Development: `http://localhost:3000/api/docs`
- Production: `https://api.cmnw.me/docs`

---

## 🤝 Contributing

We welcome contributions from developers experienced in:

- 🎯 **Microservices Architecture**
- 🕵️ **Intelligence Gathering Systems**
- 📊 **Financial Data Analysis**
- 🎮 **Gaming API Integration**
- 🔒 **Security & Authentication**

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
