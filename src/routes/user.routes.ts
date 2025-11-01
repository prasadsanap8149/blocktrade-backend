import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'User Management API - Coming Soon' });
});

export { router as userRoutes };
