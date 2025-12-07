import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RecruitersService } from './recruiters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../schemas/user.schema';
import { UpdateRecruiterProfileDto, SaveCandidateDto } from './dto/recruiter.dto';

@Controller('recruiters')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.RECRUITER)
@UseGuards(RolesGuard)
export class RecruitersController {
  constructor(private recruitersService: RecruitersService) {}

  @Get('profile')
  async getMyProfile(@CurrentUser() user: any) {
    return this.recruitersService.getProfile(user.userId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateData: UpdateRecruiterProfileDto,
  ) {
    return this.recruitersService.updateProfile(user.userId, updateData);
  }

  @Post('save-candidate')
  async saveCandidate(@CurrentUser() user: any, @Body() saveData: SaveCandidateDto) {
    console.log('💾 SaveCandidate request', { userId: user?.userId, candidateId: saveData?.candidateId });
    return this.recruitersService.saveCandidate(user.userId, saveData);
  }

  @Delete('save-candidate/:candidateId')
  async removeSavedCandidate(
    @CurrentUser() user: any,
    @Param('candidateId') candidateId: string,
  ) {
    console.log('🗑 RemoveSavedCandidate request', { userId: user?.userId, candidateId });
    return this.recruitersService.removeSavedCandidate(user.userId, candidateId);
  }

  @Get('saved-candidates')
  async getSavedCandidates(@CurrentUser() user: any) {
    console.log('📥 GetSavedCandidates request', { userId: user?.userId });
    return this.recruitersService.getSavedCandidates(user.userId);
  }

  @Get('search-history')
  async getSearchHistory(@CurrentUser() user: any) {
    return this.recruitersService.getSearchHistory(user.userId);
  }
}
