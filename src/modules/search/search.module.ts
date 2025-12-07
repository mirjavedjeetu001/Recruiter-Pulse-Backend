import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { JobSeeker, JobSeekerSchema } from '../../schemas/job-seeker.schema';
import { RecruitersModule } from '../recruiters/recruiters.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobSeeker.name, schema: JobSeekerSchema },
    ]),
    RecruitersModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
