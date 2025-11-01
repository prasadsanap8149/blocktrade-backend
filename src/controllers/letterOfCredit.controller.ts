import { Request, Response, NextFunction } from 'express';
import LetterOfCreditModel from '../models/LetterOfCredit.model';
import OrganizationModel from '../models/Organization.model';
import UserModel from '../models/User.model';
import { 
  CreateLCRequest, 
  UpdateLCRequest, 
  LCSearchFilters,
  LCStatusUpdateRequest,
  LCAmendmentRequest
} from '../types/letterOfCredit.types';
import { logger } from '../utils/logger';

export class LetterOfCreditController {
  private lcModel: LetterOfCreditModel;
  private organizationModel: OrganizationModel;
  private userModel: UserModel;

  constructor() {
    this.lcModel = new LetterOfCreditModel();
    this.organizationModel = new OrganizationModel();
    this.userModel = new UserModel();
  }

  // Create a new Letter of Credit
  createLC = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lcData: CreateLCRequest = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      // Validate required fields
      const requiredFields = [
        'applicantId', 'beneficiaryId', 'issuingBankId', 
        'amount', 'currency', 'description', 'expiryDate'
      ];
      
      const missingFields = requiredFields.filter(field => !lcData[field as keyof CreateLCRequest]);
      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          missingFields
        });
        return;
      }

      // Validate organizations exist
      const applicant = await this.organizationModel.findById(lcData.applicantId);
      const beneficiary = await this.organizationModel.findById(lcData.beneficiaryId);
      const issuingBank = await this.organizationModel.findById(lcData.issuingBankId);

      if (!applicant) {
        res.status(400).json({
          success: false,
          message: 'Applicant organization not found'
        });
        return;
      }

      if (!beneficiary) {
        res.status(400).json({
          success: false,
          message: 'Beneficiary organization not found'
        });
        return;
      }

      if (!issuingBank || issuingBank.type !== 'bank') {
        res.status(400).json({
          success: false,
          message: 'Issuing bank not found or invalid type'
        });
        return;
      }

      // Validate advising bank if provided
      if (lcData.advisingBankId) {
        const advisingBank = await this.organizationModel.findById(lcData.advisingBankId);
        if (!advisingBank || advisingBank.type !== 'bank') {
          res.status(400).json({
            success: false,
            message: 'Advising bank not found or invalid type'
          });
          return;
        }
      }

      // Create LC
      const lc = await this.lcModel.createLC(lcData, userId);

      // Populate organization names
      lc.applicantName = applicant.name;
      lc.beneficiaryName = beneficiary.name;
      lc.issuingBankName = issuingBank.name;

      // Populate user name in history
      const user = await this.userModel.findById(userId);
      if (user && lc.history.length > 0) {
        lc.history[0].performedByName = `${user.firstName} ${user.lastName}`;
      }

      logger.info(`📄 LC created successfully: ${lc.lcNumber} by user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Letter of Credit created successfully',
        data: lc
      });
    } catch (error: any) {
      logger.error('❌ Error creating LC:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create Letter of Credit'
      });
    }
  };

  // Get LC by ID
  getLCById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const lc = await this.lcModel.findById(id);
      if (!lc) {
        res.status(404).json({
          success: false,
          message: 'Letter of Credit not found'
        });
        return;
      }

      // Check if user has access to this LC
      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Users can only view LCs related to their organization
      const hasAccess = 
        lc.applicantId === user.organizationId ||
        lc.beneficiaryId === user.organizationId ||
        lc.issuingBankId === user.organizationId ||
        lc.advisingBankId === user.organizationId;

      if (!hasAccess && !user.permissions.includes('lc:view_all')) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this Letter of Credit'
        });
        return;
      }

      const lcDetail = this.lcModel.toLCDetailResponse ? 
        this.lcModel.toLCDetailResponse(lc) : 
        lc as any;

      res.json({
        success: true,
        data: lcDetail
      });
    } catch (error: any) {
      logger.error('❌ Error getting LC by ID:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve Letter of Credit'
      });
    }
  };

  // Search LCs with filters
  searchLCs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Parse query parameters
      const filters: LCSearchFilters = {
        status: req.query.status ? (req.query.status as string).split(',') as any : undefined,
        currency: req.query.currency as string,
        amountMin: req.query.amountMin ? parseFloat(req.query.amountMin as string) : undefined,
        amountMax: req.query.amountMax ? parseFloat(req.query.amountMax as string) : undefined,
        expiryDateFrom: req.query.expiryDateFrom as string,
        expiryDateTo: req.query.expiryDateTo as string,
        applicationDateFrom: req.query.applicationDateFrom as string,
        applicationDateTo: req.query.applicationDateTo as string
      };

      // If user doesn't have global view permission, filter by their organization
      if (!user.permissions.includes('lc:view_all')) {
        // User can see LCs where their organization is involved
        filters.applicantId = user.organizationId;
        // Note: We need to handle this in the model to support OR conditions
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const lcs = user.permissions.includes('lc:view_all') ?
        await this.lcModel.searchLCs(filters, skip, limit) :
        await this.lcModel.getLCsByOrganization(user.organizationId, skip, limit);

      res.json({
        success: true,
        data: lcs,
        pagination: {
          page,
          limit,
          total: lcs.length // Note: This should be total count, not current page count
        }
      });
    } catch (error: any) {
      logger.error('❌ Error searching LCs:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to search Letters of Credit'
      });
    }
  };

  // Update LC
  updateLC = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updates: UpdateLCRequest = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check if user has permission to edit LCs
      if (!user.permissions.includes('lc:edit')) {
        res.status(403).json({
          success: false,
          message: 'Permission denied to edit Letter of Credit'
        });
        return;
      }

      const updatedLC = await this.lcModel.updateLC(id, updates, userId);
      if (!updatedLC) {
        res.status(404).json({
          success: false,
          message: 'Letter of Credit not found or cannot be updated'
        });
        return;
      }

      logger.info(`📄 LC updated: ${updatedLC.lcNumber} by user ${userId}`);

      res.json({
        success: true,
        message: 'Letter of Credit updated successfully',
        data: updatedLC
      });
    } catch (error: any) {
      logger.error('❌ Error updating LC:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update Letter of Credit'
      });
    }
  };

  // Update LC Status
  updateLCStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const statusUpdate: LCStatusUpdateRequest = {
        lcId: id,
        newStatus: req.body.newStatus,
        comments: req.body.comments,
        supportingDocuments: req.body.supportingDocuments
      };
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check permissions based on the new status
      let requiredPermission = 'lc:edit';
      if (['approved', 'issued'].includes(statusUpdate.newStatus)) {
        requiredPermission = 'lc:approve';
      } else if (statusUpdate.newStatus === 'rejected') {
        requiredPermission = 'lc:reject';
      } else if (statusUpdate.newStatus === 'cancelled') {
        requiredPermission = 'lc:cancel';
      } else if (['documents_accepted', 'documents_rejected'].includes(statusUpdate.newStatus)) {
        requiredPermission = 'lc:examine_documents';
      } else if (statusUpdate.newStatus === 'payment_authorized') {
        requiredPermission = 'lc:authorize_payment';
      }

      if (!user.permissions.includes(requiredPermission)) {
        res.status(403).json({
          success: false,
          message: `Permission denied: ${requiredPermission} required`
        });
        return;
      }

      const success = await this.lcModel.updateStatus(statusUpdate, userId);
      if (!success) {
        res.status(400).json({
          success: false,
          message: 'Failed to update LC status'
        });
        return;
      }

      logger.info(`📄 LC status updated: ${id} to ${statusUpdate.newStatus} by user ${userId}`);

      res.json({
        success: true,
        message: 'LC status updated successfully'
      });
    } catch (error: any) {
      logger.error('❌ Error updating LC status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update LC status'
      });
    }
  };

  // Delete LC (only draft LCs)
  deleteLC = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check if user has permission to delete LCs
      if (!user.permissions.includes('lc:delete')) {
        res.status(403).json({
          success: false,
          message: 'Permission denied to delete Letter of Credit'
        });
        return;
      }

      const success = await this.lcModel.deleteLC(id, userId);
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Letter of Credit not found or cannot be deleted'
        });
        return;
      }

      logger.info(`📄 LC deleted: ${id} by user ${userId}`);

      res.json({
        success: true,
        message: 'Letter of Credit deleted successfully'
      });
    } catch (error: any) {
      logger.error('❌ Error deleting LC:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete Letter of Credit'
      });
    }
  };

  // Get LC Statistics
  getLCStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check if user has permission to view reports
      if (!user.permissions.includes('report:view')) {
        res.status(403).json({
          success: false,
          message: 'Permission denied to view statistics'
        });
        return;
      }

      const filters: any = {};
      
      // If user doesn't have global view permission, filter by their organization
      if (!user.permissions.includes('lc:view_all')) {
        filters.issuingBankId = user.organizationId;
      }

      const statistics = await this.lcModel.getLCStatistics(filters);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      logger.error('❌ Error getting LC statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get LC statistics'
      });
    }
  };

  // Initialize Letter of Credit indexes
  async initializeLCModel(): Promise<void> {
    try {
      await this.lcModel.createIndexes();
      logger.info('📊 Letter of Credit indexes initialized successfully');
    } catch (error) {
      logger.error('❌ Error initializing LC indexes:', error);
    }
  }
}

export default LetterOfCreditController;
