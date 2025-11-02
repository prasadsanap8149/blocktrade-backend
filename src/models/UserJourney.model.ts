import { Collection, ObjectId } from 'mongodb';
import { database } from '../config/database';
import { 
  UserJourneyStep, 
  UserOnboardingState,
  JourneyValidation,
  OrganizationType
} from '../types/role.types';
import { logger } from '../utils/logger';

export class UserJourneyModel {
  private onboardingCollection: Collection<UserOnboardingState>;

  constructor() {
    this.onboardingCollection = database.getDb().collection<UserOnboardingState>('user_onboarding');
  }

  async startUserJourney(
    userId: string, 
    organizationId: string, 
    organizationType: OrganizationType
  ): Promise<UserOnboardingState> {
    try {
      // Check if user already has an onboarding journey
      const existingJourney = await this.onboardingCollection.findOne({
        userId,
        organizationId,
        isComplete: false
      });

      if (existingJourney) {
        return existingJourney;
      }

      const onboardingState: UserOnboardingState = {
        userId,
        organizationId,
        currentStep: 1,
        completedSteps: [],
        stepData: {},
        startedAt: new Date(),
        isComplete: false,
        assignedRoles: [],
        temporaryPermissions: this.getTemporaryPermissions(organizationType)
      };

      await this.onboardingCollection.insertOne(onboardingState);
      
      logger.info(`🚀 User journey started for user ${userId} in organization ${organizationId}`);
      
      return onboardingState;
    } catch (error) {
      logger.error('❌ Error starting user journey:', error);
      throw error;
    }
  }

  async getOnboardingState(userId: string, organizationId: string): Promise<UserOnboardingState | null> {
    try {
      return await this.onboardingCollection.findOne({
        userId,
        organizationId,
        isComplete: false
      });
    } catch (error) {
      logger.error('❌ Error getting onboarding state:', error);
      return null;
    }
  }

