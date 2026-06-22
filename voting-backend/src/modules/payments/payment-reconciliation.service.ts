// src/modules/payments/payment-reconciliation.service.ts

import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { Cron } from '@nestjs/schedule';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentReconciliationService {
  private readonly logger =
    new Logger(
      PaymentReconciliationService.name,
    );

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo:
      Repository<Payment>,

    private readonly paymentsService:
      PaymentsService,
  ) {}

  // =====================================
  // Every 5 minutes
  // Recover missed webhooks
  // =====================================
  @Cron('*/5 * * * *')
  async reconcilePendingPayments() {
    try {
      const cutoff =
        new Date(
          Date.now() -
            5 * 60 * 1000,
        );

      const pendingPayments =
        await this.paymentRepo
          .createQueryBuilder('p')
          .where(
            'p.status = :status',
            {
              status:
                'INITIATED',
            },
          )
          .andWhere(
            'p.createdAt < :cutoff',
            {
              cutoff,
            },
          )
          .getMany();

      if (
        !pendingPayments.length
      ) {
        return;
      }

      this.logger.log(
        `Found ${pendingPayments.length} INITIATED payments`,
      );

      for (const payment of pendingPayments) {
        try {
          const verify =
            await this.paymentsService
              .verifyPaystackTransaction(
                payment.paystackRef,
              );

          if (
            verify?.status &&
            verify?.data?.status ===
              'success'
          ) {
            await this.paymentsService
              .recoverPaymentByReference(
                payment.paystackRef,
              );

            this.logger.log(
              `Recovered payment: ${payment.paystackRef}`,
            );
          }
        } catch (error: any) {
          this.logger.error(
            `Failed recovery for ${payment.paystackRef}: ${error?.message}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Reconciliation job failed: ${error?.message}`,
      );
    }
  }
}