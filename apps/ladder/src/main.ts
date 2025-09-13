import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ quiet: true });

import { NestFactory } from '@nestjs/core';
import { LadderModule } from './ladder.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(LadderModule);
  app.useLogger(new LoggerService(APP_LABELS.L));
  await app.listen(3000);
}
bootstrap();
