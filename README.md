# BlockTrade SaaS Platform - Multi-Tenant Trade Finance System

## Overview

BlockTrade is a comprehensive multi-tenant SaaS trade finance platform designed to serve banks, NBFCs, corporate clients, logistics providers, and insurance companies. The platform features an advanced role management system with hierarchical permissions, guided user onboarding, and complete Letter of Credit operations.

## 🌟 Key SaaS Features

### 🔐 Advanced Role Management System

- **Multi-Level Hierarchy**: Platform → Organization → Entity-specific roles
- **50+ Granular Permissions** across all business domains
- **Role Inheritance** and permission aggregation
- **Temporary & Permanent** role assignments with restrictions
- **Auto-Role Assignment**: Automatic role assignment based on organization type and user count
  - First user in organization → Admin role (bank_admin, corporate_admin, etc.)
  - Subsequent users → Standard role (bank_officer, corporate_user, etc.)

### 👥 5-Step User Onboarding Journey

- **Organization Setup**: Role assignment and department structure
- **Profile Completion**: Personal information and contact details
- **Security Setup**: Password policies, MFA, and security questions
- **Preferences Setup**: Notifications, themes, and language settings
- **Training Completion**: Compliance modules and acknowledgments

### 🏢 Multi-Tenant Architecture

- **Organization-based Data Isolation** for complete tenant separation
- **Cross-Organization Permission Control** with strict access boundaries
- **Scalable Database Schema** with performance optimization
- **Audit Logging** for all role changes and access patterns

## 🚀 Quick Start

### 1. Installation

```bash
cd blocktrade-backend
npm install
```

### 2. Database Setup (MongoDB with Docker)

#### Option A: Automated Setup (Recommended)

```bash
# Run the automated setup script
npm run db:setup
```

#### Option B: Manual Setup

```bash
# Create MongoDB volume
docker volume create mongodb_data

# Start MongoDB container
docker run --name mongodb -d -p 27017:27017 -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongodb/mongodb-community-server

# Test connection
npm run test:db
```

### 3. Environment Setup

The automated setup creates a `.env` file, or copy from `.env.example`:

```env
# MongoDB Configuration (Docker)
MONGO_URI=mongodb://admin:password@localhost:27017/blocktrade?authSource=admin

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development
API_PREFIX=/api

# Security
CORS_ORIGIN=http://localhost:4201
ENABLE_SWAGGER=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 4. Database Initialization

```bash
# Connect to MongoDB shell
npm run db:shell

# Follow the initialization commands in DATABASE_SETUP.md
```

### 5. Development Server

```bash
# Start development server
npm run dev

# Server will start on http://localhost:3000
# API Documentation: http://localhost:3000/api-docs
```

### 6. Test Setup

```bash
# Test database connection
npm run test:db

# Test API structure (without database)
npm run test:simple

# Test authentication system (requires MongoDB)
npm run test:auth
```

## 🗄️ Database Management

### MongoDB Docker Commands

```bash
# Database lifecycle
npm run db:setup      # Initial setup (automated)
npm run db:start      # Start MongoDB container
npm run db:stop       # Stop MongoDB container
npm run db:restart    # Restart MongoDB container

# Database access
npm run db:shell      # Connect to MongoDB shell
npm run db:logs       # View MongoDB logs
npm run test:db       # Test database connection

# Data management
npm run seed          # Seed database with sample data
npm run seed:clear    # Clear database
```

### Manual Database Commands

```bash
# Connect to MongoDB shell
docker exec -it mongodb mongosh -u admin -p password --authenticationDatabase admin

# View databases
show dbs

# Use blocktrade database
use blocktrade

# View collections
show collections
```

For complete database setup instructions, see [DATABASE_SETUP.md](DATABASE_SETUP.md).

### 4. Test Authentication System

```bash
# Test API structure (without database)
npm run test:simple

# Test with full functionality (requires MongoDB)
npm run test:auth
```

## �️ Multi-Level Role Hierarchy

### Platform Level (Highest Authority)

- **platform_super_admin**: Complete platform control across all organizations
- **platform_admin**: Platform administration and multi-tenant management
- **platform_support**: Support and monitoring across organizations

### Organization Level (Multi-Tenant)

- **organization_super_admin**: Complete organization management and oversight
- **organization_admin**: User and role management within organization
- **organization_manager**: Department management and team coordination
- **organization_user**: Standard business operations and workflows
- **organization_viewer**: Read-only access to organization data

### Entity-Specific Level (Business Context)

- **Bank Roles**: `bank_admin`, `bank_officer`, `bank_specialist`
- **Corporate Roles**: `corporate_admin`, `corporate_manager`, `corporate_user`
- **NBFC Roles**: `nbfc_admin`, `nbfc_manager`, `nbfc_user`
- **Logistics Roles**: `logistics_admin`, `logistics_manager`, `logistics_user`
- **Insurance Roles**: `insurance_admin`, `insurance_manager`, `insurance_user`

### Organization Types Support

- **Bank**: LC issuance, verification, and settlement
- **NBFC**: Alternative financing and credit solutions
- **Corporate**: Import/export operations and trade requests
- **Logistics**: Shipping, tracking, and cargo management
- **Insurance**: Policy management and claims processing

## 🔐 Authentication Endpoints

### Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@bank.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "bank_officer",
  "organizationId": "123e4567-e89b-12d3-a456-426614174000",
  "organizationName": "Global Bank Corp",
  "organizationType": "bank",
  "phone": "15551234567",
  "address": {
    "street": "123 Financial St",
    "city": "New York",
    "state": "NY",
    "country": "United States",
    "postalCode": "10001"
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123!",
  "mfaCode": "123456" // Optional if MFA enabled
}
```

