import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobSeeker, JobSeekerDocument } from '../../schemas/job-seeker.schema';
import { UpdateJobSeekerProfileDto } from './dto/job-seeker.dto';

@Injectable()
export class JobSeekersService {
  constructor(
    @InjectModel(JobSeeker.name) private jobSeekerModel: Model<JobSeekerDocument>,
  ) {}

  async getProfile(userId: string): Promise<JobSeekerDocument> {
    let profile = await this.jobSeekerModel
      .findOne({ userId })
      .populate('userId', 'name email phone');
    
    if (!profile) {
      // Create profile if it doesn't exist (safety fallback)
      profile = await this.jobSeekerModel.create({
        userId,
        skills: [],
        experience: [],
        education: [],
        projects: [],
        profileScore: 10,
      });
      
      // Populate after creation
      profile = await this.jobSeekerModel
        .findById(profile._id)
        .populate('userId', 'name email phone');
    }
    
    return profile;
  }

  async updateProfile(
    userId: string,
    updateData: UpdateJobSeekerProfileDto,
  ): Promise<JobSeekerDocument> {
    const profile = await this.jobSeekerModel.findOne({ userId });
    
    if (!profile) {
      throw new NotFoundException('Job seeker profile not found');
    }

    // Update profile
    Object.assign(profile, updateData);

    // Calculate total experience years
    if (updateData.experience) {
      profile.totalExperienceYears = this.calculateTotalExperience(updateData.experience);
    }

    // Calculate profile score
    profile.profileScore = this.calculateProfileScore(profile);
    profile.lastUpdated = new Date();

    await profile.save();
    return profile;
  }

  async uploadCV(userId: string, fileName: string, fileUrl: string): Promise<JobSeekerDocument> {
    const profile = await this.jobSeekerModel.findOne({ userId });
    
    if (!profile) {
      throw new NotFoundException('Job seeker profile not found');
    }

    profile.cvUrl = fileUrl;
    profile.cvFileName = fileName;
    profile.profileScore = this.calculateProfileScore(profile);
    profile.lastUpdated = new Date();

    await profile.save();
    return profile;
  }

  async getAllJobSeekers(limit: number = 100): Promise<JobSeekerDocument[]> {
    return this.jobSeekerModel
      .find({ isOpenToWork: true })
      .populate('userId', 'name email phone')
      .sort({ profileScore: -1 })
      .limit(limit);
  }

  async getJobSeekerById(id: string): Promise<JobSeekerDocument> {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Invalid job seeker ID');
    }

    const profile = await this.jobSeekerModel
      .findById(id)
      .populate('userId', 'name email phone');
    
    if (!profile) {
      throw new NotFoundException('Job seeker not found');
    }

    // Increment profile views
    profile.profileViews += 1;
    await profile.save();

    return profile;
  }

  private calculateTotalExperience(experience: any[]): number {
    return experience.reduce((total, exp) => total + (exp.years || 0), 0);
  }

  private calculateProfileScore(profile: any): number {
    let score = 10; // Base score

    // CV uploaded
    if (profile.cvUrl) score += 20;

    // Skills (up to 20 points)
    if (profile.skills && profile.skills.length > 0) {
      score += Math.min(profile.skills.length * 2, 20);
    }

    // Experience (up to 20 points)
    if (profile.experience && profile.experience.length > 0) {
      score += Math.min(profile.experience.length * 10, 20);
    }

    // Education (up to 15 points)
    if (profile.education && profile.education.length > 0) {
      score += Math.min(profile.education.length * 7.5, 15);
    }

    // Projects (up to 10 points)
    if (profile.projects && profile.projects.length > 0) {
      score += Math.min(profile.projects.length * 5, 10);
    }

    // Bio
    if (profile.bio) score += 5;

    // Social links
    if (profile.linkedinUrl) score += 3;
    if (profile.githubUrl) score += 3;
    if (profile.portfolioUrl) score += 2;

    // AI Summary
    if (profile.aiSummary) score += 2;

    return Math.min(score, 100);
  }
}
