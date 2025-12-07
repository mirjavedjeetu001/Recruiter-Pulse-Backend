import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../schemas/user.schema';
import { AiSearchDto } from '../search/dto/search.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('generate-summary/:candidateId')
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async generateProfileSummary(@Param('candidateId') candidateId: string) {
    return this.aiService.generateProfileSummary(candidateId);
  }

  @Post('match-candidates')
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async aiMatchCandidates(@Body() aiSearchDto: AiSearchDto) {
    return this.aiService.aiMatchCandidates(aiSearchDto.requirements);
  }

  @Get('profile-suggestions/:candidateId')
  @Roles(UserRole.JOB_SEEKER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async suggestProfileImprovements(@Param('candidateId') candidateId: string) {
    return this.aiService.suggestProfileImprovements(candidateId);
  }
}
