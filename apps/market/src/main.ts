import { NestFactory } from '@nestjs/core';
import { MarketModule } from './market.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(MarketModule);
  app.useLogger(new LoggerService(APP_LABELS.A));
  await app.listen(3002);
}
bootstrap();
