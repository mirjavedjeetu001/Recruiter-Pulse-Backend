import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecruitersService } from './recruiters.service';
import { RecruitersController } from './recruiters.controller';
import { Recruiter, RecruiterSchema } from '../../schemas/recruiter.schema';
import { JobSeeker, JobSeekerSchema } from '../../schemas/job-seeker.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recruiter.name, schema: RecruiterSchema },
      { name: JobSeeker.name, schema: JobSeekerSchema },
    ]),
  ],
  controllers: [RecruitersController],
  providers: [RecruitersService],
  exports: [RecruitersService],
})
export class RecruitersModule {}
