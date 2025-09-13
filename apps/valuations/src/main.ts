import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ quiet: true });

import { NestFactory } from '@nestjs/core';
import { ValuationsModule } from './valuations.module';

async function bootstrap() {
  const app = await NestFactory.create(ValuationsModule);
  await app.listen(3000);
}
bootstrap();
