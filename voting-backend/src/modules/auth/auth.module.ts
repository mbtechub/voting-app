// src/modules/auth/auth.module.ts

import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { PassportModule } from '@nestjs/passport';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import { AuthController } from './auth.controller';

import { AuthService } from './auth.service';

import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // ✅ ENV SUPPORT
    ConfigModule,

    // ✅ PASSPORT JWT
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    // ✅ JWT CONFIG
    JwtModule.registerAsync({
  imports: [ConfigModule],

  inject: [ConfigService],

  useFactory: (
    config: ConfigService,
  ) => ({
    // 🔒 SECRET FROM ENV ONLY
    secret:
      config.getOrThrow<string>(
        'JWT_SECRET',
      ),

    // 🔒 SESSION TIMEOUT
    signOptions: {
      expiresIn: '2h',
    },
  }),
}),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
  ],

  exports: [AuthService],
})
export class AuthModule {}