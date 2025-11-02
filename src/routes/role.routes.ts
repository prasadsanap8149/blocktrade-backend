import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { 
  createRoleSchema, 
  assignRoleSchema, 
  updateRoleSchema,
  journeyStepSchema,
  initOrganizationSchema
} from '../schemas/role.schemas';

const router = Router();

// Lazy initialization of RoleController to ensure database is connected
let roleController: RoleController;

const getRoleController = () => {
  if (!roleController) {
    roleController = new RoleController();
  }
  return roleController;
};

// Apply authentication to all role routes
router.use(authenticateToken);

// Role Management Routes
router.post('/roles', validate(createRoleSchema), (req, res) => getRoleController().createRole(req, res));
router.get('/roles', (req, res) => getRoleController().getRoles(req, res));
router.get('/roles/platform', (req, res) => getRoleController().getPlatformRoles(req, res));
router.get('/roles/hierarchy', (req, res) => getRoleController().getRoleHierarchy(req, res));
router.put('/roles/:roleId', validate(updateRoleSchema), (req, res) => getRoleController().updateRole(req, res));
router.delete('/roles/:roleId', (req, res) => getRoleController().deleteRole(req, res));

// Role Assignment Routes
router.post('/roles/assign', validate(assignRoleSchema), (req, res) => getRoleController().assignRole(req, res));
router.delete('/roles/revoke', (req, res) => getRoleController().revokeRole(req, res));
router.get('/roles/user/:userId', (req, res) => getRoleController().getUserRoles(req, res));

// User Journey Routes
router.post('/roles/journey/start', (req, res) => getRoleController().startUserJourney(req, res));
router.get('/roles/journey/:userId', (req, res) => getRoleController().getUserJourneyStatus(req, res));
router.post('/roles/journey/step/:stepNumber', validate(journeyStepSchema), (req, res) => getRoleController().completeJourneyStep(req, res));
router.get('/roles/journey/config', (req, res) => getRoleController().getJourneyConfiguration(req, res));

// System Administration Routes
router.post('/roles/init-organization', validate(initOrganizationSchema), (req, res) => getRoleController().initializeOrganizationRoles(req, res));

export default router;
