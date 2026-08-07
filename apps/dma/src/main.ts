import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { DmaModule } from './dma.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(DmaModule, { bufferLogs: true });
  app.useLogger(new LoggerService(APP_LABELS.D));
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
