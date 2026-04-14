import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService], // ✅ VERY IMPORTANT
})
export class CloudinaryModule {}