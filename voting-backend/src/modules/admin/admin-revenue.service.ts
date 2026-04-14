import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class AdminRevenueService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getRevenueSummary() {
    const totalRevenueRows = await this.dataSource.query(`
      SELECT NVL(SUM(AMOUNT), 0) AS TOTAL_REVENUE
      FROM PAYMENTS
      WHERE STATUS IN ('SUCCESS', 'PARTIALLY_APPLIED')
    `);

    const statusBreakdown = await this.dataSource.query(`
      SELECT STATUS, COUNT(*) AS COUNT
      FROM PAYMENTS
      GROUP BY STATUS
    `);

    const dailyRevenue = await this.dataSource.query(`
      SELECT TRUNC(PAID_AT) AS DAY, NVL(SUM(AMOUNT), 0) AS TOTAL
      FROM PAYMENTS
      WHERE STATUS IN ('SUCCESS', 'PARTIALLY_APPLIED')
      GROUP BY TRUNC(PAID_AT)
      ORDER BY DAY DESC
    `);

    return {
      totalRevenue: Number(totalRevenueRows?.[0]?.TOTAL_REVENUE ?? 0),
      statusBreakdown: statusBreakdown.map((r: any) => ({
        status: r.STATUS,
        count: Number(r.COUNT),
      })),
      dailyRevenue: dailyRevenue.map((r: any) => ({
        day: r.DAY,
        total: Number(r.TOTAL),
      })),
    };
  }
}
