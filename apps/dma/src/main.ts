import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ quiet: true });

import { NestFactory } from '@nestjs/core';
import { DmaModule } from './dma.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(DmaModule);
  app.useLogger(new LoggerService(APP_LABELS.D));
  await app.listen(3004);
}
bootstrap();
