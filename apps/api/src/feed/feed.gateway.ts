import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { LoggerService } from '@app/logger';
import { redisConfig, wsConfig } from '@app/configuration';
import { SESSION_QUERY_KEY } from '@app/resources';
import Redis from 'ioredis';
import { Server, WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'http';

/**
 * Extracts the client session id from the WS upgrade URL (?session=<id>).
 * Returns undefined for clients that did not supply one (legacy/global feed).
 */
function extractSessionId(request: IncomingMessage): string | undefined {
  try {
    const { searchParams } = new URL(request.url || '', `ws://${request.headers.host}`);
    const sid = searchParams.get(SESSION_QUERY_KEY);
    return sid || undefined;
  } catch {
    return undefined;
  }
}

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
      this.server!.handleUpgrade(request, socket, head, (ws) => {
        this.server!.emit('connection', ws, request);
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
   * Routes a Redis message. If the payload's meta.sessionId is set, deliver only
   * to sockets registered under that session (client-driven refresh events).
   * Otherwise broadcast to every connected client (legacy global feed behavior).
   */
  private dispatch(raw: string): void {
    let sessionId: unknown = undefined;
    try {
      const parsed = JSON.parse(raw) as { meta?: { sessionId?: unknown } };
      sessionId = parsed?.meta?.sessionId;
    } catch {
      // malformed payload → treat as global broadcast
    }

    if (typeof sessionId === 'string' && sessionId.length > 0) {
      this.routeToSession(sessionId, raw);
    } else {
      this.broadcast(raw);
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

  private broadcast(raw: string): void {
    if (!this.server) return;
    this.server.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(raw);
      }
    });
  }
}
