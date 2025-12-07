import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecruiterDocument = Recruiter & Document;

class SavedCandidate {
  @Prop({ type: Types.ObjectId, ref: 'JobSeeker', required: true })
  candidateId: Types.ObjectId;

  @Prop({ default: Date.now })
  savedAt: Date;

  @Prop()
  notes: string;

  @Prop()
  tags: string[];
}

class SearchHistory {
  @Prop({ required: true })
  query: string;

  @Prop({ type: Object })
  filters: any;

  @Prop({ default: Date.now })
  searchedAt: Date;

  @Prop()
  resultsCount: number;
}

@Schema({ timestamps: true })
export class Recruiter {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  companyName: string;

  @Prop()
  companyWebsite: string;

  @Prop()
  companySize: string;

  @Prop()
  industry: string;

  @Prop()
  designation: string;

  @Prop()
  companyLogo: string;

  @Prop({ type: [SavedCandidate], default: [] })
  savedCandidates: SavedCandidate[];

  @Prop({ type: [SearchHistory], default: [] })
  searchHistory: SearchHistory[];

  @Prop({ default: true })
  isVerified: boolean;

  @Prop()
  verificationDate: Date;

  @Prop({ default: 0 })
  totalSearches: number;

  @Prop({ default: 0 })
  candidatesContacted: number;
}

export const RecruiterSchema = SchemaFactory.createForClass(Recruiter);

// Indexes
RecruiterSchema.index({ companyName: 1 });
RecruiterSchema.index({ userId: 1 });
