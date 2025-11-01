import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Document Management API - Coming Soon' });
});

export { router as documentRoutes };
