// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicModule } from './modules/public/public.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { PaystackModule } from './paystack/paystack.module';
import { ElectionManagementModule } from './modules/election-management/election-management.module';

function requireEnv(config: ConfigService, key: string): string {
  const v = (config.get<string>(key) || '').trim();
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      // 🔥 LOAD LOCAL FIRST, THEN FALLBACK TO PROD
      envFilePath: ['.env.local', '.env'],
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 60,
      },
    ]),

    // 🔥 SMART DB CONFIG (AUTO SWITCH)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectString = requireEnv(config, 'DB_CONNECT_STRING');

        // 🔥 Detect Autonomous DB (cloud) vs local
        const isCloud =
          connectString.includes('adb.') ||
          connectString.includes('_high') ||
          connectString.includes('_medium') ||
          connectString.includes('_low');

        // ============================
        // 🔵 AUTONOMOUS DB (SSL REQUIRED)
        // ============================
        if (isCloud) {
          return {
            type: 'oracle',

            connectString,
            username: requireEnv(config, 'DB_USER'),
            password: requireEnv(config, 'DB_PASSWORD'),

            extra: {
              ssl: true,
              sslServerDnMatch: false,
            },

            synchronize: false,
            autoLoadEntities: true,
            logging: false,
          };
        }

        // ============================
        // 🟢 LOCAL ORACLE XE (NO SSL)
        // ============================
        return {
          type: 'oracle',

          connectString,
          username: requireEnv(config, 'DB_USER'),
          password: requireEnv(config, 'DB_PASSWORD'),

          synchronize: false,
          autoLoadEntities: true,
          logging: true,
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
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}