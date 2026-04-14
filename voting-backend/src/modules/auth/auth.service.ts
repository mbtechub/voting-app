import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async adminLogin(identifier: string, password: string) {
    const normIdentifier = (identifier ?? '').trim().toUpperCase();

    const rows = await this.dataSource.query(
      `
      SELECT
        a.admin_id      AS admin_id,
        a.email         AS email,
        a.username      AS username,
        a.password_hash AS password_hash,
        NVL(a.is_active, 'Y') AS is_active,
        r.role_name     AS role_name
      FROM admins a
      JOIN roles r ON r.role_id = a.role_id
      WHERE TRIM(UPPER(a.email)) = :1
         OR TRIM(UPPER(a.username)) = :2
      `,
      [normIdentifier, normIdentifier],
    );

    if (!rows || rows.length === 0) {
      throw new UnauthorizedException('NO_ADMIN_FOUND');
    }

    const admin = rows[0];

    const rawIsActive = admin.is_active ?? admin.IS_ACTIVE ?? 'Y';
    const isActive = String(rawIsActive).trim().toUpperCase() === 'Y';

    if (!isActive) {
      throw new ForbiddenException('Admin account is disabled');
    }

    const rawHash = admin.password_hash ?? admin.PASSWORD_HASH;
    if (!password || !rawHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, rawHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const adminId = admin.admin_id ?? admin.ADMIN_ID;
    const adminEmail = admin.email ?? admin.EMAIL ?? null;
    const adminUsername = admin.username ?? admin.USERNAME ?? null;
    const roleName = admin.role_name ?? admin.ROLE_NAME ?? null;

    await this.dataSource.query(
      `UPDATE admins SET last_login = SYSDATE WHERE admin_id = :1`,
      [adminId],
    );

    const payload = {
      adminId,
      email: adminEmail,
      username: adminUsername,
      firstName: null,
      lastName: null,
      isActive: rawIsActive,
      role: roleName,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      admin: {
        adminId,
        email: adminEmail,
        username: adminUsername,
        firstName: null,
        lastName: null,
        isActive: rawIsActive,
        role: roleName,
      },
    };
  }
}