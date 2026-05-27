import { Router } from 'express';
import { getContacts, createContact, updateContact, deleteContact } from '../controllers/crmController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to protect all CRM endpoints
router.use(authMiddleware);

router.get('/contacts', getContacts);
router.post('/contacts', createContact);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);

export default router;
