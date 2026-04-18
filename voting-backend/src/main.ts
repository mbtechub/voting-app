import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { DataSource } from 'typeorm';
import * as express from 'express';

// ✅ STATIC IMPORTS (FIXES TS ERROR)
import { AppModule } from './app.module';
import { AppModuleProd } from './app.module.prod';

async function bootstrap() {
  // =====================================================
  // ✅ ENV SWITCH (LOCAL vs PROD)
  // =====================================================
  const isProd = process.env.NODE_ENV === 'production';

  const ModuleClass = isProd ? AppModuleProd : AppModule;

  const app = await NestFactory.create(ModuleClass);

  // =====================================================
  // 🔥 SERVE UPLOADS
  // =====================================================
  app.use('/uploads', express.static('uploads'));

  // =====================================================
  // 🌐 CORS
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
  // PREFIX
  // =====================================================
  app.setGlobalPrefix('api');

  // =====================================================
  // 🔐 PAYSTACK RAW BODY (MUST COME BEFORE JSON PARSER)
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
  // NORMAL JSON (SAFE)
  // =====================================================
  const jsonParser = bodyParser.json({ limit: '2mb' });

  app.use((req: any, res: any, next: any) => {
    const url = (req.originalUrl || req.url || '').toString();

    if (url.startsWith('/api/payments/webhook')) return next();

    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return next();
    }

    return jsonParser(req, res, next);
  });

  // =====================================================
  // FORM DATA
  // =====================================================
  app.use(
    bodyParser.urlencoded({
      extended: true,
      limit: '2mb',
    }),
  );

  // =====================================================
  // VALIDATION
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
  // 🚀 START SERVER
  // =====================================================
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Nest API running on http://0.0.0.0:${port}`);
  console.log(`🌍 Mode: ${isProd ? 'PRODUCTION (Oracle Wallet)' : 'LOCAL DB'}`);

  // =====================================================
  // 🧠 SAFE DB DEBUG
  // =====================================================
  try {
    const ds = app.get(DataSource);

    const whoAmI = await ds.query(
      `SELECT USER AS db_user, SYS_CONTEXT('USERENV','CURRENT_SCHEMA') AS current_schema FROM dual`,
    );

    console.log('✅ DB CONNECTED:', whoAmI);
  } catch {
    console.warn('⚠️ DB DEBUG FAILED (but server is running)');
  }
}

bootstrap();