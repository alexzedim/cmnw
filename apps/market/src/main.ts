import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { MarketModule } from './market.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MarketModule, { bufferLogs: true });
  app.useLogger(new LoggerService(APP_LABELS.M));
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
