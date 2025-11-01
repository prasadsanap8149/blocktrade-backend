// User type definitions for BlockTrade authentication system

export interface IUser {
  id?: string; // Database-agnostic ID
  _id?: any; // For MongoDB compatibility
  username: string;
  email: string;
  passwordHash: string; // Will be hashed
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  permissions: string[];
  phone?: string;
  address?: Address;
  
  // Account status
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  
  // Security
  lastLogin?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  
  // KYC
  kycStatus: 'pending' | 'approved' | 'rejected';
  kycDocuments?: string[];
  
  // MFA
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];
  
  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Email verification
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // Profile
  profilePicture?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  
  // Preferences
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    marketing: boolean;
  };
  
  // Audit
  lastPasswordChange?: Date;
  loginHistory: LoginHistory[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginHistory {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  success: boolean;
}

export type UserRole = 
  | 'bank_admin' 
  | 'bank_officer' 
  | 'corporate_admin' 
  | 'corporate_user' 
  | 'nbfc_admin' 
  | 'nbfc_user' 
  | 'logistics_admin' 
  | 'logistics_user' 
  | 'insurance_admin' 
  | 'insurance_user';

export type OrganizationType = 'bank' | 'nbfc' | 'corporate' | 'logistics' | 'insurance';

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string; // Added for frontend validation
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  permissions?: string[];
  phone?: string;
  address?: Address;
  timezone?: string;
  language?: string;
  acceptTerms: boolean; // Added for legal compliance
  agreeToMarketing?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: Address;
  lastLogin?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  refreshToken?: string;
  isActive?: boolean;
  isVerified?: boolean;
  kycStatus?: 'pending' | 'approved' | 'rejected';
  mfaEnabled?: boolean;
  mfaSecret?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean; // Added for extended sessions
  ipAddress?: string;
  userAgent?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: Address;
  bio?: string;
  timezone?: string;
  language?: string;
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    marketing?: boolean;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  permissions: string[];
  phone?: string;
  address?: Address;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLogin?: Date;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationType: OrganizationType;
  permissions: string[];
  iat?: number;
  exp?: number;
}

// Permission definitions for role-based access control
export const PERMISSIONS = {
  // Letter of Credit permissions
  LC_CREATE: 'lc:create',
  LC_VIEW: 'lc:view',
  LC_EDIT: 'lc:edit',
  LC_APPROVE: 'lc:approve',
  LC_REJECT: 'lc:reject',
  LC_AMEND: 'lc:amend',
  LC_CANCEL: 'lc:cancel',
  
  // Document permissions
  DOCUMENT_UPLOAD: 'document:upload',
  DOCUMENT_VIEW: 'document:view',
  DOCUMENT_VERIFY: 'document:verify',
  DOCUMENT_REJECT: 'document:reject',
  DOCUMENT_DOWNLOAD: 'document:download',
  
  // Payment permissions
  PAYMENT_INITIATE: 'payment:initiate',
  PAYMENT_APPROVE: 'payment:approve',
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_PROCESS: 'payment:process',
  
  // User management permissions
  USER_CREATE: 'user:create',
  USER_VIEW: 'user:view',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  USER_MANAGE: 'user:manage',
  
  // Organization permissions
  ORG_VIEW: 'org:view',
  ORG_EDIT: 'org:edit',
  ORG_VERIFY: 'org:verify',
  
  // KYC permissions
  KYC_VIEW: 'kyc:view',
  KYC_VERIFY: 'kyc:verify',
  KYC_MANAGE: 'kyc:manage',
  
  // Reporting permissions
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  REPORT_ADMIN: 'report:admin',
  
  // System administration
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_MONITOR: 'system:monitor'
} as const;

// Role-based permission mappings
export const ROLE_PERMISSIONS = {
  bank_admin: [
    PERMISSIONS.LC_CREATE,
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.LC_EDIT,
    PERMISSIONS.LC_APPROVE,
    PERMISSIONS.LC_REJECT,
    PERMISSIONS.LC_AMEND,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_VERIFY,
    PERMISSIONS.DOCUMENT_REJECT,
    PERMISSIONS.PAYMENT_INITIATE,
    PERMISSIONS.PAYMENT_APPROVE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_PROCESS,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.KYC_VIEW,
    PERMISSIONS.KYC_VERIFY,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT
  ],
  bank_officer: [
    PERMISSIONS.LC_CREATE,
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.LC_EDIT,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_VERIFY,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.KYC_VIEW,
    PERMISSIONS.REPORT_VIEW
  ],
  corporate_admin: [
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_DOWNLOAD,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_EDIT,
    PERMISSIONS.REPORT_VIEW
  ],
  corporate_user: [
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_DOWNLOAD,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.ORG_VIEW
  ],
  nbfc_admin: [
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.PAYMENT_INITIATE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.KYC_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT
  ],
  nbfc_user: [
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.REPORT_VIEW
  ],
  logistics_admin: [
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_EDIT
  ],
  logistics_user: [
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.ORG_VIEW
  ],
  insurance_admin: [
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.REPORT_VIEW
  ],
  insurance_user: [
    PERMISSIONS.LC_VIEW,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.ORG_VIEW
  ]
} as const;
