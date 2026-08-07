import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { NestFactory } from '@nestjs/core';
import { ValuationsModule } from './valuations.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ValuationsModule, { bufferLogs: true });
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
