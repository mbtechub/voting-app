import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { MulterModule } from '@nestjs/platform-express';
import { cloudinaryConfig } from 'src/config/cloudinary';
import { Multer } from 'multer';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
@Injectable()
export class AdminService {
  
constructor(
  private readonly dataSource: DataSource,
  private readonly cloudinaryService: CloudinaryService,
) {}
  

  /* ============================================================
     RESULTS
  ============================================================ */

  async getLiveResults(electionId: number) {
    const rows = await this.dataSource.query(
      `
      SELECT
        c.candidate_id         AS "candidateId",
        c.name                 AS "candidateName",
        NVL(r.vote_count, 0)   AS "voteCount"
      FROM candidates c
      LEFT JOIN election_results r
        ON r.election_id = c.election_id
       AND r.candidate_id = c.candidate_id
      WHERE c.election_id = :1
      ORDER BY NVL(r.vote_count, 0) DESC, c.candidate_id ASC
      `,
      [electionId],
    );
    return rows;
  }

  async getFinalResults(electionId: number) {
    const electionRows = await this.dataSource.query(
      `SELECT election_id AS "electionId", end_date AS "endDate" FROM elections WHERE election_id = :1`,
      [electionId],
    );

    if (!electionRows?.length) throw new NotFoundException();

    const endDateRaw = electionRows[0]?.endDate;
    const endDate = endDateRaw ? new Date(endDateRaw) : null;

    if (!endDate || Number.isNaN(endDate.getTime())) {
      throw new NotFoundException();
    }
    if (endDate.getTime() >= Date.now()) {
      throw new NotFoundException();
    }

    return this.getLiveResults(electionId);
  }

  /* ============================================================
     REVENUE
  ============================================================ */

  async getTotalRevenue(electionId: number) {
    const electionExists = await this.dataSource.query(
      `SELECT election_id FROM elections WHERE election_id = :1`,
      [electionId],
    );
    if (!electionExists?.length) throw new NotFoundException();

    const rows = await this.dataSource.query(
      `
      SELECT NVL(SUM(ci.sub_total), 0) AS "totalRevenue"
      FROM cart_items ci
      JOIN carts c ON c.cart_id = ci.cart_id
      JOIN payments p ON p.cart_id = c.cart_id
      WHERE ci.election_id = :1
        AND p.status IN ('SUCCESS', 'PARTIALLY_APPLIED')
      `,
      [electionId],
    );

    return Number(rows?.[0]?.totalRevenue ?? 0);
  }

  async getRevenueByCandidate(electionId: number) {
    const electionExists = await this.dataSource.query(
      `SELECT election_id FROM elections WHERE election_id = :1`,
      [electionId],
    );
    if (!electionExists?.length) throw new NotFoundException();

    const rows = await this.dataSource.query(
      `
      SELECT
        ci.candidate_id           AS "candidateId",
        c.name                    AS "candidateName",
        NVL(SUM(ci.sub_total), 0) AS "revenue"
      FROM cart_items ci
      JOIN candidates c ON c.candidate_id = ci.candidate_id
      JOIN carts ca ON ca.cart_id = ci.cart_id
      JOIN payments p ON p.cart_id = ca.cart_id
      WHERE ci.election_id = :1
        AND p.status IN ('SUCCESS', 'PARTIALLY_APPLIED')
      GROUP BY ci.candidate_id, c.name
      ORDER BY NVL(SUM(ci.sub_total), 0) DESC
      `,
      [electionId],
    );

    return (rows || []).map((r: any) => ({
      candidateId: Number(r.candidateId),
      candidateName: r.candidateName,
      revenue: Number(r.revenue ?? 0),
    }));
  }

