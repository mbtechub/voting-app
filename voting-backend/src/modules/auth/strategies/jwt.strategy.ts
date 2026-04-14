import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      // 🔥 FIX: guarantees string (no undefined → fixes TS error)
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // 🔒 STRICT VALIDATION
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // 🔒 REQUIRED FIELDS
    const adminId = payload?.sub ?? payload?.adminId;
    const role = payload?.role;

    if (!adminId) {
      throw new UnauthorizedException('Invalid token: missing adminId');
    }

    if (!role) {
      throw new UnauthorizedException('Invalid token: missing role');
    }

    // 🔒 NORMALIZE ROLE (CRITICAL FOR RBAC)
    const normalizedRole = String(role).toUpperCase();

    // 🔒 BLOCK INACTIVE ADMINS
    if (payload?.isActive === false) {
      throw new UnauthorizedException('Admin account is inactive');
    }

    // ✅ FINAL USER OBJECT (USED BY JwtAuthGuard + RolesGuard)
    return {
      adminId,
      email: payload?.email ?? null,
      username: payload?.username ?? null,
      firstName: payload?.firstName ?? null,
      lastName: payload?.lastName ?? null,
      isActive: payload?.isActive ?? true,
      role: normalizedRole, // 🔥 ALWAYS UPPERCASE
    };
  }
}