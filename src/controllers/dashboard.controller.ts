import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import UserModel from '../models/User.model';
import { OrganizationModel } from '../models/Organization.model';
import { UserJourneyModel } from '../models/UserJourney.model';
import { logger } from '../utils/logger';
import { database } from '../config/database';

export class DashboardController {
  private userModel!: UserModel;
  private organizationModel!: OrganizationModel;
  private userJourneyModel!: UserJourneyModel;

  constructor() {
    this.initializeModels();
  }

  public async initializeModels() {
    try {
      await database.connect();
      this.userModel = new UserModel();
      this.organizationModel = new OrganizationModel();
      this.userJourneyModel = new UserJourneyModel();
    } catch (error) {
      logger.error('❌ Failed to initialize dashboard models:', error);
    }
  }

  /**
   * Get dashboard statistics
   */
  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!this.userModel) {
        await this.initializeModels();
      }

      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { range = '30d' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (range) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Get actual statistics from database
      const db = database.getDb();
      
      // Get Letter of Credit statistics
      const lcCollection = db.collection('letters_of_credit');
      const userCollection = db.collection('users');
      const organizationCollection = db.collection('organizations');
      
      // Filter by user's organization for role-based access
      const organizationFilter = req.user.role.includes('platform') ? {} : { 
        $or: [
          { applicantId: req.user.organizationId },
          { beneficiaryId: req.user.organizationId },
          { issuingBankId: req.user.organizationId },
          { advisingBankId: req.user.organizationId }
        ]
      };

      const dateFilter = { createdAt: { $gte: startDate, $lte: now } };
      const combinedFilter = { ...organizationFilter, ...dateFilter };

      // Parallel database queries for better performance
      const [
        totalLettersOfCredit,
        pendingApprovals,
        completedTransactions,
        totalVolumeResult,
        activeDocuments,
        pendingPayments,
        previousPeriodStats
      ] = await Promise.all([
        // Total LCs
        lcCollection.countDocuments(organizationFilter),
        
        // Pending approvals
        lcCollection.countDocuments({
          ...organizationFilter,
          status: { $in: ['submitted', 'under_review'] }
        }),
        
        // Completed transactions
        lcCollection.countDocuments({
          ...organizationFilter,
          status: { $in: ['payment_completed', 'documents_accepted'] }
        }),
        
        // Total volume
        lcCollection.aggregate([
          { $match: combinedFilter },
          { $group: { _id: null, totalVolume: { $sum: '$amount' } } }
        ]).toArray(),
        
        // Active documents (LCs with documents)
        lcCollection.countDocuments({
          ...organizationFilter,
          status: { $in: ['documents_received', 'documents_examining'] }
        }),
        
        // Pending payments
        lcCollection.countDocuments({
          ...organizationFilter,
          status: 'payment_authorized'
        }),
        
        // Previous period for growth calculation
        (() => {
          const prevStartDate = new Date(startDate);
          const prevEndDate = new Date(startDate);
          const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
          
          return lcCollection.countDocuments({
            ...organizationFilter,
            createdAt: { $gte: prevStartDate, $lt: startDate }
          });
        })()
      ]);

      const totalVolume = totalVolumeResult.length > 0 ? totalVolumeResult[0].totalVolume : 0;
      
      // Calculate monthly growth
      const currentPeriodCount = await lcCollection.countDocuments(combinedFilter);
      const growthRate = previousPeriodStats > 0 
        ? (((currentPeriodCount - previousPeriodStats) / previousPeriodStats) * 100).toFixed(1)
        : '0.0';

      const stats = {
        totalLettersOfCredit,
        pendingApprovals,
        completedTransactions,
        totalVolume,
        activeDocuments,
        pendingPayments,
        monthlyGrowth: growthRate,
        lastUpdated: new Date().toISOString(),
      };

      logger.info(`📊 Dashboard stats retrieved for user: ${req.user.username} (range: ${range})`);

      res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats,
      });
    } catch (error: any) {
      logger.error('❌ Error getting dashboard stats:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve dashboard statistics', 500);
    }
  });

  /**
   * Get recent activities
   */
  getRecentActivities = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { limit = 10 } = req.query;
      const limitNum = Math.min(Number(limit), 50); // Max 50 activities
      
      // Get actual activities from database
      const db = database.getDb();
      const auditCollection = db.collection('audit_trail');
      
      // Filter activities based on user's organization and role
      const organizationFilter = req.user.role.includes('platform') ? {} : { 
        $or: [
          { userId: req.user.userId },
          { organizationId: req.user.organizationId },
          { 'metadata.applicantId': req.user.organizationId },
          { 'metadata.beneficiaryId': req.user.organizationId },
          { 'metadata.issuingBankId': req.user.organizationId }
        ]
      };

      const activities = await auditCollection
        .find(organizationFilter)
        .sort({ timestamp: -1 })
        .limit(limitNum)
        .toArray();

      // Transform audit trail entries to activity format
      const formattedActivities = activities.map(activity => {
        let title = 'System Activity';
        let description = activity.action || 'Activity performed';
        let type = 'SYSTEM_ACTIVITY';
        let status = 'SUCCESS';
        let priority = 'MEDIUM';

        // Map activity types based on action
        switch (activity.action) {
          case 'LC_CREATED':
            type = 'LC_CREATED';
            title = 'Letter of Credit Created';
            description = `LC ${activity.metadata?.lcNumber || 'N/A'} created for ${activity.metadata?.amount || 0} ${activity.metadata?.currency || 'USD'}`;
            priority = 'HIGH';
            break;
          case 'LC_APPROVED':
            type = 'LC_APPROVED';
            title = 'Letter of Credit Approved';
            description = `LC ${activity.metadata?.lcNumber || 'N/A'} approved`;
            priority = 'HIGH';
            break;
          case 'LC_REJECTED':
            type = 'LC_REJECTED';
            title = 'Letter of Credit Rejected';
            description = `LC ${activity.metadata?.lcNumber || 'N/A'} rejected`;
            status = 'FAILED';
            priority = 'HIGH';
            break;
          case 'DOCUMENT_UPLOADED':
            type = 'DOCUMENT_UPLOADED';
            title = 'Documents Uploaded';
            description = `${activity.metadata?.documentType || 'Document'} uploaded for LC ${activity.metadata?.lcNumber || 'N/A'}`;
            priority = 'LOW';
            break;
          case 'PAYMENT_PROCESSED':
            type = 'PAYMENT_PROCESSED';
            title = 'Payment Processed';
            description = `Payment of ${activity.metadata?.amount || 0} ${activity.metadata?.currency || 'USD'} processed`;
            priority = 'HIGH';
            break;
          case 'USER_LOGIN':
            type = 'USER_LOGIN';
            title = 'User Login';
            description = `User ${activity.metadata?.username || 'N/A'} logged in`;
            priority = 'LOW';
            break;
          case 'COMPLIANCE_CHECK':
            type = 'COMPLIANCE_CHECK';
            title = 'Compliance Check';
            description = `${activity.metadata?.checkType || 'Compliance'} check performed`;
            priority = 'MEDIUM';
            break;
          default:
            title = activity.action || 'System Activity';
            description = activity.description || 'Activity performed';
        }

        return {
          id: activity._id.toString(),
          type,
          title,
          description,
          timestamp: activity.timestamp || activity.createdAt || new Date().toISOString(),
          status,
          amount: activity.metadata?.amount,
          currency: activity.metadata?.currency,
          priority,
          metadata: activity.metadata || {}
        };
      });

      // If no activities found, create a default entry
      if (formattedActivities.length === 0) {
        formattedActivities.push({
          id: 'default',
          type: 'SYSTEM_ACTIVITY',
          title: 'Welcome to BlockTrade',
          description: 'Your activity history will appear here',
          timestamp: new Date().toISOString(),
          status: 'SUCCESS',
          amount: undefined,
          currency: undefined,
          priority: 'LOW',
          metadata: {}
        });
      }

      logger.info(`📋 Recent activities retrieved for user: ${req.user.username} (found: ${formattedActivities.length})`);

      res.status(200).json({
        success: true,
        message: 'Activities retrieved successfully',
        data: formattedActivities,
      });
    } catch (error: any) {
      logger.error('❌ Error getting recent activities:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve recent activities', 500);
    }
  });

  /**
   * Get system notifications
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { limit = 10, unreadOnly = 'false' } = req.query;
      const limitNum = Math.min(Number(limit), 50); // Max 50 notifications
      
      // Get actual notifications from database
      const db = database.getDb();
      const notificationsCollection = db.collection('notifications');
      
      // Build query filter
      const filter: any = {
        $or: [
          { userId: req.user.userId },
          { organizationId: req.user.organizationId },
          { recipientType: 'ALL' },
          { recipientRoles: { $in: req.user.role } }
        ]
      };

      // Add unread filter if requested
      if (unreadOnly === 'true') {
        filter.read = { $ne: true };
      }

      const notifications = await notificationsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .toArray();

      // Get total count and unread count
      const [totalCount, unreadCount] = await Promise.all([
        notificationsCollection.countDocuments({
          $or: [
            { userId: req.user.userId },
            { organizationId: req.user.organizationId },
            { recipientType: 'ALL' },
            { recipientRoles: { $in: req.user.role } }
          ]
        }),
        notificationsCollection.countDocuments({
          $or: [
            { userId: req.user.userId },
            { organizationId: req.user.organizationId },
            { recipientType: 'ALL' },
            { recipientRoles: { $in: req.user.role } }
          ],
          read: { $ne: true }
        })
      ]);

      // Transform notifications to expected format
      const formattedNotifications = notifications.map(notification => ({
        id: notification._id.toString(),
        title: notification.title || 'Notification',
        message: notification.message || notification.content || 'You have a new notification',
        type: notification.type || 'INFO',
        timestamp: notification.createdAt || notification.timestamp || new Date().toISOString(),
        read: notification.read || false,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        expiresAt: notification.expiresAt
      }));

      // If no notifications found, create welcome notification for new users
      if (formattedNotifications.length === 0 && unreadOnly !== 'true') {
        formattedNotifications.push({
          id: 'welcome',
          title: 'Welcome to BlockTrade',
          message: 'Welcome to the BlockTrade platform! Your notifications will appear here.',
          type: 'INFO',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: undefined,
          actionText: undefined,
          expiresAt: undefined
        });
      }

      logger.info(`🔔 Notifications retrieved for user: ${req.user.username} (count: ${formattedNotifications.length}, unreadOnly: ${unreadOnly})`);

      res.status(200).json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: formattedNotifications,
        meta: {
          total: totalCount,
          unreadCount: unreadCount,
          limit: limitNum
        }
      });
    } catch (error: any) {
      logger.error('❌ Error getting notifications:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve notifications', 500);
    }
  });

  /**
   * Get dashboard alerts
   */
  getAlerts = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { limit = 10, severity, acknowledged } = req.query;
      const limitNum = Math.min(Number(limit), 50); // Max 50 alerts
      
      // Get actual alerts from database
      const db = database.getDb();
      const alertsCollection = db.collection('alerts');
      
      // Build query filter
      const filter: any = {
        $or: [
          { userId: req.user.userId },
          { organizationId: req.user.organizationId },
          { recipientType: 'ALL' },
          { recipientRoles: { $in: req.user.role } }
        ]
      };

      // Add severity filter if provided
      if (severity && typeof severity === 'string') {
        filter.severity = severity.toUpperCase();
      }

      // Add acknowledged filter if provided
      if (acknowledged !== undefined && typeof acknowledged === 'string') {
        filter.acknowledged = acknowledged === 'true';
      }

      const alerts = await alertsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .toArray();

      // Generate alerts based on existing data if no alerts collection exists
      let formattedAlerts = alerts.map(alert => ({
        id: alert._id.toString(),
        title: alert.title || 'System Alert',
        message: alert.message || 'An alert has been generated',
        severity: alert.severity || 'MEDIUM',
        category: alert.category || 'SYSTEM',
        timestamp: alert.createdAt || alert.timestamp || new Date().toISOString(),
        acknowledged: alert.acknowledged || false,
        actionRequired: alert.actionRequired || false,
        actionUrl: alert.actionUrl
      }));

      // If no alerts found, generate some based on current system state
      if (formattedAlerts.length === 0) {
        const lcCollection = db.collection('letters_of_credit');
        const userCollection = db.collection('users');
        
        const [highValueLCs, failedLogins] = await Promise.all([
          lcCollection.find({
            $or: [
              { applicantId: req.user.organizationId },
              { beneficiaryId: req.user.organizationId },
              { issuingBankId: req.user.organizationId }
            ],
            'amount.value': { $gte: 1000000 },
            status: 'PENDING_APPROVAL'
          }).limit(5).toArray(),
          
          userCollection.find({
            organizationId: req.user.organizationId,
            'loginAttempts.failed': { $gte: 3 },
            'loginAttempts.lastAttempt': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }).limit(3).toArray()
        ]);

        // Generate high value LC alerts
        highValueLCs.forEach((lc, index) => {
          formattedAlerts.push({
            id: `hv_lc_${index}`,
            title: 'High Value Transaction Alert',
            message: `Letter of Credit ${lc.lcNumber} exceeds $${(lc.amount.value / 1000000).toFixed(1)}M ${lc.amount.currency} threshold`,
            severity: 'HIGH',
            category: 'COMPLIANCE',
            timestamp: new Date(Date.now() - (index + 1) * 60 * 60 * 1000).toISOString(),
            acknowledged: false,
            actionRequired: true,
            actionUrl: `/letter-of-credit/review/${lc.lcNumber}`
          });
        });

        // Generate security alerts for failed logins
        failedLogins.forEach((user, index) => {
          formattedAlerts.push({
            id: `sec_login_${index}`,
            title: 'Failed Login Attempts',
            message: `Multiple failed login attempts detected for user ${user.username}`,
            severity: 'MEDIUM',
            category: 'SECURITY',
            timestamp: new Date(Date.now() - (index + 2) * 60 * 60 * 1000).toISOString(),
            acknowledged: false,
            actionRequired: false,
            actionUrl: undefined
          });
        });

        // If still no alerts, add a welcome message
        if (formattedAlerts.length === 0) {
          formattedAlerts.push({
            id: 'welcome',
            title: 'System Monitoring Active',
            message: 'Your security and compliance alerts will appear here',
            severity: 'LOW',
            category: 'SYSTEM',
            timestamp: new Date().toISOString(),
            acknowledged: false,
            actionRequired: false,
            actionUrl: undefined
          });
        }
      }

      // Sort by severity and timestamp
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      formattedAlerts.sort((a, b) => {
        const severityDiff = (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
                            (severityOrder[a.severity as keyof typeof severityOrder] || 0);
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      logger.info(`🚨 Alerts retrieved for user: ${req.user.username} (count: ${formattedAlerts.length})`);

      res.status(200).json({
        success: true,
        message: 'Alerts retrieved successfully',
        data: formattedAlerts.slice(0, limitNum),
        meta: {
          total: formattedAlerts.length,
          highPriorityCount: formattedAlerts.filter(a => a.severity === 'HIGH').length,
          unacknowledgedCount: formattedAlerts.filter(a => !a.acknowledged).length
        }
      });
    } catch (error: any) {
      logger.error('❌ Error getting alerts:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve alerts', 500);
    }
  });

  /**
   * Get compliance status
   */
  getComplianceStatus = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Get user's organization info
      let organization = null;
      if (req.user.organizationId) {
        organization = await this.organizationModel.findById(req.user.organizationId);
      }

      // Mock compliance status - replace with actual compliance checks
      const complianceStatus = {
        kycStatus: organization?.kycStatus || 'PENDING',
        amlStatus: 'CLEARED',
        documentVerification: 'COMPLETED',
        overallScore: Math.floor(Math.random() * 30) + 70, // 70-100
        lastCheck: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      };

      logger.info(`🛡️ Compliance status retrieved for user: ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Compliance status retrieved successfully',
        data: complianceStatus,
      });
    } catch (error: any) {
      logger.error('❌ Error getting compliance status:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve compliance status', 500);
    }
  });

  /**
   * Get system health
   */
  getSystemHealth = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Mock system health - replace with actual system checks
      const systemHealth = {
        blockchainStatus: 'HEALTHY',
        apiStatus: 'OPERATIONAL',
        databaseStatus: 'CONNECTED',
        securityStatus: 'SECURE',
        lastCheck: new Date().toISOString(),
        uptime: Math.floor(Math.random() * 1000000) + 500000, // seconds
      };

      logger.info(`🏥 System health retrieved for user: ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'System health retrieved successfully',
        data: systemHealth,
      });
    } catch (error: any) {
      logger.error('❌ Error getting system health:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve system health', 500);
    }
  });

  /**
   * Mark notification as read
   */
  markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { notificationId } = req.params;
      
      // Mock implementation - replace with actual database update
      logger.info(`✅ Notification ${notificationId} marked as read by user: ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error: any) {
      logger.error('❌ Error marking notification as read:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to mark notification as read', 500);
    }
  });

  /**
   * Acknowledge alert
   */
  acknowledgeAlert = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { alertId } = req.params;
      
      // Mock implementation - replace with actual database update
      logger.info(`✅ Alert ${alertId} acknowledged by user: ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Alert acknowledged',
      });
    } catch (error: any) {
      logger.error('❌ Error acknowledging alert:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to acknowledge alert', 500);
    }
  });

  /**
   * Get quick actions for user
   */
  getQuickActions = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { organizationType, role } = req.query;
      const userOrgType = (typeof organizationType === 'string' ? organizationType : req.user.organizationType) as string;
      const userRole = (typeof role === 'string' ? role : req.user.role) as string;

      // Define quick actions based on role and organization type
      const allQuickActions = [
        {
          id: 'create-lc',
          title: 'Create Letter of Credit',
          description: 'Start a new LC application',
          icon: 'document-plus',
          route: '/letter-of-credit/create',
          color: 'primary',
          priority: 1,
          requiredRoles: ['bank_admin', 'bank_officer', 'corporate_admin', 'corporate_manager'],
          requiredOrgTypes: ['bank', 'corporate']
        },
        {
          id: 'upload-documents',
          title: 'Upload Documents',
          description: 'Upload trade documents',
          icon: 'cloud-arrow-up',
          route: '/documents/upload',
          color: 'secondary',
          priority: 2,
          requiredRoles: ['corporate_user', 'corporate_manager', 'corporate_admin', 'bank_officer'],
          requiredOrgTypes: ['corporate', 'bank']
        },
        {
          id: 'review-applications',
          title: 'Review Applications',
          description: 'Review pending LC applications',
          icon: 'clipboard-document-check',
          route: '/letter-of-credit/review',
          color: 'warning',
          priority: 3,
          requiredRoles: ['bank_admin', 'bank_officer'],
          requiredOrgTypes: ['bank']
        },
        {
          id: 'process-payments',
          title: 'Process Payments',
          description: 'Manage payment processing',
          icon: 'banknotes',
          route: '/payments',
          color: 'success',
          priority: 4,
          requiredRoles: ['bank_admin', 'bank_officer', 'nbfc_admin', 'nbfc_manager'],
          requiredOrgTypes: ['bank', 'nbfc']
        },
        {
          id: 'view-reports',
          title: 'View Reports',
          description: 'Access analytics and reports',
          icon: 'chart-bar',
          route: '/reports',
          color: 'info',
          priority: 5,
          requiredRoles: ['bank_admin', 'corporate_admin', 'organization_admin'],
          requiredOrgTypes: ['bank', 'corporate', 'nbfc', 'logistics', 'insurance']
        },
        {
          id: 'manage-users',
          title: 'Manage Users',
          description: 'User administration',
          icon: 'users',
          route: '/admin/users',
          color: 'danger',
          priority: 6,
          requiredRoles: ['organization_admin', 'organization_super_admin'],
          requiredOrgTypes: ['bank', 'corporate', 'nbfc', 'logistics', 'insurance']
        }
      ];

      // Filter actions based on user's role and organization type
      const availableActions = allQuickActions.filter(action => {
        const hasRequiredRole = action.requiredRoles.includes(userRole);
        const hasRequiredOrgType = action.requiredOrgTypes.includes(userOrgType);
        return hasRequiredRole && hasRequiredOrgType;
      }).sort((a, b) => a.priority - b.priority);

      logger.info(`🎯 Quick actions retrieved for user: ${req.user.username} (role: ${userRole}, org: ${userOrgType})`);

      res.status(200).json({
        success: true,
        message: 'Quick actions retrieved successfully',
        data: availableActions,
      });
    } catch (error: any) {
      logger.error('❌ Error getting quick actions:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve quick actions', 500);
    }
  });

  /**
   * Export dashboard data
   */
  exportDashboardData = asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { format = 'json' } = req.query;
      
      // Mock export data - replace with actual data collection
      const exportData = {
        user: {
          username: req.user.username,
          role: req.user.role,
          organizationType: req.user.organizationType,
        },
        stats: {
          totalLettersOfCredit: 75,
          completedTransactions: 45,
          totalVolume: 5500000,
        },
        exportedAt: new Date().toISOString(),
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = `Username,Role,Organization Type,Total LCs,Completed Transactions,Total Volume,Exported At\n${req.user.username},${req.user.role},${req.user.organizationType},75,45,5500000,${new Date().toISOString()}`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="dashboard-export.csv"');
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="dashboard-export.json"');
        res.json(exportData);
      }

      logger.info(`📥 Dashboard data exported by user: ${req.user.username} (format: ${format})`);
    } catch (error: any) {
      logger.error('❌ Error exporting dashboard data:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to export dashboard data', 500);
    }
  });
}

export default DashboardController;
