import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRevenueService } from './admin-revenue.service';
import { AdminExportsService } from './admin-exports.service';
import { AuditInterceptor } from './audit.interceptor';
import { Reflector } from '@nestjs/core';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRevenueService,
    AdminExportsService,
    AuditInterceptor,
    Reflector,
  ],
  exports: [
    AdminService,
    AdminRevenueService,
    AdminExportsService,
  ],
})
export class AdminModule {}