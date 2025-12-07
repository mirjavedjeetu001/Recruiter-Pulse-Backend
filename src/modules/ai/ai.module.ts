import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { JobSeeker, JobSeekerSchema } from '../../schemas/job-seeker.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobSeeker.name, schema: JobSeekerSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
