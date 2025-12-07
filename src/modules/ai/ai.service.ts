import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobSeeker, JobSeekerDocument } from '../../schemas/job-seeker.schema';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    private configService: ConfigService,
    @InjectModel(JobSeeker.name) private jobSeekerModel: Model<JobSeekerDocument>,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    console.log('🔑 Google AI API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    
    if (apiKey && apiKey !== 'your-google-ai-key-here') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Use gemini-pro which is available in v1beta API
        this.model = this.genAI.getGenerativeModel({ 
          model: 'models/gemini-pro',
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          }
        });
        console.log('✅ Google Generative AI initialized with gemini-pro');
      } catch (error) {
        console.error('❌ Failed to initialize Google Generative AI:', error.message);
      }
    } else {
      console.warn('⚠️ Google AI API Key not configured or using default value');
    }
  }

  async generateProfileSummary(candidateId: string): Promise<any> {
    if (!candidateId || candidateId === 'undefined' || candidateId === 'null') {
      throw new Error('Invalid candidate ID');
    }

    const candidate = await this.jobSeekerModel
      .findById(candidateId)
      .populate('userId', 'name email');

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    if (!this.model) {
      // Return mock data if Gemini is not configured
      return this.generateMockSummary(candidate);
    }

    const prompt = this.buildProfilePrompt(candidate);

    try {
      const result = await this.model.generateContent([
        'You are an expert HR analyst. Analyze the candidate profile and provide structured insights.',
        prompt,
      ].join('\n\n'));
      
      const response = await result.response;
      const aiResponse = response.text();
      const summary = this.parseAiResponse(aiResponse);

      // Save to database
      candidate.aiSummary = {
        ...summary,
        generatedAt: new Date(),
      };
      await candidate.save();

      return summary;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return this.generateMockSummary(candidate);
    }
  }

  async aiMatchCandidates(requirements: string): Promise<any[]> {
    if (!this.model) {
      // Return top candidates if Gemini is not configured
      const candidates = await this.jobSeekerModel
        .find({ isOpenToWork: true })
        .populate('userId', 'name email phone')
        .sort({ profileScore: -1 })
        .limit(10);

      return candidates.map(c => ({
        candidate: c,
        matchScore: Math.floor(Math.random() * 30) + 70,
        matchReason: 'Based on profile score and experience',
      }));
    }

    try {
      // Extract key requirements using AI
      const result = await this.model.generateContent(
        'Extract key requirements from the job description. Return ONLY valid JSON with fields: skills[], minExperience, location, mustHaveSkills[]. No markdown, just JSON.\\n\\nJob Description:\\n' + requirements
      );
      
      const response = await result.response;
      const text = response.text();
      const extracted = JSON.parse(text.replace(/```json\\n?|```/g, '').trim());

      // Build search filter
      const filter: any = { isOpenToWork: true };
      
      if (extracted.skills && extracted.skills.length > 0) {
        filter.skills = { $in: extracted.skills.map(s => new RegExp(s, 'i')) };
      }

      if (extracted.minExperience) {
        filter.totalExperienceYears = { $gte: extracted.minExperience };
      }

      const candidates = await this.jobSeekerModel
        .find(filter)
        .populate('userId', 'name email phone')
        .sort({ profileScore: -1 })
        .limit(20);

      // Score each candidate
      const scoredCandidates = await Promise.all(
        candidates.map(async (candidate) => {
          const score = this.calculateMatchScore(candidate, extracted);
          return {
            candidate,
            matchScore: score,
            matchReason: this.generateMatchReason(candidate, extracted),
          };
        }),
      );

      return scoredCandidates
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);
    } catch (error) {
      console.error('AI Matching Error:', error);
      // Fallback to regular search
      const candidates = await this.jobSeekerModel
        .find({ isOpenToWork: true })
        .populate('userId', 'name email phone')
        .sort({ profileScore: -1 })
        .limit(10);

      return candidates.map(c => ({
        candidate: c,
        matchScore: c.profileScore,
        matchReason: 'High profile score',
      }));
    }
  }

  async extractSkillsFromCV(cvText: string): Promise<string[]> {
    if (!this.model) {
      return this.extractSkillsBasic(cvText);
    }

    try {
      const result = await this.model.generateContent(
        'Extract technical skills from the CV text. Return ONLY a JSON array of skill names, no other text.\n\nCV Text:\n' + cvText.substring(0, 4000)
      );
      
      const response = await result.response;
      const text = response.text();
      const skills = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
      return skills;
    } catch (error) {
      console.error('Skill Extraction Error:', error);
      return this.extractSkillsBasic(cvText);
    }
  }

  async extractCompleteProfileFromCV(cvText: string): Promise<any> {
    if (!this.model) {
      console.warn('⚠️ AI Model not configured, using basic extraction');
      return this.extractProfileBasic(cvText);
    }

    try {
      const prompt = `Extract all information from this CV/resume and return ONLY a valid JSON object.

Required JSON structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "title": "Current Job Title",
  "bio": "Professional summary in 2-3 sentences",
  "totalYears": 5.5,
  "skills": ["JavaScript", "Python", "React"],
  "experience": [
    {
      "role": "Senior Developer",
      "company": "Tech Company Inc",
      "years": 2.5,
      "description": "Key responsibilities and achievements"
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "institution": "University Name",
      "field": "Computer Science",
      "graduationYear": 2020
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "What the project does",
      "technologies": ["React", "Node.js"]
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "year": 2023
    }
  ]
}

Rules:
- Extract ALL work experience entries with complete details
- Extract ALL education entries with degrees and schools
- Extract ALL technical skills mentioned
- Use empty array [] if section not found
- Use empty string "" for missing text fields
- Return ONLY the JSON object, no markdown formatting, no explanations

CV TEXT:
${cvText.substring(0, 10000)}`;

      console.log('📤 Sending CV to Gemini AI (model: gemini-1.5-pro)...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      console.log('✅ Received response from Gemini AI');
      console.log('📥 Response preview (first 300 chars):', content.substring(0, 300));
      
      // Clean up markdown code blocks and extra text
      let cleanedContent = content.trim();
      
      // Remove markdown code fences
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Extract JSON object
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }
      
      console.log('🔍 Cleaned JSON (first 300 chars):', cleanedContent.substring(0, 300));
      
      console.log('🔍 Parsed JSON (first 300 chars):', cleanedContent.substring(0, 300));
      const extracted = JSON.parse(cleanedContent);
      
      console.log('✅ Successfully extracted CV data:', {
        skills: extracted.skills?.length || 0,
        experience: extracted.experience?.length || 0,
        education: extracted.education?.length || 0,
        projects: extracted.projects?.length || 0,
        certifications: extracted.certifications?.length || 0,
        hasBio: !!extracted.bio,
        hasLocation: !!extracted.location,
        hasPhone: !!extracted.phone,
      });
      
      return {
        skills: extracted.skills || [],
        experience: extracted.experience || [],
        education: extracted.education || [],
        projects: extracted.projects || [],
        certifications: extracted.certifications || [],
        bio: extracted.bio || extracted.summary || '',
        location: extracted.location || '',
        email: extracted.email || '',
        phone: extracted.phone || '',
        totalExperienceYears: extracted.totalYears || 0,
        title: extracted.title || '',
        name: extracted.name || '',
      };
    } catch (error) {
      console.error('❌ Gemini AI Extraction Error:', error.message);
      if (error.message?.includes('models/gemini')) {
        console.error('💡 Model error - available models may have changed. Check: https://ai.google.dev/models/gemini');
      }
      console.log('⚠️ Falling back to basic text extraction...');
      const basicResult = this.extractProfileBasic(cvText);
      console.log('📊 Basic extraction results:', {
        skills: basicResult.skills?.length || 0,
        experience: basicResult.experience?.length || 0,
        education: basicResult.education?.length || 0,
      });
      return basicResult;
    }
  }

  private extractProfileBasic(cvText: string): any {
    // Basic extraction without AI - try to extract as much as possible
    const skills = this.extractSkillsBasic(cvText);
    
    // Try to find email
    const emailMatch = cvText.match(/[\w.-]+@[\w.-]+\.\w+/);
    
    // Try to find phone
    const phoneMatch = cvText.match(/[\d\s\-\+\(\)]{10,}/);
    
    // Try to extract experience section
    const experience = this.extractExperienceBasic(cvText);
    
    // Try to extract education section
    const education = this.extractEducationBasic(cvText);
    
    // Try to extract name (first line usually)
    const lines = cvText.split('\n').filter(l => l.trim());
    const name = lines[0]?.substring(0, 50) || '';
    
    return {
      skills,
      experience,
      education,
      projects: [],
      certifications: [],
      bio: '',
      location: '',
      phone: phoneMatch ? phoneMatch[0].trim() : '',
      email: emailMatch ? emailMatch[0] : '',
      totalExperienceYears: 0,
      title: '',
      name: name,
    };
  }

  private extractExperienceBasic(cvText: string): any[] {
    const experiences = [];
    
    // Look for work experience section with multiple pattern variations
    let expText = '';
    const patterns = [
      /(?:WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EMPLOYMENT\s+HISTORY|WORK\s+HISTORY|EXPERIENCE)([\s\S]*?)(?=EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|$)/i,
      /(?:Work\s+Experience|Professional\s+Experience|Employment|Career)([\s\S]*?)(?=Education|Skills|Projects|$)/i,
    ];
    
    for (const pattern of patterns) {
      const match = cvText.match(pattern);
      if (match && match[1].trim().length > 20) {
        expText = match[1];
        break;
      }
    }
    
    if (!expText) {
      console.log('⚠️ No work experience section found');
      return [];
    }
    
    console.log('📋 Found work experience section, length:', expText.length);
    
    // Pattern 1: Look for job blocks separated by dates
    // Common CV format: Company/Role on one line, dates on next line
    const jobBlocks = expText.split(/\n\s*\n/).filter(block => block.trim().length > 10);
    
    for (const block of jobBlocks) {
      if (experiences.length >= 5) break;
      
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) continue;
      
      // Look for date patterns
      const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)[\s,]*\d{4}|(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|Present|Current)/i;
      
      let role = '';
      let company = '';
      let hasDate = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (datePattern.test(line)) {
          hasDate = true;
          // Date line found, role/company likely above
          if (i > 0) role = lines[i - 1];
          if (i > 1) company = lines[i - 2];
          else if (i === 1) company = lines[0];
        }
      }
      
      // Alternative: First line is role, second is company or dates
      if (!role && lines.length >= 2) {
        role = lines[0];
        company = lines[1].replace(datePattern, '').trim() || lines[1];
      }
      
      if (role && role.length > 3 && role.length < 150) {
        experiences.push({
          role: role.substring(0, 100),
          company: (company || 'Company').substring(0, 100),
          years: 1,
          description: lines.slice(2, 5).join(' ').substring(0, 200) || '',
        });
      }
    }
    
    console.log('✅ Extracted', experiences.length, 'work experience entries');
    return experiences;
  }

  private extractEducationBasic(cvText: string): any[] {
    const education = [];
    
    // Look for education section with multiple patterns
    let eduText = '';
    const patterns = [
      /(?:EDUCATION|ACADEMIC\s+BACKGROUND|EDUCATIONAL\s+QUALIFICATIONS?)([\s\S]*?)(?=WORK|EXPERIENCE|SKILLS|PROJECTS|CERTIFICATIONS|$)/i,
      /(?:Education|Academic\s+Background|Qualifications?)([\s\S]*?)(?=Work|Experience|Skills|Projects|$)/i,
    ];
    
    for (const pattern of patterns) {
      const match = cvText.match(pattern);
      if (match && match[1].trim().length > 10) {
        eduText = match[1];
        break;
      }
    }
    
    if (!eduText) {
      console.log('⚠️ No education section found');
      return [];
    }
    
    console.log('📋 Found education section, length:', eduText.length);
    
    // Split into blocks (education entries are usually separated by blank lines)
    const eduBlocks = eduText.split(/\n\s*\n/).filter(block => block.trim().length > 5);
    
    for (const block of eduBlocks) {
      if (education.length >= 5) break;
      
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) continue;
      
      let degree = '';
      let institution = '';
      let year = new Date().getFullYear();
      
      // Look for degree keywords in any line
      for (const line of lines) {
        if (/(Bachelor|Master|PhD|Doctorate|B\.?S\.?C?\.?|M\.?S\.?C?\.?|B\.?A\.?|M\.?A\.?|B\.?Tech|M\.?Tech|B\.?E\.?|M\.?E\.?|Diploma|Associate|Degree|High\s+School|Secondary)/i.test(line)) {
          degree = line;
          break;
        }
      }
      
      // Look for university/school/college in lines
      for (const line of lines) {
        if (/(University|College|School|Institute|Academy)/i.test(line) && line !== degree) {
          institution = line;
          break;
        }
      }
      
      // If no institution found, use second line
      if (!institution && lines.length > 1) {
        institution = lines[1];
      }
      
      // Extract year
      const yearMatch = block.match(/\b(19|20)\d{2}\b/g);
      if (yearMatch && yearMatch.length > 0) {
        year = parseInt(yearMatch[yearMatch.length - 1]); // Get latest year
      }
      
      // Use first line as degree if none found
      if (!degree && lines.length > 0) {
        degree = lines[0];
      }
      
      if (degree && degree.length > 2) {
        education.push({
          degree: degree.substring(0, 100),
          institution: (institution || 'University').substring(0, 100),
          field: '',
          graduationYear: year,
        });
      }
    }
    
    console.log('✅ Extracted', education.length, 'education entries');
    return education;
  }

  async suggestProfileImprovements(candidateId: string): Promise<any> {
    if (!candidateId || candidateId === 'undefined' || candidateId === 'null') {
      throw new Error('Invalid candidate ID');
    }

    const candidate = await this.jobSeekerModel.findById(candidateId);

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const suggestions = [];

    if (!candidate.cvUrl) {
      suggestions.push({
        type: 'critical',
        message: 'Upload your CV to increase profile visibility',
        impact: '+20 points',
      });
    }

    if (!candidate.skills || candidate.skills.length < 5) {
      suggestions.push({
        type: 'high',
        message: 'Add more skills to your profile (target: 10+ skills)',
        impact: '+10 points',
      });
    }

    if (!candidate.experience || candidate.experience.length === 0) {
      suggestions.push({
        type: 'critical',
        message: 'Add your work experience',
        impact: '+20 points',
      });
    }

    if (!candidate.projects || candidate.projects.length === 0) {
      suggestions.push({
        type: 'medium',
        message: 'Add projects to showcase your work',
        impact: '+10 points',
      });
    }

    if (!candidate.bio) {
      suggestions.push({
        type: 'medium',
        message: 'Write a professional bio/summary',
        impact: '+5 points',
      });
    }

    if (!candidate.linkedinUrl && !candidate.githubUrl) {
      suggestions.push({
        type: 'low',
        message: 'Add your LinkedIn or GitHub profile',
        impact: '+3 points',
      });
    }

    const potentialScore = candidate.profileScore + suggestions.reduce((sum, s) => {
      const points = parseInt(s.impact.match(/\d+/)[0]);
      return sum + points;
    }, 0);

    return {
      currentScore: candidate.profileScore,
      potentialScore: Math.min(potentialScore, 100),
      suggestions,
    };
  }

  private buildProfilePrompt(candidate: any): string {
    return `
Analyze this candidate profile and provide insights:

Name: ${candidate.userId?.name || 'N/A'}
Skills: ${candidate.skills?.join(', ') || 'None'}
Experience: ${candidate.totalExperienceYears || 0} years
Education: ${candidate.education?.map(e => `${e.degree} in ${e.field}`).join(', ') || 'None'}
Projects: ${candidate.projects?.length || 0} projects

Experience Details:
${candidate.experience?.map(e => `- ${e.role} at ${e.company} (${e.years} years)`).join('\n') || 'None'}

Provide:
1. Top 5-7 extracted skills
2. Brief experience summary (2-3 sentences)
3. Top 3 strengths
4. 2-3 areas for improvement
5. Overall professional summary (2 sentences)

Format as JSON with fields: skillExtraction, experienceSummary, strengths, weakAreas, overallSummary
`;
  }

  private parseAiResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      return {
        skillExtraction: [],
        experienceSummary: 'Unable to generate summary',
        strengths: ['Profile needs more details'],
        weakAreas: ['Add more information to profile'],
        overallSummary: 'Profile under development',
      };
    }
  }

  private generateMockSummary(candidate: any): any {
    return {
      skillExtraction: candidate.skills?.slice(0, 7) || [],
      experienceSummary: `Professional with ${candidate.totalExperienceYears || 0} years of experience in ${candidate.skills?.[0] || 'technology'}.`,
      strengths: [
        `${candidate.totalExperienceYears || 0}+ years of experience`,
        `${candidate.skills?.length || 0} technical skills`,
        `${candidate.projects?.length || 0} completed projects`,
      ],
      weakAreas: [
        'Profile could benefit from more detailed project descriptions',
        'Consider adding certifications',
      ],
      overallSummary: `Skilled professional with expertise in ${candidate.skills?.slice(0, 3).join(', ') || 'various technologies'}.`,
      generatedAt: new Date(),
    };
  }

  private calculateMatchScore(candidate: any, requirements: any): number {
    let score = 0;

    // Skills match (40 points)
    if (requirements.skills) {
      const matchedSkills = candidate.skills.filter(skill =>
        requirements.skills.some(req => skill.toLowerCase().includes(req.toLowerCase())),
      );
      score += (matchedSkills.length / requirements.skills.length) * 40;
    }

    // Experience match (30 points)
    if (requirements.minExperience) {
      if (candidate.totalExperienceYears >= requirements.minExperience) {
        score += 30;
      } else {
        score += (candidate.totalExperienceYears / requirements.minExperience) * 30;
      }
    }

    // Profile completeness (30 points)
    score += (candidate.profileScore / 100) * 30;

    return Math.round(score);
  }

  private generateMatchReason(candidate: any, requirements: any): string {
    const reasons = [];

    if (requirements.skills) {
      const matchedSkills = candidate.skills.filter(skill =>
        requirements.skills.some(req => skill.toLowerCase().includes(req.toLowerCase())),
      );
      if (matchedSkills.length > 0) {
        reasons.push(`Matches ${matchedSkills.length} required skills`);
      }
    }

    if (candidate.totalExperienceYears >= (requirements.minExperience || 0)) {
      reasons.push(`${candidate.totalExperienceYears} years experience`);
    }

    if (candidate.profileScore >= 80) {
      reasons.push('High profile score');
    }

    return reasons.join(', ') || 'Good overall match';
  }

  private extractSkillsBasic(cvText: string): string[] {
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue',
      'TypeScript', 'MongoDB', 'SQL', 'AWS', 'Docker', 'Kubernetes',
      'Git', 'REST API', 'GraphQL', 'HTML', 'CSS', 'Tailwind',
    ];

    return commonSkills.filter(skill =>
      cvText.toLowerCase().includes(skill.toLowerCase()),
    );
  }
}
