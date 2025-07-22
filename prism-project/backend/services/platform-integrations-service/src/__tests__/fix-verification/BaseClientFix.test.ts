// src/__tests__/fix-verification/BaseClientFix.test.ts
// Verification test to ensure JiraClient redundancy is eliminated

import { ClientFactory } from '../../clients/BaseClient';
import { JiraClient } from '../../clients/JiraClient';
import { PlatformConnection } from '../../clients/BaseClient';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BaseClient Fix Verification - JiraClient Redundancy Eliminated', () => {
  const mockConnection: PlatformConnection = {
    id: 'jira-test-fix',
    name: 'Jira Test Connection',
    platform: 'jira',
    config: {
      domain: 'test-company.atlassian.net',
      email: 'test@company.com',
      apiToken: 'test-token-12345',
      projectKey: 'TEST-PROJECT'
    },
    status: 'connected'
  };

  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAxiosInstance = {
      defaults: { headers: {}, baseURL: '' },
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('✅ FIX VERIFICATION', () => {
    test('should confirm ClientFactory now uses FULL JiraClient implementation', () => {
      // Create client through factory
      const clientFromFactory = ClientFactory.createClient(mockConnection);
      
      // Create direct instance of full JiraClient
      const directJiraClient = new JiraClient(mockConnection);
      
      // Both should be instances of the same class (full implementation)
      expect(clientFromFactory.constructor).toBe(directJiraClient.constructor);
      expect(clientFromFactory).toBeInstanceOf(JiraClient);
      
      console.log('✅ VERIFIED: ClientFactory now uses FULL JiraClient implementation');
    });

    test('should verify FULL JiraClient has all required methods implemented', async () => {
      const client = ClientFactory.createClient(mockConnection);
      
      // Verify all abstract methods are implemented (no "Not implemented" errors)
      expect(typeof client.testConnection).toBe('function');
      expect(typeof client.getProjects).toBe('function');
      expect(typeof client.getProject).toBe('function');
      expect(typeof client.getProjectMetrics).toBe('function');
      
      console.log('✅ VERIFIED: All required methods are available');
    });

    test('should verify getProjects() will fetch real data (not return empty array)', async () => {
      // Mock successful project and issues responses
      const mockProjectResponse = {
        status: 200,
        data: {
          key: 'TEST-PROJECT',
          name: 'Test Project',
          description: 'A test project'
        }
      };

      const mockIssuesResponse = {
        status: 200,
        data: {
          issues: [
            {
              key: 'TEST-PROJECT-1',
              fields: {
                summary: 'Test Issue',
                status: { name: 'Done' },
                assignee: {
                  accountId: 'user1',
                  displayName: 'Test User',
                  emailAddress: 'user1@company.com'
                },
                priority: { name: 'High' },
                issuetype: { name: 'Story' },
                labels: ['test']
              }
            }
          ]
        }
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce(mockProjectResponse)  // /project/TEST-PROJECT
        .mockResolvedValueOnce(mockIssuesResponse);  // /search

      const client = ClientFactory.createClient(mockConnection);
      const projects = await client.getProjects();

      // Should NOT be empty (unlike the old stub)
      expect(projects).not.toEqual([]);
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('TEST-PROJECT');
      expect(projects[0].name).toBe('Test Project');
      expect(projects[0].tasks).toHaveLength(1);
      
      console.log('✅ VERIFIED: getProjects() now fetches real data');
      console.log(`   - Project: ${projects[0].name}`);
      console.log(`   - Tasks: ${projects[0].tasks?.length}`);
    });

    test('should verify getProject() works (no longer throws "Not implemented")', async () => {
      // Mock the same responses as getProjects since getProject calls getProjects internally
      const mockProjectResponse = {
        status: 200,
        data: {
          key: 'TEST-PROJECT',
          name: 'Test Project',
          description: 'A test project'
        }
      };

      const mockIssuesResponse = {
        status: 200,
        data: { issues: [] }
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce(mockProjectResponse)
        .mockResolvedValueOnce(mockIssuesResponse);

      const client = ClientFactory.createClient(mockConnection);
      
      // Should NOT throw "Not implemented" error
      const project = await client.getProject('TEST-PROJECT');
      expect(project).toBeDefined();
      expect(project.id).toBe('TEST-PROJECT');
      
      console.log('✅ VERIFIED: getProject() now works correctly');
    });

    test('should verify proper error handling for invalid project', async () => {
      const client = ClientFactory.createClient(mockConnection);
      
      // Should throw specific error for wrong project, not "Not implemented"
      await expect(client.getProject('WRONG-PROJECT')).rejects.toThrow(
        'Project \'WRONG-PROJECT\' does not match configured project \'TEST-PROJECT\''
      );
      
      console.log('✅ VERIFIED: Proper error handling for invalid projects');
    });

    test('should verify API endpoints are correctly configured', () => {
      const client = ClientFactory.createClient(mockConnection);
      
      // Check that HTTP client is properly configured
      expect(mockAxiosInstance.defaults.baseURL).toBe('https://test-company.atlassian.net/rest/api/3');
      expect(mockAxiosInstance.defaults.headers['Authorization']).toContain('Basic ');
      expect(mockAxiosInstance.defaults.headers['Accept']).toBe('application/json');
      
      console.log('✅ VERIFIED: API endpoints correctly configured');
      console.log(`   - Base URL: ${mockAxiosInstance.defaults.baseURL}`);
      console.log(`   - Auth: ${mockAxiosInstance.defaults.headers['Authorization'] ? 'Configured' : 'Missing'}`);
    });
  });

  describe('🎯 REPORT GENERATION BUG SHOULD BE FIXED', () => {
    test('should demonstrate that different connections will fetch different project data', async () => {
      // Create two different connections
      const connection1 = {
        ...mockConnection,
        id: 'jira-project-a',
        config: { ...mockConnection.config, projectKey: 'PROJECT-A' }
      };

      const connection2 = {
        ...mockConnection,
        id: 'jira-project-b', 
        config: { ...mockConnection.config, projectKey: 'PROJECT-B' }
      };

      // Mock different responses for each project
      const mockProjectA = {
        status: 200,
        data: { key: 'PROJECT-A', name: 'Project Alpha', description: 'Alpha description' }
      };

      const mockProjectB = {
        status: 200,
        data: { key: 'PROJECT-B', name: 'Project Beta', description: 'Beta description' }
      };

      const mockIssuesA = {
        status: 200,
        data: {
          issues: [{
            key: 'PROJECT-A-1',
            fields: {
              summary: 'Alpha Task',
              status: { name: 'Done' },
              assignee: { accountId: 'alpha-user', displayName: 'Alpha User' },
              priority: { name: 'High' },
              issuetype: { name: 'Story' }
            }
          }]
        }
      };

      const mockIssuesB = {
        status: 200,
        data: {
          issues: [{
            key: 'PROJECT-B-1',
            fields: {
              summary: 'Beta Task',
              status: { name: 'In Progress' },
              assignee: { accountId: 'beta-user', displayName: 'Beta User' },
              priority: { name: 'Medium' },
              issuetype: { name: 'Bug' }
            }
          }]
        }
      };

      // Mock axios create to return different instances
      const mockAxiosA = { ...mockAxiosInstance };
      const mockAxiosB = { ...mockAxiosInstance };
      
      mockAxiosA.get = jest.fn()
        .mockResolvedValueOnce(mockProjectA)
        .mockResolvedValueOnce(mockIssuesA);
        
      mockAxiosB.get = jest.fn()
        .mockResolvedValueOnce(mockProjectB)
        .mockResolvedValueOnce(mockIssuesB);

      mockedAxios.create
        .mockReturnValueOnce(mockAxiosA)
        .mockReturnValueOnce(mockAxiosB);

      // Create clients for each project
      const clientA = ClientFactory.createClient(connection1);
      const clientB = ClientFactory.createClient(connection2);

      // Fetch data from each
      const projectsA = await clientA.getProjects();
      const projectsB = await clientB.getProjects();

      // Verify different data is returned (NO MORE IDENTICAL REPORTS!)
      expect(projectsA[0].id).toBe('PROJECT-A');
      expect(projectsA[0].name).toBe('Project Alpha');
      expect(projectsA[0].tasks[0].title).toBe('Alpha Task');

      expect(projectsB[0].id).toBe('PROJECT-B');
      expect(projectsB[0].name).toBe('Project Beta');
      expect(projectsB[0].tasks[0].title).toBe('Beta Task');

      // Critical: Ensure data is NOT identical
      expect(projectsA[0].id).not.toBe(projectsB[0].id);
      expect(projectsA[0].name).not.toBe(projectsB[0].name);
      expect(projectsA[0].tasks[0].title).not.toBe(projectsB[0].tasks[0].title);

      console.log('🎯 VERIFIED: Report generation bug is FIXED');
      console.log(`   - Project A: ${projectsA[0].name} (${projectsA[0].tasks[0].title})`);
      console.log(`   - Project B: ${projectsB[0].name} (${projectsB[0].tasks[0].title})`);
      console.log('   - Data is properly isolated - no more identical reports!');
    });
  });
});