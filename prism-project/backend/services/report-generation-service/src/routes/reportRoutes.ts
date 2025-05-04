import { Router } from 'express';
import { generateReport, getReportStatus, getReportById, getAllReports } from '../controllers/reportController';

const router = Router();

// Public routes (for now)
router.post('/generate', generateReport);
router.get('/:id/status', getReportStatus);
router.get('/:id', getReportById);
router.get('/', getAllReports);

export default router;