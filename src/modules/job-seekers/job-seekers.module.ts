import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobSeekersService } from './job-seekers.service';
import { JobSeekersController } from './job-seekers.controller';
import { JobSeeker, JobSeekerSchema } from '../../schemas/job-seeker.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobSeeker.name, schema: JobSeekerSchema },
    ]),
  ],
  controllers: [JobSeekersController],
  providers: [JobSeekersService],
  exports: [JobSeekersService],
})
export class JobSeekersModule {}
