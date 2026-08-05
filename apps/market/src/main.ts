import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { MarketModule } from './market.module';

async function bootstrap() {
  const app = await NestFactory.create(MarketModule);
  app.useLogger(new LoggerService(APP_LABELS.M));
  await app.listen(3002);
}
bootstrap();