  async getElectionFinancials() {
    const rows = await this.dataSource.query(`
      SELECT
        e.ELECTION_ID  AS "electionId",
        e.TITLE        AS "title",
        e.STATUS       AS "status",
        e.START_DATE   AS "startDate",
        e.END_DATE     AS "endDate",
        NVL(SUM(ci.SUB_TOTAL), 0) AS "revenue",
        NVL(SUM(ci.VOTE_QTY), 0)  AS "votesSold"
      FROM ELECTIONS e
      LEFT JOIN CART_ITEMS ci ON ci.ELECTION_ID = e.ELECTION_ID
      LEFT JOIN CARTS c ON c.CART_ID = ci.CART_ID
      LEFT JOIN PAYMENTS p
        ON p.CART_ID = c.CART_ID
       AND p.STATUS IN ('SUCCESS', 'PARTIALLY_APPLIED')
      GROUP BY
        e.ELECTION_ID, e.TITLE, e.STATUS, e.START_DATE, e.END_DATE
      ORDER BY e.ELECTION_ID DESC
    `);

    return (rows || []).map((r: any) => ({
      electionId: Number(r.electionId),
      title: r.title,
      status: r.status,
      startDate: r.startDate,
      endDate: r.endDate,
      revenue: Number(r.revenue ?? 0),
      votesSold: Number(r.votesSold ?? 0),
    }));
  }

  /* ============================================================
     EXECUTIVE DASHBOARD
  ============================================================ */

  async getDashboardSummary() {
    const totalRevenueRows = await this.dataSource.query(`
      SELECT NVL(SUM(amount), 0) AS "totalRevenue"
      FROM payments
      WHERE status IN ('SUCCESS', 'PARTIALLY_APPLIED')
    `);

    const paymentStatusRows = await this.dataSource.query(`
      SELECT status AS "status", COUNT(*) AS "count"
      FROM payments
      GROUP BY status
      ORDER BY status
    `);

    const electionsTotalRows = await this.dataSource.query(`
      SELECT COUNT(*) AS "total"
      FROM elections
    `);

    const electionsActiveRows = await this.dataSource.query(`
      SELECT COUNT(*) AS "active"
      FROM elections
      WHERE start_date <= TRUNC(SYSDATE)
        AND end_date >= TRUNC(SYSDATE)
    `);

    const electionsEndedRows = await this.dataSource.query(`
      SELECT COUNT(*) AS "ended"
      FROM elections
      WHERE end_date < TRUNC(SYSDATE)
    `);

    const dailyRevenueRows = await this.dataSource.query(`
      SELECT "day", "total"
      FROM (
        SELECT "day", "total"
        FROM (
          SELECT
            TRUNC(NVL(paid_at, created_at)) AS "day",
            NVL(SUM(amount), 0)            AS "total"
          FROM payments
          WHERE status IN ('SUCCESS', 'PARTIALLY_APPLIED')
          GROUP BY TRUNC(NVL(paid_at, created_at))
          ORDER BY TRUNC(NVL(paid_at, created_at)) DESC
        )
        FETCH FIRST 7 ROWS ONLY
      )
      ORDER BY "day" ASC
    `);

    return {
      revenue: { total: Number(totalRevenueRows?.[0]?.totalRevenue ?? 0) },
      payments: {
        byStatus: (paymentStatusRows || []).map((r: any) => ({
          status: r.status,
          count: Number(r.count),
        })),
      },
      elections: {
        total: Number(electionsTotalRows?.[0]?.total ?? 0),
        active: Number(electionsActiveRows?.[0]?.active ?? 0),
        ended: Number(electionsEndedRows?.[0]?.ended ?? 0),
      },
      dailyRevenue: (dailyRevenueRows || []).map((r: any) => ({
        day: r.day,
        total: Number(r.total),
      })),
    };
  }

  /* ============================================================
     PAYMENT EXPLORER
  ============================================================ */

