import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { CharacterMessageDto } from '@app/resources';

@Injectable()
export class TestsCharactersQueueWorker {
  private readonly logger = new Logger(TestsCharactersQueueWorker.name, {
    timestamp: true,
  });

  @RabbitSubscribe({
    exchange: 'osint.exchange',
    routingKey: 'osint.characters.*',
    queue: 'osint.characters',
    queueOptions: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': 'dlx.exchange',
        'x-dead-letter-routing-key': 'dlx.characters',
      },
    },
  })
  async handleMessage(message: CharacterMessageDto): Promise<void> {
    this.logger.log({
      logTag: 'handleMessage',
      messageId: message.messageId,
      routingKey: message.routingKey,
      source: message.source,
      guid: message.data?.guid,
      name: message.data?.name,
      realm: message.data?.realm,
      message: message.data,
    });
  }
}
