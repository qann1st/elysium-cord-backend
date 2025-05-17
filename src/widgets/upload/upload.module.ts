import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { FirebaseAdminModule } from '../firebase-admin/firebase-admin.module';

@Module({
  imports: [ConfigModule, FirebaseAdminModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
