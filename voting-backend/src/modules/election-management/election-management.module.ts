import { Module } from '@nestjs/common';
import { ElectionManagementController } from './election-management.controller';
import { ElectionManagementService } from './election-management.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [ElectionManagementController],
  providers: [ElectionManagementService],
})
export class ElectionManagementModule {}