import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { TestsModule } from './tests.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TestsModule, { bufferLogs: true });
  app.useLogger(new LoggerService(APP_LABELS.T));
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
