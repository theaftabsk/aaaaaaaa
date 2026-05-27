import { Router } from 'express';
import { 
  getGroups, createGroup, updateGroup, deleteGroup,
  getLabels, createLabel, updateLabel, deleteLabel,
  getContacts, createContact, updateContact, deleteContact, importContacts
} from '../controllers/phonebookController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

// Contacts
router.get('/contacts', getContacts);
router.post('/contacts', createContact);
router.put('/contacts/:id', updateContact);
router.post('/contacts/import', importContacts);
router.delete('/contacts/:id', deleteContact);

// Groups
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.put('/groups/:id', updateGroup);
router.delete('/groups/:id', deleteGroup);

// Labels
router.get('/labels', getLabels);
router.post('/labels', createLabel);
router.put('/labels/:id', updateLabel);
router.delete('/labels/:id', deleteLabel);

export default router;
