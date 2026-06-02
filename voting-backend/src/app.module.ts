// src/app.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import {
  ThrottlerModule,
  ThrottlerGuard,
} from '@nestjs/throttler';

import {
  APP_GUARD,
} from '@nestjs/core';

// Feature modules
import { AuthModule }
  from './modules/auth/auth.module';

import { CartModule }
  from './modules/cart/cart.module';

import { PaymentsModule }
  from './modules/payments/payments.module';

import { WebhooksModule }
  from './modules/webhooks/webhooks.module';

import { AdminModule }
  from './modules/admin/admin.module';

import { PublicModule }
  from './modules/public/public.module';

import { ReceiptsModule }
  from './modules/receipts/receipts.module';

import { PaystackModule }
  from './paystack/paystack.module';

import { ElectionManagementModule }
  from './modules/election-management/election-management.module';


function requireEnv(
  config: ConfigService,
  key: string,
): string {
  const v =
    (
      config.get<string>(
        key,
      ) || ''
    ).trim();

  if (!v) {
    throw new Error(
      `Missing required env var: ${key}`,
    );
  }

  return v;
}


@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,

      envFilePath: [
        '.env.local',
        '.env',
      ],
    }),


    ThrottlerModule.forRoot([
      {
        ttl: 60,

        limit: 200,
      },
    ]),


    // =====================================
    // 🔥 ORACLE CONFIG (RENDER SAFE)
    // =====================================

    TypeOrmModule.forRootAsync({

      imports: [
        ConfigModule,
      ],

      inject: [
        ConfigService,
      ],

      useFactory: (
        config:
          ConfigService,
      ) => {

        const connectString =
          requireEnv(
            config,
            'DB_CONNECT_STRING',
          );

        const isCloud =
          connectString.includes(
            'adb.',
          ) ||

          connectString.includes(
            '_high',
          ) ||

          connectString.includes(
            '_medium',
          ) ||

          connectString.includes(
            '_low',
          );


        // =====================================
        // 🔵 ORACLE CLOUD AUTONOMOUS DB
        // =====================================

        if (isCloud) {

          return {

            type:
              'oracle',

            connectString,

            username:
              requireEnv(
                config,
                'DB_USER',
              ),

            password:
              requireEnv(
                config,
                'DB_PASSWORD',
              ),


            extra: {

  ssl: true,

  sslServerDnMatch:
    true,

  connectTimeout:
    30000,

  // ==========================
  // 🔥 CONNECTION POOLING
  // ==========================

  poolMin: 5,

  poolMax: 25,

  poolIncrement: 1,

  // wait before failing
  queueTimeout:
    60000,
},

// TypeORM pool
poolSize:
  25,


            synchronize:
              false,

            autoLoadEntities:
              true,


            logging:
              process.env
                .NODE_ENV !==
              'production',
          };
        }



        // =====================================
        // 🟢 LOCAL ORACLE XE
        // =====================================

        return {

          type:
            'oracle',

          connectString,

          username:
            requireEnv(
              config,
              'DB_USER',
            ),

          password:
            requireEnv(
              config,
              'DB_PASSWORD',
            ),

            extra: {

              poolMin: 1,

              poolMax: 5,

              poolIncrement:
                1,
            },

          synchronize:
            false,

          autoLoadEntities:
            true,

          logging:
            process.env
              .NODE_ENV !==
            'production',
        };
      },
    }),


    AuthModule,

    CartModule,

    PaymentsModule,

    WebhooksModule,

    AdminModule,

    PublicModule,

    ReceiptsModule,

    PaystackModule,

    ElectionManagementModule,
  ],


  providers: [

    {
      provide:
        APP_GUARD,

      useClass:
        ThrottlerGuard,
    },
  ],
})

export class AppModule {}