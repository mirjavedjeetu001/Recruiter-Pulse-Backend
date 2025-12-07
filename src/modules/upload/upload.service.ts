import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobSeeker, JobSeekerDocument } from '../../schemas/job-seeker.schema';
import { AiService } from '../ai/ai.service';
import * as fs from 'fs';
import pdfParse = require('pdf-parse');

@Injectable()
export class UploadService {
  constructor(
    @InjectModel(JobSeeker.name) private jobSeekerModel: Model<JobSeekerDocument>,
    private aiService: AiService,
  ) {}

  async uploadCV(userId: string, file: Express.Multer.File): Promise<any> {
    const profile = await this.jobSeekerModel.findOne({ userId });
    
    if (!profile) {
      throw new NotFoundException('Job seeker profile not found');
    }

    // Delete old CV if exists
    if (profile.cvUrl) {
      const oldPath = profile.cvUrl.replace('/uploads/', './uploads/');
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new CV info
    const fileUrl = `/uploads/cvs/${file.filename}`;
    profile.cvUrl = fileUrl;
    profile.cvFileName = file.originalname;

    // Try to extract complete profile data from CV
    let extractedData: any = null;
    try {
      if (file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        const cvText = pdfData.text;

        console.log('📄 PDF Text Length:', cvText.length);
        console.log('📄 CV Preview (first 500 chars):', cvText.substring(0, 500));
        console.log('🔍 Starting AI extraction...');

        // Extract complete profile using AI
        extractedData = await this.aiService.extractCompleteProfileFromCV(cvText);
        
        console.log('Extracted Data:', {
          skills: extractedData.skills?.length,
          experience: extractedData.experience?.length,
          education: extractedData.education?.length,
          projects: extractedData.projects?.length,
        });
        
        // Merge skills (avoid duplicates)
        if (extractedData.skills && extractedData.skills.length > 0) {
          const currentSkills = profile.skills || [];
          const newSkills = extractedData.skills.filter(
            skill => !currentSkills.some(
              existing => existing.toLowerCase() === skill.toLowerCase()
            )
          );
          profile.skills = [...currentSkills, ...newSkills];
          console.log('Merged skills:', profile.skills.length);
        }

        // Merge experience (always add, avoid duplicates)
        if (extractedData.experience && extractedData.experience.length > 0) {
          const currentExperience = profile.experience || [];
          extractedData.experience.forEach(newExp => {
            const exists = currentExperience.some(
              exp => exp.role?.toLowerCase() === newExp.role?.toLowerCase() && 
                     exp.company?.toLowerCase() === newExp.company?.toLowerCase()
            );
            if (!exists && newExp.role && newExp.company) {
              currentExperience.push(newExp);
            }
          });
          profile.experience = currentExperience;
          console.log('Merged experience:', profile.experience.length);
        }

        // Merge education (always add, avoid duplicates)
        if (extractedData.education && extractedData.education.length > 0) {
          const currentEducation = profile.education || [];
          extractedData.education.forEach(newEdu => {
            const exists = currentEducation.some(
              edu => edu.degree?.toLowerCase() === newEdu.degree?.toLowerCase() && 
                     edu.institution?.toLowerCase() === newEdu.institution?.toLowerCase()
            );
            if (!exists && newEdu.degree && newEdu.institution) {
              currentEducation.push(newEdu);
            }
          });
          profile.education = currentEducation;
          console.log('Merged education:', profile.education.length);
        }

        // Merge projects (always add, avoid duplicates)
        if (extractedData.projects && extractedData.projects.length > 0) {
          const currentProjects = profile.projects || [];
          extractedData.projects.forEach(newProject => {
            const exists = currentProjects.some(
              proj => proj.name?.toLowerCase() === newProject.name?.toLowerCase()
            );
            if (!exists && newProject.name) {
              currentProjects.push(newProject);
            }
          });
          profile.projects = currentProjects;
          console.log('Merged projects:', profile.projects.length);
        }

        // Update bio if empty or if extracted version is better
        if (extractedData.bio && !profile.bio) {
          profile.bio = extractedData.bio;
          console.log('Added bio');
        }

        // Update location if empty
        if (extractedData.location && !profile.location) {
          profile.location = extractedData.location;
          console.log('Added location');
        }

        // Update phone if empty
        if (extractedData.phone && !profile.phone) {
          profile.phone = extractedData.phone;
          console.log('Added phone');
        }

        // Update total experience years
        if (extractedData.totalExperienceYears) {
          profile.totalExperienceYears = Math.max(
            profile.totalExperienceYears || 0,
            extractedData.totalExperienceYears
          );
          console.log('Updated total experience years:', profile.totalExperienceYears);
        }
      }
    } catch (error) {
      console.error('CV parsing error:', error);
      // Continue even if parsing fails
    }

    // Recalculate profile score
    profile.profileScore = this.calculateProfileScore(profile);
    profile.lastUpdated = new Date();
    await profile.save();

    return {
      message: 'CV uploaded successfully',
      cvUrl: fileUrl,
      fileName: file.originalname,
      profileScore: profile.profileScore,
      extractedData: {
        skillsCount: profile.skills?.length || 0,
        experienceCount: profile.experience?.length || 0,
        educationCount: profile.education?.length || 0,
        projectsCount: profile.projects?.length || 0,
        bioAdded: !!profile.bio,
        locationAdded: !!profile.location,
        phoneAdded: !!profile.phone,
        totalExperienceYears: profile.totalExperienceYears || 0,
      },
    };
  }

  async deleteCV(userId: string): Promise<any> {
    const profile = await this.jobSeekerModel.findOne({ userId });
    
    if (!profile) {
      throw new NotFoundException('Job seeker profile not found');
    }

    if (profile.cvUrl) {
      const filePath = profile.cvUrl.replace('/uploads/', './uploads/');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    profile.cvUrl = null;
    profile.cvFileName = null;
    profile.profileScore = this.calculateProfileScore(profile);
    await profile.save();

    return { message: 'CV deleted successfully' };
  }

  private calculateProfileScore(profile: any): number {
    let score = 10;
    if (profile.cvUrl) score += 20;
    if (profile.skills && profile.skills.length > 0) {
      score += Math.min(profile.skills.length * 2, 20);
    }
    if (profile.experience && profile.experience.length > 0) {
      score += Math.min(profile.experience.length * 10, 20);
    }
    if (profile.education && profile.education.length > 0) {
      score += Math.min(profile.education.length * 7.5, 15);
    }
    if (profile.projects && profile.projects.length > 0) {
      score += Math.min(profile.projects.length * 5, 10);
    }
    if (profile.bio) score += 5;
    if (profile.linkedinUrl) score += 3;
    if (profile.githubUrl) score += 3;
    if (profile.portfolioUrl) score += 2;
    if (profile.aiSummary) score += 2;
    return Math.min(score, 100);
  }
}
