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
// ❌ REMOVED PaystackModule (causing webhook conflict)
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

    // 🔥 FINAL: ORACLE WALLET CONNECTION (STABLE)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const tnsAdmin = requireEnv(config, 'TNS_ADMIN');

        return {
          type: 'oracle' as const,

          username: requireEnv(config, 'DB_USER'),
          password: requireEnv(config, 'DB_PASSWORD'),

          // 🔥 MUST MATCH tnsnames.ora
          connectString: requireEnv(config, 'DB_CONNECT_STRING'),

          synchronize: false,
          autoLoadEntities: true,
          logging: false,

          // 🔥 CRITICAL FOR RENDER STABILITY
          retryAttempts: 10,
          retryDelay: 3000,
          keepConnectionAlive: true,

          // 🔥 WALLET CONFIG (REQUIRED)
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

    AuthModule,
    CartModule,
    PaymentsModule,        // ✅ THIS handles webhook correctly
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