  async searchPayments(q: string) {
    const query = (q || '').trim();
    if (!query) throw new BadRequestException('q is required');

    const payments = await this.dataSource.query(
      `
      SELECT
        p.payment_id   AS "paymentId",
        p.cart_id      AS "cartId",
        p.paystack_ref AS "paystackRef",
        p.amount       AS "amount",
        p.status       AS "status",
        p.paid_at      AS "paidAt",
        p.created_at   AS "createdAt",
        c.cart_uuid    AS "cartUuid",
        c.status       AS "cartStatus",
        c.total_amount AS "cartTotal"
      FROM payments p
      LEFT JOIN carts c ON c.cart_id = p.cart_id
      WHERE
        p.paystack_ref = :1
        OR c.cart_uuid = :2
        OR EXISTS (
          SELECT 1 FROM vote_logs vl
          WHERE vl.payment_id = p.payment_id
            AND vl.reference = :3
        )
        OR EXISTS (
          SELECT 1 FROM receipts r
          WHERE r.payment_id = p.payment_id
            AND r.reference = :4
        )
      ORDER BY p.payment_id DESC
      FETCH FIRST 20 ROWS ONLY
      `,
      [query, query, query, query],
    );

    if (!payments?.length) return { query, matches: 0, payments: [] };

    const enriched: any[] = [];

    for (const p of payments) {
      const cartId = Number(p.cartId);
      const paymentId = Number(p.paymentId);

      const items = await this.dataSource.query(
        `
        SELECT
          cart_item_id   AS "cartItemId",
          cart_id        AS "cartId",
          election_id    AS "electionId",
          candidate_id   AS "candidateId",
          vote_qty       AS "voteQty",
          price_per_vote AS "pricePerVote",
          sub_total      AS "subTotal"
        FROM cart_items
        WHERE cart_id = :1
        ORDER BY cart_item_id ASC
        `,
        [cartId],
      );

      const voteLogs = await this.dataSource.query(
        `
        SELECT
          vote_log_id   AS "voteLogId",
          payment_id    AS "paymentId",
          reference     AS "reference",
          election_id   AS "electionId",
          candidate_id  AS "candidateId",
          vote_qty      AS "voteQty",
          apply_status  AS "applyStatus",
          skip_reason   AS "skipReason",
          created_at    AS "createdAt",
          cart_item_id  AS "cartItemId"
        FROM vote_logs
        WHERE payment_id = :1
        ORDER BY vote_log_id ASC
        `,
        [paymentId],
      );

      const receiptRows = await this.dataSource.query(
        `
        SELECT
          receipt_id     AS "receiptId",
          payment_id     AS "paymentId",
          reference      AS "reference",
          snapshot_json  AS "snapshotJson",
          snapshot_hash  AS "snapshotHash",
          pdf_hash       AS "pdfHash",
          created_at     AS "createdAt"
        FROM receipts
        WHERE payment_id = :1
        ORDER BY receipt_id DESC
        FETCH FIRST 1 ROWS ONLY
        `,
        [paymentId],
      );

      enriched.push({
        payment: p,
        cart: {
          cartId,
          cartUuid: p.cartUuid,
          status: p.cartStatus,
          totalAmount: Number(p.cartTotal ?? 0),
        },
        items: items || [],
        voteLogs: voteLogs || [],
        receipt: receiptRows?.[0] ?? null,
      });
    }

    return { query, matches: enriched.length, payments: enriched };
  }

  /* ============================================================
     ELECTION-LEVEL BREAKDOWN (Dashboard)
  ============================================================ */

  async getElectionBreakdown() {
    const rows = await this.dataSource.query(`
      SELECT
        e.election_id AS "electionId",
        e.title       AS "title",
        e.status      AS "status",
        NVL(SUM(ci.sub_total), 0) AS "totalRevenue",
        NVL(SUM(ci.vote_qty), 0)  AS "totalVotes",
        COUNT(DISTINCT p.payment_id) AS "totalPayments"
      FROM elections e
      LEFT JOIN cart_items ci ON ci.election_id = e.election_id
      LEFT JOIN carts c ON c.cart_id = ci.cart_id
      LEFT JOIN payments p
        ON p.cart_id = c.cart_id
       AND p.status IN ('SUCCESS', 'PARTIALLY_APPLIED')
      GROUP BY e.election_id, e.title, e.status
      ORDER BY NVL(SUM(ci.sub_total), 0) DESC
    `);

    return (rows || []).map((r: any) => ({
      electionId: Number(r.electionId),
      title: r.title,
      status: r.status,
      totalRevenue: Number(r.totalRevenue),
      totalVotes: Number(r.totalVotes),
      totalPayments: Number(r.totalPayments),
    }));
  }

  /* ============================================================
     DASHBOARD — TOP CANDIDATES
  ============================================================ */

