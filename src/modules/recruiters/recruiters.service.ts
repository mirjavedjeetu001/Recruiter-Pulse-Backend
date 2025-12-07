import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Recruiter, RecruiterDocument } from '../../schemas/recruiter.schema';
import { JobSeeker, JobSeekerDocument } from '../../schemas/job-seeker.schema';
import { UpdateRecruiterProfileDto, SaveCandidateDto } from './dto/recruiter.dto';

@Injectable()
export class RecruitersService {
  constructor(
    @InjectModel(Recruiter.name) private recruiterModel: Model<RecruiterDocument>,
    @InjectModel(JobSeeker.name) private jobSeekerModel: Model<JobSeekerDocument>,
  ) {}

  async getProfile(userId: string): Promise<RecruiterDocument> {
    let profile = await this.recruiterModel
      .findOne({ userId })
      .populate('userId', 'name email phone');
    
    if (!profile) {
      // This shouldn't normally happen, but create as fallback
      throw new NotFoundException('Recruiter profile not found. Please contact support.');
    }
    
    return profile;
  }

  async updateProfile(
    userId: string,
    updateData: UpdateRecruiterProfileDto,
  ): Promise<RecruiterDocument> {
    const profile = await this.recruiterModel.findOne({ userId });
    
    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    Object.assign(profile, updateData);
    await profile.save();
    
    return profile;
  }

  async saveCandidate(userId: string, saveData: SaveCandidateDto): Promise<RecruiterDocument> {
    const profile = await this.recruiterModel.findOne({ userId });
    
    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    // Check if candidate is already saved
    const existingIndex = profile.savedCandidates.findIndex(
      (c) => c.candidateId.toString() === saveData.candidateId,
    );

    if (existingIndex !== -1) {
      // Update existing
      profile.savedCandidates[existingIndex].notes = saveData.notes || '';
      profile.savedCandidates[existingIndex].tags = saveData.tags || [];
    } else {
      // Add new
      profile.savedCandidates.push({
        candidateId: saveData.candidateId as any,
        savedAt: new Date(),
        notes: saveData.notes || '',
        tags: saveData.tags || [],
      });
    }

    await profile.save();
    console.log('✅ Saved candidate count now:', profile.savedCandidates.length);
    return profile;
  }

  async removeSavedCandidate(userId: string, candidateId: string): Promise<RecruiterDocument> {
    const profile = await this.recruiterModel.findOne({ userId });
    
    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    profile.savedCandidates = profile.savedCandidates.filter(
      (c) => c.candidateId.toString() !== candidateId,
    );

    await profile.save();
    return profile;
  }

  async getSavedCandidates(userId: string): Promise<any> {
    const profile = await this.recruiterModel.findOne({ userId });
    
    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }
    
    console.log('📦 Raw saved candidates count:', profile.savedCandidates.length);
    
    // Manual population - fetch JobSeeker documents directly
    const candidatesWithDetails = await Promise.all(
      profile.savedCandidates.map(async (savedCandidate) => {
        console.log('🔍 Looking up candidateId:', savedCandidate.candidateId);
        
        const jobSeeker = await this.jobSeekerModel
          .findById(savedCandidate.candidateId)
          .populate('userId', 'name email phone')
          .lean();
        
        console.log('📋 Found jobSeeker:', jobSeeker ? 'YES' : 'NO');
        
        if (!jobSeeker) {
          console.warn('⚠️ JobSeeker not found for ID:', savedCandidate.candidateId);
          return null;
        }
        
        return {
          _id: savedCandidate.candidateId,
          candidateId: jobSeeker,
          savedAt: savedCandidate.savedAt,
          notes: savedCandidate.notes,
          tags: savedCandidate.tags,
        };
      }),
    );
    
    // Filter out null entries (candidates not found)
    const validCandidates = candidatesWithDetails.filter((c) => c !== null);
    
    console.log('📦 Returning saved candidates:', validCandidates.length);
    return validCandidates;
  }

  async addSearchHistory(userId: string, query: string, filters: any, resultsCount: number): Promise<void> {
    const profile = await this.recruiterModel.findOne({ userId });
    
    if (!profile) {
      return;
    }

    profile.searchHistory.push({
      query,
      filters,
      searchedAt: new Date(),
      resultsCount,
    });

    // Keep only last 50 searches
    if (profile.searchHistory.length > 50) {
      profile.searchHistory = profile.searchHistory.slice(-50);
    }

    profile.totalSearches += 1;
    await profile.save();
  }

  async getSearchHistory(userId: string): Promise<any[]> {
    const profile = await this.recruiterModel.findOne({ userId });
    
    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    return profile.searchHistory.sort((a, b) => 
      b.searchedAt.getTime() - a.searchedAt.getTime()
    );
  }
}