### Get User Profile

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

## 🛡️ Security Features

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&\*)

### Rate Limiting

- Registration: 5 attempts per 15 minutes
- Login: 3 attempts per 15 minutes
- General API: 100 requests per 15 minutes

### Account Security

- Account locking after failed login attempts
- JWT token with short expiration (15 minutes)
- Refresh token for session management
- MFA support (ready for implementation)

### Permission System

Granular permissions for different operations:

- **LC Operations**: create, view, edit, approve, cancel
- **Document Management**: upload, view, edit, verify, download
- **Payment Processing**: initiate, approve, view, reconcile
- **User Management**: create, view, edit, delete
- **System Operations**: audit, backup, system_config

## 📝 Updated Registration Process

### New Registration Features

- **Optional Role Field**: Roles are now automatically assigned based on organization type and user count
- **Optional Organization ID**: Required only when joining existing organizations
- **Smart Organization Handling**: Create new organizations or join existing ones
- **Enhanced Validation**: Comprehensive edge case handling and input validation
- **Terms Acceptance**: Mandatory terms and conditions acceptance
- **Password Confirmation**: Client-side and server-side password matching

### Registration Flow

1. **New Organization**: First user becomes admin, creates organization structure
2. **Existing Organization**: Subsequent users get standard roles, join existing structure
3. **Auto-Role Assignment**: Based on organization type and user position
4. **Immediate Login**: JWT tokens provided upon successful registration

### Test Registration Process

```bash
# Run comprehensive registration tests
npm run test:registration

# Test specific scenarios
npm run dev  # Start server
# Then use Postman collection: blocktrade-enhanced-api.postman_collection.json
```

## 🧪 Testing & Demo Accounts

### Platform Admin Credentials

```javascript
// Platform Super Admin (Complete System Control)
{
  username: 'platform_admin',
  password: 'BlockTrade@2024!',
  role: 'platform_super_admin'
}
```

### Demo Organization Accounts

```javascript
// Demo International Bank
{
  username: 'bank_admin@demobank.com',
  password: 'Demo@2024!',
  role: 'bank_admin',
  organization: 'Demo International Bank'
}

// Demo Trading Corporation
{
  username: 'corp_admin@democorp.com',
  password: 'Demo@2024!',
  role: 'corporate_admin',
  organization: 'Demo Trading Corporation'
}

// Demo Financial Services (NBFC)
{
  username: 'nbfc_admin@demofinance.com',
  password: 'Demo@2024!',
  role: 'nbfc_admin',
  organization: 'Demo Financial Services'
}

// Demo Logistics Solutions
{
  username: 'logistics_admin@demologistics.com',
  password: 'Demo@2024!',
  role: 'logistics_admin',
  organization: 'Demo Logistics Solutions'
}

// Demo Insurance Group
{
  username: 'insurance_admin@demoinsurance.com',
  password: 'Demo@2024!',
  role: 'insurance_admin',
  organization: 'Demo Insurance Group'
}
```

### User Journey Testing

Each demo account can create new users and test the complete 5-step onboarding journey with role assignments and permission validation.

### Sample API Calls

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "corporate_user",
    "organizationId": "b1c2d3e4-f5a6-7b8c-9d0e-123456789abc",
    "organizationName": "Test Corp",
    "organizationType": "corporate",
    "phone": "15551234567"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!"
  }'

# Get profile (replace TOKEN with actual token)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## 📊 Database Schema

### User Model

```typescript
interface IUser {
  username: string;
  email: string;
  password: string; // hashed
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  permissions: string[];

  // Security
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;

  // Contact Info
  phone?: string;
  address?: IAddress;

  // KYC
  kycStatus: "pending" | "approved" | "rejected";
  kycDocuments?: string[];

  // MFA
  mfaEnabled: boolean;
  mfaSecret?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

### Organization Model

```typescript
interface IOrganization {
  id: string; // UUID
  name: string;
  type: OrganizationType;
  registrationNumber?: string;
  countryCode: string;

  // Contact
  address: IAddress;
  contactPerson: IContactPerson;

  // Verification
  isVerified: boolean;
  verificationDate?: Date;
  verificationDocuments: IDocument[];

  // KYC
  kycStatus: "pending" | "in_review" | "approved" | "rejected";

  // Specific fields
  swiftCode?: string; // Banks
  licenseNumber?: string; // NBFC, Insurance
  tradingLicense?: string; // Corporate

  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔧 Development Setup

### With Database (Full Functionality)

1. **Install MongoDB**

   ```bash
   # macOS with Homebrew
   brew install mongodb-community
   brew services start mongodb-community

   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Seed Test Data**

   ```bash
   npm run seed
   ```

3. **Run Tests**
   ```bash
   npm run test:auth
   ```

### Without Database (API Structure Testing)

```bash
# Test API structure, validation, and security features
npm run test:simple
```

## 🚧 Next Steps

The authentication system is now ready for frontend integration. Next development phases:

1. **Letter of Credit Management**

   - LC creation and approval workflows
   - Document requirements management
   - Payment processing integration

2. **Document Management System**

   - Secure document upload and storage
   - Digital signature verification
   - Blockchain-based document integrity

3. **Advanced Security Features**

   - Multi-factor authentication implementation
   - Advanced audit logging
   - Compliance reporting

4. **Integration Features**
   - Blockchain integration for transparency
   - External bank API integration
   - Real-time notifications

## 📞 Support

For questions or issues with the authentication system:

1. Check the API documentation at `/api-docs`
2. Review test cases in `/src/utils/`
3. Check logs for detailed error information
4. Refer to project documentation in `/project_plan/`

---

**BlockTrade Team** | Trade Finance Reimagined with Blockchain Technology
