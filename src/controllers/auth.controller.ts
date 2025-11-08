import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import UserModel from '../models/User.model';
import { OrganizationModel } from '../models/Organization.model';
import { RoleModel } from '../models/Role.model';
import { UserJourneyModel } from '../models/UserJourney.model';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { 
  CreateUserRequest, 
  LoginRequest, 
  JWTPayload, 
  PasswordResetRequest, 
  PasswordResetConfirm,
  EmailVerificationRequest,
  ChangePasswordRequest,
  UpdateProfileRequest
} from '../types/user.types';
import { OrganizationType, OrganizationRole, EntitySpecificRole, UserJourneyStep } from '../types/role.types';
import { CreateOrganizationRequest, Address, ContactPerson } from '../types/organization.types';
import { logger } from '../utils/logger';
import { database } from '../config/database';

export class AuthController {
  private userModel!: UserModel;
  private organizationModel!: OrganizationModel;
  private roleModel!: RoleModel;
  private userJourneyModel!: UserJourneyModel;

  constructor() {
    // Initialize after database connection
    this.initializeModels();
  }

  public async initializeModels() {
    try {
      await database.connect();
      this.userModel = new UserModel();
      this.organizationModel = new OrganizationModel();
      this.roleModel = new RoleModel();
      this.userJourneyModel = new UserJourneyModel();
      await this.userModel.createIndexes();
      await this.organizationModel.createIndexes();
    } catch (error) {
      logger.error('❌ Failed to initialize models:', error);
    }
  }

  /**
   * Creates a new organization during user registration
   */
  private async createOrganization(userData: CreateUserRequest): Promise<string> {
    try {
      // Ensure we have required address data
      const baseAddress = userData.organizationAddress || {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      };

      const defaultAddress: Address = {
        street: baseAddress.street,
        city: baseAddress.city,
        state: baseAddress.state,
        postalCode: baseAddress.postalCode,
        country: baseAddress.country,
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      // Ensure we have required contact person data with designation
      const defaultContactPerson: ContactPerson = {
        name: userData.organizationContactPerson?.name || `${userData.firstName} ${userData.lastName}`,
        email: userData.organizationContactPerson?.email || userData.email,
        phone: userData.organizationContactPerson?.phone || userData.phone || '+1-555-0123',
        designation: 'CEO' // Default designation for organization creator
      };

      const organizationData: CreateOrganizationRequest = {
        name: userData.organizationName,
        type: userData.organizationType,
        registrationNumber: userData.organizationRegistrationNumber,
        countryCode: userData.organizationCountryCode || 'US',
        address: userData.organizationAddress || defaultAddress,
        contactPerson: defaultContactPerson,
        swiftCode: userData.organizationSwiftCode,
        licenseNumber: userData.organizationLicenseNumber
      };

      const organization = await this.organizationModel.createOrganization(organizationData);
      logger.info(`🏢 New organization created during registration: ${organization.name} (${organization.id})`);
      return organization.id;
    } catch (error) {
      logger.error('❌ Error creating organization during registration:', error);
      throw new AppError('Failed to create organization', 500);
    }
  }

  /**
   * Automatically determines the default role for a new user based on organization type
   * First user in an organization gets admin role, subsequent users get basic user role
   */
  private async getDefaultRoleForUser(organizationType: OrganizationType, organizationId: string): Promise<string> {
    try {
      // Check if this is the first user in the organization
      const existingUsers = await this.userModel.findByOrganization(organizationId);
      const isFirstUser = existingUsers.length === 0;

      // Define default roles based on organization type
      const defaultRoles = {
        bank: isFirstUser ? 'bank_admin' : 'bank_officer',
        corporate: isFirstUser ? 'corporate_admin' : 'corporate_user',
        nbfc: isFirstUser ? 'nbfc_admin' : 'nbfc_user',
        logistics: isFirstUser ? 'logistics_admin' : 'logistics_user',
        insurance: isFirstUser ? 'insurance_admin' : 'insurance_user'
      };

      return defaultRoles[organizationType];
    } catch (error) {
      logger.error('Error determining default role:', error);
      // Fallback to basic user role
      const fallbackRoles = {
        bank: 'bank_officer',
        corporate: 'corporate_user',
        nbfc: 'nbfc_user',
        logistics: 'logistics_user',
        insurance: 'insurance_user'
      };
      return fallbackRoles[organizationType];
    }
  }

  register = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel || !this.organizationModel) {
        await this.initializeModels();
      }

