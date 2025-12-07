import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../schemas/user.schema';
import { SearchCandidatesDto, AiSearchDto } from './dto/search.dto';
import { RecruitersService } from '../recruiters/recruiters.service';

@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RECRUITER, UserRole.ADMIN)
export class SearchController {
  constructor(
    private searchService: SearchService,
    private recruitersService: RecruitersService,
  ) {}

  @Post('candidates')
  async searchCandidates(
    @Body() searchDto: SearchCandidatesDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.searchService.searchCandidates(searchDto);
    
    // Save search history
    await this.recruitersService.addSearchHistory(
      user.userId,
      searchDto.query || 'Advanced search',
      searchDto,
      result.pagination.total,
    );

    return result;
  }

  @Get('top-candidates')
  async getTopCandidates(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.searchService.getTopCandidates(limitNum);
  }

  @Get('by-skills')
  async getCandidatesBySkills(
    @Query('skills') skills: string,
    @Query('limit') limit?: string,
  ) {
    const skillsArray = skills.split(',').map(s => s.trim());
    const limitNum = limit ? parseInt(limit) : 20;
    return this.searchService.getCandidatesBySkills(skillsArray, limitNum);
  }

  @Get('statistics')
  async getStatistics() {
    return this.searchService.getStatistics();
  }
}
