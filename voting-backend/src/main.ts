import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { DataSource } from 'typeorm';
import * as express from 'express';
import * as oracledb from 'oracledb';

// ✅ SINGLE MODULE ONLY
import { AppModule } from './app.module';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  // =====================================================
  // 🔥 ORACLE CLIENT INIT (ONLY FOR PRODUCTION WALLET)
  // =====================================================
  if (isProd) {
    try {
      oracledb.initOracleClient({
        libDir: '/home/vapp/instantclient',
        configDir: '/home/vapp/wallet',
      });

      console.log('🔥 Oracle initialized (wallet + client)');
    } catch (err: any) {
      console.error('❌ Oracle init failed:', err.message);
      process.exit(1);
    }
  }

  // ✅ ALWAYS USE SAME MODULE
  const app = await NestFactory.create(AppModule);

  // =====================================================
  // 📁 SERVE UPLOADS
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
  // 🔐 PAYSTACK RAW BODY
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
  // JSON HANDLER (SAFE)
  // =====================================================
  const jsonParser = bodyParser.json({ limit: '2mb' });

  app.use((req: any, res: any, next: any) => {
    const url = (req.originalUrl || req.url || '').toString();

    if (url.startsWith('/api/payments/webhook')) return next();

    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) return next();

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
  // 🧠 DB DEBUG
  // =====================================================
  try {
    const ds = app.get(DataSource);

    const result = await ds.query(
      `SELECT USER AS db_user, SYS_CONTEXT('USERENV','CURRENT_SCHEMA') AS current_schema FROM dual`,
    );

    console.log('✅ DB CONNECTED:', result);
  } catch (err: any) {
    console.error('❌ DB CONNECTION FAILED:', err.message);
  }
}

bootstrap();