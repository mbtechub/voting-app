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
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env'
          : '.env.local',
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 60,
      },
    ]),

    // 🔥 SMART + SAFE DB CONFIG
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = process.env.NODE_ENV;
        const tnsAdmin = config.get<string>('TNS_ADMIN');

        // ✅ Only enable wallet if BOTH conditions are true
        const useWallet = nodeEnv === 'production' && !!tnsAdmin;

        // ============================
        // 🔵 PRODUCTION (WALLET MODE)
        // ============================
        if (useWallet) {
          return {
            type: 'oracle',

            username: requireEnv(config, 'DB_USER'),
            password: requireEnv(config, 'DB_PASSWORD'),
            connectString: requireEnv(config, 'DB_CONNECT_STRING'),

            extra: {
              configDir: tnsAdmin,

              poolMin: 1,
              poolMax: 5,
              poolIncrement: 1,
              queueTimeout: 60000,
            },

            synchronize: false,
            autoLoadEntities: true,
            logging: false,
          };
        }

        // ============================
        // 🟢 LOCAL DEV (NO WALLET)
        // ============================
        return {
          type: 'oracle',

          username: requireEnv(config, 'DB_USER'),
          password: requireEnv(config, 'DB_PASSWORD'),
          connectString: requireEnv(config, 'DB_CONNECT_STRING'),

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