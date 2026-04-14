import { SetMetadata } from '@nestjs/common';

export const AUDIT_META_KEY = 'audit_meta';

export type AuditMeta = {
  action: string;
  entity: string;
};

export const Audit = (action: string, entity: string) =>
  SetMetadata(AUDIT_META_KEY, { action, entity });