      const userData: CreateUserRequest = req.body;
      
      logger.info(`📝 Registration attempt: ${userData.username} (${userData.email}) - Organization: ${userData.organizationName}`);

      // Check if user already exists
      const existingUserByEmail = await this.userModel.findByEmail(userData.email);
      if (existingUserByEmail) {
        logger.warn(`❌ Registration failed - Email already exists: ${userData.email}`);
        throw new AppError('A user with this email address already exists', 409);
      }

      const existingUserByUsername = await this.userModel.findByUsername(userData.username);
      if (existingUserByUsername) {
        logger.warn(`❌ Registration failed - Username already exists: ${userData.username}`);
        throw new AppError('A user with this username already exists', 409);
      }

      let organizationId = userData.organizationId;
      let organizationInfo = null;
      
      // Handle organization logic
      if (userData.isNewOrganization || !organizationId) {
        // Creating new organization
        logger.info(`🏢 Creating new organization: ${userData.organizationName}`);
        
        // Check if organization name already exists
        const existingOrgByName = await this.organizationModel.findByName(userData.organizationName);
        if (existingOrgByName) {
          throw new AppError(`An organization with the name "${userData.organizationName}" already exists. Please choose a different name or join the existing organization.`, 409);
        }

        organizationId = await this.createOrganization(userData);
        userData.organizationId = organizationId;
        organizationInfo = await this.organizationModel.findById(organizationId);
        
        logger.info(`✅ New organization created: ${userData.organizationName} (${organizationId})`);
      } else {
        // Joining existing organization
        logger.info(`🏢 Joining existing organization: ${organizationId}`);
        
        organizationInfo = await this.organizationModel.findById(organizationId);
        if (!organizationInfo) {
          throw new AppError('Organization not found. Please create a new organization or provide a valid organization ID.', 404);
        }
        
        // Verify organization type matches
        if (organizationInfo.type !== userData.organizationType) {
          throw new AppError(`Organization type mismatch. The selected organization is of type "${organizationInfo.type}" but you specified "${userData.organizationType}".`, 400);
        }

        // Check if organization is active and accepting new members
        if (!organizationInfo.isActive) {
          throw new AppError('The selected organization is not currently accepting new members.', 403);
        }

        // Update organization name in userData to match existing organization
        userData.organizationName = organizationInfo.name;
      }
      
      // Auto-assign role based on organization type and existing users
      const defaultRole = await this.getDefaultRoleForUser(userData.organizationType, organizationId);
      userData.role = defaultRole as any; // Override any manually provided role
      
      logger.info(`🎭 Auto-assigned role: ${defaultRole} for organization type: ${userData.organizationType}`);
      
      // Create user with all validation passed
      const user = await this.userModel.createUser(userData);
      
      // Initialize user journey for new user
      if (this.userJourneyModel) {
        try {
          await this.userJourneyModel.startUserJourney(user.id, organizationId, userData.organizationType);
          logger.info(`🚀 User journey initialized for user: ${user.username}`);
        } catch (journeyError) {
          logger.error('⚠️ Failed to initialize user journey, but user created successfully:', journeyError);
        }
      }
      
