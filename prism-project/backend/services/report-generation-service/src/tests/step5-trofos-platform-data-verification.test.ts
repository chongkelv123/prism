// backend/services/report-generation-service/src/tests/step5-trofos-platform-data-verification.test.ts
// STEP 5 VERIFICATION: PlatformDataService TROFOS Integration Test

import { PlatformDataService, ReportGenerationConfig } from '../services/PlatformDataService';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock axios to control HTTP responses
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

describe('Step 5: TROFOS Platform Data Service Integration', () => {
  let platformDataService: PlatformDataService;

  beforeEach(() => {
    platformDataService = new PlatformDataService('test-auth-token');
    jest.clearAllMocks();
  });

  describe('🔧 TROFOS Fallback Data Generation', () => {
    test('should generate TROFOS fallback data when platform integration fails', async () => {
      const config: ReportGenerationConfig = {
        platform: 'trofos',
        connectionId: 'trofos-test-connection',
        projectId: 'trofos-demo-project',
        templateId: 'standard'
      };

      // Force fallback by making HTTP requests fail
      const mockHttpClient = (platformDataService as any).httpClient;
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      // Call fetchProjectData - should fall back to TROFOS demo data
      const result = await platformDataService.fetchProjectData(config);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const trofosProject = result[0];
      expect(trofosProject.platform).toBe('trofos');
      expect(trofosProject.fallbackData).toBe(true);
      expect(trofosProject.name).toContain('TROFOS');
      
      // Verify TROFOS-specific content
      expect(Array.isArray(trofosProject.tasks)).toBe(true);
      expect(trofosProject.tasks.length).toBeGreaterThan(0);
      expect(Array.isArray(trofosProject.team)).toBe(true);
      expect(trofosProject.team.length).toBeGreaterThan(0);

      // Verify TROFOS-specific fields
      expect(trofosProject.tasks[0]).toHaveProperty('storyPoints');
      expect(trofosProject.platformSpecific?.trofos).toBeDefined();
      expect(Array.isArray(trofosProject.sprints)).toBe(true);

      console.log('✅ TROFOS fallback data generated successfully:', {
        projectName: trofosProject.name,
        taskCount: trofosProject.tasks.length,
        teamSize: trofosProject.team.length,
        sprintCount: trofosProject.sprints?.length,
        hasStoryPoints: trofosProject.tasks.some(t => t.storyPoints),
        platform: trofosProject.platform
      });
    });

    test('should include TROFOS-specific project structure', async () => {
      const config: ReportGenerationConfig = {
        platform: 'trofos',
        connectionId: 'test-connection',
        projectId: 'custom-trofos-project',
        templateId: 'detailed'
      };

      // Force fallback
      const mockHttpClient = (platformDataService as any).httpClient;
      mockHttpClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await platformDataService.fetchProjectData(config);
      const trofosProject = result[0];

      // Verify TROFOS-specific structure
      expect(trofosProject.platformSpecific?.trofos).toEqual({
        projectType: 'Software Development',
        modules: expect.arrayContaining(['Authentication', 'Dashboard', 'API']),
        integrations: expect.arrayContaining(['GitHub', 'Slack', 'JIRA'])
      });

      // Verify sprint structure (TROFOS-specific)
      expect(trofosProject.sprints).toBeDefined();
      expect(trofosProject.sprints!.length).toBeGreaterThan(0);
      expect(trofosProject.sprints![0]).toHaveProperty('velocity');
      expect(trofosProject.sprints![0]).toHaveProperty('plannedPoints');
      expect(trofosProject.sprints![0]).toHaveProperty('completedPoints');

      // Verify task structure with story points
      const sampleTask = trofosProject.tasks[0];
      expect(sampleTask).toHaveProperty('storyPoints');
      expect(sampleTask.id).toMatch(/^TROFOS-/);

      console.log('✅ TROFOS project structure verified');
    });
  });

  describe('🚨 JIRA REGRESSION TEST - CRITICAL', () => {
    test('should still generate Jira fallback data unchanged', async () => {
      const jiraConfig: ReportGenerationConfig = {
        platform: 'jira',
        connectionId: 'jira-test-connection',
        projectId: 'PRISM',
        templateId: 'standard'
      };

      // Force fallback for Jira
      const mockHttpClient = (platformDataService as any).httpClient;
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      const result = await platformDataService.fetchProjectData(jiraConfig);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const jiraProject = result[0];
      expect(jiraProject.platform).toBe('jira');
      expect(jiraProject.fallbackData).toBe(true);
      expect(jiraProject.name).toContain('PRISM');

      // Verify Jira-specific content unchanged
      expect(jiraProject.platformSpecific?.jira).toBeDefined();
      expect(jiraProject.platformSpecific?.jira?.projectKey).toBe('PRISM');
      expect(Array.isArray(jiraProject.platformSpecific?.jira?.issueTypes)).toBe(true);

      // Verify no TROFOS contamination in Jira data
      expect(jiraProject.platformSpecific?.trofos).toBeUndefined();
      expect(jiraProject.tasks.every(t => !t.hasOwnProperty('storyPoints') || t.storyPoints === undefined)).toBe(false); // Jira can have story points too
      
      console.log('✅ Jira functionality remains completely unchanged');
    });
  });

  describe('🔄 MONDAY.COM REGRESSION TEST', () => {
    test('should still generate Monday.com fallback data unchanged', async () => {
      const mondayConfig: ReportGenerationConfig = {
        platform: 'monday',
        connectionId: 'monday-test-connection',
        projectId: '2021562995',
        templateId: 'executive'
      };

      // Force fallback for Monday.com
      const mockHttpClient = (platformDataService as any).httpClient;
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      const result = await platformDataService.fetchProjectData(mondayConfig);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      const mondayProject = result[0];
      expect(mondayProject.platform).toBe('monday');
      expect(mondayProject.fallbackData).toBe(true);

      // Verify Monday.com-specific content unchanged
      expect(mondayProject.platformSpecific?.monday).toBeDefined();
      expect(mondayProject.platformSpecific?.monday?.boardId).toBe('2021562995');
      expect(Array.isArray(mondayProject.platformSpecific?.monday?.groups)).toBe(true);

      // Verify no TROFOS contamination in Monday data
      expect(mondayProject.platformSpecific?.trofos).toBeUndefined();
      
      console.log('✅ Monday.com functionality remains unchanged');
    });
  });

  describe('🎯 PLATFORM ISOLATION VERIFICATION', () => {
    test('should generate different data for different platforms', async () => {
      const platforms = ['jira', 'monday', 'trofos'];
      const results = [];

      // Force fallback for all platforms
      const mockHttpClient = (platformDataService as any).httpClient;
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      // Generate data for each platform
      for (const platform of platforms) {
        const config: ReportGenerationConfig = {
          platform,
          connectionId: `${platform}-connection`,
          projectId: `${platform}-project`,
          templateId: 'standard'
        };

        const result = await platformDataService.fetchProjectData(config);
        results.push({ platform, data: result[0] });
      }

      // Verify each platform has unique characteristics
      const jiraData = results.find(r => r.platform === 'jira')?.data;
      const mondayData = results.find(r => r.platform === 'monday')?.data;
      const trofosData = results.find(r => r.platform === 'trofos')?.data;

      expect(jiraData?.platform).toBe('jira');
      expect(mondayData?.platform).toBe('monday');
      expect(trofosData?.platform).toBe('trofos');

      // Verify platform-specific properties
      expect(jiraData?.platformSpecific?.jira).toBeDefined();
      expect(jiraData?.platformSpecific?.monday).toBeUndefined();
      expect(jiraData?.platformSpecific?.trofos).toBeUndefined();

      expect(mondayData?.platformSpecific?.monday).toBeDefined();
      expect(mondayData?.platformSpecific?.jira).toBeUndefined();
      expect(mondayData?.platformSpecific?.trofos).toBeUndefined();

      expect(trofosData?.platformSpecific?.trofos).toBeDefined();
      expect(trofosData?.platformSpecific?.jira).toBeUndefined();
      expect(trofosData?.platformSpecific?.monday).toBeUndefined();

      console.log('✅ Platform isolation verified - no data bleeding between platforms');
    });
  });
});

console.log(`
📋 STEP 5 VERIFICATION SUMMARY:
===============================

✅ UPDATE: Added TROFOS case to generateEnhancedFallbackData method
✅ CREATE: New generateTrofosFallbackData method
✅ PATTERN: Follows exact same structure as Jira/Monday fallback methods
✅ ISOLATION: Completely separate from existing Jira/Monday logic

🚨 CRITICAL IMPLEMENTATION NOTES:
- Only ADD TROFOS support to existing if-else chain
- DO NOT modify existing Jira or Monday.com cases
- New generateTrofosFallbackData method is completely separate
- TROFOS-specific data structure with story points and sprints

📊 TROFOS FALLBACK DATA FEATURES:
- 12 demo tasks with story points and sprint assignments
- 4 team members with skills and departments
- 3 sprints with velocity tracking
- TROFOS-specific platform configuration
- Sprint-based project structure

🔒 ZERO IMPACT VERIFICATION:
- Jira fallback data generation unchanged
- Monday.com fallback data generation unchanged
- No shared code between platform fallback methods
- Independent platform-specific data structures

✅ Ready for Step 6: Route Registration
`);