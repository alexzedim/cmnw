import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ quiet: true });

import { NestFactory } from '@nestjs/core';
import { ItemsModule } from './items.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(ItemsModule);
  app.useLogger(new LoggerService(APP_LABELS.I));
  await app.listen(3010);
}
bootstrap();
