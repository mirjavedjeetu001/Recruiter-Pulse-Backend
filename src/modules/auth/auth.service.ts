import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { User, UserDocument, UserRole } from '../../schemas/user.schema';
import { JobSeeker, JobSeekerDocument } from '../../schemas/job-seeker.schema';
import { Recruiter, RecruiterDocument } from '../../schemas/recruiter.schema';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(JobSeeker.name) private jobSeekerModel: Model<JobSeekerDocument>,
    @InjectModel(Recruiter.name) private recruiterModel: Model<RecruiterDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, role, name, phone, companyName, designation } = registerDto;

    // Check if user exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
    });

    // Create role-specific profile
    if (role === UserRole.JOB_SEEKER) {
      await this.jobSeekerModel.create({
        userId: user._id,
        skills: [],
        experience: [],
        education: [],
        projects: [],
        profileScore: 10, // Initial score for creating account
      });
    } else if (role === UserRole.RECRUITER) {
      if (!companyName) {
        throw new BadRequestException('Company name is required for recruiters');
      }
      await this.recruiterModel.create({
        userId: user._id,
        companyName,
        designation: designation || 'Recruiter',
        isVerified: false,
      });
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      accessToken: token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      accessToken: token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  private generateToken(user: UserDocument): string {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
