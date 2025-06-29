import { Router } from 'express';
import { generateReport, getReportStatus, getReportById, getAllReports, downloadReport } from '../controllers/reportController';
import jiraReportRoutes from './jiraReportRoutes'; // Import JIRA report routes

const router = Router();

// Public routes (for now)
router.post('/generate', generateReport);
router.get('/:id/status', getReportStatus);
router.get('/:id', getReportById);
router.get('/', getAllReports);
router.get('/:id/download', downloadReport);

// NEW: Add Jira-specific report routes
router.use('/', jiraReportRoutes); // ADD THIS LINE

export default router;