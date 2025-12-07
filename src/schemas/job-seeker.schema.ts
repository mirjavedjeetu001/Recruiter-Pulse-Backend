import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobSeekerDocument = JobSeeker & Document;

class Experience {
  @Prop({ required: true })
  company: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  years: number;

  @Prop()
  description: string;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ default: false })
  isCurrent: boolean;
}

class Education {
  @Prop({ required: true })
  institution: string;

  @Prop({ required: true })
  degree: string;

  @Prop()
  field: string;

  @Prop()
  graduationYear: number;

  @Prop()
  grade: string;
}

class Project {
  @Prop({ required: true })
  title: string;

  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop({ type: [String] })
  technologies: string[];

  @Prop()
  url: string;

  @Prop()
  githubUrl: string;
}

class Certification {
  @Prop({ required: true })
  name: string;

  @Prop()
  issuer: string;

  @Prop()
  year: number;

  @Prop()
  credentialUrl: string;
}
class AISummary {
  @Prop()
  skillExtraction: string[];

  @Prop()
  experienceSummary: string;

  @Prop({ type: [String] })
  strengths: string[];

  @Prop({ type: [String] })
  weakAreas: string[];

  @Prop()
  overallSummary: string;

  @Prop()
  generatedAt: Date;
}

@Schema({ timestamps: true })
export class JobSeeker {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ type: [Experience], default: [] })
  experience: Experience[];

  @Prop({ type: [Education], default: [] })
  education: Education[];

  @Prop({ type: [Project], default: [] })
  projects: Project[];

  @Prop()
  cvUrl: string;

  @Prop()
  cvFileName: string;

  @Prop()
  location: string;

  @Prop()
  phone: string;

  @Prop()
  expectedSalary: number;

  @Prop({ min: 0, max: 100, default: 0 })
  profileScore: number;

  @Prop({ type: AISummary })
  aiSummary: AISummary;

  @Prop()
  bio: string;

  @Prop()
  linkedinUrl: string;

  @Prop()
  githubUrl: string;

  @Prop()
  portfolioUrl: string;

  @Prop({ default: 0 })
  totalExperienceYears: number;

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({ type: [String], default: [] })
  certifications: string[];

  @Prop({ default: true })
  isOpenToWork: boolean;

  @Prop({ type: [String], default: [] })
  preferredJobTypes: string[]; // full-time, part-time, contract, remote

  @Prop({ default: 0 })
  profileViews: number;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const JobSeekerSchema = SchemaFactory.createForClass(JobSeeker);

// Indexes for better search performance
JobSeekerSchema.index({ skills: 1 });
JobSeekerSchema.index({ location: 1 });
JobSeekerSchema.index({ totalExperienceYears: 1 });
JobSeekerSchema.index({ profileScore: -1 });
JobSeekerSchema.index({ 'experience.role': 1 });
