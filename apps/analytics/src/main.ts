import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { NestFactory } from '@nestjs/core';
import { AnalyticsModule } from './analytics.module';
import { LoggerService } from '@app/logger';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsModule);
  app.useLogger(new LoggerService('ANALYTICS'));
  const port = process.env.PORT || 3010;
  await app.listen(port);
  console.log(`Analytics service listening on port ${port}`);
}
bootstrap();
