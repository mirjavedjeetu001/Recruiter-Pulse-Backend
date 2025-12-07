import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { JobSeeker, JobSeekerSchema } from '../../schemas/job-seeker.schema';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobSeeker.name, schema: JobSeekerSchema },
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/cvs',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `cv-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx/;
        const ext = extname(file.originalname).toLowerCase().slice(1);
        const mimetype = allowedTypes.test(file.mimetype);
        const extname_valid = allowedTypes.test(ext);

        if (mimetype && extname_valid) {
          return cb(null, true);
        }
        cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
      },
    }),
    AiModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
