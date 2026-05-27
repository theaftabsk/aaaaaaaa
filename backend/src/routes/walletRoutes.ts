import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  getMyWallet,
  getTransactions,
  getPricing,
  initiateRecharge,
  verifyRecharge,
} from '../controllers/walletController';

const router = Router();

router.get('/',                    authMiddleware, getMyWallet);
router.get('/transactions',        authMiddleware, getTransactions);
router.get('/pricing',             authMiddleware, getPricing);
router.post('/recharge/initiate',  authMiddleware, initiateRecharge);
router.post('/recharge/verify',    authMiddleware, verifyRecharge);

export default router;
