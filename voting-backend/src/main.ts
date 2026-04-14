import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { DataSource } from 'typeorm';
import * as express from 'express'; // ✅ ADD THIS

function requireEnv(name: string): string {
  const value = (process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // =====================================================
  // 🔥 SERVE UPLOADS (CRITICAL FIX FOR IMAGES)
  // =====================================================
  app.use('/uploads', express.static('uploads'));

  // =====================================================
  // FLEXIBLE CORS (DEV + NETWORK TESTING)
  // =====================================================
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-paystack-signature',
    ],
  });

  // =====================================================
  // DEBUG: Confirm DB schema
  // =====================================================
  const ds = app.get(DataSource);
  const whoAmI = await ds.query(
    `SELECT USER AS db_user, SYS_CONTEXT('USERENV','CURRENT_SCHEMA') AS current_schema FROM dual`,
  );
  console.log('DB_SCHEMA_CHECK:', whoAmI);

  // =====================================================
  // Global prefix
  // =====================================================
  app.setGlobalPrefix('api');

  // =====================================================
  // RAW BODY FOR PAYSTACK WEBHOOK (MUST STAY FIRST)
  // =====================================================
  app.use(
    '/api/payments/webhook',
    bodyParser.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // =====================================================
  // NORMAL JSON REQUESTS (DO NOT TOUCH MULTIPART)
  // =====================================================
  const jsonParser = bodyParser.json({
    limit: '2mb',
  });

  app.use((req: any, res: any, next: any) => {
    const url = (req.originalUrl || req.url || '').toString();

    // skip webhook (uses raw body)
    if (url.startsWith('/api/payments/webhook')) return next();

    // skip multipart (IMPORTANT)
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return next();
    }

    return jsonParser(req, res, next);
  });

  // =====================================================
  // URL ENCODED (FOR FORMS)
  // =====================================================
  app.use(
    bodyParser.urlencoded({
      extended: true,
      limit: '2mb',
    }),
  );

  // =====================================================
  // GLOBAL VALIDATION (FORMDATA SAFE)
  // =====================================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // =====================================================
  // PORT
  // =====================================================
  const port = Number(process.env.PORT || 3000);

  await app.listen(port, '0.0.0.0');

  console.log(`Nest API listening on http://0.0.0.0:${port}`);
}

bootstrap();