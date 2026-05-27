import { Router } from 'express';
import { getCampaigns, createCampaign, deleteCampaign, getBroadcastStats } from '../controllers/broadcastController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to protect all Broadcast endpoints
router.use(authMiddleware);

router.get('/campaigns', getCampaigns);
router.get('/stats', getBroadcastStats);
router.post('/campaigns', createCampaign);
router.delete('/campaigns/:id', deleteCampaign);

export default router;
