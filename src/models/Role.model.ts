import { Collection, ObjectId } from 'mongodb';
import { database } from '../config/database';
import { 
  IRoleDefinition, 
  IRoleHierarchy, 
  IUserRole,
  CreateRoleRequest,
  AssignRoleRequest,
  UpdateRoleRequest,
  RoleAssignmentRule,
  DEFAULT_PLATFORM_ROLES,
  DEFAULT_ORGANIZATION_ROLES,
  ENTITY_ROLE_TEMPLATES,
  ROLE_ASSIGNMENT_RULES,
  OrganizationType,
  RoleLevel,
  UserRole
} from '../types/role.types';
import { logger } from '../utils/logger';

export class RoleModel {
  private rolesCollection: Collection<IRoleDefinition>;
  private hierarchyCollection: Collection<IRoleHierarchy>;
  private userRolesCollection: Collection<IUserRole>;

  constructor() {
    const db = database.getDb();
    this.rolesCollection = db.collection<IRoleDefinition>('roles');
    this.hierarchyCollection = db.collection<IRoleHierarchy>('role_hierarchies');
    this.userRolesCollection = db.collection<IUserRole>('user_roles');
  }

  // Role Definition Management
  async createRole(roleData: CreateRoleRequest, createdBy: string): Promise<IRoleDefinition> {
    try {
      // Check if role already exists
      const query: any = {
        name: roleData.name
      };
      
      if (roleData.organizationId) {
        query.organizationId = roleData.organizationId;
      } else {
        query.organizationId = { $exists: false };
      }
      
      const existingRole = await this.rolesCollection.findOne(query);

      if (existingRole) {
        throw new Error(`Role '${roleData.name}' already exists`);
      }

      const role: IRoleDefinition = {
        id: new ObjectId().toString(),
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        level: roleData.level,
        category: roleData.category,
        permissions: roleData.permissions,
        isDefault: false,
        isSystemRole: false,
        organizationId: roleData.organizationId,
        entityType: roleData.entityType,
        parentRoleId: roleData.parentRoleId,
        childRoles: [],
        restrictions: roleData.restrictions || [],
        metadata: roleData.metadata,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      const result = await this.rolesCollection.insertOne(role);
      
      // Update parent role's child roles if applicable
      if (roleData.parentRoleId) {
        await this.addChildRole(roleData.parentRoleId, role.id);
      }

      logger.info(`🎭 New role created: ${roleData.name} by ${createdBy}`);
      
      return role;
    } catch (error) {
      logger.error('❌ Error creating role:', error);
      throw error;
    }
  }

  async getRoleById(roleId: string): Promise<IRoleDefinition | null> {
    try {
      return await this.rolesCollection.findOne({ 
        $or: [
          { _id: new ObjectId(roleId) },
          { id: roleId }
        ]
      });
    } catch (error) {
      logger.error('❌ Error finding role by ID:', error);
      return null;
    }
  }

  async getRoleByName(name: string, organizationId?: string): Promise<IRoleDefinition | null> {
    try {
      const query: any = { name };
      
      if (organizationId) {
        query.organizationId = organizationId;
      } else {
        query.organizationId = { $exists: false };
      }
      
      return await this.rolesCollection.findOne(query);
    } catch (error) {
      logger.error('❌ Error finding role by name:', error);
      return null;
    }
  }

  async getRolesByOrganization(
    organizationId: string, 
    level?: RoleLevel,
    includeSystemRoles: boolean = true
  ): Promise<IRoleDefinition[]> {
    try {
      const query: any = {
        $or: [
          { organizationId },
          ...(includeSystemRoles ? [{ organizationId: null, isSystemRole: true }] : [])
        ],
        isActive: true
      };

      if (level) {
        query.level = level;
      }

      return await this.rolesCollection
        .find(query)
        .sort({ level: 1, name: 1 })
        .toArray();
    } catch (error) {
      logger.error('❌ Error finding roles by organization:', error);
      return [];
    }
  }

  async getPlatformRoles(): Promise<IRoleDefinition[]> {
    try {
      return await this.rolesCollection
        .find({
          level: 'platform',
          isActive: true
        })
        .sort({ name: 1 })
        .toArray();
    } catch (error) {
      logger.error('❌ Error finding platform roles:', error);
      return [];
    }
  }

  async updateRole(roleId: string, updates: UpdateRoleRequest, updatedBy: string): Promise<IRoleDefinition | null> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: new Date(),
        updatedBy
      };

