# Recruiter Pulse - Backend

NestJS backend API for the Recruiter Pulse recruitment platform.

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - JSON Web Token authentication
- **Passport** - Authentication middleware
- **OpenAI API** - AI-powered candidate matching
- **Multer** - File upload handling

## Features

- JWT-based authentication
- Role-based access control (Job Seeker & Recruiter)
- User management
- Profile management for job seekers and recruiters
- CV upload and storage
- AI-powered candidate search
- RESTful API architecture

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- MongoDB 4.x or higher
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/recruiter-pulse

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Server
PORT=3001

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Development

Run the development server with hot-reload:

```bash
npm run start:dev
```

The API will be available at [http://localhost:3001](http://localhost:3001).

### Build

Create a production build:

```bash
npm run build
```

### Start Production Server

```bash
npm run start:prod
```

## Project Structure

```
src/
├── main.ts              # Application entry point
├── app.module.ts        # Root module
├── modules/             # Feature modules
│   ├── auth/           # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── decorators/  # Custom decorators
│   │   ├── dto/         # Data transfer objects
│   │   ├── guards/      # Auth guards
│   │   └── strategies/  # Passport strategies
│   ├── users/          # User management
│   ├── job-seekers/    # Job seeker profiles
│   ├── recruiters/     # Recruiter profiles
│   ├── search/         # AI-powered search
│   ├── upload/         # File upload handling
│   └── ai/             # AI integration
└── schemas/            # MongoDB schemas
    ├── user.schema.ts
    ├── job-seeker.schema.ts
    └── recruiter.schema.ts
```

## API Endpoints

### Authentication
```
POST   /auth/register     Register new user
POST   /auth/login        Login user
GET    /auth/profile      Get current user profile
```

### Users
```
GET    /users             Get all users
GET    /users/:id         Get user by ID
PUT    /users/:id         Update user
DELETE /users/:id         Delete user
```

### Job Seekers
```
GET    /job-seekers       Get all job seekers
GET    /job-seekers/:id   Get job seeker by ID
POST   /job-seekers       Create job seeker profile
PUT    /job-seekers/:id   Update job seeker profile
DELETE /job-seekers/:id   Delete job seeker profile
```

### Recruiters
```
GET    /recruiters        Get all recruiters
GET    /recruiters/:id    Get recruiter by ID
POST   /recruiters        Create recruiter profile
PUT    /recruiters/:id    Update recruiter profile
POST   /recruiters/save-candidate   Save candidate
GET    /recruiters/saved-candidates Get saved candidates
```

### Search
```
POST   /search            AI-powered candidate search
POST   /search/advanced   Advanced search with filters
```

### Upload
```
POST   /upload/cv         Upload CV file
GET    /upload/cv/:id     Get CV file
DELETE /upload/cv/:id     Delete CV file
```

### AI
```
POST   /ai/match          Get AI-powered candidate matches
POST   /ai/analyze-cv     Analyze CV with AI
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Guards

- **JwtAuthGuard** - Protects routes requiring authentication
- **RolesGuard** - Restricts access based on user roles

## Decorators

- **@CurrentUser()** - Inject current authenticated user
- **@Roles()** - Specify required roles for route access

## Database Models

### User Schema
- email, password, role, createdAt, updatedAt

### Job Seeker Schema
- userId, name, skills, experience, education, cvUrl, etc.

### Recruiter Schema
- userId, companyName, savedCandidates, etc.

## File Uploads

CV files are stored in the `uploads/cvs/` directory. Supported formats:
- PDF
- DOC/DOCX

## Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start with hot-reload
- `npm run start:prod` - Start production build
- `npm run build` - Build the application
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

## Error Handling

The API uses NestJS built-in exception filters for consistent error responses:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

## CORS

CORS is configured in `main.ts`. Update the allowed origins in production.

## Contributing

1. Create a feature branch
2. Implement changes with tests
3. Ensure all tests pass
4. Submit a pull request

## License

MIT
