import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { OsintModule } from './osint.module';

async function bootstrap() {
  const app = await NestFactory.create(OsintModule);
  app.useLogger(new LoggerService(APP_LABELS.O));
  await app.listen(3000);
}
bootstrap();
