import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import UserModel from '../models/User.model';
import OrganizationModel from '../models/Organization.model';
import { demoOrganizations, demoUsers } from '../utils/demoData';
import { logger } from '../utils/logger';
import { database } from '../config/database';

class DataSeeder {
  private userModel: UserModel;
  private orgModel: OrganizationModel;
  
  constructor() {
    this.userModel = new UserModel();
    this.orgModel = new OrganizationModel();
  }
  
  async connectToDatabase() {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blocktrade';
    
    try {
      await database.connect();
      logger.info('Connected to MongoDB for seeding');
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async seedOrganizations() {
    logger.info('🏢 Seeding organizations...');
    
    for (const orgData of demoOrganizations) {
      try {
        const existingOrg = await this.orgModel.findByName(orgData.name);
        
        if (!existingOrg) {
          const org = await this.orgModel.createOrganization(orgData);
          logger.info(`✅ Created organization: ${orgData.name}`);
        } else {
          logger.info(`⏭️  Organization already exists: ${orgData.name}`);
        }
      } catch (error) {
        logger.error(`❌ Failed to create organization ${orgData.name}:`, error);
      }
    }
  }

  async seedUsers() {
    logger.info('👥 Seeding users...');
    
    for (const userData of demoUsers) {
      try {
        const existingUser = await this.userModel.findByUsernameOrEmail(userData.username, userData.email);
        
        if (!existingUser) {
          // Add required fields for CreateUserRequest
          const userRequest = {
            ...userData,
            confirmPassword: userData.password, // For validation
            acceptTerms: true, // Required field
            isActive: true,
            isVerified: true,
            kycStatus: 'approved' as const
          } as any; // Type assertion for demo data
          
          // For demo data, bypass role assignment permissions by creating user directly
          const user = await this.userModel.createUser(userRequest);
          logger.info(`✅ Created demo user: ${userData.username} (${userData.role})`);
        } else {
          logger.info(`⏭️  User already exists: ${userData.username}`);
        }
      } catch (error) {
        logger.error(`❌ Failed to create user ${userData.username}:`, error);
        // Continue with next user instead of failing completely
        continue;
      }
    }
  }

  async clearData() {
    logger.info('🗑️  Clearing existing data...');
    
    try {
      // Access collections directly from database
      const db = database.getDb();
      await db.collection('users').deleteMany({});
      await db.collection('organizations').deleteMany({});
      logger.info('✅ Cleared all users and organizations');
    } catch (error) {
      logger.error('❌ Failed to clear data:', error);
      throw error;
    }
  }

  async seedAll(clearFirst: boolean = false) {
    try {
      await this.connectToDatabase();
      
      if (clearFirst) {
        await this.clearData();
      }
      
      await this.seedOrganizations();
      await this.seedUsers();
      
      logger.info('🎉 Data seeding completed successfully!');
      
      // Display summary
      const db = database.getDb();
      const userCount = await db.collection('users').countDocuments();
      const orgCount = await db.collection('organizations').countDocuments();
      
      logger.info('📊 Database Summary:');
      logger.info(`   👥 Users: ${userCount}`);
      logger.info(`   🏢 Organizations: ${orgCount}`);
      
      // Display test credentials
      logger.info('\n🔑 Test Credentials:');
      logger.info('   Bank Admin: sarah_admin / SecurePass123!');
      logger.info('   Corporate Admin: michael_admin / SecurePass123!');
      logger.info('   NBFC Admin: rajesh_admin / SecurePass123!');
      logger.info('   Logistics Admin: emma_admin / SecurePass123!');
      logger.info('   Insurance Admin: david_admin / SecurePass123!');
      
    } catch (error) {
      logger.error('❌ Data seeding failed:', error);
      throw error;
    } finally {
      await database.disconnect();
      logger.info('Disconnected from MongoDB');
    }
  }
}

// Command line usage
if (require.main === module) {
  const seeder = new DataSeeder();
  const clearFirst = process.argv.includes('--clear');
  
  seeder.seedAll(clearFirst)
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default DataSeeder;