  async getTopCandidates(params: { electionId?: number; limit?: number }) {
    const electionId = params.electionId ?? null;
    const limit = params.limit ?? 10;

    try {
      const rows = await this.dataSource.query(
        `
        SELECT
          t."electionId",
          t."electionTitle",
          t."candidateId",
          t."candidateName",
          t."voteCount"
        FROM (
          SELECT
            c.election_id         AS "electionId",
            e.title               AS "electionTitle",
            c.candidate_id        AS "candidateId",
            c.name                AS "candidateName",
            NVL(r.vote_count, 0)  AS "voteCount"
          FROM candidates c
          JOIN elections e
            ON e.election_id = c.election_id
          LEFT JOIN election_results r
            ON r.election_id = c.election_id
           AND r.candidate_id = c.candidate_id
          WHERE c.election_id = NVL(:1, c.election_id)
          ORDER BY NVL(r.vote_count, 0) DESC, c.candidate_id ASC
        ) t
        WHERE ROWNUM <= :2
        `,
        [electionId, limit],
      );

      return (rows || []).map((r: any) => ({
        electionId: Number(r.electionId),
        electionTitle: r.electionTitle,
        candidateId: Number(r.candidateId),
        candidateName: r.candidateName,
        voteCount: Number(r.voteCount ?? 0),
      }));
    } catch (err: any) {
      console.error('[getTopCandidates] failed:', err);
      const msg =
        process.env.NODE_ENV === 'production'
          ? 'Top candidates query failed'
          : String(err?.message || err);
      throw new InternalServerErrorException(msg);
    }
  }

  /* ============================================================
     DASHBOARD — REVENUE (LAST 30 DAYS)
  ============================================================ */

  async getRevenueLast30Days() {
    const rows = await this.dataSource.query(`
      SELECT
        d.day AS "day",
        NVL(r.total, 0) AS "total"
      FROM (
        SELECT TRUNC(SYSDATE) - (LEVEL - 1) AS day
        FROM dual
        CONNECT BY LEVEL <= 30
      ) d
      LEFT JOIN (
        SELECT
          TRUNC(NVL(paid_at, created_at)) AS day,
          SUM(amount) AS total
        FROM payments
        WHERE status IN ('SUCCESS', 'PARTIALLY_APPLIED')
          AND TRUNC(NVL(paid_at, created_at)) >= TRUNC(SYSDATE) - 29
        GROUP BY TRUNC(NVL(paid_at, created_at))
      ) r
        ON r.day = d.day
      ORDER BY d.day ASC
    `);

    return (rows || []).map((r: any) => ({
      day: r.day,
      total: Number(r.total ?? 0),
    }));
  }

  /* ============================================================
     DASHBOARD — TOP ELECTIONS
  ============================================================ */

  async getTopElections(params: { limit?: number }) {
    const limit = params.limit ?? 5;

    const rows = await this.dataSource.query(
      `
      SELECT
        t."electionId",
        t."electionTitle",
        t."revenue",
        t."votesSold",
        t."paymentsCount"
      FROM (
        SELECT
          e.election_id AS "electionId",
          e.title       AS "electionTitle",
          NVL(SUM(CASE WHEN p.payment_id IS NOT NULL THEN ci.sub_total ELSE 0 END), 0) AS "revenue",
          NVL(SUM(CASE WHEN p.payment_id IS NOT NULL THEN ci.vote_qty  ELSE 0 END), 0) AS "votesSold",
          COUNT(DISTINCT p.payment_id) AS "paymentsCount"
        FROM elections e
        LEFT JOIN cart_items ci ON ci.election_id = e.election_id
        LEFT JOIN carts c ON c.cart_id = ci.cart_id
        LEFT JOIN payments p
          ON p.cart_id = c.cart_id
         AND p.status IN ('SUCCESS', 'PARTIALLY_APPLIED')
        GROUP BY e.election_id, e.title
        ORDER BY
          NVL(SUM(CASE WHEN p.payment_id IS NOT NULL THEN ci.sub_total ELSE 0 END), 0) DESC,
          e.election_id ASC
      ) t
      WHERE ROWNUM <= :1
      `,
      [limit],
    );

    return (rows || []).map((r: any) => ({
      electionId: Number(r.electionId),
      electionTitle: r.electionTitle,
      revenue: Number(r.revenue ?? 0),
      votesSold: Number(r.votesSold ?? 0),
      paymentsCount: Number(r.paymentsCount ?? 0),
    }));
  }

  /* ============================================================
     DASHBOARD — PAYMENTS HEALTH
  ============================================================ */