  async updateStepData(
    userId: string,
    organizationId: string,
    stepNumber: number,
    stepData: Record<string, any>
  ): Promise<boolean> {
    try {
      const result = await this.onboardingCollection.updateOne(
        {
          userId,
          organizationId,
          isComplete: false
        },
        {
          $set: {
            [`stepData.step${stepNumber}`]: stepData,
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount === 1;
    } catch (error) {
      logger.error('❌ Error updating step data:', error);
      return false;
    }
  }

  async completeStep(
    userId: string,
    organizationId: string,
    stepNumber: number,
    stepData: Record<string, any>
  ): Promise<UserOnboardingState | null> {
    try {
      // Validate step data against journey requirements
      const isValid = await this.validateStepData(stepNumber, stepData, organizationId);
      if (!isValid) {
        throw new Error('Step data validation failed');
      }

      const journey = this.getUserJourneySteps(organizationId);
      const currentStep = journey.find(s => s.step === stepNumber);
      
      if (!currentStep) {
        throw new Error('Invalid step number');
      }

      // Determine next step
      const nextStepNumber = stepNumber + 1;
      const isLastStep = nextStepNumber > journey.length;

      const updateData: any = {
        $addToSet: { completedSteps: stepNumber },
        $set: {
          [`stepData.step${stepNumber}`]: stepData,
          currentStep: isLastStep ? stepNumber : nextStepNumber,
          updatedAt: new Date()
        }
      };

      // If it's the last step, mark as complete
      if (isLastStep) {
        updateData.$set.isComplete = true;
        updateData.$set.completedAt = new Date();
        
        // Assign final roles based on completed journey
        const finalRoles = await this.determineFinalRoles(userId, organizationId, stepData);
        updateData.$set.assignedRoles = finalRoles;
      }

      const result = await this.onboardingCollection.findOneAndUpdate(
        {
          userId,
          organizationId,
          isComplete: false
        },
        updateData,
        { returnDocument: 'after' }
      );

      if (result) {
        logger.info(`✅ Step ${stepNumber} completed for user ${userId}`);
        
        // If journey is complete, trigger role assignments
        if (isLastStep) {
          await this.completeOnboarding(userId, organizationId, result);
        }
      }

      return result;
    } catch (error) {
      logger.error('❌ Error completing step:', error);
      throw error;
    }
  }

  async completeOnboarding(
    userId: string,
    organizationId: string,
    onboardingState: UserOnboardingState
  ): Promise<void> {
    try {
      // Here you would typically:
      // 1. Assign final roles to user
      // 2. Remove temporary permissions
      // 3. Send welcome email
      // 4. Create user profile
      // 5. Set up default preferences

      logger.info(`🎉 Onboarding completed for user ${userId} in organization ${organizationId}`);
      
      // You can integrate with RoleModel here to assign roles
      // Example: await roleModel.assignRole({...}, 'system');
      
    } catch (error) {
      logger.error('❌ Error completing onboarding:', error);
      throw error;
    }
  }

  private async validateStepData(
    stepNumber: number,
    stepData: Record<string, any>,
    organizationId: string
  ): Promise<boolean> {
    try {
      const journey = this.getUserJourneySteps(organizationId);
      const step = journey.find(s => s.step === stepNumber);
      
      if (!step) return false;

      // Validate required fields
      for (const field of step.requiredFields) {
        if (!stepData[field]) {
          logger.warn(`❌ Required field missing: ${field} in step ${stepNumber}`);
          return false;
        }
      }

      // Run custom validations
      for (const validation of step.validations) {
        const isValid = await this.runValidation(validation, stepData[validation.field]);
        if (!isValid) {
          logger.warn(`❌ Validation failed: ${validation.message}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('❌ Error validating step data:', error);
      return false;
    }
  }

  private async runValidation(validation: JourneyValidation, value: any): Promise<boolean> {
    try {
      switch (validation.type) {
        case 'required':
          return value !== undefined && value !== null && value !== '';
          
        case 'format':
          // Implement format validations (email, phone, etc.)
          if (validation.rule === 'email') {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          }
          if (validation.rule === 'phone') {
            return /^\+?[\d\s-()]+$/.test(value);
          }
          return true;
          
        case 'custom':
          // Implement custom validation logic
          return true;
          
        default:
          return true;
      }
    } catch (error) {
      logger.error('❌ Error running validation:', error);
      return false;
    }
  }

  private async determineFinalRoles(
    userId: string,
    organizationId: string,
    allStepData: Record<string, any>
  ): Promise<string[]> {
    try {
      // Logic to determine final roles based on completed journey data
      // This would typically involve business rules based on:
      // - Organization type
      // - User's role in organization
      // - Department/team
      // - Responsibilities selected during onboarding
      
      const roles: string[] = [];
      
      // Default role assignment logic
      if (allStepData.step1?.organizationRole === 'admin') {
        roles.push('organization_admin');
      } else if (allStepData.step1?.organizationRole === 'manager') {
        roles.push('organization_manager');
      } else {
        roles.push('organization_user');
      }

      return roles;
    } catch (error) {
      logger.error('❌ Error determining final roles:', error);
      return ['organization_user']; // Fallback to basic user role
    }
  }

  private getTemporaryPermissions(organizationType: OrganizationType): string[] {
    // Basic read permissions during onboarding
    return [
      'org:view',
      'profile:edit',
      'onboarding:access'
    ];
  }

  getUserJourneySteps(organizationId?: string): UserJourneyStep[] {
    // This could be configurable per organization
    // For now, returning a standard journey
    return [
      {
        step: 1,
        name: 'organization_setup',
        description: 'Organization and Role Setup',
        requiredFields: ['organizationRole', 'department', 'reportingManager'],
        optionalFields: ['teamMembers', 'projectAssignments'],
        validations: [
          {
            field: 'organizationRole',
            type: 'required',
            rule: 'required',
            message: 'Organization role is required'
          }
        ],
        nextSteps: ['profile_completion'],
        permissions: ['org:view', 'profile:edit'],
        roleAssignments: ['organization_viewer'] // Temporary role during onboarding
      },
      {
        step: 2,
        name: 'profile_completion',
        description: 'Complete Your Profile',
        requiredFields: ['firstName', 'lastName', 'email', 'phone'],
        optionalFields: ['bio', 'profilePicture', 'timezone', 'language'],
        validations: [
          {
            field: 'email',
            type: 'format',
            rule: 'email',
            message: 'Valid email address required'
          },
          {
            field: 'phone',
            type: 'format',
            rule: 'phone',
            message: 'Valid phone number required'
          }
        ],
        nextSteps: ['security_setup'],
        permissions: ['profile:edit', 'profile:view']
      },
      {
        step: 3,
        name: 'security_setup',
        description: 'Security and Authentication Setup',
        requiredFields: ['passwordConfirmed', 'securityQuestions'],
        optionalFields: ['mfaEnabled', 'backupEmail'],
        validations: [
          {
            field: 'passwordConfirmed',
            type: 'required',
            rule: 'required',
            message: 'Password confirmation required'
          }
        ],
        nextSteps: ['preferences_setup'],
        permissions: ['security:setup', 'mfa:setup']
      },
      {
        step: 4,
        name: 'preferences_setup',
        description: 'Set Your Preferences',
        requiredFields: ['notifications'],
        optionalFields: ['theme', 'language', 'timezone'],
        validations: [],
        nextSteps: ['training_completion'],
        permissions: ['preferences:edit']
      },
      {
        step: 5,
        name: 'training_completion',
        description: 'Complete Required Training',
        requiredFields: ['trainingModulesCompleted', 'complianceAcknowledgment'],
        optionalFields: ['additionalTraining'],
        validations: [
          {
            field: 'complianceAcknowledgment',
            type: 'required',
            rule: 'required',
            message: 'Compliance acknowledgment required'
          }
        ],
        nextSteps: [],
        permissions: ['training:access', 'compliance:view']
      }
    ];
  }

  /**
   * Drop all existing indexes except the default _id_ index
   */
  private async dropAllIndexes(): Promise<void> {
    try {
      const indexes = await this.onboardingCollection.listIndexes().toArray();
      
      for (const index of indexes) {
        // Skip the default _id_ index as it cannot be dropped
        if (index.name !== '_id_') {
          try {
            await this.onboardingCollection.dropIndex(index.name);
            logger.info(`🗑️ Dropped existing user journey index: ${index.name}`);
          } catch (error: any) {
            // Ignore if index doesn't exist
            if (error.code !== 27) { // IndexNotFound
              logger.warn(`⚠️ Failed to drop user journey index ${index.name}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      logger.warn('⚠️ Error listing or dropping user journey indexes:', error);
    }
  }

  async createIndexes(): Promise<void> {
    try {
      // First, drop all existing indexes except _id_
      await this.dropAllIndexes();
      
      const indexOperations = [
        { key: { userId: 1, organizationId: 1 }, options: { unique: true }, name: 'user_org_unique' },
        { key: { userId: 1 }, options: {}, name: 'user_id' },
        { key: { organizationId: 1 }, options: {}, name: 'organization_id' },
        { key: { isComplete: 1 }, options: {}, name: 'is_complete' },
        { key: { currentStep: 1 }, options: {}, name: 'current_step' },
        { key: { startedAt: 1 }, options: {}, name: 'started_at' },
        { key: { completedAt: 1 }, options: {}, name: 'completed_at' }
      ];

      for (const indexOp of indexOperations) {
        try {
          await this.onboardingCollection.createIndex(indexOp.key as any, indexOp.options);
          logger.info(`📊 Created index: ${indexOp.name}`);
        } catch (error: any) {
          logger.error(`❌ Error creating index ${indexOp.name}:`, error);
        }
      }

      logger.info('📊 User journey collection indexes setup completed');
    } catch (error) {
      logger.error('❌ Error in createIndexes method:', error);
    }
  }
}

export default UserJourneyModel;
