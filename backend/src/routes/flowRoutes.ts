import { Router } from 'express';
import { getFlows, getFlowById, createFlow, updateFlow, deleteFlow } from '../controllers/flowController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to protect all Chatbot Flow endpoints
router.use(authMiddleware);

router.get('/', getFlows);
router.get('/:id', getFlowById);
router.post('/', createFlow);
router.put('/:id', updateFlow);
router.delete('/:id', deleteFlow);

export default router;