  async getPaymentsHealth() {
    const cartPendingRows = await this.dataSource.query(`
      SELECT COUNT(*) AS "count"
      FROM carts
      WHERE status = 'PENDING'
    `);

    const paymentsByStatusRows = await this.dataSource.query(`
      SELECT status AS "status", COUNT(*) AS "count"
      FROM payments
      GROUP BY status
    `);

    const last24hRows = await this.dataSource.query(`
      SELECT
        SUM(CASE WHEN status IN ('SUCCESS', 'PARTIALLY_APPLIED') THEN 1 ELSE 0 END) AS "successCount",
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS "failedCount"
      FROM payments
      WHERE NVL(paid_at, created_at) >= (SYSDATE - 1)
    `);

    const last7dRows = await this.dataSource.query(`
      SELECT
        SUM(CASE WHEN status IN ('SUCCESS', 'PARTIALLY_APPLIED') THEN 1 ELSE 0 END) AS "successCount",
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS "failedCount"
      FROM payments
      WHERE NVL(paid_at, created_at) >= (SYSDATE - 7)
    `);

    const byStatus: Record<string, number> = {};
    for (const r of paymentsByStatusRows || []) {
      byStatus[String(r.status)] = Number(r.count ?? 0);
    }

    return {
      pendingCarts: Number(cartPendingRows?.[0]?.count ?? 0),
      payments: {
        initiated: byStatus['INITIATED'] ?? 0,
        success: byStatus['SUCCESS'] ?? 0,
        partial: byStatus['PARTIALLY_APPLIED'] ?? 0,
        failed: byStatus['FAILED'] ?? 0,
      },
      last24h: {
        success: Number(last24hRows?.[0]?.successCount ?? 0),
        failed: Number(last24hRows?.[0]?.failedCount ?? 0),
      },
      last7d: {
        success: Number(last7dRows?.[0]?.successCount ?? 0),
        failed: Number(last7dRows?.[0]?.failedCount ?? 0),
      },
    };
  }

  /* ============================================================
     WEBHOOK EVENTS (SUPER_ADMIN)
  ============================================================ */

  async getRecentWebhookEvents(params: { limit?: number; reference?: string }) {
    const limit = Math.max(1, Math.min(Number(params.limit || 50), 200));
    const reference = (params.reference || '').trim();

    const binds: any[] = [];
    let where = `WHERE EVENT_NAME = 'charge.success'`;

    if (reference) {
      binds.push(reference);
      where += ` AND REFERENCE = :${binds.length}`;
    }

    const limitBindIndex = binds.length + 1;
    binds.push(limit);

    const rows = await this.dataSource.query(
      `
      SELECT
        WEBHOOK_EVENT_ID     AS "webhookEventId",
        PROVIDER             AS "provider",
        ROUTE                AS "route",
        IP_ADDRESS           AS "ipAddress",
        EVENT_NAME           AS "eventName",
        REFERENCE            AS "reference",
        SIGNATURE_PRESENT    AS "signaturePresent",
        SIGNATURE_VALID      AS "signatureValid",
        PROCESSED            AS "processed",
        PROCESS_RESULT       AS "processResult",
        ERROR_MESSAGE        AS "errorMessage",
        REQUEST_HASH         AS "requestHash",
        RECEIVED_AT          AS "receivedAt",
        FINISHED_AT          AS "finishedAt",
        DURATION_MS          AS "durationMs",
        PAYMENT_ID           AS "paymentId",
        CART_ID              AS "cartId"
      FROM WEBHOOK_EVENTS
      ${where}
      ORDER BY WEBHOOK_EVENT_ID DESC
      FETCH FIRST :${limitBindIndex} ROWS ONLY
      `,
      binds,
    );

    return { count: rows.length, items: rows };
  }

  /* ============================================================
     AUDIT LOGS (SUPER_ADMIN)
  ============================================================ */

  async getAuditLogs(limit = 50, admin?: string, action?: string) {
    const safeLimit = Math.max(1, Math.min(Number(limit || 50), 200));

    const binds: any[] = [];
    let where = 'WHERE 1=1';

    if (admin) {
      binds.push(`%${admin.toLowerCase()}%`);
      where += ` AND LOWER(PERFORMED_BY) LIKE :${binds.length}`;
    }

    if (action) {
      binds.push(`%${action.toLowerCase()}%`);
      where += ` AND LOWER(ACTION) LIKE :${binds.length}`;
    }

    binds.push(safeLimit);

    const rows = await this.dataSource.query(
      `
      SELECT
        AUDIT_ID      AS "auditId",
        PERFORMED_BY  AS "adminUsername",
        ACTION        AS "action",
        ENTITY        AS "module",
        ENTITY_ID     AS "target",
        DETAILS       AS "message",
        'SUCCESS'     AS "status",
        CREATED_AT    AS "createdAt"
      FROM AUDIT_LOGS
      ${where}
      ORDER BY CREATED_AT DESC
      FETCH FIRST :${binds.length} ROWS ONLY
      `,
      binds,
    );

    return {
      count: rows.length,
      items: rows,
    };
  }