      // Generate tokens for immediate login
      const tokenPayload: JWTPayload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationType: user.organizationType,
        permissions: user.permissions,
      };
      
      const tokens = authService.generateTokens(tokenPayload);
      
      // Update last login
      await this.userModel.updateLastLogin(user.id);
      
      // Send welcome email (async, don't wait for it)
      if (emailService.isEnabled()) {
        emailService.sendWelcomeEmail(user.email, {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          organizationName: user.organizationName,
          isNewOrganization: userData.isNewOrganization || false,
          role: user.role,
        }).catch(error => {
          logger.error('❌ Failed to send welcome email:', error);
        });
      }
      
      logger.info(`✅ User registered successfully: ${user.username} - Role: ${user.role} - Org: ${user.organizationName} (${organizationId})`);
      
      res.status(201).json({
        success: true,
        message: `Registration successful! Welcome to BlockTrade. You have been assigned the role of ${user.role} in ${user.organizationName}.`,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: organizationId,
            organizationName: user.organizationName,
            organizationType: user.organizationType,
            permissions: user.permissions,
            phone: user.phone,
            address: user.address,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          tokens,
          organizationInfo: {
            id: organizationInfo?.id,
            name: organizationInfo?.name,
            type: organizationInfo?.type,
            isNewOrganization: userData.isNewOrganization || false,
          },
        },
      });
    } catch (error: any) {
      logger.error('❌ Registration error:', error);
      
      // Handle specific error cases
      if (error.code === 11000) {
        // MongoDB duplicate key error
        const duplicateField = Object.keys(error.keyPattern || {})[0];
        const duplicateValue = error.keyValue ? error.keyValue[duplicateField] : 'unknown';
        
        if (duplicateField === 'email') {
          throw new AppError('A user with this email address already exists', 409);
        } else if (duplicateField === 'username') {
          throw new AppError('A user with this username already exists', 409);
        } else {
          throw new AppError(`Duplicate ${duplicateField}: ${duplicateValue}`, 409);
        }
      }
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // Generic error handling
      if (error.message && error.message.includes('validation')) {
        throw new AppError(`Registration validation failed: ${error.message}`, 400);
      }
      
      throw new AppError('Registration failed. Please check your information and try again.', 500);
    }
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeModels();
      }

      const { username, password, mfaCode, rememberMe }: LoginRequest = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      logger.info(`🔐 Login attempt: ${username} from ${ipAddress}`);
      
      // Find user by username
      const user = await this.userModel.findByEmail(username);
      
      if (!user) {
        logger.warn(`❌ Login failed - user not found: ${username}`);
        throw new AppError('Invalid username or password', 401);
      }
      
      if (!user.isActive) {
        logger.warn(`❌ Login failed - inactive account: ${username}`);
        throw new AppError('Account is deactivated', 401);
      }

      // Check if account is locked
      const isLocked = await this.userModel.isAccountLocked(user._id!.toString());
      if (isLocked) {
        logger.warn(`❌ Login failed - account locked: ${username}`);
        throw new AppError('Account is temporarily locked due to multiple failed attempts', 423);
      }
      
      // Validate password
      const isValidPassword = await this.userModel.validatePassword(user, password);
      
      if (!isValidPassword) {
        // Increment failed login attempts
        await this.userModel.incrementFailedLoginAttempts(user._id!.toString());
        logger.warn(`❌ Login failed - invalid password: ${username}`);
        throw new AppError('Invalid username or password', 401);
      }

      // Check MFA if enabled
      if (user.mfaEnabled && !mfaCode) {
        throw new AppError('MFA code is required', 422);
      }

      if (user.mfaEnabled && mfaCode) {
        // TODO: Implement MFA verification
        // For now, we'll skip MFA verification
        logger.info(`🔐 MFA verification required for ${username} (not implemented yet)`);
      }
      
      // Generate tokens with extended expiry if remember me is checked
      const tokenPayload: JWTPayload = {
        userId: user._id!.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationType: user.organizationType,
        permissions: user.permissions,
      };
      
      const tokens = authService.generateTokens(tokenPayload, rememberMe);
      
      // Record login in history
      await this.userModel.recordLogin(user._id!.toString(), {
        timestamp: new Date(),
        ipAddress,
        userAgent,
        location: '', // TODO: Implement IP geolocation
        success: true,
      });
      
      // Update last login
      await this.userModel.updateLastLogin(user._id!.toString());
      
      // Get user response (without password)
      const userResponse = await this.userModel.findById(user._id!.toString());
      
      // Get organization information
      let organizationInfo = null;
      if (user.organizationId) {
        try {
          const organization = await this.organizationModel.findById(user.organizationId);
          if (organization) {
            organizationInfo = {
              id: organization.id,
              name: organization.name,
              type: organization.type,
              registrationNumber: organization.registrationNumber,
              countryCode: organization.countryCode,
              address: organization.address,
              contactPerson: organization.contactPerson,
              swiftCode: organization.swiftCode,
              licenseNumber: organization.licenseNumber,
              kycStatus: organization.kycStatus,
              isActive: organization.isActive,
              createdAt: organization.createdAt,
              updatedAt: organization.updatedAt,
            };
          }
        } catch (orgError) {
          logger.error('❌ Failed to fetch organization info during login:', orgError);
        }
      }
      
      // Send login alert email (async, don't wait for it)
      if (emailService.isEnabled()) {
        emailService.sendLoginAlert(user.email, {
          firstName: user.firstName,
          lastName: user.lastName,
          loginTime: new Date(),
          ipAddress,
          userAgent,
        }).catch(error => {
          logger.error('❌ Failed to send login alert:', error);
        });
      }
      
      logger.info(`✅ Login successful: ${username} - Role: ${user.role} - Org: ${user.organizationName}`);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse ? {
            id: userResponse._id!.toString(),
            username: userResponse.username,
            email: userResponse.email,
            firstName: userResponse.firstName,
            lastName: userResponse.lastName,
            role: userResponse.role,
            organizationId: userResponse.organizationId,
            organizationName: userResponse.organizationName,
            organizationType: userResponse.organizationType,
            permissions: userResponse.permissions,
            phone: userResponse.phone,
            address: userResponse.address,
            isActive: userResponse.isActive,
            emailVerified: userResponse.emailVerified,
            emailVerifiedAt: userResponse.emailVerifiedAt,
            lastLogin: userResponse.lastLogin,
            mfaEnabled: userResponse.mfaEnabled,
            createdAt: userResponse.createdAt,
            updatedAt: userResponse.updatedAt,
          } : null,
          tokens,
          organizationInfo,
        },
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('❌ Login error:', error);
      throw new AppError('Login failed', 500);
    }
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeModels();
      }

      const { email }: PasswordResetRequest = req.body;
      
      logger.info(`🔑 Password reset requested for: ${email}`);
      
      const user = await this.userModel.findByEmail(email);
      
      if (!user || !user.isActive) {
        // Don't reveal if user exists or not for security
        logger.warn(`❌ Password reset failed - user not found or inactive: ${email}`);
        res.status(200).json({
          success: true,
          message: 'If an account with that email exists, we\'ve sent a password reset link.',
        });
        return;
      }
      
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry
      
      // Save reset token to user
      await this.userModel.setPasswordResetToken(user._id!.toString(), resetToken, resetExpires);
      
      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/reset-password?token=${resetToken}`;
      
      // Send password reset email
      const emailSent = await emailService.sendPasswordResetEmail(email, {
        firstName: user.firstName,
        lastName: user.lastName,
        resetUrl,
        expiresAt: resetExpires,
      });
      
      if (emailSent) {
        logger.info(`✅ Password reset email sent to: ${email}`);
      } else {
        logger.error(`❌ Failed to send password reset email to: ${email}`);
      }
      
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, we\'ve sent a password reset link.',
      });
    } catch (error: any) {
      logger.error('❌ Forgot password error:', error);
      throw new AppError('Failed to process password reset request', 500);
    }
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeModels();
      }

      const { token, newPassword, confirmPassword }: PasswordResetConfirm = req.body;
      
      // Validate password confirmation
      if (newPassword !== confirmPassword) {
        throw new AppError('Password confirmation does not match', 400);
      }
      
      logger.info(`🔑 Password reset attempt with token: ${token.substring(0, 8)}...`);
      
      const user = await this.userModel.findByPasswordResetToken(token);
      
      if (!user) {
        logger.warn(`❌ Password reset failed - invalid or expired token`);
        throw new AppError('Invalid or expired reset token', 400);
      }
      
      // Update password and clear reset token
      const success = await this.userModel.resetPassword(user._id!.toString(), newPassword);
      
      if (!success) {
        throw new AppError('Failed to reset password', 500);
      }
      
      logger.info(`✅ Password reset successful for user: ${user.username}`);
      
      res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('❌ Reset password error:', error);
      throw new AppError('Failed to reset password', 500);
    }
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeModels();
      }

      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { currentPassword, newPassword, confirmPassword }: ChangePasswordRequest = req.body;
      
      // Validate password confirmation
      if (newPassword !== confirmPassword) {
        throw new AppError('Password confirmation does not match', 400);
      }
      
      const user = await this.userModel.findById(req.user.userId);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Validate current password
      const isValidPassword = await this.userModel.validatePassword(user, currentPassword);
      
      if (!isValidPassword) {
        throw new AppError('Current password is incorrect', 401);
      }
      
      // Update password
      const success = await this.userModel.updatePassword(req.user.userId, newPassword);
      
      if (!success) {
        throw new AppError('Failed to change password', 500);
      }
      
      logger.info(`✅ Password changed successfully for user: ${user.username}`);
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('❌ Change password error:', error);
      throw new AppError('Failed to change password', 500);
    }
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeModels();
      }

      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const updates: UpdateProfileRequest = req.body;
      
      const updatedUser = await this.userModel.updateProfile(req.user.userId, updates);
      
      if (!updatedUser) {
        throw new AppError('Failed to update profile', 500);
      }
      
      logger.info(`✅ Profile updated successfully for user: ${updatedUser.username}`);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('❌ Update profile error:', error);
      throw new AppError('Failed to update profile', 500);
    }
  });

  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeModels();
      }

      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }
      
      const user = await this.userModel.findById(req.user.userId);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      const userResponse = {
        id: user._id!.toString(),
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        organizationType: user.organizationType,
        permissions: user.permissions,
        phone: user.phone,
        address: user.address,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        lastLogin: user.lastLogin,
        mfaEnabled: user.mfaEnabled,
        profilePicture: user.profilePicture,
        bio: user.bio,
        timezone: user.timezone,
        language: user.language,
        notifications: user.notifications,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      
      res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: { user: userResponse },
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('❌ Get current user error:', error);
      throw new AppError('Failed to retrieve user profile', 500);
    }
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeModels();
      }

      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }
      
      // Verify refresh token
      const decoded = authService.verifyRefreshToken(refreshToken);
      
      // Get user details
      const user = await this.userModel.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401);
      }
      
      // Generate new tokens
      const tokenPayload: JWTPayload = {
        userId: user._id!.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationType: user.organizationType,
        permissions: user.permissions,
      };
      
      const tokens = authService.generateTokens(tokenPayload);
      
      logger.info(`🔄 Token refreshed for user: ${user.username}`);
      
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('❌ Token refresh error:', error);
      throw new AppError('Token refresh failed', 401);
    }
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    // For stateless JWT, logout is handled on the client side
    // In a production system, you might want to maintain a blacklist of tokens
    
    logger.info(`👋 User logged out: ${req.user?.username || 'Unknown'}`);
    
    res.status(200).json({
      success: true,
      message: 'Logout successful',
      data: null,
    });
  });

  /**
   * Get available organizations for user registration
   */
  getAvailableOrganizations = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.organizationModel) {
        await this.initializeModels();
      }

      const { type, search, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      
      const filters: any = { isActive: true };
      
      // Filter by organization type if provided
      if (type) {
        filters.type = type;
      }
      
      // Add search functionality if needed
      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { registrationNumber: { $regex: search, $options: 'i' } }
        ];
      }

      const result = await this.organizationModel.getAllOrganizations(skip, Number(limit), filters);
      
      res.status(200).json({
        success: true,
        message: 'Organizations retrieved successfully',
        data: {
          organizations: result.organizations.map(org => ({
            id: org.id,
            name: org.name,
            type: org.type,
            countryCode: org.countryCode,
            kycStatus: org.kycStatus
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: result.total,
            pages: Math.ceil(result.total / Number(limit))
          }
        }
      });
    } catch (error: any) {
      logger.error('❌ Error getting available organizations:', error);
      throw new AppError('Failed to retrieve organizations', 500);
    }
  });
}
