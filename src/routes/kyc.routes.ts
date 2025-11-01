import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'KYC/AML API - Coming Soon' });
});

export { router as kycRoutes };
