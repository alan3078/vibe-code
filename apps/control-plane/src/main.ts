import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.setGlobalPrefix('api');
  const portalOrigins = [...new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(process.env.PORTAL_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  ])];
  app.enableCors({ origin: portalOrigins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}

void bootstrap();
