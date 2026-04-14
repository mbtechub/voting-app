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

// ✅ New: Election Management (admin elections + candidates)
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
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 60,
      },
    ]),

    // ✅ No hardcoded DB creds/URL: use env vars (matches your project rule)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'oracle',
        connectString: requireEnv(config, 'DB_CONNECT_STRING'),
        username: requireEnv(config, 'DB_USER'),
        password: requireEnv(config, 'DB_PASS'),
        synchronize: false,
        autoLoadEntities: true,
        logging: true,
      }),
    }),

    AuthModule,
    CartModule,
    PaymentsModule,
    WebhooksModule,
    AdminModule,
    PublicModule,
    ReceiptsModule,
    PaystackModule,

    // ✅ Added
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