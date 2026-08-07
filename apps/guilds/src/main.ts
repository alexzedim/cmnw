import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { NestFactory } from '@nestjs/core';
import { GuildsModule } from './guilds.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(GuildsModule, { bufferLogs: true });
  app.useLogger(new LoggerService(APP_LABELS.G));
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
