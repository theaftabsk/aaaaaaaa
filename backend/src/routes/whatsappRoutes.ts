import { Router } from 'express';
import { sendManualMessage, getSessions } from '../controllers/whatsappController';
import { handleMetaOauthCallback, getMetaBusinesses, getMetaPhones, verifyAndSaveMetaCredentials, getMetaTemplates } from '../controllers/metaController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// Send message via Cloud API
router.post('/send', sendManualMessage);
router.get('/sessions', getSessions);

// Meta API & OAuth Endpoints
router.post('/meta/oauth/callback', handleMetaOauthCallback);
router.get('/meta/businesses', getMetaBusinesses);
router.get('/meta/phones', getMetaPhones);
router.post('/meta/verify', verifyAndSaveMetaCredentials);
router.get('/meta/templates', getMetaTemplates);

export default router;
