import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CoreModule, { bufferLogs: true });
  app.useLogger(new LoggerService(APP_LABELS.C));
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
