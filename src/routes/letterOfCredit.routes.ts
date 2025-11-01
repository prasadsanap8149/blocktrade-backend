import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { 
  createLCSchema, 
  updateLCSchema, 
  updateLCStatusSchema
} from '../schemas/letterOfCredit.schemas';

const router = Router();

// Dynamic import of controller to avoid database connection issues
let lcController: any = null;

const getLCController = async () => {
  if (!lcController) {
    const { default: LetterOfCreditController } = await import('../controllers/letterOfCredit.controller');
    lcController = new LetterOfCreditController();
  }
  return lcController;
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     LCDocument:
 *       type: object
 *       required:
 *         - documentType
 *       properties:
 *         documentType:
 *           type: string
 *           description: Type of document required
 *         required:
 *           type: boolean
 *           default: true
 *           description: Whether this document is mandatory
 *         copies:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 1
 *           description: Number of copies required
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Additional description for the document
 *         originalRequired:
 *           type: boolean
 *           default: false
 *           description: Whether original document is required
 * 
 *     CreateLCRequest:
 *       type: object
 *       required:
 *         - applicantId
 *         - beneficiaryId
 *         - issuingBankId
 *         - amount
 *         - currency
 *         - description
 *         - expiryDate
 *         - incoterms
 *         - requiredDocuments
 *         - tolerance
 *       properties:
 *         applicantId:
 *           type: string
 *           description: ID of the applicant organization
 *         beneficiaryId:
 *           type: string
 *           description: ID of the beneficiary organization
 *         issuingBankId:
 *           type: string
 *           description: ID of the issuing bank
 *         advisingBankId:
 *           type: string
 *           description: ID of the advising bank (optional)
 *         amount:
 *           type: number
 *           minimum: 0.01
 *           description: LC amount
 *         currency:
 *           type: string
 *           enum: [USD, EUR, GBP, JPY, CNY, INR, AED, SGD, HKD, CHF, CAD, AUD]
 *           description: Currency code
 *         description:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           description: Description of goods/services
 *         expiryDate:
 *           type: string
 *           format: date
 *           description: LC expiry date
 *         lastShipmentDate:
 *           type: string
 *           format: date
 *           description: Last date for shipment (optional)
 *         presentationPeriod:
 *           type: integer
 *           minimum: 1
 *           maximum: 21
 *           default: 21
 *           description: Days for document presentation
 *         incoterms:
 *           type: string
 *           enum: [EXW, FCA, CPT, CIP, DAT, DAP, DDP, FAS, FOB, CFR, CIF]
 *           description: International commercial terms
 *         partialShipments:
 *           type: boolean
 *           default: false
 *           description: Whether partial shipments are allowed
 *         transshipment:
 *           type: boolean
 *           default: false
 *           description: Whether transshipment is allowed
 *         requiredDocuments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LCDocument'
 *           minItems: 1
 *           description: List of required documents
 *         tolerance:
 *           type: object
 *           required:
 *             - amountPlus
 *             - amountMinus
 *           properties:
 *             amountPlus:
 *               type: number
 *               minimum: 0
 *               maximum: 10
 *               description: Positive tolerance percentage
 *             amountMinus:
 *               type: number
 *               minimum: 0
 *               maximum: 10
 *               description: Negative tolerance percentage
 *         specialInstructions:
 *           type: string
 *           maxLength: 2000
 *           description: Special instructions for the LC
 */

/**
 * @swagger
 * /api/lc:
 *   post:
 *     tags: [Letter of Credit]
 *     summary: Create a new Letter of Credit
 *     description: Creates a new Letter of Credit application
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLCRequest'
 *     responses:
 *       201:
 *         description: Letter of Credit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Letter of Credit created successfully
 *                 data:
 *                   type: object
 *                   description: Created LC details
 *       400:
 *         description: Bad request - validation errors
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', validate(createLCSchema), async (req, res, next) => {
  const controller = await getLCController();
  return controller.createLC(req, res, next);
});

/**
 * @swagger
 * /api/lc:
 *   get:
 *     tags: [Letter of Credit]
 *     summary: Search Letters of Credit
 *     description: Search and filter Letters of Credit based on various criteria
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated list of statuses to filter by
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Currency code to filter by
 *       - in: query
 *         name: amountMin
 *         schema:
 *           type: number
 *         description: Minimum amount filter
 *       - in: query
 *         name: amountMax
 *         schema:
 *           type: number
 *         description: Maximum amount filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: List of Letters of Credit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: LC summary data
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res, next) => {
  const controller = await getLCController();
  return controller.searchLCs(req, res, next);
});

/**
 * @swagger
 * /api/lc/statistics:
 *   get:
 *     tags: [Letter of Credit]
 *     summary: Get LC statistics
 *     description: Get statistical data about Letters of Credit
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: LC statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Statistical data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/statistics', async (req, res, next) => {
  const controller = await getLCController();
  return controller.getLCStatistics(req, res, next);
});

/**
 * @swagger
 * /api/lc/{id}:
 *   get:
 *     tags: [Letter of Credit]
 *     summary: Get Letter of Credit by ID
 *     description: Retrieve detailed information about a specific Letter of Credit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Letter of Credit ID
 *     responses:
 *       200:
 *         description: Letter of Credit details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Detailed LC information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - access denied to this LC
 *       404:
 *         description: Letter of Credit not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res, next) => {
  const controller = await getLCController();
  return controller.getLCById(req, res, next);
});

/**
 * @swagger
 * /api/lc/{id}:
 *   put:
 *     tags: [Letter of Credit]
 *     summary: Update Letter of Credit
 *     description: Update an existing Letter of Credit (only draft and submitted LCs can be updated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Letter of Credit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               # ... other updatable fields
 *     responses:
 *       200:
 *         description: Letter of Credit updated successfully
 *       400:
 *         description: Bad request - validation errors or LC cannot be updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Letter of Credit not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', validate(updateLCSchema), async (req, res, next) => {
  const controller = await getLCController();
  return controller.updateLC(req, res, next);
});

/**
 * @swagger
 * /api/lc/{id}/status:
 *   patch:
 *     tags: [Letter of Credit]
 *     summary: Update LC status
 *     description: Update the status of a Letter of Credit (workflow transition)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Letter of Credit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newStatus
 *             properties:
 *               newStatus:
 *                 type: string
 *                 enum: [draft, submitted, under_review, approved, rejected, issued, documents_received, documents_examining, documents_accepted, documents_rejected, payment_authorized, payment_completed, expired, cancelled, amended]
 *                 description: New status for the LC
 *               comments:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Comments for the status change
 *               supportingDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of supporting document IDs
 *     responses:
 *       200:
 *         description: LC status updated successfully
 *       400:
 *         description: Bad request - invalid status transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Letter of Credit not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/status', validate(updateLCStatusSchema), async (req, res, next) => {
  const controller = await getLCController();
  return controller.updateLCStatus(req, res, next);
});

/**
 * @swagger
 * /api/lc/{id}:
 *   delete:
 *     tags: [Letter of Credit]
 *     summary: Delete Letter of Credit
 *     description: Delete a Letter of Credit (only draft LCs can be deleted)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Letter of Credit ID
 *     responses:
 *       200:
 *         description: Letter of Credit deleted successfully
 *       400:
 *         description: Bad request - LC cannot be deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Letter of Credit not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res, next) => {
  const controller = await getLCController();
  return controller.deleteLC(req, res, next);
});

export { router as letterOfCreditRoutes };
