import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload, uploadFiles, listFiles, deleteFile, getStorageUsage } from '../controllers/mediaController';

const router = Router();

router.post('/upload',  authMiddleware, upload.array('files', 20), uploadFiles);
router.get('/',         authMiddleware, listFiles);
router.delete('/:id',   authMiddleware, deleteFile);
router.get('/usage',    authMiddleware, getStorageUsage);

export default router;
