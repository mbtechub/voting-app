import { SetMetadata } from '@nestjs/common';
import { Role } from './roles.enum';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to route or controller
 * Example:
 *   @Roles(Role.ADMIN)
 *   @Roles(Role.ADMIN, Role.SUPER_ADMIN)
 */
export function Roles(...roles: Role[]) {
  // 🔒 Normalize roles to uppercase (prevents mismatch issues)
  const normalized = roles.map((r) => String(r).toUpperCase() as Role);

  return SetMetadata(ROLES_KEY, normalized);
}