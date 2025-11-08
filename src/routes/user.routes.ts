import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { UserJourneyModel } from '../models/UserJourney.model';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/users/{userId}/journey:
 *   get:
 *     summary: Get user journey progress
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User journey retrieved successfully
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
 *                     userId:
 *                       type: string
 *                     totalSteps:
 *                       type: number
 *                     stepsCompleted:
 *                       type: array
 *                       items:
 *                         type: number
 *                     currentStep:
 *                       type: number
 *                     isCompleted:
 *                       type: boolean
 *                     startedAt:
 *                       type: string
 *                       format: date-time
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                     lastActivity:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only access your own journey
 *       404:
 *         description: User journey not found
 *       500:
 *         description: Server error
 */
router.get('/:userId/journey', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { userId } = req.params;
    
    // Users can only access their own journey unless they are admin
    if (userId !== req.user.userId && !req.user.role.includes('admin')) {
      throw new AppError('You can only access your own user journey', 403);
    }

    const userJourneyModel = new UserJourneyModel();
    const journey = await userJourneyModel.findByUserId(userId);

    if (!journey) {
      throw new AppError('User journey not found', 404);
    }

    logger.info(`📊 User journey retrieved for user: ${userId} by ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Journey retrieved successfully',
      data: {
        userId: journey.userId,
        totalSteps: journey.totalSteps,
        stepsCompleted: journey.stepsCompleted,
        currentStep: journey.currentStep,
        isCompleted: journey.isCompleted,
        startedAt: journey.startedAt,
        completedAt: journey.completedAt,
        lastActivity: journey.lastActivity,
      },
    });
  } catch (error: any) {
    logger.error('❌ Error getting user journey:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to retrieve user journey', 500);
  }
}));

/**
 * @swagger
 * /api/users/{userId}/journey/step:
 *   post:
 *     summary: Complete a journey step
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stepNumber
 *             properties:
 *               stepNumber:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Step number to complete
 *               metadata:
 *                 type: object
 *                 description: Additional step metadata
 *     responses:
 *       200:
 *         description: Journey step completed successfully
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only update your own journey
 *       400:
 *         description: Invalid step number or step already completed
 *       500:
 *         description: Server error
 */
router.post('/:userId/journey/step', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { userId } = req.params;
    const { stepNumber, metadata = {} } = req.body;
    
    // Users can only update their own journey
    if (userId !== req.user.userId) {
      throw new AppError('You can only update your own user journey', 403);
    }

    if (!stepNumber || stepNumber < 1 || stepNumber > 5) {
      throw new AppError('Invalid step number. Must be between 1 and 5', 400);
    }

    const userJourneyModel = new UserJourneyModel();
    const result = await userJourneyModel.completeStep(userId, req.user.organizationId, stepNumber, metadata);

    if (!result) {
      throw new AppError('Failed to complete journey step. Step may already be completed.', 400);
    }

    logger.info(`✅ Journey step ${stepNumber} completed for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: `Journey step ${stepNumber} completed successfully`,
      data: {
        stepNumber,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('❌ Error completing journey step:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to complete journey step', 500);
  }
}));

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *       - in: query
 *         name: organizationType
 *         schema:
 *           type: string
 *         description: Filter by organization type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username, email, or name
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Server error
 */
router.get('/', requireRole(['bank_admin', 'corporate_admin', 'nbfc_admin', 'logistics_admin', 'insurance_admin']), (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'User listing endpoint - Coming Soon',
    data: {
      endpoint: '/api/users',
      method: 'GET',
      access: 'Organization Admin only',
      status: 'Not Implemented'
    }
  });
});

export { router as userRoutes };
