import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicModule } from './modules/public/public.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ElectionManagementModule } from './modules/election-management/election-management.module';

// 🔒 Strict env loader (DO NOT BREAK THIS PATTERN)
function requireEnv(config: ConfigService, key: string): string {
  const v = (config.get<string>(key) || '').trim();
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

@Module({
  imports: [
    // =====================================================
    // 🌍 ENV CONFIG
    // =====================================================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env'
          : '.env.local',
    }),

    // =====================================================
    // 🛡️ RATE LIMITING
    // =====================================================
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 60,
      },
    ]),

    // =====================================================
    // 🔥 ORACLE DB (PRODUCTION-STABLE)
    // =====================================================
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const tnsAdmin = requireEnv(config, 'TNS_ADMIN');

        return {
          type: 'oracle' as const,

          username: requireEnv(config, 'DB_USER'),
          password: requireEnv(config, 'DB_PASSWORD'),

          // Must match wallet tnsnames.ora
          connectString: requireEnv(config, 'DB_CONNECT_STRING'),

          synchronize: false,
          autoLoadEntities: true,
          logging: false,

          // Render stability
          retryAttempts: 10,
          retryDelay: 3000,
          keepConnectionAlive: true,

          extra: {
            configDir: tnsAdmin,
            poolMin: 1,
            poolMax: 5,
            poolIncrement: 1,
            queueTimeout: 60000,
          },
        };
      },
    }),

    // =====================================================
    // 🧩 FEATURE MODULES
    // =====================================================
    AuthModule,
    CartModule,

    // 🔥 SINGLE SOURCE OF TRUTH FOR WEBHOOKS
    PaymentsModule,

    AdminModule,
    PublicModule,
    ReceiptsModule,
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