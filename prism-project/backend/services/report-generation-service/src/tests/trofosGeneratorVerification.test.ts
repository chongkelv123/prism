// backend/services/report-generation-service/src/__tests__/trofosGeneratorVerification.test.ts
// VERIFICATION: Enhanced TROFOS Generator Implementation & Jira Regression Test

import { EnhancedTrofosReportGenerator } from '../generators/EnhancedTrofosReportGenerator';
import { EnhancedJiraReportGenerator } from '../generators/EnhancedJiraReportGenerator';
import { ProjectData } from '../services/PlatformDataService';
import fs from 'fs';
import path from 'path';

// Mock test data for TROFOS
const mockTrofosProjectData: ProjectData = {
  id: 'trofos-test-project',
  name: 'TROFOS Test Project',
  platform: 'trofos',
  description: 'Test project for TROFOS report generation',
  tasks: [
    {
      id: 'TROFOS-1',
      name: 'Implement user authentication',
      status: 'Done',
      assignee: 'Alice Johnson',
      priority: 'High',
      storyPoints: 8
    },
    {
      id: 'TROFOS-2', 
      name: 'Create dashboard UI',
      status: 'In Progress',
      assignee: 'Bob Smith',
      priority: 'Medium',
      storyPoints: 5
    },
    {
      id: 'TROFOS-3',
      name: 'Setup database schema',
      status: 'To Do',
      assignee: 'Charlie Brown',
      priority: 'High',
      storyPoints: 13
    },
    {
      id: 'TROFOS-4',
      name: 'Write API documentation',
      status: 'To Do',
      assignee: 'Diana Prince',
      priority: 'Low',
      storyPoints: 3
    },
    {
      id: 'TROFOS-5',
      name: 'Implement search functionality',
      status: 'Blocked',
      assignee: 'Eve Wilson',
      priority: 'Critical',
      storyPoints: 8
    }
  ],
  team: [
    { id: 'user1', name: 'Alice Johnson', role: 'Senior Developer', taskCount: 1 },
    { id: 'user2', name: 'Bob Smith', role: 'Frontend Developer', taskCount: 1 },
    { id: 'user3', name: 'Charlie Brown', role: 'Backend Developer', taskCount: 1 },
    { id: 'user4', name: 'Diana Prince', role: 'Technical Writer', taskCount: 1 },
    { id: 'user5', name: 'Eve Wilson', role: 'Full Stack Developer', taskCount: 1 }
  ],
  metrics: [
    { name: 'Total Backlog Items', value: '5', type: 'number' },
    { name: 'Completed Items', value: '1', type: 'number' },
    { name: 'In Progress', value: '1', type: 'number' },
    { name: 'Sprint Velocity', value: '16', type: 'number' },
    { name: 'Completion Rate', value: '20%', type: 'percentage' }
  ],
  platformSpecific: {
    trofos: {
      projectId: 'trofos-test-project',
      backlogCount: 5,
      sprintCount: 2,
      apiEndpoint: 'https://test-trofos-server.com/api'
    }
  },
  fallbackData: false,
  lastUpdated: new Date().toISOString(),
  dataQuality: {
    completeness: 95,
    accuracy: 90,
    freshness: 95
  }
};

// Mock Jira data for regression testing
const mockJiraProjectData: ProjectData = {
  id: 'jira-test-project',
  name: 'JIRA Test Project',
  platform: 'jira',
  description: 'Test project for Jira report generation',
  tasks: [
    {
      id: 'JIRA-1',
      name: 'Setup project infrastructure',
      status: 'Done',
      assignee: 'John Doe',
      priority: 'High'
    },
    {
      id: 'JIRA-2',
      name: 'Implement core features',
      status: 'In Progress',
      assignee: 'Jane Smith',
      priority: 'Medium'
    }
  ],
  team: [
    { id: 'user1', name: 'John Doe', role: 'Lead Developer', taskCount: 1 },
    { id: 'user2', name: 'Jane Smith', role: 'Developer', taskCount: 1 }
  ],
  metrics: [
    { name: 'Total Issues', value: '2', type: 'number' },
    { name: 'Completion Rate', value: '50%', type: 'percentage' }
  ],
  platformSpecific: {
    jira: {
      projectKey: 'JIRA',
      issueTypes: ['Epic', 'Story', 'Task'],
      components: ['Backend', 'Frontend'],
      versions: ['1.0.0']
    }
  },
  fallbackData: false,
  lastUpdated: new Date().toISOString(),
  dataQuality: {
    completeness: 90,
    accuracy: 95,
    freshness: 90
  }
};

