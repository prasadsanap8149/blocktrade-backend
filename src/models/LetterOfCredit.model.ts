import { Collection, ObjectId } from 'mongodb';
import { database } from '../config/database';
import { 
  ILetterOfCredit, 
  CreateLCRequest, 
  UpdateLCRequest,
  LCResponse, 
  LCDetailResponse,
  LCSearchFilters,
  LCStatus,
  LCWorkflowStage,
  LCHistoryEntry,
  LCStatusUpdateRequest,
  LCAmendmentRequest,
  LC_STATUS_WORKFLOW
} from '../types/letterOfCredit.types';
import { logger } from '../utils/logger';

export class LetterOfCreditModel {
  private collection: Collection<ILetterOfCredit>;

  constructor() {
    this.collection = database.getDb().collection<ILetterOfCredit>('letters_of_credit');
  }

  async createLC(lcData: CreateLCRequest, createdBy: string): Promise<LCDetailResponse> {
    try {
      // Generate unique LC Number
      const lcNumber = await this.generateLCNumber();
      
      // Create LC document
      const lc: ILetterOfCredit = {
        lcNumber,
        applicantId: lcData.applicantId,
        applicantName: '', // Will be populated from organization lookup
        beneficiaryId: lcData.beneficiaryId,
        beneficiaryName: '', // Will be populated from organization lookup
        issuingBankId: lcData.issuingBankId,
        issuingBankName: '', // Will be populated from organization lookup
        advisingBankId: lcData.advisingBankId,
        advisingBankName: '',
        
        amount: lcData.amount,
        currency: lcData.currency,
        description: lcData.description,
        
        applicationDate: new Date(),
        expiryDate: new Date(lcData.expiryDate),
        lastShipmentDate: lcData.lastShipmentDate ? new Date(lcData.lastShipmentDate) : undefined,
        presentationPeriod: lcData.presentationPeriod,
        
        incoterms: lcData.incoterms,
        partialShipments: lcData.partialShipments,
        transshipment: lcData.transshipment,
        
        requiredDocuments: lcData.requiredDocuments,
        
        status: 'draft',
        workflowStage: 'application',
        
        charges: {
          issuanceCharges: 0,
          chargesFor: 'applicant'
        },
        
        tolerance: lcData.tolerance,
        specialInstructions: lcData.specialInstructions,
        
        history: [{
          timestamp: new Date(),
          action: 'LC_CREATED',
          performedBy: createdBy,
          performedByName: '', // Will be populated from user lookup
          details: 'Letter of Credit application created',
          newStatus: 'draft'
        }],
        
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        lastModifiedBy: createdBy
      };

      // TODO: Populate organization and user names from their respective collections
      // This should be done in the controller layer

      const result = await this.collection.insertOne(lc);
      
      logger.info(`📄 New LC created: ${lcNumber} - Amount: ${lcData.currency} ${lcData.amount}`);
      
      return this.toLCDetailResponse({ 
        ...lc, 
        _id: result.insertedId
      });
    } catch (error) {
      logger.error('❌ Error creating LC:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<ILetterOfCredit | null> {
    try {
      return await this.collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      logger.error('❌ Error finding LC by ID:', error);
      return null;
    }
  }

  async findByLCNumber(lcNumber: string): Promise<ILetterOfCredit | null> {
    try {
      return await this.collection.findOne({ lcNumber });
    } catch (error) {
      logger.error('❌ Error finding LC by number:', error);
      return null;
    }
  }

  async searchLCs(filters: LCSearchFilters, skip: number = 0, limit: number = 10): Promise<LCResponse[]> {
    try {
      const query: any = {};

      if (filters.status && filters.status.length > 0) {
        query.status = { $in: filters.status };
      }

      if (filters.applicantId) {
        query.applicantId = filters.applicantId;
      }

      if (filters.beneficiaryId) {
        query.beneficiaryId = filters.beneficiaryId;
      }

      if (filters.issuingBankId) {
        query.issuingBankId = filters.issuingBankId;
      }

      if (filters.currency) {
        query.currency = filters.currency;
      }

      if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
        query.amount = {};
        if (filters.amountMin !== undefined) {
          query.amount.$gte = filters.amountMin;
        }
        if (filters.amountMax !== undefined) {
          query.amount.$lte = filters.amountMax;
        }
      }

      if (filters.expiryDateFrom || filters.expiryDateTo) {
        query.expiryDate = {};
        if (filters.expiryDateFrom) {
          query.expiryDate.$gte = new Date(filters.expiryDateFrom);
        }
        if (filters.expiryDateTo) {
          query.expiryDate.$lte = new Date(filters.expiryDateTo);
        }
      }

      if (filters.applicationDateFrom || filters.applicationDateTo) {
        query.applicationDate = {};
        if (filters.applicationDateFrom) {
          query.applicationDate.$gte = new Date(filters.applicationDateFrom);
        }
        if (filters.applicationDateTo) {
          query.applicationDate.$lte = new Date(filters.applicationDateTo);
        }
      }

      const lcs = await this.collection
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      return lcs.map(lc => this.toLCResponse(lc));
    } catch (error) {
      logger.error('❌ Error searching LCs:', error);
      return [];
    }
  }

  async updateLC(id: string, updates: UpdateLCRequest, updatedBy: string): Promise<LCDetailResponse | null> {
    try {
      const currentLC = await this.findById(id);
      if (!currentLC) {
        return null;
      }

      // Check if LC can be updated (only draft and submitted LCs can be updated)
      if (!['draft', 'submitted'].includes(currentLC.status)) {
        throw new Error('LC cannot be updated in current status');
      }

      const updateData: any = {
        updatedAt: new Date(),
        lastModifiedBy: updatedBy
      };

      // Build history entry for changes
      const changes: string[] = [];

      if (updates.amount !== undefined && updates.amount !== currentLC.amount) {
        updateData.amount = updates.amount;
        changes.push(`Amount changed from ${currentLC.currency} ${currentLC.amount} to ${currentLC.currency} ${updates.amount}`);
      }

      if (updates.description !== undefined && updates.description !== currentLC.description) {
        updateData.description = updates.description;
        changes.push('Description updated');
      }

      if (updates.expiryDate !== undefined) {
        const newExpiryDate = new Date(updates.expiryDate);
        if (newExpiryDate.getTime() !== currentLC.expiryDate.getTime()) {
          updateData.expiryDate = newExpiryDate;
          changes.push(`Expiry date changed to ${newExpiryDate.toISOString().split('T')[0]}`);
        }
      }

      if (updates.lastShipmentDate !== undefined) {
        updateData.lastShipmentDate = new Date(updates.lastShipmentDate);
        changes.push('Last shipment date updated');
      }

      if (updates.presentationPeriod !== undefined && updates.presentationPeriod !== currentLC.presentationPeriod) {
        updateData.presentationPeriod = updates.presentationPeriod;
        changes.push(`Presentation period changed to ${updates.presentationPeriod} days`);
      }

      if (updates.incoterms !== undefined && updates.incoterms !== currentLC.incoterms) {
        updateData.incoterms = updates.incoterms;
        changes.push(`Incoterms changed to ${updates.incoterms}`);
      }

      if (updates.partialShipments !== undefined && updates.partialShipments !== currentLC.partialShipments) {
        updateData.partialShipments = updates.partialShipments;
        changes.push(`Partial shipments ${updates.partialShipments ? 'allowed' : 'not allowed'}`);
      }

      if (updates.transshipment !== undefined && updates.transshipment !== currentLC.transshipment) {
        updateData.transshipment = updates.transshipment;
        changes.push(`Transshipment ${updates.transshipment ? 'allowed' : 'not allowed'}`);
      }

      if (updates.requiredDocuments !== undefined) {
        updateData.requiredDocuments = updates.requiredDocuments;
        changes.push('Required documents updated');
      }

      if (updates.tolerance !== undefined) {
        updateData.tolerance = updates.tolerance;
        changes.push('Tolerance levels updated');
      }

      if (updates.specialInstructions !== undefined) {
        updateData.specialInstructions = updates.specialInstructions;
        changes.push('Special instructions updated');
      }

      // Add history entry if there are changes
      if (changes.length > 0) {
        const historyEntry: LCHistoryEntry = {
          timestamp: new Date(),
          action: 'LC_UPDATED',
          performedBy: updatedBy,
          performedByName: '', // Will be populated in controller
          details: changes.join(', ')
        };

        updateData.$push = {
          history: historyEntry
        };
      }

      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData, ...(updateData.$push ? { $push: updateData.$push } : {}) },
        { returnDocument: 'after' }
      );

      if (result) {
        logger.info(`📄 LC updated: ${result.lcNumber} - Changes: ${changes.join(', ')}`);
        return this.toLCDetailResponse(result);
      }
      
      return null;
    } catch (error) {
      logger.error('❌ Error updating LC:', error);
      throw error;
    }
  }

  async updateStatus(statusUpdate: LCStatusUpdateRequest, updatedBy: string): Promise<boolean> {
    try {
      const currentLC = await this.findById(statusUpdate.lcId);
      if (!currentLC) {
        throw new Error('LC not found');
      }

      // Validate status transition
      const allowedNextStatuses = (LC_STATUS_WORKFLOW as any)[currentLC.status] || [];
      if (!allowedNextStatuses.includes(statusUpdate.newStatus)) {
        throw new Error(`Cannot transition from ${currentLC.status} to ${statusUpdate.newStatus}`);
      }

      const historyEntry: LCHistoryEntry = {
        timestamp: new Date(),
        action: 'STATUS_CHANGE',
        performedBy: updatedBy,
        performedByName: '', // Will be populated in controller
        details: statusUpdate.comments || `Status changed to ${statusUpdate.newStatus}`,
        oldStatus: currentLC.status,
        newStatus: statusUpdate.newStatus,
        comments: statusUpdate.comments
      };

      const updateData: any = {
        status: statusUpdate.newStatus,
        updatedAt: new Date(),
        lastModifiedBy: updatedBy,
        $push: {
          history: historyEntry
        }
      };

      // Update workflow stage based on status
      updateData.workflowStage = this.getWorkflowStageFromStatus(statusUpdate.newStatus);

      // Set issue date when LC is issued
      if (statusUpdate.newStatus === 'issued' && !currentLC.issueDate) {
        updateData.issueDate = new Date();
      }

      const result = await this.collection.updateOne(
        { _id: new ObjectId(statusUpdate.lcId) },
        updateData
      );

      if (result.modifiedCount === 1) {
        logger.info(`📄 LC status updated: ${currentLC.lcNumber} - ${currentLC.status} → ${statusUpdate.newStatus}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Error updating LC status:', error);
      throw error;
    }
  }

  async deleteLC(id: string, deletedBy: string): Promise<boolean> {
    try {
      const currentLC = await this.findById(id);
      if (!currentLC) {
        return false;
      }

      // Only allow deletion of draft LCs
      if (currentLC.status !== 'draft') {
        throw new Error('Only draft LCs can be deleted');
      }

      const result = await this.collection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 1) {
        logger.info(`📄 LC deleted: ${currentLC.lcNumber} by user ${deletedBy}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Error deleting LC:', error);
      throw error;
    }
  }

  async getLCsByOrganization(organizationId: string, skip: number = 0, limit: number = 10): Promise<LCResponse[]> {
    try {
      const lcs = await this.collection
        .find({
          $or: [
            { applicantId: organizationId },
            { beneficiaryId: organizationId },
            { issuingBankId: organizationId },
            { advisingBankId: organizationId }
          ]
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      return lcs.map(lc => this.toLCResponse(lc));
    } catch (error) {
      logger.error('❌ Error getting LCs by organization:', error);
      return [];
    }
  }

  async getLCStatistics(filters?: LCSearchFilters): Promise<any> {
    try {
      const matchStage: any = {};

      if (filters?.applicantId) matchStage.applicantId = filters.applicantId;
      if (filters?.beneficiaryId) matchStage.beneficiaryId = filters.beneficiaryId;
      if (filters?.issuingBankId) matchStage.issuingBankId = filters.issuingBankId;

      const stats = await this.collection.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
            statusCounts: {
              $push: '$status'
            },
            currencyBreakdown: {
              $push: { currency: '$currency', amount: '$amount' }
            }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            totalAmount: 1,
            avgAmount: 1,
            statusCounts: 1,
            currencyBreakdown: 1
          }
        }
      ]).toArray();

      return stats[0] || {
        total: 0,
        totalAmount: 0,
        avgAmount: 0,
        statusCounts: [],
        currencyBreakdown: []
      };
    } catch (error) {
      logger.error('❌ Error getting LC statistics:', error);
      return {
        total: 0,
        totalAmount: 0,
        avgAmount: 0,
        statusCounts: [],
        currencyBreakdown: []
      };
    }
  }

  private async generateLCNumber(): Promise<string> {
    const prefix = 'LC';
    const year = new Date().getFullYear();
    
    // Find the highest sequence number for the current year
    const lastLC = await this.collection
      .findOne(
        { lcNumber: { $regex: `^${prefix}${year}` } },
        { sort: { lcNumber: -1 } }
      );

    let sequence = 1;
    if (lastLC && lastLC.lcNumber) {
      const lastSequence = parseInt(lastLC.lcNumber.slice(-6));
      sequence = lastSequence + 1;
    }

    return `${prefix}${year}${sequence.toString().padStart(6, '0')}`;
  }

  private getWorkflowStageFromStatus(status: LCStatus): LCWorkflowStage {
    const stageMapping: Record<LCStatus, LCWorkflowStage> = {
      'draft': 'application',
      'submitted': 'bank_review',
      'under_review': 'bank_review',
      'approved': 'issuance',
      'rejected': 'application',
      'issued': 'shipment',
      'documents_received': 'documentation',
      'documents_examining': 'examination',
      'documents_accepted': 'payment',
      'documents_rejected': 'documentation',
      'payment_authorized': 'payment',
      'payment_completed': 'closure',
      'expired': 'closure',
      'cancelled': 'closure',
      'amended': 'issuance'
    };

    return stageMapping[status] || 'application';
  }

  public toLCResponse(lc: ILetterOfCredit): LCResponse {
    return {
      id: lc._id?.toString() || '',
      lcNumber: lc.lcNumber,
      applicantName: lc.applicantName,
      beneficiaryName: lc.beneficiaryName,
      issuingBankName: lc.issuingBankName,
      advisingBankName: lc.advisingBankName,
      amount: lc.amount,
      currency: lc.currency,
      description: lc.description,
      applicationDate: lc.applicationDate,
      issueDate: lc.issueDate,
      expiryDate: lc.expiryDate,
      status: lc.status,
      workflowStage: lc.workflowStage,
      createdAt: lc.createdAt,
      updatedAt: lc.updatedAt
    };
  }

  public toLCDetailResponse(lc: ILetterOfCredit): LCDetailResponse {
    return {
      ...this.toLCResponse(lc),
      applicantId: lc.applicantId,
      beneficiaryId: lc.beneficiaryId,
      issuingBankId: lc.issuingBankId,
      advisingBankId: lc.advisingBankId,
      confirmingBankId: lc.confirmingBankId,
      confirmingBankName: lc.confirmingBankName,
      lastShipmentDate: lc.lastShipmentDate,
      presentationPeriod: lc.presentationPeriod,
      incoterms: lc.incoterms,
      partialShipments: lc.partialShipments,
      transshipment: lc.transshipment,
      requiredDocuments: lc.requiredDocuments,
      charges: lc.charges,
      tolerance: lc.tolerance,
      specialInstructions: lc.specialInstructions,
      blockchainTxId: lc.blockchainTxId,
      history: lc.history,
      createdBy: lc.createdBy,
      lastModifiedBy: lc.lastModifiedBy
    };
  }

  // Create indexes for better performance
  async createIndexes(): Promise<void> {
    try {
      await this.collection.createIndex({ lcNumber: 1 }, { unique: true });
      await this.collection.createIndex({ applicantId: 1 });
      await this.collection.createIndex({ beneficiaryId: 1 });
      await this.collection.createIndex({ issuingBankId: 1 });
      await this.collection.createIndex({ advisingBankId: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ applicationDate: 1 });
      await this.collection.createIndex({ expiryDate: 1 });
      await this.collection.createIndex({ amount: 1, currency: 1 });
      await this.collection.createIndex({ createdAt: 1 });

      // Compound indexes for common queries
      await this.collection.createIndex({ applicantId: 1, status: 1 });
      await this.collection.createIndex({ issuingBankId: 1, status: 1 });
      await this.collection.createIndex({ status: 1, createdAt: -1 });

      logger.info('📊 Letter of Credit collection indexes created successfully');
    } catch (error) {
      logger.error('❌ Error creating LC indexes:', error);
    }
  }
}

export default LetterOfCreditModel;
