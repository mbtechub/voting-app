import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // ✅ Let Express handle header normalization
    const received = req.get('x-super-admin-token');
    const expected = process.env.SUPER_ADMIN_TOKEN;

    if (!expected) {
      throw new UnauthorizedException('SUPER_ADMIN_TOKEN is not set');
    }

    // Temporary debug (safe, remove later)

    if (!received || received.trim() !== expected.trim()) {
      throw new UnauthorizedException('Super Admin token missing or invalid');
    }

    return true;
  }
}
