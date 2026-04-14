import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './roles.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // ✅ No roles defined → allow (public or just authenticated route)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 🔒 MUST have authenticated user
    if (!user) {
      throw new ForbiddenException('Access denied: no authenticated user');
    }

    // 🔒 Normalize user role (critical fix)
    const userRole = String(user.role || '').toUpperCase();

    if (!userRole) {
      throw new ForbiddenException('Access denied: missing role');
    }

    // 🔒 Normalize required roles too (defensive)
    const normalizedRequired = requiredRoles.map((r) =>
      String(r).toUpperCase(),
    );

    const hasAccess = normalizedRequired.includes(userRole as Role);

    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied: requires role [${normalizedRequired.join(
          ', ',
        )}], but got [${userRole}]`,
      );
    }

    return true;
  }
}