  async insertAuditLog(input: {
    action: string;
    entity: string;
    entityId?: number | null;
    performedBy?: string | null;
    details?: any;
  }) {
    const nextIdRows = await this.dataSource.query(`
      SELECT NVL(MAX(AUDIT_ID), 0) + 1 AS NEXT_ID
      FROM AUDIT_LOGS
    `);

    const nextId =
      Number(nextIdRows?.[0]?.NEXT_ID ?? nextIdRows?.[0]?.next_id ?? 1) || 1;

    const detailsString =
      input.details == null
        ? null
        : typeof input.details === 'string'
          ? input.details
          : JSON.stringify(input.details);

    await this.dataSource.query(
      `
      INSERT INTO AUDIT_LOGS (
        AUDIT_ID,
        ACTION,
        ENTITY,
        ENTITY_ID,
        PERFORMED_BY,
        CREATED_AT,
        DETAILS
      )
      VALUES (
        :1,
        :2,
        :3,
        :4,
        :5,
        SYSDATE,
        :6
      )
      `,
      [
        nextId,
        input.action,
        input.entity,
        input.entityId ?? null,
        input.performedBy ?? null,
        detailsString,
      ],
    );
  }

  /* ============================================================
     USERS (SUPER_ADMIN)
  ============================================================ */

  async listAdminUsers(params: { limit: number }) {
    const limit = Math.max(1, Math.min(Number(params.limit || 50), 200));

    const rows = await this.dataSource.query(
      `
      SELECT
        ADMIN_ID     AS "adminId",
        USERNAME     AS "username",
        EMAIL        AS "email",
        ROLE_ID      AS "roleId",
        IS_ACTIVE    AS "isActive",
        CREATED_AT   AS "createdAt",
        LAST_LOGIN   AS "lastLogin"
      FROM ADMINS
      ORDER BY ADMIN_ID DESC
      FETCH FIRST :1 ROWS ONLY
      `,
      [limit],
    );

    return { count: rows.length, items: rows };
  }

