import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ quiet: true });

import { cmnwConfig } from '@app/configuration';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '15mb' }));

  app.useLogger(new LoggerService(APP_LABELS.CMNW));

  const corsOrigin = cmnwConfig.cors.origins.length > 0 ? cmnwConfig.cors.origins : true;

  app.enableCors({
    origin: corsOrigin,
    credentials: cmnwConfig.cors.allowCredentials,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Disposition'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const options = new DocumentBuilder()
    .setTitle('CMNW Backend')
    .setDescription('Provides REST API for CMNW-DB')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(cmnwConfig.port);
}
bootstrap();
