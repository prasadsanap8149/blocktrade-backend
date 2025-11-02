import { database } from '../config/database';
import { UserModel } from '../models/User.model';
import { RoleModel } from '../models/Role.model';
import { UserJourneyModel } from '../models/UserJourney.model';
import { OrganizationModel } from '../models/Organization.model';
import { logger } from '../utils/logger';

export class DatabaseInitializer {
  private userModel?: UserModel;
  private roleModel?: RoleModel;
  private journeyModel?: UserJourneyModel;
  private organizationModel?: OrganizationModel;

  constructor() {
    // Models will be initialized lazily when first accessed
  }

  private getUserModel(): UserModel {
    if (!this.userModel) {
      this.userModel = new UserModel();
    }
    return this.userModel;
  }

  private getRoleModel(): RoleModel {
    if (!this.roleModel) {
      this.roleModel = new RoleModel();
    }
    return this.roleModel;
  }

  private getJourneyModel(): UserJourneyModel {
    if (!this.journeyModel) {
      this.journeyModel = new UserJourneyModel();
    }
    return this.journeyModel;
  }

  private getOrganizationModel(): OrganizationModel {
    if (!this.organizationModel) {
      this.organizationModel = new OrganizationModel();
    }
    return this.organizationModel;
  }

  /**
   * Initialize the complete database with roles, indexes, and default data
   */
  async initializeDatabase(): Promise<void> {
    try {
      logger.info('🚀 Starting database initialization...');

      // Connect to database first
      await database.connect();
      
      // Initialize all collections and indexes
      await this.createIndexes();
      
      // Initialize default roles
      await this.initializeRoles();
      
      // Create default platform admin if it doesn't exist
      await this.createDefaultPlatformAdmin();
      
      logger.info('✅ Database initialization completed successfully');
    } catch (error) {
      logger.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create all necessary database indexes
   */
  private async createIndexes(): Promise<void> {
    try {
      logger.info('📊 Creating database indexes...');

      await Promise.all([
        this.getUserModel().createIndexes(),
        this.getRoleModel().createIndexes(),
        this.getJourneyModel().createIndexes(),
        this.getOrganizationModel().createIndexes()
      ]);

      logger.info('✅ All indexes created successfully');
    } catch (error) {
      logger.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  /**
   * Initialize all default roles
   */
  private async initializeRoles(): Promise<void> {
    try {
      logger.info('🎭 Initializing default roles...');
      
      await this.getRoleModel().initializeDefaultRoles();
      
      logger.info('✅ Default roles initialized successfully');
    } catch (error) {
      logger.error('❌ Error initializing roles:', error);
      throw error;
    }
  }

  /**
   * Create default platform admin user if none exists
   */
  private async createDefaultPlatformAdmin(): Promise<void> {
    try {
      logger.info('👤 Checking for platform admin...');

      // Check if any platform admin exists
      const existingPlatformAdmin = await this.getUserModel().findByUsernameOrEmail('platform_admin', 'admin@blocktrade.com');
      
      if (existingPlatformAdmin) {
        logger.info('ℹ️ Platform admin already exists, skipping creation');
        return;
      }

      // Create default platform admin
      const adminData = {
        username: 'platform_admin',
        email: 'admin@blocktrade.com',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'BlockTrade@2024!',
        confirmPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'BlockTrade@2024!',
        firstName: 'Platform',
        lastName: 'Administrator',
        role: 'platform_super_admin' as any,
        organizationId: 'platform',
        organizationName: 'BlockTrade Platform',
        organizationType: 'bank' as any,
        acceptTerms: true,
        agreeToMarketing: false
      };

      const adminUser = await this.getUserModel().createUser(adminData);
      
      // Verify email immediately for platform admin
      await this.getUserModel().verifyEmail(adminUser.id);
      
      // Assign platform super admin role
      const platformSuperAdminRole = await this.getRoleModel().getRoleByName('platform_super_admin');
      if (platformSuperAdminRole) {
        await this.getRoleModel().assignRole({
          userId: adminUser.id,
          roleId: platformSuperAdminRole.id,
          organizationId: 'platform'
        }, 'system');
      }

      logger.info('✅ Default platform admin created successfully');
      logger.warn('⚠️ Please change the default admin password immediately after first login');
    } catch (error) {
      logger.error('❌ Error creating default platform admin:', error);
      throw error;
    }
  }

  /**
   * Initialize roles for a new organization
   */
  async initializeNewOrganization(organizationId: string, organizationType: string): Promise<void> {
    try {
      logger.info(`🏢 Initializing new organization: ${organizationId} (${organizationType})`);

      // Initialize organization-specific roles
      await this.getRoleModel().initializeOrganizationRoles(
        organizationId, 
        organizationType as any
      );

      logger.info(`✅ Organization ${organizationId} initialized successfully`);
    } catch (error) {
      logger.error(`❌ Error initializing organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Create the first super admin for an organization
   */
  async createOrganizationSuperAdmin(
    organizationId: string,
    adminData: {
      username: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationType: string;
      organizationName: string;
    }
  ): Promise<string> {
    try {
      logger.info(`👤 Creating super admin for organization ${organizationId}`);

      // Create user
      const userCreateData = {
        ...adminData,
        confirmPassword: adminData.password,
        role: 'organization_super_admin' as any,
        organizationId,
        organizationType: adminData.organizationType as any,
        acceptTerms: true,
        agreeToMarketing: false
      };

      const user = await this.getUserModel().createUser(userCreateData);

      // Get organization super admin role
      const superAdminRole = await this.getRoleModel().getRoleByName('organization_super_admin');
      if (superAdminRole) {
        await this.getRoleModel().assignRole({
          userId: user.id,
          roleId: superAdminRole.id,
          organizationId
        }, 'system');
      }

      // Start user journey for the admin
      await this.getJourneyModel().startUserJourney(
        user.id,
        organizationId,
        adminData.organizationType as any
      );

      logger.info(`✅ Organization super admin created for ${organizationId}`);
      return user.id;
    } catch (error) {
      logger.error(`❌ Error creating organization super admin:`, error);
      throw error;
    }
  }

  /**
   * Seed demo data for development/testing
   */
  async seedDemoData(): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('⚠️ Demo data seeding is disabled in production');
        return;
      }

      logger.info('🌱 Seeding demo data...');

      // Create demo organizations
      await this.createDemoOrganizations();
      
      // Create demo users
      await this.createDemoUsers();

      logger.info('✅ Demo data seeded successfully');
    } catch (error) {
      logger.error('❌ Error seeding demo data:', error);
      throw error;
    }
  }

  private async createDemoOrganizations(): Promise<void> {
    const demoOrgs = [
      {
        id: 'demo_bank_001',
        name: 'Demo International Bank',
        type: 'bank',
        email: 'contact@demobank.com'
      },
      {
        id: 'demo_corp_001',
        name: 'Demo Trading Corporation',
        type: 'corporate',
        email: 'admin@democorp.com'
      },
      {
        id: 'demo_nbfc_001',
        name: 'Demo Financial Services',
        type: 'nbfc',
        email: 'info@demonbfc.com'
      }
    ];

    for (const org of demoOrgs) {
      try {
        // Check if organization already exists
        const existingOrg = await this.getOrganizationModel().findByName(org.name);
        if (existingOrg) {
          continue;
        }

        // Create organization
        await this.getOrganizationModel().createOrganization({
          name: org.name,
          type: org.type as any,
          registrationNumber: `DEMO${org.id.toUpperCase()}`,
          countryCode: 'US',
          address: {
            street: '123 Demo Street',
            city: 'Demo City',
            state: 'Demo State',
            country: 'Demo Country',
            postalCode: '12345'
          },
          contactPerson: {
            name: 'Demo Contact',
            email: org.email,
            phone: '+1-555-0199',
            designation: 'Administrator'
          }
        });

        // Initialize organization roles
        await this.initializeNewOrganization(org.id, org.type);

        logger.info(`✅ Demo organization created: ${org.name}`);
      } catch (error) {
        logger.error(`❌ Error creating demo organization ${org.name}:`, error);
      }
    }
  }

  private async createDemoUsers(): Promise<void> {
    const demoUsers = [
      {
        organizationId: 'demo_bank_001',
        username: 'bank_admin',
        email: 'admin@demobank.com',
        firstName: 'Bank',
        lastName: 'Administrator',
        role: 'organization_super_admin',
        organizationType: 'bank'
      },
      {
        organizationId: 'demo_bank_001',
        username: 'bank_officer',
        email: 'officer@demobank.com',
        firstName: 'Bank',
        lastName: 'Officer',
        role: 'bank_officer',
        organizationType: 'bank'
      },
      {
        organizationId: 'demo_corp_001',
        username: 'corp_admin',
        email: 'admin@democorp.com',
        firstName: 'Corporate',
        lastName: 'Administrator',
        role: 'organization_super_admin',
        organizationType: 'corporate'
      }
    ];

    for (const userData of demoUsers) {
      try {
        // Check if user already exists
        const existingUser = await this.getUserModel().findByUsernameOrEmail(userData.username, userData.email);
        if (existingUser) {
          continue;
        }

        // Create user
        const userCreateData = {
          ...userData,
          password: 'Demo@2024!',
          confirmPassword: 'Demo@2024!',
          role: userData.role as any,
          organizationType: userData.organizationType as any,
          organizationName: userData.organizationId === 'demo_bank_001' ? 'Demo International Bank' : 
                          userData.organizationId === 'demo_corp_001' ? 'Demo Trading Corporation' : 
                          'Demo Financial Services',
          acceptTerms: true,
          agreeToMarketing: false
        };

        const user = await this.getUserModel().createUser(userCreateData);

        // Verify email for demo users
        await this.getUserModel().verifyEmail(user.id);

        // Assign appropriate role
        const role = await this.getRoleModel().getRoleByName(userData.role, userData.organizationId);
        if (role) {
          await this.getRoleModel().assignRole({
            userId: user.id,
            roleId: role.id,
            organizationId: userData.organizationId
          }, 'system');
        }

        logger.info(`✅ Demo user created: ${userData.username}`);
      } catch (error) {
        logger.error(`❌ Error creating demo user ${userData.username}:`, error);
      }
    }
  }

  /**
   * Validate database integrity
   */
  async validateDatabaseIntegrity(): Promise<boolean> {
    try {
      logger.info('🔍 Validating database integrity...');

      // Check if all required collections exist
      const collections = await database.getDb().listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      const requiredCollections = ['users', 'roles', 'role_hierarchies', 'user_roles', 'user_onboarding', 'organizations'];
      
      for (const collection of requiredCollections) {
        if (!collectionNames.includes(collection)) {
          logger.error(`❌ Missing required collection: ${collection}`);
          return false;
        }
      }

      // Check if platform admin exists
      const platformAdmin = await this.getUserModel().findByUsernameOrEmail('platform_admin', 'admin@blocktrade.com');
      if (!platformAdmin) {
        logger.error('❌ Platform admin not found');
        return false;
      }

      // Check if default roles exist
      const defaultRoles = ['platform_super_admin', 'organization_super_admin', 'organization_admin'];
      const missingRoles = [];
      
      for (const roleName of defaultRoles) {
        const role = await this.getRoleModel().getRoleByName(roleName);
        if (!role) {
          missingRoles.push(roleName);
        }
      }

      if (missingRoles.length > 0) {
        logger.warn(`⚠️ Missing default roles: ${missingRoles.join(', ')}`);
        logger.info('🔄 Attempting to reinitialize roles...');
        
        try {
          await this.initializeRoles();
          logger.info('✅ Roles reinitialized successfully');
        } catch (roleError) {
          logger.error('❌ Failed to reinitialize roles:', roleError);
          return false;
        }
      }

      logger.info('✅ Database integrity validation passed');
      return true;
    } catch (error) {
      logger.error('❌ Database integrity validation failed:', error);
      return false;
    }
  }

  /**
   * Clean up demo data (for testing purposes)
   */
  async cleanupDemoData(): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('⚠️ Demo data cleanup is disabled in production');
        return;
      }

      logger.info('🧹 Cleaning up demo data...');

      const demoOrgIds = ['demo_bank_001', 'demo_corp_001', 'demo_nbfc_001'];
      
      // Remove demo users
      for (const orgId of demoOrgIds) {
        const users = await this.getUserModel().findByOrganization(orgId);
        for (const user of users) {
          await this.getUserModel().deactivateUser(user.id);
        }
      }

      // Remove demo organizations (if using organization model)
      // This would depend on your organization cleanup logic

      logger.info('✅ Demo data cleanup completed');
    } catch (error) {
      logger.error('❌ Error cleaning up demo data:', error);
      throw error;
    }
  }
}

// Lazy initialization to ensure database is connected first
let databaseInitializer: DatabaseInitializer;

const getDatabaseInitializer = (): DatabaseInitializer => {
  if (!databaseInitializer) {
    databaseInitializer = new DatabaseInitializer();
  }
  return databaseInitializer;
};

// Initialization functions for different environments
export const initializeProduction = async (): Promise<void> => {
  const initializer = getDatabaseInitializer();
  await initializer.initializeDatabase();
  
  const isValid = await initializer.validateDatabaseIntegrity();
  if (!isValid) {
    throw new Error('Database integrity validation failed');
  }
};

export const initializeDevelopment = async (): Promise<void> => {
  const initializer = getDatabaseInitializer();
  await initializer.initializeDatabase();
  await initializer.seedDemoData();
  
  const isValid = await initializer.validateDatabaseIntegrity();
  if (!isValid) {
    throw new Error('Database integrity validation failed');
  }
};

export const initializeTesting = async (): Promise<void> => {
  const initializer = getDatabaseInitializer();
  await initializer.initializeDatabase();
  // Don't seed demo data for testing - tests should create their own data
  
  const isValid = await initializer.validateDatabaseIntegrity();
  if (!isValid) {
    throw new Error('Database integrity validation failed');
  }
};
