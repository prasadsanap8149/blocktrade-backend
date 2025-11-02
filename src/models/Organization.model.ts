import { Collection, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../config/database';
import { 
  IOrganization, 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest, 
  OrganizationResponse,
  OrganizationStats 
} from '../types/organization.types';
import { logger } from '../utils/logger';

export class OrganizationModel {
  private collection: Collection<IOrganization>;

  constructor() {
    this.collection = database.getDb().collection<IOrganization>('organizations');
  }

  async createOrganization(orgData: CreateOrganizationRequest): Promise<OrganizationResponse> {
    try {
      // Check if organization already exists
      const existingOrg = await this.collection.findOne({ 
        name: orgData.name,
        type: orgData.type 
      });
      
      if (existingOrg) {
        throw new Error('Organization with this name and type already exists');
      }

      // Create organization document
      const organization: IOrganization = {
        id: uuidv4(),
        name: orgData.name,
        type: orgData.type,
        registrationNumber: orgData.registrationNumber,
        countryCode: orgData.countryCode,
        address: orgData.address,
        contactPerson: orgData.contactPerson,
        kycStatus: 'pending',
        kycDocuments: [],
        swiftCode: orgData.swiftCode,
        licenseNumber: orgData.licenseNumber,
        tradingLicense: orgData.tradingLicense,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.collection.insertOne(organization);
      
      logger.info(`🏢 New organization created: ${orgData.name} (${orgData.type})`);
      
      return this.toOrganizationResponse({ 
        ...organization, 
        _id: result.insertedId
      });
    } catch (error) {
      logger.error('❌ Error creating organization:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<IOrganization | null> {
    try {
      return await this.collection.findOne({ id });
    } catch (error) {
      logger.error('❌ Error finding organization by ID:', error);
      return null;
    }
  }

  async findByName(name: string): Promise<IOrganization | null> {
    try {
      return await this.collection.findOne({ name });
    } catch (error) {
      logger.error('❌ Error finding organization by name:', error);
      return null;
    }
  }

  async findByType(type: string, skip: number = 0, limit: number = 10): Promise<OrganizationResponse[]> {
    try {
      const organizations = await this.collection
        .find({ type: type as any, isActive: true })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      return organizations.map(org => this.toOrganizationResponse(org));
    } catch (error) {
      logger.error('❌ Error finding organizations by type:', error);
      return [];
    }
  }

  async updateOrganization(orgId: string, updates: UpdateOrganizationRequest): Promise<OrganizationResponse | null> {
    try {
      const result = await this.collection.findOneAndUpdate(
        { id: orgId },
        { 
          $set: { 
            ...updates,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (result) {
        return this.toOrganizationResponse(result);
      }
      
      return null;
    } catch (error) {
      logger.error('❌ Error updating organization:', error);
      throw error;
    }
  }

  async updateKYCStatus(orgId: string, status: string, verifiedBy?: string): Promise<boolean> {
    try {
      const updateData: any = { 
        kycStatus: status,
        updatedAt: new Date()
      };

      if (status === 'verified' && verifiedBy) {
        updateData.verificationDate = new Date();
        updateData.verifiedBy = verifiedBy;
      }

      const result = await this.collection.updateOne(
        { id: orgId },
        { $set: updateData }
      );

      if (result.modifiedCount === 1) {
        logger.info(`🏢 Organization KYC status updated: ${orgId} -> ${status}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Error updating KYC status:', error);
      return false;
    }
  }

  async addKYCDocument(orgId: string, document: any): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { id: orgId },
        { 
          $push: { kycDocuments: document },
          $set: { updatedAt: new Date() }
        }
      );

      return result.modifiedCount === 1;
    } catch (error) {
      logger.error('❌ Error adding KYC document:', error);
      return false;
    }
  }

  async deactivateOrganization(orgId: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { id: orgId },
        { 
          $set: { 
            isActive: false,
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount === 1) {
        logger.info(`🏢 Organization deactivated: ${orgId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Error deactivating organization:', error);
      return false;
    }
  }

  async reactivateOrganization(orgId: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { id: orgId },
        { 
          $set: { 
            isActive: true,
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount === 1) {
        logger.info(`🏢 Organization reactivated: ${orgId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Error reactivating organization:', error);
      return false;
    }
  }

  async getAllOrganizations(skip: number = 0, limit: number = 10, filters: any = {}): Promise<{organizations: OrganizationResponse[], total: number}> {
    try {
      const query = { ...filters };
      
      const organizations = await this.collection
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      const total = await this.collection.countDocuments(query);

      return {
        organizations: organizations.map(org => this.toOrganizationResponse(org)),
        total
      };
    } catch (error) {
      logger.error('❌ Error getting all organizations:', error);
      return { organizations: [], total: 0 };
    }
  }

  async getOrganizationStats(orgId: string): Promise<OrganizationStats | null> {
    try {
      // This would typically aggregate data from multiple collections
      // For now, returning basic stats
      const organization = await this.findById(orgId);
      if (!organization) {
        return null;
      }

      // TODO: Implement proper aggregation with LC and user collections
      const stats: OrganizationStats = {
        totalUsers: 0,
        activeUsers: 0,
        totalLCs: 0,
        activeLCs: 0,
        totalTransactionValue: 0,
        averageTransactionValue: 0,
        successRate: 0,
        lastActivityDate: organization.updatedAt
      };

      return stats;
    } catch (error) {
      logger.error('❌ Error getting organization stats:', error);
      return null;
    }
  }

  private toOrganizationResponse(org: IOrganization): OrganizationResponse {
    return {
      id: org.id,
      name: org.name,
      type: org.type,
      registrationNumber: org.registrationNumber,
      countryCode: org.countryCode,
      address: org.address,
      contactPerson: org.contactPerson,
      kycStatus: org.kycStatus,
      verificationDate: org.verificationDate,
      verifiedBy: org.verifiedBy,
      swiftCode: org.swiftCode,
      licenseNumber: org.licenseNumber,
      tradingLicense: org.tradingLicense,
      isActive: org.isActive,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  /**
   * Drop all existing indexes except the default _id_ index
   */
  private async dropAllIndexes(): Promise<void> {
    try {
      const indexes = await this.collection.listIndexes().toArray();
      
      for (const index of indexes) {
        // Skip the default _id_ index as it cannot be dropped
        if (index.name !== '_id_') {
          try {
            await this.collection.dropIndex(index.name);
            logger.info(`🗑️ Dropped existing organization index: ${index.name}`);
          } catch (error: any) {
            // Ignore if index doesn't exist
            if (error.code !== 27) { // IndexNotFound
              logger.warn(`⚠️ Failed to drop organization index ${index.name}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      logger.warn('⚠️ Error listing or dropping organization indexes:', error);
    }
  }

  // Create indexes for better performance
  async createIndexes(): Promise<void> {
    try {
      // First, drop all existing indexes except _id_
      await this.dropAllIndexes();
      
      const indexOperations = [
        { key: { id: 1 }, options: { unique: true, name: 'id_unique' } },
        { key: { name: 1, type: 1 }, options: { unique: true, name: 'name_type_unique' } },
        { key: { type: 1 }, options: { name: 'type_index' } },
        { key: { countryCode: 1 }, options: { name: 'countryCode_index' } },
        { key: { kycStatus: 1 }, options: { name: 'kycStatus_index' } },
        { key: { isActive: 1 }, options: { name: 'isActive_index' } },
        { key: { createdAt: 1 }, options: { name: 'createdAt_index' } },
        { key: { swiftCode: 1 }, options: { sparse: true, name: 'swiftCode_sparse' } }, // Sparse for optional fields
        
        // Compound indexes
        { key: { type: 1, kycStatus: 1 }, options: { name: 'type_kycStatus_compound' } },
        { key: { type: 1, isActive: 1 }, options: { name: 'type_isActive_compound' } },
        { key: { countryCode: 1, type: 1 }, options: { name: 'countryCode_type_compound' } }
      ];

      for (const indexOp of indexOperations) {
        try {
          await this.collection.createIndex(indexOp.key as any, indexOp.options);
          logger.info(`📊 Created organization index: ${indexOp.options.name}`);
        } catch (error: any) {
          logger.error(`❌ Error creating organization index ${indexOp.options.name}:`, error);
        }
      }
      
      logger.info('📊 Organization collection indexes created successfully');
    } catch (error) {
      logger.error('❌ Error creating organization indexes:', error);
    }
  }
}

export default OrganizationModel;
