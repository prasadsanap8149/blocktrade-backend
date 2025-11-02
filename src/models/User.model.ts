import { Collection, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { database } from '../config/database';
import { 
  IUser, 
  CreateUserRequest, 
  UserResponse, 
  ROLE_PERMISSIONS, 
  LoginHistory,
  UpdateProfileRequest
} from '../types/user.types';
import { logger } from '../utils/logger';

export class UserModel {
  private collection: Collection<IUser>;

  constructor() {
    this.collection = database.getDb().collection<IUser>('users');
  }

  async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.findByUsernameOrEmail(userData.username, userData.email);
      if (existingUser) {
        throw new Error('User with this username or email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Get default permissions for role
      const userRole = userData.role!; // Role is guaranteed to be set by auth controller
      const permissions = userData.permissions || [...(ROLE_PERMISSIONS[userRole] || [])];

      // Create user document
      const user: IUser = {
        username: userData.username,
        email: userData.email.toLowerCase(),
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userRole,
        organizationId: userData.organizationId,
        organizationName: userData.organizationName,
        organizationType: userData.organizationType,
        permissions,
        phone: userData.phone,
        address: userData.address,
        isActive: true,
        emailVerified: false,
        failedLoginAttempts: 0,
        kycStatus: 'pending',
        mfaEnabled: false,
        notifications: {
          email: true,
          sms: false,
          push: true,
          marketing: userData.agreeToMarketing || false,
        },
        loginHistory: [],
        timezone: userData.timezone || 'UTC',
        language: userData.language || 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.collection.insertOne(user);
      
      logger.info(`👤 New user created: ${userData.username} (${userData.email}) - Role: ${userData.role} - Org: ${userData.organizationName}`);
      
      return this.toUserResponse({ 
        ...user, 
        _id: result.insertedId
      });
    } catch (error) {
      logger.error('❌ Error creating user:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<IUser | null> {
    try {
      return await this.collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      logger.error('❌ Error finding user by ID:', error);
      return null;
    }
  }

  async findByUsername(username: string): Promise<IUser | null> {
    try {
      return await this.collection.findOne({ username });
    } catch (error) {
      logger.error('❌ Error finding user by username:', error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await this.collection.findOne({ email: email.toLowerCase() });
    } catch (error) {
      logger.error('❌ Error finding user by email:', error);
      return null;
    }
  }

  async findByUsernameOrEmail(username: string, email: string): Promise<IUser | null> {
    try {
      return await this.collection.findOne({
        $or: [
          { username },
          { email: email.toLowerCase() }
        ]
      });
    } catch (error) {
      logger.error('❌ Error finding user by username or email:', error);
      return null;
    }
  }

  async findByOrganization(organizationId: string, skip: number = 0, limit: number = 10): Promise<UserResponse[]> {
    try {
      const users = await this.collection
        .find({ organizationId, isActive: true })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      return users.map(user => this.toUserResponse(user));
    } catch (error) {
      logger.error('❌ Error finding users by organization:', error);
      return [];
    }
  }

  async validatePassword(user: IUser, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      logger.error('❌ Error validating password:', error);
      return false;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            lastLogin: new Date(),
            updatedAt: new Date(),
            failedLoginAttempts: 0 // Reset failed attempts on successful login
          }
        }
      );
    } catch (error) {
      logger.error('❌ Error updating last login:', error);
    }
  }

  async incrementFailedLoginAttempts(userId: string): Promise<number> {
    try {
      const user = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { 
          $inc: { failedLoginAttempts: 1 },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

      const failedAttempts = user?.failedLoginAttempts || 0;

      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);

        await this.collection.updateOne(
          { _id: new ObjectId(userId) },
          { 
            $set: { 
              accountLockedUntil: lockUntil,
              updatedAt: new Date()
            }
          }
        );

        logger.warn(`🔒 Account locked for user ID: ${userId} due to too many failed login attempts`);
      }

      return failedAttempts;
    } catch (error) {
      logger.error('❌ Error incrementing failed login attempts:', error);
      return 0;
    }
  }

  async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user || !user.accountLockedUntil) {
        return false;
      }

      const now = new Date();
      if (user.accountLockedUntil > now) {
        return true;
      }

      // Clear lock if expired
      await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $unset: { accountLockedUntil: 1 },
          $set: { 
            failedLoginAttempts: 0,
            updatedAt: new Date()
          }
        }
      );

      return false;
    } catch (error) {
      logger.error('❌ Error checking account lock status:', error);
      return false;
    }
  }

  async updateUser(userId: string, updates: Partial<IUser>): Promise<UserResponse | null> {
    try {
      // Remove sensitive fields from updates
      const { passwordHash, ...safeUpdates } = updates;

      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            ...safeUpdates,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (result) {
        return this.toUserResponse(result);
      }
      
      return null;
    } catch (error) {
      logger.error('❌ Error updating user:', error);
      throw error;
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      const result = await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            passwordHash,
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount === 1;
    } catch (error) {
      logger.error('❌ Error updating password:', error);
      return false;
    }
  }

  async deactivateUser(userId: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            isActive: false,
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount === 1) {
        logger.info(`👤 User deactivated: ${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Error deactivating user:', error);
      return false;
    }
  }

  async reactivateUser(userId: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            isActive: true,
            failedLoginAttempts: 0,
            updatedAt: new Date()
          },
          $unset: { accountLockedUntil: 1 }
        }
      );

      if (result.modifiedCount === 1) {
        logger.info(`👤 User reactivated: ${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Error reactivating user:', error);
      return false;
    }
  }

  async verifyEmail(userId: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            emailVerified: true,
            emailVerifiedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount === 1;
    } catch (error) {
      logger.error('❌ Error verifying email:', error);
      return false;
    }
  }

  async updatePermissions(userId: string, permissions: string[]): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            permissions,
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount === 1;
    } catch (error) {
      logger.error('❌ Error updating permissions:', error);
      return false;
    }
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user || !user.isActive) {
        return false;
      }

      return user.permissions.includes(permission);
    } catch (error) {
      logger.error('❌ Error checking permission:', error);
      return false;
    }
  }

  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user || !user.isActive) {
        return false;
      }

      return permissions.some(permission => user.permissions.includes(permission));
    } catch (error) {
      logger.error('❌ Error checking permissions:', error);
      return false;
    }
  }

  async recordLogin(userId: string, loginData: LoginHistory): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $push: { 
            loginHistory: {
              $each: [loginData],
              $slice: -10 // Keep only last 10 login records
            }
          },
          $set: { updatedAt: new Date() }
        }
      );
    } catch (error) {
      logger.error('❌ Error recording login history:', error);
    }
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            passwordResetToken: token,
            passwordResetExpires: expires,
            updatedAt: new Date()
          }
        }
      );
    } catch (error) {
      logger.error('❌ Error setting password reset token:', error);
      throw error;
    }
  }

  async findByPasswordResetToken(token: string): Promise<IUser | null> {
    try {
      return await this.collection.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });
    } catch (error) {
      logger.error('❌ Error finding user by password reset token:', error);
      return null;
    }
  }

  async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      const result = await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            passwordHash,
            lastPasswordChange: new Date(),
            updatedAt: new Date()
          },
          $unset: {
            passwordResetToken: 1,
            passwordResetExpires: 1
          }
        }
      );

      if (result.modifiedCount === 1) {
        logger.info(`🔐 Password reset successfully for user: ${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Error resetting password:', error);
      return false;
    }
  }

  async setEmailVerificationToken(userId: string, token: string, expires: Date): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            emailVerificationToken: token,
            emailVerificationExpires: expires,
            updatedAt: new Date()
          }
        }
      );
    } catch (error) {
      logger.error('❌ Error setting email verification token:', error);
      throw error;
    }
  }

  async findByEmailVerificationToken(token: string): Promise<IUser | null> {
    try {
      return await this.collection.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
      });
    } catch (error) {
      logger.error('❌ Error finding user by email verification token:', error);
      return null;
    }
  }

  async verifyEmailByToken(token: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { 
          emailVerificationToken: token,
          emailVerificationExpires: { $gt: new Date() }
        },
        { 
          $set: { 
            emailVerified: true,
            emailVerifiedAt: new Date(),
            updatedAt: new Date()
          },
          $unset: {
            emailVerificationToken: 1,
            emailVerificationExpires: 1
          }
        }
      );

      if (result.modifiedCount === 1) {
        logger.info(`📧 Email verified successfully for token: ${token.substring(0, 8)}...`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Error verifying email:', error);
      return false;
    }
  }

  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<UserResponse | null> {
    try {
      const allowedUpdates: any = {
        updatedAt: new Date()
      };

      // Only add defined values
      if (updates.firstName !== undefined) allowedUpdates.firstName = updates.firstName;
      if (updates.lastName !== undefined) allowedUpdates.lastName = updates.lastName;
      if (updates.phone !== undefined) allowedUpdates.phone = updates.phone;
      if (updates.address !== undefined) allowedUpdates.address = updates.address;
      if (updates.bio !== undefined) allowedUpdates.bio = updates.bio;
      if (updates.timezone !== undefined) allowedUpdates.timezone = updates.timezone;
      if (updates.language !== undefined) allowedUpdates.language = updates.language;
      
      // Handle notifications separately to ensure all required fields
      if (updates.notifications) {
        const currentUser = await this.findById(userId);
        if (currentUser) {
          allowedUpdates.notifications = {
            email: updates.notifications.email !== undefined ? updates.notifications.email : currentUser.notifications.email,
            sms: updates.notifications.sms !== undefined ? updates.notifications.sms : currentUser.notifications.sms,
            push: updates.notifications.push !== undefined ? updates.notifications.push : currentUser.notifications.push,
            marketing: updates.notifications.marketing !== undefined ? updates.notifications.marketing : currentUser.notifications.marketing,
          };
        }
      }

      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { $set: allowedUpdates },
        { returnDocument: 'after' }
      );

      if (result) {
        return this.toUserResponse(result);
      }
      
      return null;
    } catch (error) {
      logger.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(userId: string, notifications: Partial<IUser['notifications']>): Promise<boolean> {
    try {
      // Get current notifications to merge with partial update
      const currentUser = await this.findById(userId);
      if (!currentUser) {
        return false;
      }

      const updatedNotifications = {
        email: notifications.email !== undefined ? notifications.email : currentUser.notifications.email,
        sms: notifications.sms !== undefined ? notifications.sms : currentUser.notifications.sms,
        push: notifications.push !== undefined ? notifications.push : currentUser.notifications.push,
        marketing: notifications.marketing !== undefined ? notifications.marketing : currentUser.notifications.marketing,
      };

      const result = await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            notifications: updatedNotifications,
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount === 1;
    } catch (error) {
      logger.error('❌ Error updating notification preferences:', error);
      return false;
    }
  }

  async generateMFABackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = Array.from({ length: 10 }, () => 
        randomBytes(4).toString('hex').toUpperCase()
      );

      await this.collection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            mfaBackupCodes: backupCodes,
            updatedAt: new Date()
          }
        }
      );

      return backupCodes;
    } catch (error) {
      logger.error('❌ Error generating MFA backup codes:', error);
      throw error;
    }
  }

  async useMFABackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { 
          _id: new ObjectId(userId),
          mfaBackupCodes: code
        },
        { 
          $pull: { mfaBackupCodes: code },
          $set: { updatedAt: new Date() }
        }
      );

      return result.modifiedCount === 1;
    } catch (error) {
      logger.error('❌ Error using MFA backup code:', error);
      return false;
    }
  }

  private toUserResponse(user: IUser): UserResponse {
    return {
      id: user._id?.toString() || '',
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Create indexes for better performance
  async createIndexes(): Promise<void> {
    try {
      // Create indexes with proper error handling
      const indexOperations = [
        { key: { username: 1 }, options: { unique: true, sparse: true }, name: 'username' },
        { key: { email: 1 }, options: { unique: true }, name: 'email' },
        { key: { role: 1 }, options: {}, name: 'role' },
        { key: { organizationId: 1 }, options: {}, name: 'organizationId' },
        { key: { organizationType: 1 }, options: {}, name: 'organizationType' },
        { key: { isActive: 1 }, options: {}, name: 'isActive' },
        { key: { emailVerified: 1 }, options: {}, name: 'emailVerified' },
        { key: { createdAt: 1 }, options: {}, name: 'createdAt' },
        { key: { lastLogin: 1 }, options: {}, name: 'lastLogin' },
        { key: { organizationId: 1, isActive: 1 }, options: {}, name: 'organizationId_isActive' },
        { key: { role: 1, isActive: 1 }, options: {}, name: 'role_isActive' }
      ];

      for (const indexOp of indexOperations) {
        try {
          await this.collection.createIndex(indexOp.key as any, indexOp.options);
          logger.info(`📊 Created index: ${indexOp.name}`);
        } catch (error: any) {
          if (error.code === 11000 || error.codeName === 'DuplicateKey') {
            logger.warn(`⚠️ Index ${indexOp.name} already exists or has duplicate values, skipping...`);
          } else if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
            logger.warn(`⚠️ Index ${indexOp.name} has conflicting options, dropping and recreating...`);
            try {
              // Drop by index name instead of key
              const indexName = Object.keys(indexOp.key).join('_') + '_1';
              await this.collection.dropIndex(indexName);
              await this.collection.createIndex(indexOp.key as any, indexOp.options);
              logger.info(`📊 Recreated index: ${indexOp.name}`);
            } catch (recreateError) {
              logger.error(`❌ Failed to recreate index ${indexOp.name}:`, recreateError);
            }
          } else {
            logger.error(`❌ Error creating index ${indexOp.name}:`, error);
          }
        }
      }
      
      logger.info('📊 User collection indexes setup completed');
    } catch (error) {
      logger.error('❌ Error in createIndexes method:', error);
    }
  }
}

export default UserModel;
