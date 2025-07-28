// backend/services/report-generation-service/src/routes/trofosReportRoutes.ts

import { Router } from 'express';
import { 
  generateTrofosStandardReport,
  generateTrofosExecutiveReport, 
  generateTrofosDetailedReport,
  validateTrofosConnection,
  getTrofosProjectPreview
} from '../controllers/trofosReportController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// Generate TROFOS Standard Report (5-7 slides)
// POST /api/reports/generate-trofos-standard
router.post('/generate-trofos-standard', generateTrofosStandardReport);

// Generate TROFOS Executive Summary (4-5 slides) 
// POST /api/reports/generate-trofos-executive
router.post('/generate-trofos-executive', generateTrofosExecutiveReport);

// Generate TROFOS Detailed Analysis (8-10 slides)
// POST /api/reports/generate-trofos-detailed
router.post('/generate-trofos-detailed', generateTrofosDetailedReport);

// Validate TROFOS connection for report generation
// GET /api/reports/validate-trofos-connection/:connectionId
router.get('/validate-trofos-connection/:connectionId', validateTrofosConnection);

// Get TROFOS project preview and analytics
// GET /api/reports/trofos-project-preview/:connectionId
router.get('/trofos-project-preview/:connectionId', getTrofosProjectPreview);

export default router;