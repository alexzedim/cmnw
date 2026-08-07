import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { AnalyticsModule } from './analytics.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AnalyticsModule, { bufferLogs: true });
  app.useLogger(new LoggerService(APP_LABELS.A));
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
