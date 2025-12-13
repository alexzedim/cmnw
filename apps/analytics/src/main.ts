import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { NestFactory } from '@nestjs/core';
import { AnalyticsModule } from './analytics.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsModule);
  app.useLogger(new LoggerService(APP_LABELS.A));
  await app.listen(3001);
}
bootstrap();
