// backend/services/report-generation-service/src/routes/jiraReportRoutes.ts
// JIRA REPORT ROUTES - Windows Compatible (No Unicode/Symbols)
// Routes for generating professional Jira reports with real platform data

import { Router } from 'express';
import { 
  generateJiraStandardReport,
  generateJiraExecutiveReport, 
  generateJiraDetailedReport,
  validateJiraConnection,
  getJiraProjectPreview
} from '../controllers/jiraReportController';

const router = Router();

/**
 * JIRA REPORT GENERATION ENDPOINTS
 * These endpoints generate professional PowerPoint reports using real Jira data
 */

// Generate Jira Standard Report (5-7 slides)
// POST /api/reports/generate-jira-standard
router.post('/generate-jira-standard', generateJiraStandardReport);

// Generate Jira Executive Summary (4-5 slides) 
// POST /api/reports/generate-jira-executive
router.post('/generate-jira-executive', generateJiraExecutiveReport);

// Generate Jira Detailed Analysis (8-10 slides)
// POST /api/reports/generate-jira-detailed
router.post('/generate-jira-detailed', generateJiraDetailedReport);

// Validate Jira connection for report generation
// GET /api/reports/validate-jira-connection/:connectionId
router.get('/validate-jira-connection/:connectionId', validateJiraConnection);

// Get Jira project preview and analytics
// GET /api/reports/jira-project-preview/:connectionId
router.get('/jira-project-preview/:connectionId', getJiraProjectPreview);

export default router;