  async createAdminUser(input: {
    username: string;
    email: string;
    password: string;
    roleId: number;
    isActive?: 'Y' | 'N';
  }) {
    const username = (input.username || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    const password = (input.password || '').trim();
    const roleId = Number(input.roleId);
    const isActive = (input.isActive || 'Y').toUpperCase() as 'Y' | 'N';

    if (!username) throw new BadRequestException('username is required');
    if (!email) throw new BadRequestException('email is required');
    if (!password || password.length < 6) {
      throw new BadRequestException('password must be at least 6 characters');
    }
    if (!Number.isFinite(roleId) || roleId <= 0) {
      throw new BadRequestException('roleId must be a positive number');
    }
    if (isActive !== 'Y' && isActive !== 'N') {
      throw new BadRequestException('isActive must be Y or N');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      await this.dataSource.query(
        `
        INSERT INTO ADMINS (USERNAME, EMAIL, PASSWORD_HASH, ROLE_ID, IS_ACTIVE, CREATED_AT)
        VALUES (:1, :2, :3, :4, :5, SYSDATE)
        `,
        [username, email, passwordHash, roleId, isActive],
      );
    } catch (e: any) {
      if (String(e?.message || '').includes('ORA-00001')) {
        throw new BadRequestException('username or email already exists');
      }
      throw e;
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        ADMIN_ID     AS "adminId",
        USERNAME     AS "username",
        EMAIL        AS "email",
        ROLE_ID      AS "roleId",
        IS_ACTIVE    AS "isActive",
        CREATED_AT   AS "createdAt",
        LAST_LOGIN   AS "lastLogin"
      FROM ADMINS
      WHERE EMAIL = :1
      `,
      [email],
    );

    return rows?.[0] || { ok: true };
  }

  async updateAdminUser(
    adminId: number,
    input: { roleId?: number; isActive?: 'Y' | 'N' },
  ) {
    const roleId =
      input.roleId === undefined ? undefined : Number(input.roleId);
    const isActiveRaw = (input.isActive || '').toUpperCase();

    if (roleId !== undefined && (!Number.isFinite(roleId) || roleId <= 0)) {
      throw new BadRequestException('roleId must be a positive number');
    }

    if (
      input.isActive !== undefined &&
      isActiveRaw !== 'Y' &&
      isActiveRaw !== 'N'
    ) {
      throw new BadRequestException('isActive must be Y or N');
    }

    const existing = await this.dataSource.query(
      `SELECT ADMIN_ID AS "adminId" FROM ADMINS WHERE ADMIN_ID = :1`,
      [adminId],
    );
    if (!existing?.length) throw new NotFoundException('Admin not found');

    const sets: string[] = [];
    const binds: any[] = [];

    if (roleId !== undefined) {
      binds.push(roleId);
      sets.push(`ROLE_ID = :${binds.length}`);
    }

    if (input.isActive !== undefined) {
      binds.push(isActiveRaw);
      sets.push(`IS_ACTIVE = :${binds.length}`);
    }

    if (!sets.length) throw new BadRequestException('Nothing to update');

    binds.push(adminId);

    await this.dataSource.query(
      `
      UPDATE ADMINS
      SET ${sets.join(', ')}
      WHERE ADMIN_ID = :${binds.length}
      `,
      binds,
    );

    const rows = await this.dataSource.query(
      `
      SELECT
        ADMIN_ID     AS "adminId",
        USERNAME     AS "username",
        EMAIL        AS "email",
        ROLE_ID      AS "roleId",
        IS_ACTIVE    AS "isActive",
        CREATED_AT   AS "createdAt",
        LAST_LOGIN   AS "lastLogin"
      FROM ADMINS
      WHERE ADMIN_ID = :1
      `,
      [adminId],
    );

    return rows?.[0] || { ok: true };
  }

  async resetAdminPassword(adminId: number, newPassword: string) {
    const pw = (newPassword || '').trim();
    if (!pw || pw.length < 6) {
      throw new BadRequestException('newPassword must be at least 6 characters');
    }

    const existing = await this.dataSource.query(
      `SELECT ADMIN_ID AS "adminId" FROM ADMINS WHERE ADMIN_ID = :1`,
      [adminId],
    );
    if (!existing?.length) throw new NotFoundException('Admin not found');

    const passwordHash = await bcrypt.hash(pw, 10);

    await this.dataSource.query(
      `
      UPDATE ADMINS
      SET PASSWORD_HASH = :1
      WHERE ADMIN_ID = :2
      `,
      [passwordHash, adminId],
    );

    return { ok: true };
  }

  //Image upload//
  async createCandidate(data: {
  electionId: number;
  name: string;
  description?: string;
  votePrice?: number | null;
  photoUrl?: string | null;
  file?: any;
}) {
  const cloudinary = cloudinaryConfig();

 let photoUrl =
  data.photoUrl !== undefined && data.photoUrl !== null
    ? String(data.photoUrl).trim()
    : null;

  // ✅ Upload to Cloudinary if file exists
  if (data.file) {
    await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'nominees',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);

          photoUrl = result?.secure_url || null;
          resolve(result);
        },
      );

      // ✅ SAFE (file exists here)
      stream.end(data.file!.buffer);
    });
  }

  // ✅ INSERT INTO ORACLE
  await this.dataSource.query(
    `
    INSERT INTO candidates (
      candidate_id,
      election_id,
      name,
      description,
      photo_url,
      vote_price,
      created_at
    )
    VALUES (
      CANDIDATES_SEQ.NEXTVAL,
      :1,
      :2,
      :3,
      :4,
      :5,
      SYSDATE
    )
    `,
    [
      data.electionId,
      data.name,
      data.description || null,
      photoUrl,
      data.votePrice ?? null,
    ],
  );

  return {
    message: 'Candidate created successfully',
    photoUrl,
  };
}

async updateCandidate(
  candidateId: number,
  data: {
    name: string;
    description?: string;
    votePrice?: number | null;
    photoUrl?: string | null;
    file?: any;
  },
) {
  const cloudinary = cloudinaryConfig();

  /* ============================================================
     EXISTING RECORD (VERY IMPORTANT)
  ============================================================ */
  const existing = await this.getCandidateById(candidateId);

  if (!existing) {
    throw new NotFoundException('Candidate not found');
  }

  const oldPhotoUrl = existing.photoUrl || null;

  /* ============================================================
     PHOTO LOGIC (SAFE + NON-DESTRUCTIVE)
  ============================================================ */

  // default: keep existing
  let photoUrl: string | null = oldPhotoUrl;

  // ✅ CASE 1: FILE UPLOAD (HIGHEST PRIORITY)
  if (data.file) {
    await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'nominees',
          resource_type: 'image',
        },
        async (error, result) => {
          if (error) return reject(error);

          const newUrl = result?.secure_url || null;

          // 🔥 delete old image if different
          if (oldPhotoUrl && newUrl && oldPhotoUrl !== newUrl) {
            try {
              const publicId =
                this.cloudinaryService.extractPublicId(oldPhotoUrl);

              if (publicId) {
                await this.cloudinaryService.deleteImage(publicId);
              }
            } catch (err) {
              console.warn('Old image delete failed:', err);
            }
          }

          photoUrl = newUrl;
          resolve(result);
        },
      );

      stream.end(data.file!.buffer);
    });
  }

  // ✅ CASE 2: URL CHANGE (only if explicitly provided)
  else if (data.photoUrl !== undefined) {
    const newUrl = data.photoUrl
      ? String(data.photoUrl).trim()
      : null;

    if (newUrl !== oldPhotoUrl) {
      // delete old image if exists
      if (oldPhotoUrl) {
        try {
          const publicId =
            this.cloudinaryService.extractPublicId(oldPhotoUrl);

          if (publicId) {
            await this.cloudinaryService.deleteImage(publicId);
          }
        } catch (err) {
          console.warn('Old image delete failed:', err);
        }
      }

      photoUrl = newUrl;
    }
  }

  /* ============================================================
     NORMALIZE OTHER FIELDS
  ============================================================ */

  const description =
    data.description !== undefined && data.description !== null
      ? String(data.description).trim() || null
      : null;

  let votePrice: number | null = null;

  if (
    data.votePrice !== undefined &&
    data.votePrice !== null &&
    String(data.votePrice).trim() !== ''
  ) {
    const n = Number(data.votePrice);

    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException('Vote price must be >= 0');
    }

    votePrice = n;
  }

  /* ============================================================
     UPDATE (SAFE NVL LOGIC)
  ============================================================ */

  await this.dataSource.query(
    `
    UPDATE candidates
    SET
      name = :1,
      description = :2,
      photo_url = :3,
      vote_price = :4
    WHERE candidate_id = :5
    `,
    [
      data.name,
      description,
      photoUrl,
      votePrice,
      candidateId,
    ],
  );

  return {
    message: 'Candidate updated successfully',
    photoUrl,
  };
}


async getCandidateById(candidateId: number) {
  const rows = await this.dataSource.query(
    `
    SELECT 
      candidate_id AS "candidateId",
      photo_url   AS "photoUrl"
    FROM candidates
    WHERE candidate_id = :1
    `,
    [candidateId],
  );

  return rows?.[0] || null;
}

async getCandidatesByElection(electionId: number) {
  const rows = await this.dataSource.query(
    `
    SELECT
      c.candidate_id AS "candidateId",
      c.name         AS "name",
      c.photo_url    AS "photoUrl"   -- 🔥 THIS IS THE FIX
    FROM candidates c
    WHERE c.election_id = :1
    ORDER BY c.candidate_id ASC
    `,
    [electionId],
  );

  return rows;
}
/* ============================================================
   PUBLIC — GET CANDIDATES (WITH IMAGE)
============================================================ */

async getPublicCandidates(electionId: number) {
  const rows = await this.dataSource.query(
    `
    SELECT
      c.candidate_id AS "candidateId",
      c.name         AS "name",
      c.photo_url    AS "photoUrl" -- 🔥 THIS FIXES YOUR ISSUE
    FROM candidates c
    WHERE c.election_id = :1
    ORDER BY c.candidate_id ASC
    `,
    [electionId],
  );

  return rows;
}

}