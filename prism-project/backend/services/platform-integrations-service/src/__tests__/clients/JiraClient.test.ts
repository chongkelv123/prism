// src/__tests__/clients/JiraClient.test.ts
// Module 2: JiraClient API Integration Tests - Full Implementation
// Focus: API endpoint isolation, authentication headers, project-specific data retrieval

import { JiraClient } from '../../clients/JiraClient';
import { PlatformConnection } from '../../clients/BaseClient';
import axios, { AxiosInstance } from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Module 2: JiraClient API Integration - Full Implementation', () => {
  const mockConnection1: PlatformConnection = {
    id: 'jira-conn-alpha',
    name: 'Jira Project Alpha',
    platform: 'jira',
    config: {
      domain: 'alpha-company.atlassian.net',
      email: 'alpha@company.com',
      apiToken: 'alpha-token-12345',
      projectKey: 'ALPHA'
    },
    status: 'connected'
  };

  const mockConnection2: PlatformConnection = {
    id: 'jira-conn-beta',
    name: 'Jira Project Beta',
    platform: 'jira',
    config: {
      domain: 'beta-company.atlassian.net',
      email: 'beta@company.com',
      apiToken: 'beta-token-67890',
      projectKey: 'BETA'
    },
    status: 'connected'
  };

  let client1: JiraClient;
  let client2: JiraClient;
  let mockAxiosInstance1: any;
  let mockAxiosInstance2: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create separate mock axios instances
    mockAxiosInstance1 = {
      defaults: { headers: {}, baseURL: '' },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      request: jest.fn(),
      head: jest.fn(),
      options: jest.fn(),
      getUri: jest.fn(),
      create: jest.fn(),
      postForm: jest.fn(),    // ✅ Added missing property
      putForm: jest.fn(),     // ✅ Added missing property
      patchForm: jest.fn(),   // ✅ Added missing property
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any;

    mockAxiosInstance2 = {
      defaults: { headers: {}, baseURL: '' },
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any;

    // Mock axios.create to return different instances
    mockedAxios.create
      .mockReturnValueOnce(mockAxiosInstance1)
      .mockReturnValueOnce(mockAxiosInstance2);

    client1 = new JiraClient(mockConnection1);
    client2 = new JiraClient(mockConnection2);
  });

  describe('🔧 Domain Normalization & HTTP Client Configuration', () => {
    test('should normalize domains correctly for different formats', () => {
      const testCases = [
        { input: 'company.atlassian.net', expected: 'https://company.atlassian.net/rest/api/3' },
        { input: 'https://company.atlassian.net', expected: 'https://company.atlassian.net/rest/api/3' },
        { input: 'company.atlassian.net/', expected: 'https://company.atlassian.net/rest/api/3' },
        { input: 'company', expected: 'https://company.atlassian.net/rest/api/3' }
      ];

      testCases.forEach(({ input, expected }) => {
        const mockConn = {
          ...mockConnection1,
          config: { ...mockConnection1.config, domain: input }
        };

        const mockInstance = {
          defaults: { headers: {}, baseURL: '' },
          get: jest.fn(),
          post: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
          patch: jest.fn(),
          request: jest.fn(),
          head: jest.fn(),
          options: jest.fn(),
          getUri: jest.fn(),
          create: jest.fn(),
          interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() }
          }
        } as any;

        mockedAxios.create.mockReturnValueOnce(mockInstance);
        new JiraClient(mockConn);

        expect(mockInstance.defaults.baseURL).toBe(expected);
      });

      console.log('✅ Domain normalization working correctly');
    });

    test('should create isolated HTTP client configurations', () => {
      expect(mockAxiosInstance1.defaults.baseURL).toBe('https://alpha-company.atlassian.net/rest/api/3');
      expect(mockAxiosInstance2.defaults.baseURL).toBe('https://beta-company.atlassian.net/rest/api/3');

      // Verify different base URLs
      expect(mockAxiosInstance1.defaults.baseURL).not.toBe(mockAxiosInstance2.defaults.baseURL);

      console.log('✅ HTTP clients properly isolated');
    });

    test('should validate required configuration fields', () => {
      const invalidConfigs = [
        { ...mockConnection1.config, domain: '' },
        { ...mockConnection1.config, email: '' },
        { ...mockConnection1.config, apiToken: '' },
        { ...mockConnection1.config, projectKey: '' }
      ];

      invalidConfigs.forEach(invalidConfig => {
        const invalidConnection = { ...mockConnection1, config: invalidConfig };

        expect(() => {
          mockedAxios.create.mockReturnValueOnce(mockAxiosInstance1);
          new JiraClient(invalidConnection);
        }).toThrow();
      });

      console.log('✅ Configuration validation working');
    });
  });

  describe('🔐 Authentication Isolation & Security', () => {
    test('should create unique authentication headers for each connection', () => {
      const expectedAuth1 = Buffer.from('alpha@company.com:alpha-token-12345').toString('base64');
      const expectedAuth2 = Buffer.from('beta@company.com:beta-token-67890').toString('base64');

      expect(mockAxiosInstance1.defaults.headers['Authorization']).toBe(`Basic ${expectedAuth1}`);
      expect(mockAxiosInstance2.defaults.headers['Authorization']).toBe(`Basic ${expectedAuth2}`);

      // Critical: Verify no auth header bleeding
      expect(mockAxiosInstance1.defaults.headers['Authorization']).not.toBe(
        mockAxiosInstance2.defaults.headers['Authorization']
      );

      console.log('✅ Authentication headers properly isolated');
    });

    test('should include proper Jira-specific headers', () => {
      expect(mockAxiosInstance1.defaults.headers['Accept']).toBe('application/json');
      expect(mockAxiosInstance1.defaults.headers['Content-Type']).toBe('application/json');

      expect(mockAxiosInstance2.defaults.headers['Accept']).toBe('application/json');
      expect(mockAxiosInstance2.defaults.headers['Content-Type']).toBe('application/json');

      console.log('✅ Jira-specific headers configured');
    });

    test('should handle authentication errors properly in testConnection', async () => {
      const authErrorScenarios = [
        { status: 401, expectedError: 'Invalid email or API token' },
        { status: 403, expectedError: 'API token does not have sufficient permissions' },
        { status: 404, expectedError: 'Jira instance not found. Please check your domain' }
      ];

      for (const scenario of authErrorScenarios) {
        mockAxiosInstance1.get.mockRejectedValueOnce({
          response: { status: scenario.status }
        });

        await expect(client1.testConnection()).rejects.toThrow(scenario.expectedError);
      }

      console.log('✅ Authentication error handling working');
    });
  });

  describe('🎯 Project-Specific API Endpoint Construction', () => {
    test('should construct correct project-specific API endpoints', async () => {
      // Mock responses for both clients
      const alphaProjectResponse = {
        status: 200,
        data: { key: 'ALPHA', name: 'Alpha Project', description: 'Alpha description' }
      };

      const betaProjectResponse = {
        status: 200,
        data: { key: 'BETA', name: 'Beta Project', description: 'Beta description' }
      };

      const alphaIssuesResponse = {
        status: 200,
        data: { issues: [] }
      };

      const betaIssuesResponse = {
        status: 200,
        data: { issues: [] }
      };

      mockAxiosInstance1.get
        .mockResolvedValueOnce(alphaProjectResponse)
        .mockResolvedValueOnce(alphaIssuesResponse);

      mockAxiosInstance2.get
        .mockResolvedValueOnce(betaProjectResponse)
        .mockResolvedValueOnce(betaIssuesResponse);

      await client1.getProjects();
      await client2.getProjects();

      // Verify correct project-specific endpoints were called
      expect(mockAxiosInstance1.get).toHaveBeenCalledWith('/project/ALPHA');
      expect(mockAxiosInstance1.get).toHaveBeenCalledWith('/search', {
        params: {
          jql: 'project = ALPHA',
          fields: 'summary,status,assignee,priority,created,updated,labels,issuetype',
          maxResults: 100,
          startAt: 0
        }
      });

    expect(mockAxiosInstance2.get).toHaveBeenCalledWith('/project/BETA');
    expect(mockAxiosInstance2.get).toHaveBeenCalledWith('/search', {
      params: {
        jql: 'project = BETA',
        fields: 'summary,status,assignee,priority,created,updated,labels,issuetype',
        maxResults: 100,
        startAt: 0
      }
    });

    console.log('✅ Project-specific endpoints correctly constructed');
  });

  test('should prevent cross-project data contamination in API calls', async () => {
    // Mock project data with clear identifiers
    const alphaData = {
      projectResponse: {
        status: 200,
        data: { key: 'ALPHA', name: 'Alpha Project' }
      },
      issuesResponse: {
        status: 200,
        data: {
          issues: [{
            key: 'ALPHA-1',
            fields: {
              summary: 'Alpha Task 1',
              status: { name: 'Done' },
              assignee: {
                accountId: 'alpha-user-1',
                displayName: 'Alpha User 1',
                emailAddress: 'alpha1@company.com'
              }
            }
          }]
        }
      }
    };

    const betaData = {
      projectResponse: {
        status: 200,
        data: { key: 'BETA', name: 'Beta Project' }
      },
      issuesResponse: {
        status: 200,
        data: {
          issues: [{
            key: 'BETA-1',
            fields: {
              summary: 'Beta Task 1',
              status: { name: 'In Progress' },
              assignee: {
                accountId: 'beta-user-1',
                displayName: 'Beta User 1',
                emailAddress: 'beta1@company.com'
              }
            }
          }]
        }
      }
    };

    // Setup mocks
    mockAxiosInstance1.get
      .mockResolvedValueOnce(alphaData.projectResponse)
      .mockResolvedValueOnce(alphaData.issuesResponse);

    mockAxiosInstance2.get
      .mockResolvedValueOnce(betaData.projectResponse)
      .mockResolvedValueOnce(betaData.issuesResponse);

    // Execute API calls
    const alphaProjects = await client1.getProjects();
    const betaProjects = await client2.getProjects();

    // Verify data isolation - NO CROSS-CONTAMINATION
    expect(alphaProjects[0].id).toBe('ALPHA');
    expect(alphaProjects[0].name).toBe('Alpha Project');
    expect(alphaProjects[0].tasks[0].id).toBe('ALPHA-1');
    expect(alphaProjects[0].tasks[0].title).toBe('Alpha Task 1');
    expect(alphaProjects[0].tasks[0].assignee.name).toBe('Alpha User 1');

    expect(betaProjects[0].id).toBe('BETA');
    expect(betaProjects[0].name).toBe('Beta Project');
    expect(betaProjects[0].tasks[0].id).toBe('BETA-1');
    expect(betaProjects[0].tasks[0].title).toBe('Beta Task 1');
    expect(betaProjects[0].tasks[0].assignee.name).toBe('Beta User 1');

    // Critical: Ensure NO cross-contamination
    expect(alphaProjects[0].id).not.toBe(betaProjects[0].id);
    expect(alphaProjects[0].tasks[0].id).not.toBe(betaProjects[0].tasks[0].id);
    expect(alphaProjects[0].tasks[0].assignee.name).not.toBe(betaProjects[0].tasks[0].assignee.name);

    console.log('🎯 CRITICAL: No cross-project data contamination detected');
    console.log(`   - Alpha: ${alphaProjects[0].name} (${alphaProjects[0].tasks[0].title})`);
    console.log(`   - Beta: ${betaProjects[0].name} (${betaProjects[0].tasks[0].title})`);
  });  // ✅ Close the test function
});    // ✅ Close the describe block
});