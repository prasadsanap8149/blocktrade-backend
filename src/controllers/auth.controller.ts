import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import UserModel from '../models/User.model';
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
import { logger } from '../utils/logger';
import { database } from '../config/database';

export class AuthController {
  private userModel!: UserModel;

  constructor() {
    // Initialize after database connection
    this.initializeUserModel();
  }

  public async initializeUserModel() {
    try {
      await database.connect();
      this.userModel = new UserModel();
      await this.userModel.createIndexes();
    } catch (error) {
      logger.error('❌ Failed to initialize UserModel:', error);
    }
  }

  register = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeUserModel();
      }

      const userData: CreateUserRequest = req.body;
      
      // Validate password confirmation
      if (userData.password !== userData.confirmPassword) {
        throw new AppError('Password confirmation does not match', 400);
      }

      // Validate terms acceptance
      if (!userData.acceptTerms) {
        throw new AppError('You must accept the terms and conditions', 400);
      }
      
      logger.info(`📝 User registration attempt: ${userData.username} (${userData.email}) - Org: ${userData.organizationName}`);
      
      const user = await this.userModel.createUser(userData);
      
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
        }).catch(error => {
          logger.error('❌ Failed to send welcome email:', error);
        });
      }
      
      logger.info(`✅ User registered successfully: ${user.username} - Role: ${user.role} - Org: ${user.organizationName}`);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          tokens,
        },
      });
    } catch (error: any) {
      logger.error('❌ Registration error:', error);
      
      if (error.message.includes('already exists')) {
        throw new AppError('User with this username or email already exists', 409);
      }
      
      throw new AppError('Registration failed', 400);
    }
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeUserModel();
      }

      const { username, password, mfaCode, rememberMe }: LoginRequest = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      logger.info(`🔐 Login attempt: ${username} from ${ipAddress}`);
      
      // Find user by username
      const user = await this.userModel.findByUsername(username);
      
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
        await this.initializeUserModel();
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
        await this.initializeUserModel();
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
        await this.initializeUserModel();
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
        await this.initializeUserModel();
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
        await this.initializeUserModel();
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
        await this.initializeUserModel();
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
}
