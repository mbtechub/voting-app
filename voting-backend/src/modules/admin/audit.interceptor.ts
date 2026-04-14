import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AUDIT_META_KEY, AuditMeta } from './audit.decorator';
import { AdminService } from './admin.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminService: AdminService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const meta = this.reflector.getAllAndOverride<AuditMeta>(AUDIT_META_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!meta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();

    const performedBy =
      req?.user?.username ||
      req?.user?.email ||
      req?.user?.sub ||
      'UNKNOWN_ADMIN';

    const initialEntityId = this.extractEntityId(req);
    const requestDetails = this.buildBaseDetails(req);

    return next.handle().pipe(
      tap((responseBody) => {
        const resolvedEntityId =
          this.extractEntityIdFromResponse(responseBody) ?? initialEntityId;

        void this.adminService
          .insertAuditLog({
            action: meta.action,
            entity: meta.entity,
            entityId: resolvedEntityId,
            performedBy,
            details: this.toSafeDetails({
              ...requestDetails,
              outcome: 'SUCCESS',
              responseSummary: this.buildResponseSummary(responseBody),
            }),
          })
          .catch(() => {});
      }),
      catchError((err) => {
        void this.adminService
          .insertAuditLog({
            action: meta.action,
            entity: meta.entity,
            entityId: initialEntityId,
            performedBy,
            details: this.toSafeDetails({
              ...requestDetails,
              outcome: 'FAILED',
              error: err?.message || 'Unknown error',
              errorName: err?.name || null,
              statusCode: err?.status || err?.statusCode || null,
            }),
          })
          .catch(() => {});

        return throwError(() => err);
      }),
    );
  }

  private extractEntityId(req: any): number | null {
    const candidates = [
      req?.params?.adminId,
      req?.params?.id,
      req?.params?.candidateId,
      req?.query?.electionId,
      req?.query?.adminId,
      req?.body?.electionId,
      req?.body?.adminId,
      req?.body?.candidateId,
      req?.body?.entityId,
    ];

    for (const value of candidates) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }

    return null;
  }

  private extractEntityIdFromResponse(body: any): number | null {
    if (!body || typeof body !== 'object') return null;

    const candidates = [
      body?.adminId,
      body?.electionId,
      body?.candidateId,
      body?.entityId,
      body?.paymentId,
      body?.cartId,
      body?.receiptId,
      body?.auditId,
    ];

    for (const value of candidates) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }

    return null;
  }

  private buildBaseDetails(req: any) {
    return {
      method: req?.method || null,
      path: req?.originalUrl || req?.url || null,
      ip: req?.ip || null,
      query: this.safeObject(req?.query || {}),
      body: this.safeBody(req?.body || {}),
    };
  }

  private buildResponseSummary(body: any) {
    if (body == null) return null;

    if (Array.isArray(body)) {
      return {
        type: 'array',
        length: body.length,
      };
    }

    if (typeof body === 'object') {
      const summary: Record<string, any> = {};

      const interestingKeys = [
        'ok',
        'adminId',
        'electionId',
        'candidateId',
        'paymentId',
        'cartId',
        'receiptId',
        'auditId',
        'status',
        'message',
        'count',
      ];

      for (const key of interestingKeys) {
        if (body[key] !== undefined) {
          summary[key] = body[key];
        }
      }

      return summary;
    }

    return {
      type: typeof body,
      value: String(body).slice(0, 300),
    };
  }

  private safeBody(body: Record<string, any>) {
    const clone = this.safeObject(body);

    const redactKeys = [
      'password',
      'newPassword',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'secret',
      'signature',
    ];

    for (const key of redactKeys) {
      if (key in clone) {
        clone[key] = '[REDACTED]';
      }
    }

    return clone;
  }

  private safeObject(obj: Record<string, any>) {
    const clone: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj || {})) {
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        clone[key] = typeof value === 'string' ? value.slice(0, 500) : value;
        continue;
      }

      if (Array.isArray(value)) {
        clone[key] = `[Array(${value.length})]`;
        continue;
      }

      if (typeof value === 'object') {
        clone[key] = '[Object]';
        continue;
      }

      clone[key] = String(value);
    }

    return clone;
  }

  private toSafeDetails(details: any) {
    try {
      const str = JSON.stringify(details);
      if (str.length <= 3500) return details;

      return {
        ...details,
        truncated: true,
        body: '[TRUNCATED]',
        responseSummary: details?.responseSummary ?? null,
      };
    } catch {
      return {
        outcome: details?.outcome || 'UNKNOWN',
        note: 'Audit details could not be serialized',
      };
    }
  }
}