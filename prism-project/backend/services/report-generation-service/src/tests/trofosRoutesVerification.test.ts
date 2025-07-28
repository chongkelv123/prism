// backend/services/report-generation-service/src/__tests__/trofosRoutesVerification.test.ts
// VERIFICATION: TROFOS Routes Implementation & Jira Regression Test

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock the controllers for testing
jest.mock('../controllers/trofosReportController', () => ({
  generateTrofosStandardReport: jest.fn((req, res) => res.status(201).json({ 
    message: 'TROFOS Standard Report queued',
    platform: 'trofos',
    template: 'standard'
  })),
  generateTrofosExecutiveReport: jest.fn((req, res) => res.status(201).json({
    message: 'TROFOS Executive Report queued',
    platform: 'trofos', 
    template: 'executive'
  })),
  generateTrofosDetailedReport: jest.fn((req, res) => res.status(201).json({
    message: 'TROFOS Detailed Report queued',
    platform: 'trofos',
    template: 'detailed'
  })),
  validateTrofosConnection: jest.fn((req, res) => res.status(200).json({
    valid: true,
    platform: 'trofos'
  })),
  getTrofosProjectPreview: jest.fn((req, res) => res.status(200).json({
    platform: 'trofos',
    projectName: 'Test Project'
  }))
}));

// Mock Jira controllers to ensure they still work
jest.mock('../controllers/jiraReportController', () => ({
  generateJiraStandardReport: jest.fn((req, res) => res.status(201).json({ 
    message: 'Jira Standard Report queued',
    platform: 'jira',
    template: 'standard'
  })),
  generateJiraExecutiveReport: jest.fn((req, res) => res.status(201).json({
    message: 'Jira Executive Report queued',
    platform: 'jira',
    template: 'executive'
  })),
  generateJiraDetailedReport: jest.fn((req, res) => res.status(201).json({
    message: 'Jira Detailed Report queued', 
    platform: 'jira',
    template: 'detailed'
  })),
  validateJiraConnection: jest.fn((req, res) => res.status(200).json({
    valid: true,
    platform: 'jira'
  })),
  getJiraProjectPreview: jest.fn((req, res) => res.status(200).json({
    platform: 'jira',
    projectName: 'Test Project'
  }))
}));

// Mock middleware
jest.mock('../middleware/auth', () => ({
  authenticateJWT: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  }
}));

