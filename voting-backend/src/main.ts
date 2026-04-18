import 'reflect-metadata';

// 🔥 FORCE WALLET PATH EARLY (CRITICAL)
process.env.TNS_ADMIN = process.env.TNS_ADMIN || '/home/vapp/wallet';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { DataSource } from 'typeorm';
import * as express from 'express';
import * as oracledb from 'oracledb';

// ✅ STATIC IMPORTS
import { AppModule } from './app.module';
import { AppModuleProd } from './app.module.prod';

async function bootstrap() {
  // =====================================================
  // ✅ ENV SWITCH (LOCAL vs PROD)
  // =====================================================
  const isProd = process.env.NODE_ENV === 'production';

  // 🔥 ORACLE WALLET (ONLY IN PRODUCTION — HARD FORCED)
  if (isProd) {
    try {
      oracledb.initOracleClient({
        configDir: '/home/vapp/wallet', // 🔥 HARD PATH (DO NOT RELY ON ENV)
      });

      console.log('🔥 Oracle wallet forced at runtime:', process.env.TNS_ADMIN);
      console.log('✅ Oracle client initialized with wallet');
    } catch (err) {
      console.error('❌ Oracle client init failed:', err);
    }
  }

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
  // NORMAL JSON
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
  } catch (err: any) {
    console.warn('⚠️ DB DEBUG FAILED:', err?.message || err);
  }
}

bootstrap();