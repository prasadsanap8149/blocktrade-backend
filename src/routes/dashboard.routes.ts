import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const dashboardController = new DashboardController();

// Apply rate limiting to dashboard routes
const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: 'Too many dashboard requests, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(dashboardLimiter);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time range for statistics
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalLettersOfCredit:
 *                       type: number
 *                     pendingApprovals:
 *                       type: number
 *                     completedTransactions:
 *                       type: number
 *                     totalVolume:
 *                       type: number
 *                     activeDocuments:
 *                       type: number
 *                     pendingPayments:
 *                       type: number
 *                     monthlyGrowth:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stats', dashboardController.getDashboardStats);

/**
 * @swagger
 * /api/dashboard/activities:
 *   get:
 *     summary: Get recent activities
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Number of activities to retrieve
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [LC_CREATED, LC_APPROVED, LC_REJECTED, DOCUMENT_UPLOADED, PAYMENT_PROCESSED, COMPLIANCE_CHECK]
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         enum: [SUCCESS, PENDING, FAILED, WARNING]
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       priority:
 *                         type: string
 *                         enum: [LOW, MEDIUM, HIGH]
 *                       metadata:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/activities', dashboardController.getRecentActivities);

/**
 * @swagger
 * /api/dashboard/notifications:
 *   get:
 *     summary: Get system notifications
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [INFO, WARNING, ERROR, SUCCESS]
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       read:
 *                         type: boolean
 *                       actionUrl:
 *                         type: string
 *                       actionText:
 *                         type: string
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/notifications', dashboardController.getNotifications);

/**
 * @swagger
 * /api/dashboard/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.put('/notifications/:notificationId/read', dashboardController.markNotificationAsRead);

/**
 * @swagger
 * /api/dashboard/alerts:
 *   get:
 *     summary: Get dashboard alerts
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       severity:
 *                         type: string
 *                         enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                       category:
 *                         type: string
 *                         enum: [COMPLIANCE, SECURITY, SYSTEM, BUSINESS]
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       acknowledged:
 *                         type: boolean
 *                       actionRequired:
 *                         type: boolean
 *                       actionUrl:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/alerts', dashboardController.getAlerts);

/**
 * @swagger
 * /api/dashboard/alerts/{alertId}/acknowledge:
 *   put:
 *     summary: Acknowledge alert
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.put('/alerts/:alertId/acknowledge', dashboardController.acknowledgeAlert);

/**
 * @swagger
 * /api/dashboard/compliance:
 *   get:
 *     summary: Get compliance status
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compliance status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     kycStatus:
 *                       type: string
 *                       enum: [VERIFIED, PENDING, EXPIRED, REJECTED]
 *                     amlStatus:
 *                       type: string
 *                       enum: [CLEARED, PENDING, FLAGGED]
 *                     documentVerification:
 *                       type: string
 *                       enum: [COMPLETED, PENDING, EXPIRED]
 *                     overallScore:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                     lastCheck:
 *                       type: string
 *                       format: date-time
 *                     nextReview:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/compliance', dashboardController.getComplianceStatus);

/**
 * @swagger
 * /api/dashboard/system-health:
 *   get:
 *     summary: Get system health status
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     blockchainStatus:
 *                       type: string
 *                       enum: [HEALTHY, DEGRADED, DOWN]
 *                     apiStatus:
 *                       type: string
 *                       enum: [OPERATIONAL, DEGRADED, DOWN]
 *                     databaseStatus:
 *                       type: string
 *                       enum: [CONNECTED, SLOW, DISCONNECTED]
 *                     securityStatus:
 *                       type: string
 *                       enum: [SECURE, WARNING, BREACH]
 *                     lastCheck:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       description: System uptime in seconds
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/system-health', dashboardController.getSystemHealth);

/**
 * @swagger
 * /api/dashboard/quick-actions:
 *   get:
 *     summary: Get quick actions for user
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationType
 *         schema:
 *           type: string
 *           enum: [bank, corporate, nbfc, logistics, insurance]
 *         description: Filter by organization type
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *     responses:
 *       200:
 *         description: Quick actions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       icon:
 *                         type: string
 *                       route:
 *                         type: string
 *                       color:
 *                         type: string
 *                       priority:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/quick-actions', dashboardController.getQuickActions);

/**
 * @swagger
 * /api/dashboard/export:
 *   get:
 *     summary: Export dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *     responses:
 *       200:
 *         description: Dashboard data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/export', dashboardController.exportDashboardData);

export { router as dashboardRoutes };