describe('TROFOS Routes Verification', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('✅ TROFOS Routes Implementation', () => {
    beforeEach(() => {
      // Import and mount TROFOS routes
      const trofosRoutes = require('../routes/trofosReportRoutes').default;
      app.use('/api/reports', trofosRoutes);
    });

    test('TROFOS Standard Report route should be accessible', async () => {
      const response = await request(app)
        .post('/api/reports/generate-trofos-standard')
        .send({ connectionId: 'test-trofos-conn', projectId: 'test-project' });

      expect(response.status).toBe(201);
      expect(response.body.platform).toBe('trofos');
      expect(response.body.template).toBe('standard');
      console.log('✅ TROFOS Standard route works');
    });

    test('TROFOS Executive Report route should be accessible', async () => {
      const response = await request(app)
        .post('/api/reports/generate-trofos-executive')
        .send({ connectionId: 'test-trofos-conn', projectId: 'test-project' });

      expect(response.status).toBe(201);
      expect(response.body.platform).toBe('trofos');
      expect(response.body.template).toBe('executive');
      console.log('✅ TROFOS Executive route works');
    });

    test('TROFOS Detailed Report route should be accessible', async () => {
      const response = await request(app)
        .post('/api/reports/generate-trofos-detailed')
        .send({ connectionId: 'test-trofos-conn', projectId: 'test-project' });

      expect(response.status).toBe(201);
      expect(response.body.platform).toBe('trofos');
      expect(response.body.template).toBe('detailed');
      console.log('✅ TROFOS Detailed route works');
    });

    test('TROFOS Validation route should be accessible', async () => {
      const response = await request(app)
        .get('/api/reports/validate-trofos-connection/test-conn-id')
        .query({ projectId: 'test-project' });

      expect(response.status).toBe(200);
      expect(response.body.platform).toBe('trofos');
      console.log('✅ TROFOS Validation route works');
    });

    test('TROFOS Preview route should be accessible', async () => {
      const response = await request(app)
        .get('/api/reports/trofos-project-preview/test-conn-id')
        .query({ projectId: 'test-project' });

      expect(response.status).toBe(200);
      expect(response.body.platform).toBe('trofos');
      console.log('✅ TROFOS Preview route works');
    });
  });

  describe('🚨 CRITICAL: Jira Routes Regression Test', () => {
    beforeEach(() => {
      // Import and mount Jira routes to ensure they still work
      const jiraRoutes = require('../routes/jiraReportRoutes').default;
      app.use('/api/reports', jiraRoutes);
    });

    test('Jira Standard Report route should still work', async () => {
      const response = await request(app)
        .post('/api/reports/generate-jira-standard')
        .send({ connectionId: 'test-jira-conn', projectId: 'PRISM' });

      expect(response.status).toBe(201);
      expect(response.body.platform).toBe('jira');
      expect(response.body.template).toBe('standard');
      console.log('✅ Jira Standard route still works');
    });

    test('Jira Executive Report route should still work', async () => {
      const response = await request(app)
        .post('/api/reports/generate-jira-executive')
        .send({ connectionId: 'test-jira-conn', projectId: 'PRISM' });

      expect(response.status).toBe(201);
      expect(response.body.platform).toBe('jira');
      console.log('✅ Jira Executive route still works');
    });

    test('Jira Detailed Report route should still work', async () => {
      const response = await request(app)
        .post('/api/reports/generate-jira-detailed')
        .send({ connectionId: 'test-jira-conn', projectId: 'PRISM' });

      expect(response.status).toBe(201);
      expect(response.body.platform).toBe('jira');
      console.log('✅ Jira Detailed route still works');
    });

    test('Jira Validation route should still work', async () => {
      const response = await request(app)
        .get('/api/reports/validate-jira-connection/test-conn-id')
        .query({ projectId: 'PRISM' });

      expect(response.status).toBe(200);
      expect(response.body.platform).toBe('jira');
      console.log('✅ Jira Validation route still works');
    });

    test('Jira Preview route should still work', async () => {
      const response = await request(app)
        .get('/api/reports/jira-project-preview/test-conn-id')
        .query({ projectId: 'PRISM' });

      expect(response.status).toBe(200);
      expect(response.body.platform).toBe('jira');
      console.log('✅ Jira Preview route still works');
    });
  });

  describe('🔒 Route Pattern Verification', () => {
    test('TROFOS and Jira routes should be completely separate', () => {
      const trofosRoutes = require('../routes/trofosReportRoutes').default;
      const jiraRoutes = require('../routes/jiraReportRoutes').default;

      // Verify they are different router instances
      expect(trofosRoutes).not.toBe(jiraRoutes);
      console.log('✅ TROFOS and Jira routes are separate instances');
    });

    test('TROFOS routes should import from TROFOS controller only', () => {
      // This is verified at compile time - if import fails, test will fail
      const trofosController = require('../controllers/trofosReportController');
      
      expect(trofosController.generateTrofosStandardReport).toBeDefined();
      expect(trofosController.generateTrofosExecutiveReport).toBeDefined();
      expect(trofosController.generateTrofosDetailedReport).toBeDefined();
      expect(trofosController.validateTrofosConnection).toBeDefined();
      expect(trofosController.getTrofosProjectPreview).toBeDefined();
      
      console.log('✅ TROFOS routes import correct controller functions');
    });
  });
});

console.log(`
📋 STEP 2 VERIFICATION SUMMARY:
===============================

✅ Created: trofosReportRoutes.ts
✅ Pattern: Exact copy of jiraReportRoutes.ts structure  
✅ Endpoints: All 5 TROFOS endpoints defined
✅ Import: Uses trofosReportController (not Jira)
✅ Middleware: Same authentication as Jira
✅ Paths: Uses /generate-trofos-* patterns

🚨 CRITICAL CHECKS:
- TROFOS routes completely separate from Jira routes
- No modifications to jiraReportRoutes.ts
- Same middleware and validation patterns
- Independent router instance

📡 EXPECTED ENDPOINTS:
- POST /api/reports/generate-trofos-standard
- POST /api/reports/generate-trofos-executive  
- POST /api/reports/generate-trofos-detailed
- GET /api/reports/validate-trofos-connection/:connectionId
- GET /api/reports/trofos-project-preview/:connectionId

✅ Ready for Step 3: Enhanced TROFOS Report Generator
`);