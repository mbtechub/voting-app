import 'reflect-metadata';

import * as path from 'path';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { DataSource } from 'typeorm';
import * as express from 'express';

import { AppModule } from './app.module';

console.log('🚀 BOOTING APP...');

// =====================================================
// 🔥 FORCE WALLET PATH (CRITICAL FOR RENDER)
// =====================================================
process.env.TNS_ADMIN =
  process.env.TNS_ADMIN ||
  process.env.ORACLE_WALLET_PATH ||
  path.join(process.cwd(), 'wallet');

console.log('ENV CHECK:', {
  DB_CONNECT_STRING: process.env.DB_CONNECT_STRING,
  DB_USER: process.env.DB_USER,
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
  TNS_ADMIN: process.env.TNS_ADMIN,
});

// =====================================================
// 🧪 WALLET DEBUG
// =====================================================
try {
  const walletPath = process.env.TNS_ADMIN!;

  console.log('🧪 Checking wallet path:', walletPath);

  const exists = fs.existsSync(walletPath);
  console.log('📁 Wallet path exists:', exists);

  if (exists) {
    const files = fs.readdirSync(walletPath);
    console.log('📂 Wallet files:', files);
  } else {
    console.error('❌ Wallet folder NOT found');
  }
} catch (err: any) {
  console.error('❌ Wallet debug error:', err.message);
}

// =====================================================
// 🚀 BOOTSTRAP
// =====================================================
async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  console.log('🔥 Wallet configured via TNS_ADMIN:', process.env.TNS_ADMIN);

  const app = await NestFactory.create(AppModule);

  // =====================================================
  // 🔐 TRUST PROXY (IMPORTANT FOR RENDER / PAYSTACK)
  // =====================================================
  const instance = app.getHttpAdapter().getInstance();
  if (instance && instance.set) {
    instance.set('trust proxy', 1);
  }

  // =====================================================
  // 📁 STATIC FILES
  // =====================================================
  app.use('/uploads', express.static('uploads'));

  // =====================================================
  // 🌐 CORS
  // =====================================================
  const allowedOrigins = [
    'http://localhost:3001',
    process.env.FRONTEND_BASE_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  });

  // =====================================================
  // PREFIX
  // =====================================================
  app.setGlobalPrefix('api');

  // =====================================================
  // 🔐 PAYSTACK RAW BODY (DO NOT TOUCH)
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
  // JSON HANDLER
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
    }),
  );

  // =====================================================
  // 🚨 HEALTH CHECK (IMPORTANT FOR RENDER PORT DETECTION)
  // =====================================================
  app.getHttpAdapter().get('/health', (_req, res) => {
    res.status(200).send('OK');
  });

  // =====================================================
  // 🚀 START SERVER (FIXED FOR RENDER)
  // =====================================================
  const port = Number(process.env.PORT || 3000);

  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Mode: ${isProd ? 'PRODUCTION' : 'LOCAL'}`);

  // =====================================================
  // 🧠 DB DEBUG (NON-BLOCKING)
  // =====================================================
  setTimeout(async () => {
    try {
      const ds = app.get(DataSource);

      const result = await ds.query(
        `SELECT USER AS db_user, SYS_CONTEXT('USERENV','CURRENT_SCHEMA') AS current_schema FROM dual`,
      );

      console.log('✅ DB CONNECTED:', result);
    } catch (err: any) {
      console.error('❌ DB CONNECTION FAILED:', err.message);
    }
  }, 3000); // delay so server still boots even if DB fails
}

bootstrap();
