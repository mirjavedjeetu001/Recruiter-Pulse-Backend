import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobSeeker, JobSeekerDocument } from '../../schemas/job-seeker.schema';
import { SearchCandidatesDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(JobSeeker.name) private jobSeekerModel: Model<JobSeekerDocument>,
  ) {}

  async searchCandidates(searchDto: SearchCandidatesDto): Promise<any> {
    const {
      query,
      skills,
      location,
      minExperience,
      maxExperience,
      minSalary,
      maxSalary,
      education,
      minProfileScore,
      jobTypes,
      page = 1,
      limit = 20,
      sortBy = 'profileScore',
      sortOrder = 'desc',
    } = searchDto;

    // Build filter query
    const filter: any = { isOpenToWork: true };

    // Text search in multiple fields
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      filter.$or = [
        { skills: searchRegex },
        { 'experience.role': searchRegex },
        { 'experience.company': searchRegex },
        { 'education.degree': searchRegex },
        { 'education.field': searchRegex },
        { bio: searchRegex },
      ];
    }

    // Skills filter (match any of the skills)
    if (skills && skills.length > 0) {
      filter.skills = { $in: skills.map(skill => new RegExp(skill, 'i')) };
    }

    // Location filter
    if (location) {
      filter.location = new RegExp(location, 'i');
    }

    // Experience filter
    if (minExperience !== undefined || maxExperience !== undefined) {
      filter.totalExperienceYears = {};
      if (minExperience !== undefined) {
        filter.totalExperienceYears.$gte = minExperience;
      }
      if (maxExperience !== undefined) {
        filter.totalExperienceYears.$lte = maxExperience;
      }
    }

    // Salary filter
    if (minSalary !== undefined || maxSalary !== undefined) {
      filter.expectedSalary = {};
      if (minSalary !== undefined) {
        filter.expectedSalary.$gte = minSalary;
      }
      if (maxSalary !== undefined) {
        filter.expectedSalary.$lte = maxSalary;
      }
    }

    // Education filter
    if (education) {
      filter['education.degree'] = new RegExp(education, 'i');
    }

    // Profile score filter
    if (minProfileScore !== undefined) {
      filter.profileScore = { $gte: minProfileScore };
    }

    // Job types filter
    if (jobTypes && jobTypes.length > 0) {
      filter.preferredJobTypes = { $in: jobTypes };
    }

    // Build sort object
    const sort: any = {};
    if (sortBy === 'experience') {
      sort.totalExperienceYears = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'recent') {
      sort.lastUpdated = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.profileScore = sortOrder === 'asc' ? 1 : -1;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [candidates, total] = await Promise.all([
      this.jobSeekerModel
        .find(filter)
        .populate('userId', 'name email phone')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.jobSeekerModel.countDocuments(filter),
    ]);

    return {
      candidates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async getTopCandidates(limit: number = 10): Promise<JobSeekerDocument[]> {
    return this.jobSeekerModel
      .find({ isOpenToWork: true })
      .populate('userId', 'name email phone')
      .sort({ profileScore: -1 })
      .limit(limit);
  }

  async getCandidatesBySkills(skills: string[], limit: number = 20): Promise<JobSeekerDocument[]> {
    return this.jobSeekerModel
      .find({
        isOpenToWork: true,
        skills: { $in: skills.map(skill => new RegExp(skill, 'i')) },
      })
      .populate('userId', 'name email phone')
      .sort({ profileScore: -1 })
      .limit(limit);
  }

  async getStatistics(): Promise<any> {
    const [
      totalCandidates,
      openToWork,
      avgProfileScore,
      avgExperience,
      topSkills,
      locationDistribution,
    ] = await Promise.all([
      this.jobSeekerModel.countDocuments(),
      this.jobSeekerModel.countDocuments({ isOpenToWork: true }),
      this.jobSeekerModel.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$profileScore' } } },
      ]),
      this.jobSeekerModel.aggregate([
        { $group: { _id: null, avgExp: { $avg: '$totalExperienceYears' } } },
      ]),
      this.jobSeekerModel.aggregate([
        { $unwind: '$skills' },
        { $group: { _id: '$skills', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      this.jobSeekerModel.aggregate([
        { $match: { location: { $exists: true, $ne: null } } },
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      totalCandidates,
      openToWork,
      averageProfileScore: avgProfileScore[0]?.avgScore || 0,
      averageExperience: avgExperience[0]?.avgExp || 0,
      topSkills: topSkills.map(s => ({ skill: s._id, count: s.count })),
      topLocations: locationDistribution.map(l => ({ location: l._id, count: l.count })),
    };
  }
}