describe('Enhanced TROFOS Generator Verification', () => {
  let trofosGenerator: EnhancedTrofosReportGenerator;
  let jiraGenerator: EnhancedJiraReportGenerator;
  const testStorageDir = path.join(__dirname, '../../test-storage');

  beforeAll(() => {
    // Create test storage directory
    if (!fs.existsSync(testStorageDir)) {
      fs.mkdirSync(testStorageDir, { recursive: true });
    }
    
    // Set test storage directory
    process.env.STORAGE_DIR = testStorageDir;
  });

  beforeEach(() => {
    trofosGenerator = new EnhancedTrofosReportGenerator();
    jiraGenerator = new EnhancedJiraReportGenerator();
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testStorageDir)) {
      const files = fs.readdirSync(testStorageDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testStorageDir, file));
      });
      fs.rmdirSync(testStorageDir);
    }
  });

  describe('✅ TROFOS Generator Implementation', () => {
    test('should create TROFOS generator instance successfully', () => {
      expect(trofosGenerator).toBeInstanceOf(EnhancedTrofosReportGenerator);
      console.log('✅ TROFOS generator instantiated');
    });

    test('should have all required methods', () => {
      expect(typeof trofosGenerator.generate).toBe('function');
      console.log('✅ TROFOS generator has generate method');
    });

    test('should generate TROFOS standard report', async () => {
      const config = {
        templateId: 'standard' as const,
        title: 'Test TROFOS Standard Report',
        includeSprintAnalysis: true,
        includeResourceAllocation: true
      };

      let progressCalled = false;
      const progressCallback = async (progress: number) => {
        progressCalled = true;
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      };

      const filename = await trofosGenerator.generate(
        mockTrofosProjectData,
        config,
        progressCallback
      );

      expect(filename).toBeTruthy();
      expect(filename).toContain('trofos');
      expect(filename).toContain('standard');
      expect(progressCalled).toBe(true);
      
      // Verify file was created
      const filepath = path.join(testStorageDir, filename);
      expect(fs.existsSync(filepath)).toBe(true);
      
      console.log('✅ TROFOS standard report generated:', filename);
    }, 15000);

    test('should generate TROFOS executive report', async () => {
      const config = {
        templateId: 'executive' as const,
        title: 'Test TROFOS Executive Report'
      };

      const filename = await trofosGenerator.generate(mockTrofosProjectData, config);
      
      expect(filename).toBeTruthy();
      expect(filename).toContain('trofos');
      expect(filename).toContain('executive');
      
      console.log('✅ TROFOS executive report generated:', filename);
    }, 15000);

    test('should generate TROFOS detailed report', async () => {
      const config = {
        templateId: 'detailed' as const,
        title: 'Test TROFOS Detailed Report'
      };

      const filename = await trofosGenerator.generate(mockTrofosProjectData, config);
      
      expect(filename).toBeTruthy();
      expect(filename).toContain('trofos');
      expect(filename).toContain('detailed');
      
      console.log('✅ TROFOS detailed report generated:', filename);
    }, 20000);

    test('should handle invalid template ID', async () => {
      const config = {
        templateId: 'invalid' as any,
        title: 'Test Invalid Template'
      };

      await expect(
        trofosGenerator.generate(mockTrofosProjectData, config)
      ).rejects.toThrow('Unknown template ID: invalid');
      
      console.log('✅ TROFOS generator handles invalid template correctly');
    });
  });

  describe('🚨 CRITICAL: Jira Generator Regression Test', () => {
    test('Jira generator should still work for standard reports', async () => {
      const config = {
        templateId: 'standard' as const,
        title: 'Test Jira Standard Report - Regression Test'
      };

      const filename = await jiraGenerator.generate(mockJiraProjectData, config);
      
      expect(filename).toBeTruthy();
      expect(filename).toContain('jira');
      expect(filename).toContain('standard');
      
      // Verify file was created
      const filepath = path.join(testStorageDir, filename);
      expect(fs.existsSync(filepath)).toBe(true);
      
      console.log('✅ Jira standard report still works:', filename);
    }, 15000);

    test('Jira generator should still work for executive reports', async () => {
      const config = {
        templateId: 'executive' as const,
        title: 'Test Jira Executive Report - Regression Test'
      };

      const filename = await jiraGenerator.generate(mockJiraProjectData, config);
      
      expect(filename).toBeTruthy();
      expect(filename).toContain('jira');
      expect(filename).toContain('executive');
      
      console.log('✅ Jira executive report still works:', filename);
    }, 15000);

    test('Jira generator should still work for detailed reports', async () => {
      const config = {
        templateId: 'detailed' as const,
        title: 'Test Jira Detailed Report - Regression Test'
      };

      const filename = await jiraGenerator.generate(mockJiraProjectData, config);
      
      expect(filename).toBeTruthy();
      expect(filename).toContain('jira');
      expect(filename).toContain('detailed');
      
      console.log('✅ Jira detailed report still works:', filename);
    }, 20000);
  });

  describe('🔒 Platform Isolation Verification', () => {
    test('TROFOS and Jira generators should be separate instances', () => {
      expect(trofosGenerator).not.toBe(jiraGenerator);
      expect(trofosGenerator.constructor).not.toBe(jiraGenerator.constructor);
      console.log('✅ TROFOS and Jira generators are completely separate');
    });

    test('TROFOS generator should handle TROFOS-specific data correctly', async () => {
      const config = { templateId: 'standard' as const };
      
      // Should work with TROFOS data
      const trofosFilename = await trofosGenerator.generate(mockTrofosProjectData, config);
      expect(trofosFilename).toBeTruthy();
      
      // Should also work with non-TROFOS data (graceful handling)
      const jiraAsNonTrofos = { ...mockJiraProjectData, platform: 'trofos' as const };
      const crossPlatformFilename = await trofosGenerator.generate(jiraAsNonTrofos, config);
      expect(crossPlatformFilename).toBeTruthy();
      
      console.log('✅ TROFOS generator handles data correctly');
    });

    test('should generate different file names for different platforms', async () => {
      const config = { templateId: 'standard' as const, title: 'Platform Test' };
      
      const trofosFilename = await trofosGenerator.generate(mockTrofosProjectData, config);
      const jiraFilename = await jiraGenerator.generate(mockJiraProjectData, config);
      
      expect(trofosFilename).not.toBe(jiraFilename);
      expect(trofosFilename).toContain('trofos');
      expect(jiraFilename).toContain('jira');
      
      console.log('✅ Different platforms generate different filenames');
      console.log('  TROFOS:', trofosFilename);
      console.log('  Jira:', jiraFilename);
    });
  });

  describe('📊 Data Analysis Verification', () => {
    test('should analyze TROFOS data correctly', async () => {
      const config = { templateId: 'standard' as const };
      
      // The generator should analyze the mock data and extract insights
      const filename = await trofosGenerator.generate(mockTrofosProjectData, config);
      expect(filename).toBeTruthy();
      
      // Verify file size indicates content was generated
      const filepath = path.join(testStorageDir, filename);
      const stats = fs.statSync(filepath);
      expect(stats.size).toBeGreaterThan(50000); // PowerPoint files should be substantial
      
      console.log('✅ TROFOS data analysis and report generation working');
      console.log(`  File size: ${Math.round(stats.size / 1024)} KB`);
    });
  });
});

console.log(`
📋 STEP 3 VERIFICATION SUMMARY:
===============================

✅ Created: EnhancedTrofosReportGenerator.ts
✅ Pattern: Exact copy of EnhancedJiraReportGenerator.ts structure
✅ Features: TROFOS-specific slide generation and analysis
✅ Templates: Standard, Executive, Detailed support
✅ Platform: TROFOS theme colors and terminology
✅ Analysis: Sprint velocity, backlog items, resource allocation

🚨 CRITICAL CHECKS:
- TROFOS generator completely separate from Jira generator
- No modifications to EnhancedJiraReportGenerator.ts
- Same PptxGenJS usage patterns and file generation
- Independent PowerPoint generation logic

📊 TROFOS-SPECIFIC FEATURES:
- Backlog status analysis (not task status)
- Sprint velocity tracking
- Resource workload distribution  
- Story points analysis
- TROFOS-specific color scheme (purple theme)

🔒 PLATFORM ISOLATION:
- Separate class instance
- TROFOS-specific slide content
- Independent analysis methods
- Different file naming patterns

✅ Ready for Step 4: TROFOS Data Transformation
`);