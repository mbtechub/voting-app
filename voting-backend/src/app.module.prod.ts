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

    // 🔥 FINAL: DIRECT ORACLE CONNECTION (NO WALLET)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const nodeEnv = process.env.NODE_ENV;

        return {
          type: 'oracle' as const,

          username: requireEnv(config, 'DB_USER'),
          password: requireEnv(config, 'DB_PASSWORD'),

          // ✅ MUST be this format in env:
          // adb.af-johannesburg-1.oraclecloud.com:1522/votingapplifedb_medium?ssl=true
          connectString: requireEnv(config, 'DB_CONNECT_STRING'),

          synchronize: false,
          autoLoadEntities: true,
          logging: nodeEnv !== 'production',

          // 🔥 CRITICAL FOR RENDER
          retryAttempts: 10,
          retryDelay: 3000,
          keepConnectionAlive: true,

          // 🔥 REQUIRED FOR ORACLE TCPS
          extra: {
            poolMin: 1,
            poolMax: 5,
            poolIncrement: 1,
            queueTimeout: 60000,

            ssl: true, // 🔥 THIS IS IMPORTANT
          },
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