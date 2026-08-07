import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { CharactersModule } from './characters.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CharactersModule, { bufferLogs: true });
  app.useLogger(new LoggerService(APP_LABELS.CH));
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
