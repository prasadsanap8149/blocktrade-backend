import { Request, Response } from 'express';
import { RoleModel } from '../models/Role.model';
import { UserJourneyModel } from '../models/UserJourney.model';
import { 
  CreateRoleRequest, 
  AssignRoleRequest, 
  UpdateRoleRequest,
  OrganizationType,
  RoleLevel
} from '../types/role.types';
import { logger } from '../utils/logger';

export class RoleController {
  private roleModel: RoleModel;
  private journeyModel: UserJourneyModel;

  constructor() {
    this.roleModel = new RoleModel();
    this.journeyModel = new UserJourneyModel();
  }

  // Role Management Endpoints

  /**
   * Create a new role
   * POST /api/roles
   */
  createRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const roleData: CreateRoleRequest = req.body;
      const { userId } = req.user!;

      // Validate permissions to create role
      const canCreateRole = await this.roleModel.hasPermission(
        userId, 
        'org:role_create', 
        roleData.organizationId
      );

      if (!canCreateRole) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create role'
        });
        return;
      }

      const role = await this.roleModel.createRole(roleData, userId);

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: { role }
      });

      logger.info(`🎭 Role created: ${roleData.name} by user ${userId}`);
    } catch (error: any) {
      logger.error('❌ Error in createRole:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create role'
      });
    }
  };

  /**
   * Get roles for organization
   * GET /api/roles?organizationId=xxx&level=xxx&includeSystem=true
   */
  getRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId, level, includeSystem = 'true' } = req.query;
      const { userId, organizationId: userOrgId } = req.user!;

      // Use user's organization if not specified and user is not platform admin
      const targetOrgId = organizationId as string || userOrgId;

      // Check if user can view roles for this organization
      const canViewRoles = await this.roleModel.hasPermission(
        userId, 
        'org:role_manage', 
        targetOrgId
      );

      if (!canViewRoles) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view roles'
        });
        return;
      }

      const roles = await this.roleModel.getRolesByOrganization(
        targetOrgId,
        level as RoleLevel,
        includeSystem === 'true'
      );

      res.json({
        success: true,
        data: { 
          roles,
          count: roles.length
        }
      });
    } catch (error: any) {
      logger.error('❌ Error in getRoles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles'
      });
    }
  };

  /**
   * Get platform roles (admin only)
   * GET /api/roles/platform
   */
  getPlatformRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.user!;

      // Check platform admin permissions
      const isPlatformAdmin = await this.roleModel.hasPermission(
        userId, 
        'platform:role_manage'
      );

      if (!isPlatformAdmin) {
        res.status(403).json({
          success: false,
          message: 'Platform admin access required'
        });
        return;
      }

      const roles = await this.roleModel.getPlatformRoles();

      res.json({
        success: true,
        data: { 
          roles,
          count: roles.length
        }
      });
    } catch (error: any) {
      logger.error('❌ Error in getPlatformRoles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch platform roles'
      });
    }
  };

  /**
   * Get role hierarchy for organization
   * GET /api/roles/hierarchy?organizationId=xxx
   */
  getRoleHierarchy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.query;
      const { userId, organizationId: userOrgId } = req.user!;

      const targetOrgId = organizationId as string || userOrgId;

      const canViewHierarchy = await this.roleModel.hasPermission(
        userId, 
        'org:role_manage', 
        targetOrgId
      );

      if (!canViewHierarchy) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view role hierarchy'
        });
        return;
      }

      const hierarchy = await this.roleModel.getOrganizationHierarchy(targetOrgId);

      if (!hierarchy) {
        res.status(404).json({
          success: false,
          message: 'Role hierarchy not found for organization'
        });
        return;
      }

      res.json({
        success: true,
        data: { hierarchy }
      });
    } catch (error: any) {
      logger.error('❌ Error in getRoleHierarchy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch role hierarchy'
      });
    }
  };

  /**
   * Update a role
   * PUT /api/roles/:roleId
   */
  updateRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId } = req.params;
      const updates: UpdateRoleRequest = req.body;
      const { userId } = req.user!;

      // Get role to check permissions
      const role = await this.roleModel.getRoleById(roleId);
      if (!role) {
        res.status(404).json({
          success: false,
          message: 'Role not found'
        });
        return;
      }

      // Check if user can update this role
      const canUpdateRole = await this.roleModel.hasPermission(
        userId, 
        'org:role_manage', 
        role.organizationId || undefined
      );

      if (!canUpdateRole) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update role'
        });
        return;
      }

      const updatedRole = await this.roleModel.updateRole(roleId, updates, userId);

      if (!updatedRole) {
        res.status(404).json({
          success: false,
          message: 'Role not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: { role: updatedRole }
      });
    } catch (error: any) {
      logger.error('❌ Error in updateRole:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update role'
      });
    }
  };

  /**
   * Delete a role
   * DELETE /api/roles/:roleId
   */
  deleteRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId } = req.params;
      const { userId } = req.user!;

      // Get role to check permissions
      const role = await this.roleModel.getRoleById(roleId);
      if (!role) {
        res.status(404).json({
          success: false,
          message: 'Role not found'
        });
        return;
      }

      // Check if user can delete this role
      const canDeleteRole = await this.roleModel.hasPermission(
        userId, 
        'org:role_create', // Create permission usually includes delete
        role.organizationId || undefined
      );

      if (!canDeleteRole) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete role'
        });
        return;
      }

      const deleted = await this.roleModel.deleteRole(roleId, userId);

      if (!deleted) {
        res.status(400).json({
          success: false,
          message: 'Failed to delete role'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error: any) {
      logger.error('❌ Error in deleteRole:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete role'
      });
    }
  };

  // Role Assignment Endpoints

  /**
   * Assign role to user
   * POST /api/roles/assign
   */
  assignRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const assignmentData: AssignRoleRequest = req.body;
      const { userId } = req.user!;

      // Check if user can assign this role
      const canAssign = await this.roleModel.canUserAssignRole(
        userId, 
        assignmentData.roleId, 
        assignmentData.organizationId
      );

      if (!canAssign) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to assign this role'
        });
        return;
      }

      const userRole = await this.roleModel.assignRole(assignmentData, userId);

      res.status(201).json({
        success: true,
        message: 'Role assigned successfully',
        data: { userRole }
      });

      logger.info(`🎭 Role ${assignmentData.roleId} assigned to user ${assignmentData.userId} by ${userId}`);
    } catch (error: any) {
      logger.error('❌ Error in assignRole:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to assign role'
      });
    }
  };

  /**
   * Revoke role from user
   * DELETE /api/roles/revoke
   */
  revokeRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId: targetUserId, roleId, organizationId } = req.body;
      const { userId } = req.user!;

      // Check if user can revoke this role
      const canRevoke = await this.roleModel.canUserAssignRole(
        userId, 
        roleId, 
        organizationId
      );

      if (!canRevoke) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to revoke this role'
        });
        return;
      }

      const revoked = await this.roleModel.revokeRole(targetUserId, roleId, organizationId, userId);

      if (!revoked) {
        res.status(404).json({
          success: false,
          message: 'Role assignment not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Role revoked successfully'
      });

      logger.info(`🎭 Role ${roleId} revoked from user ${targetUserId} by ${userId}`);
    } catch (error: any) {
      logger.error('❌ Error in revokeRole:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to revoke role'
      });
    }
  };

  /**
   * Get user roles
   * GET /api/roles/user/:userId?organizationId=xxx
   */
  getUserRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId: targetUserId } = req.params;
      const { organizationId } = req.query;
      const { userId, organizationId: userOrgId } = req.user!;

      const targetOrgId = organizationId as string || userOrgId;

      // Check if user can view roles for this user
      const canViewUserRoles = await this.roleModel.hasPermission(
        userId, 
        'org:user_view', 
        targetOrgId
      );

      // Users can always view their own roles
      if (!canViewUserRoles && userId !== targetUserId) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view user roles'
        });
        return;
      }

      const userRoles = await this.roleModel.getUserRoles(targetUserId, targetOrgId);
      const permissions = await this.roleModel.getUserPermissions(targetUserId, targetOrgId);

      res.json({
        success: true,
        data: { 
          userRoles,
          permissions,
          count: userRoles.length
        }
      });
    } catch (error: any) {
      logger.error('❌ Error in getUserRoles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user roles'
      });
    }
  };

  // User Journey Endpoints

  /**
   * Start user onboarding journey
   * POST /api/roles/journey/start
   */
  startUserJourney = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId, organizationType } = req.body;
      const { userId, organizationId } = req.user!;

      // Check if user can start journey for another user
      if (targetUserId && targetUserId !== userId) {
        const canManageUsers = await this.roleModel.hasPermission(
          userId, 
          'org:user_manage', 
          organizationId
        );

        if (!canManageUsers) {
          res.status(403).json({
            success: false,
            message: 'Insufficient permissions to start journey for another user'
          });
          return;
        }
      }

      const finalUserId = targetUserId || userId;
      const journey = await this.journeyModel.startUserJourney(
        finalUserId, 
        organizationId, 
        organizationType
      );

      res.status(201).json({
        success: true,
        message: 'User journey started successfully',
        data: { journey }
      });

      logger.info(`🚀 User journey started for ${finalUserId} by ${userId}`);
    } catch (error: any) {
      logger.error('❌ Error in startUserJourney:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to start user journey'
      });
    }
  };

  /**
   * Get user journey status
   * GET /api/roles/journey/:userId
   */
  getUserJourneyStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId: targetUserId } = req.params;
      const { userId, organizationId } = req.user!;

      // Users can view their own journey, or admin can view any
      if (targetUserId !== userId) {
        const canViewJourney = await this.roleModel.hasPermission(
          userId, 
          'org:user_view', 
          organizationId
        );

        if (!canViewJourney) {
          res.status(403).json({
            success: false,
            message: 'Insufficient permissions to view user journey'
          });
          return;
        }
      }

      const onboardingState = await this.journeyModel.getOnboardingState(targetUserId, organizationId);

      if (!onboardingState) {
        res.status(404).json({
          success: false,
          message: 'No active journey found for user'
        });
        return;
      }

      // Get journey steps for context
      const journeySteps = this.journeyModel.getUserJourneySteps(organizationId);

      res.json({
        success: true,
        data: { 
          onboardingState,
          journeySteps,
          currentStepInfo: journeySteps.find(s => s.step === onboardingState.currentStep)
        }
      });
    } catch (error: any) {
      logger.error('❌ Error in getUserJourneyStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user journey status'
      });
    }
  };

  /**
   * Complete a journey step
   * POST /api/roles/journey/step/:stepNumber
   */
  completeJourneyStep = async (req: Request, res: Response): Promise<void> => {
    try {
      const { stepNumber } = req.params;
      const { stepData, targetUserId } = req.body;
      const { userId, organizationId } = req.user!;

      const finalUserId = targetUserId || userId;

      // Check permissions if completing step for another user
      if (targetUserId && targetUserId !== userId) {
        const canManageJourney = await this.roleModel.hasPermission(
          userId, 
          'org:user_manage', 
          organizationId
        );

        if (!canManageJourney) {
          res.status(403).json({
            success: false,
            message: 'Insufficient permissions to complete step for another user'
          });
          return;
        }
      }

      const updatedJourney = await this.journeyModel.completeStep(
        finalUserId, 
        organizationId, 
        parseInt(stepNumber), 
        stepData
      );

      if (!updatedJourney) {
        res.status(404).json({
          success: false,
          message: 'Journey not found or step could not be completed'
        });
        return;
      }

      res.json({
        success: true,
        message: `Step ${stepNumber} completed successfully`,
        data: { journey: updatedJourney }
      });

      logger.info(`✅ Journey step ${stepNumber} completed for user ${finalUserId}`);
    } catch (error: any) {
      logger.error('❌ Error in completeJourneyStep:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to complete journey step'
      });
    }
  };

  // System Administration Endpoints

  /**
   * Initialize organization roles
   * POST /api/roles/init-organization
   */
  initializeOrganizationRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId, organizationType } = req.body;
      const { userId } = req.user!;

      // Check platform admin permissions
      const isPlatformAdmin = await this.roleModel.hasPermission(
        userId, 
        'platform:org_manage'
      );

      if (!isPlatformAdmin) {
        res.status(403).json({
          success: false,
          message: 'Platform admin access required'
        });
        return;
      }

      await this.roleModel.initializeOrganizationRoles(organizationId, organizationType as OrganizationType);

      res.json({
        success: true,
        message: 'Organization roles initialized successfully'
      });

      logger.info(`🏗️ Organization roles initialized for ${organizationId} by ${userId}`);
    } catch (error: any) {
      logger.error('❌ Error in initializeOrganizationRoles:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to initialize organization roles'
      });
    }
  };

  /**
   * Get journey configuration
   * GET /api/roles/journey/config?organizationId=xxx
   */
  getJourneyConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.query;
      const { userId, organizationId: userOrgId } = req.user!;

      const targetOrgId = organizationId as string || userOrgId;

      const canViewConfig = await this.roleModel.hasPermission(
        userId, 
        'org:role_manage', 
        targetOrgId
      );

      if (!canViewConfig) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view journey configuration'
        });
        return;
      }

      const journeySteps = this.journeyModel.getUserJourneySteps(targetOrgId);

      res.json({
        success: true,
        data: { 
          journeySteps,
          totalSteps: journeySteps.length
        }
      });
    } catch (error: any) {
      logger.error('❌ Error in getJourneyConfiguration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch journey configuration'
      });
    }
  };
}

export default RoleController;
