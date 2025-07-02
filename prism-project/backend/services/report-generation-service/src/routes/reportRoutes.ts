import { Router } from 'express';
import { generateReport, getReportStatus, getReportById, getAllReports, downloadReport } from '../controllers/reportController';
import { authenticateJWT } from '../middleware/auth'; 
import jiraReportRoutes from './jiraReportRoutes'; 

const router = Router();

// APPLY AUTHENTICATION TO ALL ROUTES
router.use(authenticateJWT);

// Public routes (for now)
router.post('/generate', generateReport);
router.get('/:id/status', getReportStatus);
router.get('/:id', getReportById);
router.get('/', getAllReports);
router.get('/:id/download', downloadReport);

// NEW: Add Jira-specific report routes
router.use('/', jiraReportRoutes); // ADD THIS LINE

export default router;