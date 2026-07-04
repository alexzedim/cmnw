import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { LoggerService } from '@app/logger';
import { redisConfig, wsConfig } from '@app/configuration';
import Redis from 'ioredis';
import { Server } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'http';

@Injectable()
export class FeedGateway implements OnApplicationBootstrap {
  private readonly logger = new LoggerService(FeedGateway.name);
  private readonly subscriber: Redis;
  private server: Server | null = null;

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {
    this.subscriber = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
    });
  }

  onApplicationBootstrap(): void {
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer() as HttpServer;
    this.server = new Server({ noServer: true, clientTracking: true });

    httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
      const { pathname } = new URL(request.url || '', `ws://${request.headers.host}`);
      if (pathname !== wsConfig.path) {
        return;
      }
      this.server!.handleUpgrade(request, socket, head, (ws) => {
        this.server!.emit('connection', ws, request);
      });
    });

    this.server.on('connection', (ws) => {
      const count = this.server?.clients.size ?? 0;
      this.logger.info({ logTag: 'FEED_CONNECT', data: { count } });
      ws.on('close', () => {
        const c = this.server?.clients.size ?? 0;
        this.logger.info({ logTag: 'FEED_DISCONNECT', data: { count: c } });
      });
      ws.on('error', (error) => {
        this.logger.error({ logTag: 'FEED_WS_ERROR', errorOrException: error });
      });
    });

    this.startSubscriber().catch((error) => {
      this.logger.error({ logTag: 'FEED_SUBSCRIBE_INIT', errorOrException: error });
    });

    this.logger.info({
      logTag: 'FEED_INIT',
      data: { path: wsConfig.path, channel: wsConfig.channel },
    });
  }

  private async startSubscriber(): Promise<void> {
    await this.subscriber.subscribe(wsConfig.channel);
    this.subscriber.on('message', (_channel: string, raw: string) => {
      this.broadcast(raw);
    });
    this.subscriber.on('error', (error: unknown) => {
      this.logger.error({ logTag: 'FEED_SUBSCRIBE', errorOrException: error });
    });
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
