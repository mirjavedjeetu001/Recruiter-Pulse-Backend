import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobSeekersService } from './job-seekers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../schemas/user.schema';
import { UpdateJobSeekerProfileDto } from './dto/job-seeker.dto';

@Controller('job-seekers')
@UseGuards(JwtAuthGuard)
export class JobSeekersController {
  constructor(private jobSeekersService: JobSeekersService) {}

  @Get('profile')
  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(RolesGuard)
  async getMyProfile(@CurrentUser() user: any) {
    console.log('📋 GetProfile request - User:', { userId: user?.userId, role: user?.role });
    
    try {
      const profile = await this.jobSeekersService.getProfile(user.userId);
      console.log('✅ Profile fetched successfully:', { userId: user.userId, profileScore: profile.profileScore });
      return profile;
    } catch (error) {
      console.error('❌ Error fetching profile:', error.message);
      throw error;
    }
  }

  @Patch('profile')
  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(RolesGuard)
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateData: UpdateJobSeekerProfileDto,
  ) {
    console.log('🔄 UpdateProfile request - User:', { userId: user?.userId, role: user?.role });
    console.log('📝 Update data:', JSON.stringify(updateData).substring(0, 200));
    
    try {
      const profile = await this.jobSeekersService.updateProfile(user.userId, updateData);
      console.log('✅ Profile updated successfully:', { userId: user.userId, profileScore: profile.profileScore });
      return profile;
    } catch (error) {
      console.error('❌ Error updating profile:', error.message);
      throw error;
    }
  }

  @Get('all')
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async getAllJobSeekers() {
    return this.jobSeekersService.getAllJobSeekers();
  }

  @Get(':id')
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async getJobSeekerById(@Param('id') id: string) {
    console.log('📄 GetJobSeekerById request', { id });
    return this.jobSeekersService.getJobSeekerById(id);
  }
}
