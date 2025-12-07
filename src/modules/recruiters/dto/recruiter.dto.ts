import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateRecruiterProfileDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsUrl()
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  designation?: string;
}

export class SaveCandidateDto {
  @IsString()
  candidateId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  tags?: string[];
}
