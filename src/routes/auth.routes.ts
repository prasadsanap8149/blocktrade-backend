import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate, validationSchemas } from '../middleware/validation.middleware';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 login attempts per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/organizations:
 *   get:
 *     summary: Get available organizations for registration
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [bank, nbfc, corporate, logistics, insurance]
 *         description: Filter by organization type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search organizations by name or registration number
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
 *         description: Number of organizations per page
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
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
 *                     organizations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           countryCode:
 *                             type: string
 *                           kycStatus:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         pages:
 *                           type: number
 *       500:
 *         description: Server error
 */
router.get(
  '/organizations',
  authController.getAvailableOrganizations
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - confirmPassword
 *               - firstName
 *               - lastName
 *               - organizationName
 *               - organizationType
 *               - acceptTerms
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@bank.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *               confirmPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional - provide if joining existing organization
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               organizationName:
 *                 type: string
 *                 example: Global Bank Corp
 *               organizationType:
 *                 type: string
 *                 enum: [bank, nbfc, corporate, logistics, insurance]
 *                 example: bank
 *               isNewOrganization:
 *                 type: boolean
 *                 description: Set to true when creating a new organization
 *                 example: true
 *               organizationRegistrationNumber:
 *                 type: string
 *                 description: Required for new organizations
 *                 example: REG123456789
 *               organizationCountryCode:
 *                 type: string
 *                 description: Two-letter country code for new organizations
 *                 example: US
 *               organizationAddress:
 *                 type: object
 *                 description: Address for new organizations
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *               organizationContactPerson:
 *                 type: object
 *                 description: Contact person for new organizations
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *               organizationSwiftCode:
 *                 type: string
 *                 description: SWIFT code for banks (11 characters)
 *                 example: BOFAUS3NXXX
 *               organizationLicenseNumber:
 *                 type: string
 *                 description: License number for regulated organizations
 *                 example: LIC789012345
 *               acceptTerms:
 *                 type: boolean
 *                 description: Must be true
 *                 example: true
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Auto-assigned based on role
 *                 example: ["lc:create", "lc:view", "document:verify"]
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                     user:
 *                       type: object
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         expiresIn:
 *                           type: number
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: User already exists
 */
router.post(
  '/register',
  authLimiter,
  validate(validationSchemas.register),
  authController.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *               mfaCode:
 *                 type: string
 *                 description: Required if MFA is enabled
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     user:
 *                       type: object
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         expiresIn:
 *                           type: number
 *       401:
 *         description: Invalid credentials
 *       422:
 *         description: MFA code required
 *       423:
 *         description: Account locked
 */
router.post(
  '/login',
  loginLimiter,
  validate(validationSchemas.login),
  authController.login
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/me',
  authenticateToken,
  authController.getCurrentUser
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post(
  '/refresh',
  validate(validationSchemas.refreshToken),
  authController.refreshToken
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post(
  '/logout',
  authenticateToken,
  authController.logout
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@bank.com
 *     responses:
 *       200:
 *         description: Password reset email sent (if account exists)
 */
router.post(
  '/forgot-password',
  validate(validationSchemas.forgotPassword),
  authController.forgotPassword
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: "abc123xyz789"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePass123!"
 *               confirmPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/reset-password',
  validate(validationSchemas.resetPassword),
  authController.resetPassword
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password (authenticated user)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "OldPassword123!"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePass123!"
 *               confirmPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 */
router.post(
  '/change-password',
  authenticateToken,
  validate(validationSchemas.changePassword),
  authController.changePassword
);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               bio:
 *                 type: string
 *                 example: "Senior Trade Finance Officer"
 *               timezone:
 *                 type: string
 *                 example: "America/New_York"
 *               language:
 *                 type: string
 *                 example: "en"
 *               notifications:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   sms:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   marketing:
 *                     type: boolean
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put(
  '/profile',
  authenticateToken,
  validate(validationSchemas.updateProfile),
  authController.updateProfile
);

// Admin routes for user management
/**
 * @route GET /api/auth/users
 * @desc Get all users (Admin only)
 * @access Private (Admin)
 */
router.get(
  '/users',
  authenticateToken,
  requireRole(['bank_admin']),
  (req, res) => {
    res.status(501).json({
      success: false,
      message: 'User management endpoint - Coming Soon',
      data: {
        endpoint: '/api/auth/users',
        method: 'GET',
        access: 'Bank Admin only',
        status: 'Not Implemented'
      }
    });
  }
);

/**
 * @route PUT /api/auth/users/:userId/status
 * @desc Update user status (Admin only)
 * @access Private (Admin)
 */
router.put(
  '/users/:userId/status',
  authenticateToken,
  requireRole(['bank_admin']),
  (req, res) => {
    res.status(501).json({
      success: false,
      message: 'User status update endpoint - Coming Soon',
      data: {
        endpoint: '/api/auth/users/:userId/status',
        method: 'PUT',
        access: 'Bank Admin only',
        status: 'Not Implemented'
      }
    });
  }
);

export { router as authRoutes };
