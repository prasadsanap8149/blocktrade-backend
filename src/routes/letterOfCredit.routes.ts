// Placeholder routes - will be implemented as needed
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Letter of Credit API - Coming Soon' });
});

export { router as letterOfCreditRoutes };
