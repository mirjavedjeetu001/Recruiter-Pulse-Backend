import { IsOptional, IsString, IsNumber, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchCandidatesDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minExperience?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Max(50)
  maxExperience?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minSalary?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxSalary?: number;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  minProfileScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobTypes?: string[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string; // profileScore, experience, recent

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class AiSearchDto {
  @IsString()
  requirements: string; // Natural language requirements
}
