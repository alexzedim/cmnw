import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { WarcraftLogsModule } from './warcraft-logs.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WarcraftLogsModule, { bufferLogs: true });
  app.useLogger(new LoggerService(APP_LABELS.WCL));
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
