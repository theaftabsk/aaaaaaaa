import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to protect all dashboard endpoints
router.use(authMiddleware);

router.get('/stats', getDashboardStats);

export default router;
