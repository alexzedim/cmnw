# Queue Module

BullMQ queue registration and Bull Board dashboard for the CMNW application.

## Registered Queues

- `osint.characters` - Character data processing
- `osint.guilds` - Guild data processing
- `osint.profiles` - Profile data processing
- `dma.auctions` - Auction data processing
- `dma.items` - Item data processing
- `dma.valuations` - Valuation data processing
- `core.realms` - Realm data processing

## Bull Board UI

Visual dashboard for monitoring and managing BullMQ queues.

```http
GET /queues
```

**Features:**

- Visual dashboard showing all queues
- Real-time job details and status
- Retry failed jobs with one click
- Remove or pause jobs
- View job data and stack traces
- Filter jobs by status (waiting, active, completed, failed, delayed)

**Access:**

```
http://localhost:3000/queues
```
