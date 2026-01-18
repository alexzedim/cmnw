# RabbitMQ Library

This library provides RabbitMQ integration for the CMNW (Commonwealth) application, replacing the previous BullMQ-based pub/sub system.

## Features

- **Publisher Service**: Publish messages to RabbitMQ exchanges with validation
- **Queue Configuration**: Pre-configured queues for all CMNW services
- **Priority Queues**: Support for message prioritization (0-10 scale)
- **Dead Letter Exchange**: Automatic routing of failed messages
- **TTL Management**: Per-message-type time-to-live configuration
- **Retry Logic**: Built-in retry mechanism with exponential backoff

## Architecture

### Exchanges

- **osint.exchange**: OSINT service messages (characters, guilds, profiles)
- **dma.exchange**: DMA service messages (auctions, items)
- **dlx.exchange**: Dead Letter Exchange for failed messages

### Queues

#### OSINT Queues
- `osint.characters` - Character data processing
- `osint.guilds` - Guild data processing
- `osint.profiles` - Profile data processing

#### DMA Queues
- `dma.auctions` - Auction data processing
- `dma.items` - Item data processing

#### Core Queues
- `core.realms` - Realm data processing

#### Dead Letter Queue
- `dlx.dlq` - Failed messages (24-hour retention)

## Usage

### Publishing Messages

```typescript
import { RabbitMQPublisherService } from '@app/rabbitmq';
import { CharacterMessageDto } from '@app/resources';

@Injectable()
export class MyService {
  constructor(private publisher: RabbitMQPublisherService) {}

  async publishCharacter(characterData: any) {
    const message = CharacterMessageDto.fromMythicPlusLadder(characterData);
    await this.publisher.publishMessage('osint.exchange', message);
  }

  async publishMultiple(characters: any[]) {
    const messages = characters.map(c => 
      CharacterMessageDto.fromMythicPlusLadder(c)
    );
    await this.publisher.publishBulk('osint.exchange', messages);
  }

  async publishWithRetry(characterData: any) {
    const message = CharacterMessageDto.fromMythicPlusLadder(characterData);
    await this.publisher.publishWithRetry('osint.exchange', message, 3, 1000);
  }
}
```

### Message Priority

Messages are prioritized on a 0-10 scale:

- **9**: Guild Masters, Hall of Fame (urgent)
- **8**: Warcraft Logs, Guild Requests (very high)
- **7**: Ladder Data, Guild Roster (high)
- **6**: WoW Progress (normal)
- **5**: Character/Guild Index (normal)
- **3**: Guild Members (low)
- **2**: Migrations (very low)

### Message TTL

Time-to-live values vary by message type:

- **5 minutes**: Guild Masters
- **10 minutes**: Hall of Fame, Warcraft Logs
- **30 minutes**: Guild Requests
- **1 hour**: Ladder Data, Guild Roster
- **2 hours**: WoW Progress
- **12 hours**: Character/Guild Index
- **24 hours**: Guild Members, Migrations

## Configuration

The RabbitMQ module is configured via environment variables:

```env
RABBITMQ_URI=amqp://guest:guest@localhost:5672
RABBITMQ_PREFETCH=10
```

## Module Setup

Import the RabbitMQ module in your application:

```typescript
import { RabbitMQModule } from '@app/rabbitmq';

@Module({
  imports: [RabbitMQModule],
})
export class AppModule {}
```

## Monitoring

The library includes built-in logging for:

- Message publication success/failure
- Retry attempts
- Bulk operation statistics
- Queue initialization

## Error Handling

Failed messages are automatically routed to the Dead Letter Exchange (DLX) with:

- Original message preserved
- Failure reason logged
- 24-hour retention for analysis

## Migration from BullMQ

See the main project documentation for migration guidelines from BullMQ to RabbitMQ.
