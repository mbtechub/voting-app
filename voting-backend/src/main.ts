import 'reflect-metadata';

import * as path from 'path';
import * as fs from 'fs';
import * as oracledb from 'oracledb'; // <-- ADD
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { DataSource } from 'typeorm';
import * as express from 'express';

import { AppModule } from './app.module.prod';

console.log('🚀 BOOTING APP...');

// =====================================================
// 🔥 WALLET SETUP (ORACLE)
// =====================================================
process.env.TNS_ADMIN =
  process.env.TNS_ADMIN ||
  process.env.ORACLE_WALLET_PATH ||
  path.join(process.cwd(), 'wallet');

// =====================================================
// 🔍 ENV CHECK
// =====================================================
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
  console.log('🧪 Wallet path:', walletPath);

  if (fs.existsSync(walletPath)) {
    console.log('📁 Wallet exists');
    console.log('📂 Files:', fs.readdirSync(walletPath));
  } else {
    console.error('❌ Wallet NOT found at:', walletPath);
  }
} catch (err: any) {
  console.error('❌ Wallet debug error:', err.message);
}

// =====================================================
// 🔥 DIRECT ORACLE TEST (NEW)
// =====================================================
(async () => {
  try {
    console.log('🔍 Testing Oracle connection...');

    const conn = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      configDir: process.env.TNS_ADMIN,
    });

    console.log('✅ DIRECT ORACLE CONNECTED');

    const result = await conn.execute(
      `SELECT USER, SYS_CONTEXT('USERENV','CURRENT_SCHEMA') FROM dual`
    );

    console.log('✅ DB TEST:', result.rows);

    await conn.close();

    console.log('✅ ORACLE CLOSED');

  } catch (err: any) {

    console.error(
      '❌ DIRECT ORACLE ERROR:',
      err
    );

  }
})();

// =====================================================
// 🚀 BOOTSTRAP
// =====================================================
async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule);

  // =====================================================
  // 🔐 TRUST PROXY
  // =====================================================
  const instance = app.getHttpAdapter().getInstance();
  if (instance?.set) {
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
    'http://localhost:3000',
    process.env.FRONTEND_BASE_URL,
    'https://lasugalanight.com.ng',
    'https://www.lasugalanight.com.ng',
    'https://voting-app-five-delta.vercel.app',
  ].filter(Boolean);

  console.log('🌐 Allowed CORS origins:', allowedOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`❌ Blocked by CORS: ${origin}`);
      return callback(new Error(`CORS blocked: ${origin}`), false);
    },

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
    ],
  });

  // =====================================================
  // PREFIX
  // =====================================================
  app.setGlobalPrefix('api');

  // =====================================================
  // PAYSTACK RAW BODY
  // =====================================================
  app.use(
    '/api/paystack/webhook',
    bodyParser.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  const jsonParser = bodyParser.json({ limit: '2mb' });

  app.use((req: any, res: any, next: any) => {
    const url = (req.originalUrl || req.url || '').toString();

    if (url.startsWith('/api/paystack/webhook'))
      return next();

    const contentType =
      req.headers['content-type'] || '';

    if (
      contentType.includes(
        'multipart/form-data'
      )
    )
      return next();

    return jsonParser(req, res, next);
  });

  app.use(
    bodyParser.urlencoded({
      extended: true,
      limit: '2mb',
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.getHttpAdapter().get(
    '/health',
    (_req, res) => {
      res.status(200).send('OK');
    },
  );

  const port =
    Number(process.env.PORT || 3000);

  await app.listen(port, '0.0.0.0');

  console.log(
    `🚀 Server running on port ${port}`
  );

  console.log(
    `🌍 Mode: ${
      isProd ? 'PRODUCTION' : 'LOCAL'
    }`
  );
}

bootstrap();