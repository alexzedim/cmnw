import { LoggerService } from '@app/logger';
import { cmnwConfig, redisConfig, wsConfig } from '@app/configuration';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import Redis from 'ioredis';
import { Server } from 'ws';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  namespace: wsConfig.namespace,
  cors: {
    origin: cmnwConfig.cors.origins.length > 0 ? cmnwConfig.cors.origins : true,
    credentials: cmnwConfig.cors.allowCredentials,
  },
})
export class FeedGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new LoggerService(FeedGateway.name);
  private readonly subscriber: Redis;

  constructor() {
    this.subscriber = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
    });
  }

  async afterInit(): Promise<void> {
    await this.subscriber.subscribe(wsConfig.channel);
    this.subscriber.on('message', (_channel: string, raw: string) => {
      this.broadcast(raw);
    });
    this.subscriber.on('error', (error: unknown) => {
      this.logger.error({ logTag: 'FEED_SUBSCRIBE', errorOrException: error });
    });
    this.logger.info({ logTag: 'FEED_INIT', data: { namespace: wsConfig.namespace, channel: wsConfig.channel } });
  }

  handleConnection(): void {
    const count = this.server?.clients?.size ?? 0;
    this.logger.info({ logTag: 'FEED_CONNECT', data: { count } });
  }

  handleDisconnect(): void {
    const count = this.server?.clients?.size ?? 0;
    this.logger.info({ logTag: 'FEED_DISCONNECT', data: { count } });
  }

  private broadcast(raw: string): void {
    if (!this.server) return;
    this.server.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(raw);
      }
    });
  }
}
