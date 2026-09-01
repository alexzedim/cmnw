import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { redisConfig, wsConfig } from '@app/configuration';
import { LoggerService } from '@app/logger';
import { extractSessionId } from '@app/resources';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import Redis from 'ioredis';
import { Server, type WebSocket } from 'ws';

@Injectable()
export class FeedGateway implements OnApplicationBootstrap {
  private readonly logger = new LoggerService(FeedGateway.name);
  private readonly subscriber: Redis;
  private server: Server | null = null;

  /** sessionId → connected sockets for that session (for routed refresh events) */
  private readonly sessions = new Map<string, Set<WebSocket>>();

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
      const server = this.server;
      if (!server) return;
      server.handleUpgrade(request, socket, head, (ws) => {
        server.emit('connection', ws, request);
      });
    });

    this.server.on('connection', (ws, request) => {
      const sessionId = extractSessionId(request);
      if (sessionId) {
        let bucket = this.sessions.get(sessionId);
        if (!bucket) {
          bucket = new Set();
          this.sessions.set(sessionId, bucket);
        }
        bucket.add(ws);
      }

      const count = this.server?.clients.size ?? 0;
      this.logger.info({
        logTag: 'FEED_CONNECT',
        data: { count, sessionId: sessionId ?? null, sessions: this.sessions.size },
      });

      ws.on('close', () => {
        if (sessionId) {
          const bucket = this.sessions.get(sessionId);
          if (bucket) {
            bucket.delete(ws);
            if (bucket.size === 0) {
              this.sessions.delete(sessionId);
            }
          }
        }
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
      this.dispatch(raw);
    });
    this.subscriber.on('error', (error: unknown) => {
      this.logger.error({ logTag: 'FEED_SUBSCRIBE', errorOrException: error });
    });
  }

  /**
   * Routes a Redis message to the sockets registered under the payload's
   * meta.sessionId (client-driven refresh events). Payloads without a valid
   * sessionId are dropped.
   */
  private dispatch(raw: string): void {
    let sessionId: unknown;
    try {
      const parsed = JSON.parse(raw) as { meta?: { sessionId?: unknown } };
      sessionId = parsed?.meta?.sessionId;
    } catch {
      // malformed payload → nothing to route
    }

    if (typeof sessionId === 'string' && sessionId.length > 0) {
      this.routeToSession(sessionId, raw);
    }
  }

  private routeToSession(sessionId: string, raw: string): void {
    const bucket = this.sessions.get(sessionId);
    if (!bucket) return;
    for (const client of bucket) {
      if (client.readyState === client.OPEN) {
        client.send(raw);
      }
    }
  }
}