      const result = await this.rolesCollection.findOneAndUpdate(
        { 
          $or: [
            { _id: new ObjectId(roleId) },
            { id: roleId }
          ]
        },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (result) {
        logger.info(`🎭 Role updated: ${roleId} by ${updatedBy}`);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error updating role:', error);
      throw error;
    }
  }

  async deleteRole(roleId: string, deletedBy: string): Promise<boolean> {
    try {
      // Check if role is assigned to any users
      const assignedUsers = await this.userRolesCollection.countDocuments({
        roleId,
        isActive: true
      });

      if (assignedUsers > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      // Check if role is a system role
      const role = await this.getRoleById(roleId);
      if (role?.isSystemRole) {
        throw new Error('Cannot delete system role');
      }

      const result = await this.rolesCollection.updateOne(
        { 
          $or: [
            { _id: new ObjectId(roleId) },
            { id: roleId }
          ]
        },
        { 
          $set: { 
            isActive: false,
            updatedAt: new Date(),
            updatedBy: deletedBy
          }
        }
      );

      if (result.modifiedCount === 1) {
        logger.info(`🎭 Role deleted: ${roleId} by ${deletedBy}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('❌ Error deleting role:', error);
      throw error;
    }
  }

  // Role Hierarchy Management
  async createOrganizationHierarchy(organizationId: string, createdBy: string): Promise<IRoleHierarchy> {
    try {
      // Get default roles for organization
      const defaultRoles = await this.getRolesByOrganization(organizationId, undefined, true);
      
      const hierarchy: IRoleHierarchy = {
        organizationId,
        hierarchyTree: this.buildHierarchyTree(defaultRoles),
        defaultRoles: defaultRoles.filter(r => r.isDefault).map(r => r.id),
        allowedRoles: defaultRoles.map(r => r.id),
        customRoles: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.hierarchyCollection.insertOne(hierarchy);
      
      logger.info(`🏗️ Role hierarchy created for organization: ${organizationId}`);
      
      return hierarchy;
    } catch (error) {
      logger.error('❌ Error creating role hierarchy:', error);
      throw error;
    }
  }

  async getOrganizationHierarchy(organizationId: string): Promise<IRoleHierarchy | null> {
    try {
      return await this.hierarchyCollection.findOne({ organizationId });
    } catch (error) {
      logger.error('❌ Error getting organization hierarchy:', error);
      return null;
    }
  }

  private buildHierarchyTree(roles: IRoleDefinition[]): any[] {
    const roleMap = new Map(roles.map(role => [role.id, role]));
    const tree: any[] = [];
    const visited = new Set<string>();

    // Build hierarchy tree based on role levels and permissions
    const levelOrder = ['platform', 'organization_super', 'organization_admin', 'organization_standard', 'entity_specific'];
    
    levelOrder.forEach(level => {
      const levelRoles = roles.filter(role => role.level === level);
      
      levelRoles.forEach(role => {
        if (!visited.has(role.id)) {
          const node = {
            roleId: role.id,
            level: levelOrder.indexOf(level),
            children: this.findChildRoles(role, roles, visited),
            permissions: role.permissions,
            canManage: this.calculateManageableRoles(role, roles),
            canAssign: this.calculateAssignableRoles(role, roles)
          };
          
          tree.push(node);
          visited.add(role.id);
        }
      });
    });

    return tree;
  }

  private findChildRoles(parentRole: IRoleDefinition, allRoles: IRoleDefinition[], visited: Set<string>): any[] {
    const children: any[] = [];
    const levelOrder = ['platform', 'organization_super', 'organization_admin', 'organization_standard', 'entity_specific'];
    const parentLevelIndex = levelOrder.indexOf(parentRole.level);

    allRoles.forEach(role => {
      const roleLevelIndex = levelOrder.indexOf(role.level);
      
      if (roleLevelIndex > parentLevelIndex && !visited.has(role.id)) {
        const child = {
          roleId: role.id,
          level: roleLevelIndex,
          children: this.findChildRoles(role, allRoles, visited),
          permissions: role.permissions,
          canManage: this.calculateManageableRoles(role, allRoles),
          canAssign: this.calculateAssignableRoles(role, allRoles)
        };
        
        children.push(child);
        visited.add(role.id);
      }
    });

    return children;
  }

  private calculateManageableRoles(role: IRoleDefinition, allRoles: IRoleDefinition[]): string[] {
    const rules = ROLE_ASSIGNMENT_RULES.find(rule => rule.sourceRoleId === role.name);
    if (!rules) return [];

    if (rules.canAssignRoles.includes('*')) {
      return allRoles.map(r => r.id);
    }

    return allRoles
      .filter(r => rules.canAssignRoles.includes(r.name))
      .map(r => r.id);
  }

  private calculateAssignableRoles(role: IRoleDefinition, allRoles: IRoleDefinition[]): string[] {
    // Same as manageable for now, can be customized based on business rules
    return this.calculateManageableRoles(role, allRoles);
  }

  // User Role Assignment
  async assignRole(assignmentData: AssignRoleRequest, assignedBy: string): Promise<IUserRole> {
    try {
      // Validate role exists and is active
      const role = await this.getRoleById(assignmentData.roleId);
      if (!role || !role.isActive) {
        throw new Error('Role not found or inactive');
      }

      // Check if user already has this role
      const existingAssignment = await this.userRolesCollection.findOne({
        userId: assignmentData.userId,
        roleId: assignmentData.roleId,
        organizationId: assignmentData.organizationId,
        isActive: true
      });

      if (existingAssignment) {
        throw new Error('User already has this role assigned');
      }

      // Validate assignment permissions
      await this.validateRoleAssignment(assignedBy, assignmentData.roleId, assignmentData.organizationId);

      const userRole: IUserRole = {
        userId: assignmentData.userId,
        roleId: assignmentData.roleId,
        organizationId: assignmentData.organizationId,
        assignedBy,
        assignedAt: new Date(),
        expiresAt: assignmentData.expiresAt,
        isTemporary: assignmentData.isTemporary || false,
        isActive: true,
        restrictions: assignmentData.restrictions || [],
        metadata: assignmentData.metadata
      };

      await this.userRolesCollection.insertOne(userRole);
      
      logger.info(`🎭 Role assigned: ${assignmentData.roleId} to user ${assignmentData.userId} by ${assignedBy}`);
      
      return userRole;
    } catch (error) {
      logger.error('❌ Error assigning role:', error);
      throw error;
    }
  }

  async revokeRole(userId: string, roleId: string, organizationId: string, revokedBy: string): Promise<boolean> {
    try {
      const result = await this.userRolesCollection.updateOne(
        {
          userId,
          roleId,
          organizationId,
          isActive: true
        },
        {
          $set: {
            isActive: false,
            revokedAt: new Date(),
            revokedBy
          }
        }
      );

      if (result.modifiedCount === 1) {
        logger.info(`🎭 Role revoked: ${roleId} from user ${userId} by ${revokedBy}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('❌ Error revoking role:', error);
      throw error;
    }
  }

  async getUserRoles(userId: string, organizationId?: string): Promise<IUserRole[]> {
    try {
      const query: any = {
        userId,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      };

      if (organizationId) {
        query.organizationId = organizationId;
      }

      return await this.userRolesCollection
        .find(query)
        .sort({ assignedAt: -1 })
        .toArray();
    } catch (error) {
      logger.error('❌ Error getting user roles:', error);
      return [];
    }
  }

  async getUserPermissions(userId: string, organizationId?: string): Promise<string[]> {
    try {
      const userRoles = await this.getUserRoles(userId, organizationId);
      const roleIds = userRoles.map(ur => ur.roleId);
      
      const roles = await this.rolesCollection
        .find({
          $or: [
            { _id: { $in: roleIds.map(id => new ObjectId(id)) } },
            { id: { $in: roleIds } }
          ],
          isActive: true
        })
        .toArray();

      const allPermissions = new Set<string>();
      roles.forEach(role => {
        role.permissions.forEach(permission => allPermissions.add(permission));
      });

      return Array.from(allPermissions);
    } catch (error) {
      logger.error('❌ Error getting user permissions:', error);
      return [];
    }
  }

  async hasPermission(userId: string, permission: string, organizationId?: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId, organizationId);
      return permissions.includes(permission);
    } catch (error) {
      logger.error('❌ Error checking permission:', error);
      return false;
    }
  }

  async canUserAssignRole(assignerUserId: string, targetRoleId: string, organizationId: string): Promise<boolean> {
    try {
      const assignerRoles = await this.getUserRoles(assignerUserId, organizationId);
      const targetRole = await this.getRoleById(targetRoleId);
      
      if (!targetRole) return false;

      for (const userRole of assignerRoles) {
        const role = await this.getRoleById(userRole.roleId);
        if (!role) continue;

        const rules = ROLE_ASSIGNMENT_RULES.find(rule => rule.sourceRoleId === role.name);
        if (rules && (rules.canAssignRoles.includes('*') || rules.canAssignRoles.includes(targetRole.name))) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('❌ Error checking role assignment permission:', error);
      return false;
    }
  }

  private async validateRoleAssignment(assignerUserId: string, targetRoleId: string, organizationId: string): Promise<void> {
    const canAssign = await this.canUserAssignRole(assignerUserId, targetRoleId, organizationId);
    if (!canAssign) {
      throw new Error('Insufficient permissions to assign this role');
    }
  }

  private async addChildRole(parentRoleId: string, childRoleId: string): Promise<void> {
    try {
      await this.rolesCollection.updateOne(
        { 
          $or: [
            { _id: new ObjectId(parentRoleId) },
            { id: parentRoleId }
          ]
        },
        { 
          $addToSet: { childRoles: childRoleId },
          $set: { updatedAt: new Date() }
        }
      );
    } catch (error) {
      logger.error('❌ Error adding child role:', error);
    }
  }

  // Initialization and Seeding
  async initializeDefaultRoles(): Promise<void> {
    try {
      logger.info('🎭 Initializing default roles...');

      // Initialize platform roles
      for (const roleData of DEFAULT_PLATFORM_ROLES) {
        const existingRole = await this.getRoleByName(roleData.name!);
        if (!existingRole) {
          const fullRoleData: CreateRoleRequest = {
            name: roleData.name!,
            displayName: roleData.displayName!,
            description: roleData.description!,
            level: roleData.level!,
            category: roleData.category!,
            permissions: roleData.permissions!,
            restrictions: roleData.restrictions || []
          };
          
          await this.createRole(fullRoleData, 'system');
        }
      }

      // Initialize organization roles
      for (const roleData of DEFAULT_ORGANIZATION_ROLES) {
        const existingRole = await this.getRoleByName(roleData.name!);
        if (!existingRole) {
          const fullRoleData: CreateRoleRequest = {
            name: roleData.name!,
            displayName: roleData.displayName!,
            description: roleData.description!,
            level: roleData.level!,
            category: roleData.category!,
            permissions: roleData.permissions!,
            restrictions: roleData.restrictions || []
          };
          
          await this.createRole(fullRoleData, 'system');
        }
      }

      logger.info('✅ Default roles initialized successfully');
    } catch (error) {
      logger.error('❌ Error initializing default roles:', error);
      throw error;
    }
  }

  async initializeOrganizationRoles(organizationId: string, organizationType: OrganizationType): Promise<void> {
    try {
      logger.info(`🎭 Initializing roles for organization ${organizationId} (${organizationType})`);

      const entityRoles = ENTITY_ROLE_TEMPLATES[organizationType] || [];
      
      for (const roleData of entityRoles) {
        const existingRole = await this.getRoleByName(roleData.name!, organizationId);
        if (!existingRole) {
          const fullRoleData: CreateRoleRequest = {
            name: roleData.name!,
            displayName: roleData.displayName!,
            description: roleData.description!,
            level: roleData.level!,
            category: roleData.category!,
            permissions: roleData.permissions!,
            organizationId,
            entityType: organizationType,
            restrictions: roleData.restrictions || []
          };
          
          await this.createRole(fullRoleData, 'system');
        }
      }

      // Create organization hierarchy
      const existingHierarchy = await this.getOrganizationHierarchy(organizationId);
      if (!existingHierarchy) {
        await this.createOrganizationHierarchy(organizationId, 'system');
      }

      logger.info(`✅ Organization roles initialized for ${organizationId}`);
    } catch (error) {
      logger.error('❌ Error initializing organization roles:', error);
      throw error;
    }
  }

  // Index creation
  async createIndexes(): Promise<void> {
    try {
      const indexOperations = [
        // Roles collection indexes
        { collection: this.rolesCollection, key: { name: 1, organizationId: 1 }, options: { unique: true }, name: 'roles_name_org' },
        { collection: this.rolesCollection, key: { level: 1 }, options: {}, name: 'roles_level' },
        { collection: this.rolesCollection, key: { category: 1 }, options: {}, name: 'roles_category' },
        { collection: this.rolesCollection, key: { organizationId: 1 }, options: {}, name: 'roles_organization' },
        { collection: this.rolesCollection, key: { isSystemRole: 1 }, options: {}, name: 'roles_system' },
        { collection: this.rolesCollection, key: { isActive: 1 }, options: {}, name: 'roles_active' },

        // Role hierarchy collection indexes
        { collection: this.hierarchyCollection, key: { organizationId: 1 }, options: { unique: true }, name: 'hierarchy_organization' },

        // User roles collection indexes
        { collection: this.userRolesCollection, key: { userId: 1, organizationId: 1 }, options: {}, name: 'user_roles_user_org' },
        { collection: this.userRolesCollection, key: { roleId: 1 }, options: {}, name: 'user_roles_role' },
        { collection: this.userRolesCollection, key: { isActive: 1 }, options: {}, name: 'user_roles_active' },
        { collection: this.userRolesCollection, key: { expiresAt: 1 }, options: {}, name: 'user_roles_expires' },
        { collection: this.userRolesCollection, key: { userId: 1, roleId: 1, organizationId: 1 }, options: { unique: true }, name: 'user_roles_unique' }
      ];

      for (const indexOp of indexOperations) {
        try {
          await indexOp.collection.createIndex(indexOp.key as any, indexOp.options);
          logger.info(`📊 Created index: ${indexOp.name}`);
        } catch (error: any) {
          if (error.code === 11000 || error.codeName === 'DuplicateKey') {
            logger.warn(`⚠️ Index ${indexOp.name} already exists, skipping...`);
          } else {
            logger.error(`❌ Error creating index ${indexOp.name}:`, error);
          }
        }
      }

      logger.info('📊 Role collection indexes setup completed');
    } catch (error) {
      logger.error('❌ Error in createIndexes method:', error);
    }
  }
}

export default RoleModel;
