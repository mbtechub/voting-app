import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRevenueService } from './admin-revenue.service';
import { AdminExportsService } from './admin-exports.service';
import { AuditInterceptor } from './audit.interceptor'; // ✅ NEW
import { Reflector } from '@nestjs/core'; // ✅ required for interceptor
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRevenueService,
    AdminExportsService,
    AuditInterceptor, // ✅ register interceptor
    Reflector, // ✅ required for metadata reflection
  ],
  exports: [
    AdminService,
    AdminRevenueService,
    AdminExportsService,
  ],
})

@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRevenueService,
    AdminExportsService,
  ],
})

export class AdminModule {}