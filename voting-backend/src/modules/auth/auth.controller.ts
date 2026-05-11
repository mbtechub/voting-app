import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // -------------------------------------------------
  // ADMIN LOGIN
  // POST /api/auth/admin/login
  // -------------------------------------------------
  @Throttle({
    default: {
      ttl: 60,
      limit: 5,
    },
  })
  @Post('admin/login')
  adminLogin(@Body() dto: AdminLoginDto) {
    const identifier =
      (dto.identifier ?? dto.email ?? '').trim();

    return this.authService.adminLogin(
      identifier,
      dto.password,
    );
  }

  // -------------------------------------------------
  // ADMIN WHOAMI (JWT Protected)
  // GET /api/auth/admin/whoami
  // -------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get('admin/whoami')
  whoami(@Req() req: any) {
    const user = req.user;

    return {
      ok: true,

      role: user.role ?? null,

      admin: {
        adminId:
          user.adminId ?? null,

        email:
          user.email ?? null,

        username:
          user.username ?? null,

        firstName:
          user.firstName ?? null,

        lastName:
          user.lastName ?? null,

        isActive:
          user.isActive ?? null,

        role:
          user.role ?? null,

        mustChangePassword:
          user.mustChangePassword ??
          'Y',
      },
    };
  }

  // -------------------------------------------------
  // CHANGE PASSWORD
  // POST /api/auth/admin/change-password
  // -------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Post('admin/change-password')
  changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.adminId,
      dto,
    );
  }
}