import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ quiet: true });

import { NestFactory } from '@nestjs/core';
import { WowProgressModule } from './wow-progress.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(WowProgressModule);
  app.useLogger(new LoggerService(APP_LABELS.W));
  await app.listen(3000);
}
bootstrap();
