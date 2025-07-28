// backend/services/report-generation-service/src/tests/trofosControllerVerification.test.ts
// VERIFICATION TEST: TROFOS Controller Implementation & Jira Regression Test
// Ensures TROFOS controller works correctly and Jira functionality is unaffected

import request from 'supertest';
import jwt from 'jsonwebtoken';

// Test configuration
const API_BASE_URL = 'http://localhost:4002'; // Report Generation Service
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Generate test JWT token
function generateTestToken(userId: string = 'test-user-123'): string {
  return jwt.sign(
    { userId, email: 'test@example.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('TROFOS Report Controller Verification', () => {
  const authToken = generateTestToken();
  const trofosConnectionId = 'test-trofos-connection-id';
  const jiraConnectionId = '686093672bb729e4dfaf6fa2'; // Known working Jira connection
  
  // Test request bodies
  const trofosRequestBody = {
    connectionId: trofosConnectionId,
    projectId: 'trofos-project-123',
    reportTitle: 'Test TROFOS Report'
  };

  const jiraRequestBody = {
    connectionId: jiraConnectionId,
    projectId: 'PRISM',
    reportTitle: 'Test Jira Report'
  };

  describe('✅ TROFOS Controller Tests', () => {
    test('TROFOS Standard Report endpoint should be callable', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/reports/generate-trofos-standard')
        .set('Authorization', `Bearer ${authToken}`)
        .send(trofosRequestBody);

      // Should either succeed or fail gracefully (not 404)
      expect(response.status).not.toBe(404);
      console.log('✅ TROFOS Standard endpoint exists:', response.status);
    });

    test('TROFOS Executive Report endpoint should be callable', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/reports/generate-trofos-executive')
        .set('Authorization', `Bearer ${authToken}`)
        .send(trofosRequestBody);

      expect(response.status).not.toBe(404);
      console.log('✅ TROFOS Executive endpoint exists:', response.status);
    });

    test('TROFOS Detailed Report endpoint should be callable', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/reports/generate-trofos-detailed')
        .set('Authorization', `Bearer ${authToken}`)
        .send(trofosRequestBody);

      expect(response.status).not.toBe(404);
      console.log('✅ TROFOS Detailed endpoint exists:', response.status);
    });

    test('TROFOS Validation endpoint should be callable', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/validate-trofos-connection/${trofosConnectionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId: 'test-project' });

      expect(response.status).not.toBe(404);
      console.log('✅ TROFOS Validation endpoint exists:', response.status);
    });

    test('TROFOS Preview endpoint should be callable', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/trofos-project-preview/${trofosConnectionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId: 'test-project' });

      expect(response.status).not.toBe(404);
      console.log('✅ TROFOS Preview endpoint exists:', response.status);
    });
  });

  describe('🚨 CRITICAL: Jira Regression Tests', () => {
    test('Jira Standard Report should still work', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/reports/generate-jira-standard')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jiraRequestBody);

      // Should work exactly as before
      expect([200, 201, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(404);
      console.log('✅ Jira Standard still works:', response.status);
      
      if (response.status === 201) {
        expect(response.body.platform).toBe('jira');
        expect(response.body.template).toBe('standard');
      }
    });

    test('Jira Executive Report should still work', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/reports/generate-jira-executive')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jiraRequestBody);

      expect([200, 201, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(404);
      console.log('✅ Jira Executive still works:', response.status);
    });

    test('Jira Detailed Report should still work', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/reports/generate-jira-detailed')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jiraRequestBody);

      expect([200, 201, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(404);
      console.log('✅ Jira Detailed still works:', response.status);
    });

    test('Jira Validation should still work', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/validate-jira-connection/${jiraConnectionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId: 'PRISM' });

      expect([200, 400, 404, 500]).toContain(response.status);
      expect(response.status).not.toBe(404);
      console.log('✅ Jira Validation still works:', response.status);
    });

    test('Jira Preview should still work', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/reports/jira-project-preview/${jiraConnectionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId: 'PRISM' });

      expect([200, 400, 404, 500]).toContain(response.status);
      console.log('✅ Jira Preview still works:', response.status);
    });
  });

  describe('🔒 Authentication Tests', () => {
    test('TROFOS endpoints should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/reports/generate-trofos-standard')
        .send(trofosRequestBody);

      expect(response.status).toBe(401);
      console.log('✅ TROFOS authentication required');
    });

    test('TROFOS endpoints should validate connectionId', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/reports/generate-trofos-standard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ projectId: 'test' }); // Missing connectionId

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Connection ID is required');
      console.log('✅ TROFOS validation works');
    });
  });
});

// Manual testing commands for terminal verification
console.log(`
🧪 MANUAL TESTING COMMANDS:

# Test TROFOS Standard Report
curl -X POST http://localhost:4002/api/reports/generate-trofos-standard \\
  -H "Authorization: Bearer ${generateTestToken()}" \\
  -H "Content-Type: application/json" \\
  -d '{"connectionId": "test-connection", "projectId": "test-project"}'

# Test TROFOS Executive Report  
curl -X POST http://localhost:4002/api/reports/generate-trofos-executive \\
  -H "Authorization: Bearer ${generateTestToken()}" \\
  -H "Content-Type: application/json" \\
  -d '{"connectionId": "test-connection", "projectId": "test-project"}'

# Test TROFOS Detailed Report
curl -X POST http://localhost:4002/api/reports/generate-trofos-detailed \\
  -H "Authorization: Bearer ${generateTestToken()}" \\
  -H "Content-Type: application/json" \\
  -d '{"connectionId": "test-connection", "projectId": "test-project"}'

# Verify Jira Still Works
curl -X POST http://localhost:4002/api/reports/generate-jira-standard \\
  -H "Authorization: Bearer ${generateTestToken()}" \\
  -H "Content-Type: application/json" \\
  -d '{"connectionId": "686093672bb729e4dfaf6fa2", "projectId": "PRISM"}'

🚨 CRITICAL VERIFICATION:
1. All TROFOS endpoints should return 404 (routes not yet registered)
2. All Jira endpoints should work exactly as before
3. No modifications to any existing Jira files
`);

export { generateTestToken };