import { Router } from 'express';
import {
  getInboxContacts,
  getInboxMessages,
  assignConversation,
  toggleBotTakeover,
  sendUnifiedInboxMessage
} from '../controllers/inboxController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to protect all Inbox endpoints
router.use(authMiddleware);

router.get('/contacts', getInboxContacts);
router.get('/messages/:phone', getInboxMessages);
router.post('/assign', assignConversation);
router.post('/takeover', toggleBotTakeover);
router.post('/send', sendUnifiedInboxMessage);

export default router;
