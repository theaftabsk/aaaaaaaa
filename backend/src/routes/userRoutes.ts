import { Router } from 'express';
import { getUserSettings, updateUserSettings } from '../controllers/userController';
import { getTeamMembers, addTeamMember, deleteTeamMember } from '../controllers/teamController';
import {
  getKnowledge,
  addKnowledge,
  updateKnowledge,
  deleteKnowledge,
  uploadKnowledgeFile
} from '../controllers/knowledgeController';
import { getAiLogs, clearAiLogs } from '../controllers/aiLogController';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';
import fs from 'fs';

const router = Router();

// Ensure temp directory exists for uploads
const uploadDir = 'uploads/temp';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

router.use(authMiddleware);

router.get('/settings', getUserSettings);
router.post('/settings', updateUserSettings);

// Team management endpoints
router.get('/team', getTeamMembers);
router.post('/team/invite', addTeamMember);
router.delete('/team/:memberId', deleteTeamMember);

// Knowledge Base endpoints
router.get('/knowledge', getKnowledge);
router.post('/knowledge', addKnowledge);
router.put('/knowledge/:id', updateKnowledge);
router.delete('/knowledge/:id', deleteKnowledge);
router.post('/knowledge/upload', upload.single('file'), uploadKnowledgeFile);

// AI Logs endpoints
router.get('/ai-logs', getAiLogs);
router.delete('/ai-logs', clearAiLogs);

export default router;
