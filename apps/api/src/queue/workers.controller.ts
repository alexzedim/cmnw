import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { SetConcurrencyDto, WorkerConfig } from '@app/resources';

@Controller('workers')
export class WorkersController {
  private readonly WORKER_NAMES = [
    'osint',
    'dma',
    'characters',
    'guilds',
    'profile',
    'items',
    'auctions',
    'market',
  ];

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  @Post('concurrency')
  @HttpCode(HttpStatus.OK)
  async setConcurrency(@Body() dto: SetConcurrencyDto) {
    const { worker, concurrency, replicas } = dto;

    await this.redis.set(`worker:${worker}:concurrency`, concurrency);

    if (replicas !== undefined) {
      await this.redis.set(`worker:${worker}:replicas`, replicas);
    }

    return {
      success: true,
      worker,
      concurrency,
      replicas,
      message: 'Configuration updated. Restart workers to apply changes.',
    };
  }

  @Get('concurrency')
  async getConcurrency() {
    const config: Record<string, WorkerConfig> = {};

    for (const worker of this.WORKER_NAMES) {
      const concurrency = await this.redis.get(`worker:${worker}:concurrency`);
      const replicas = await this.redis.get(`worker:${worker}:replicas`);

      config[worker] = {
        concurrency,
        replicas,
      };
    }

    return config;
  }
}
