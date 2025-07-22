// backend/services/platform-integrations-service/src/__tests__/services/DataTransformationPipeline.test.ts
// Module 3: Data Transformation Pipeline Tests - Testing ConnectionService data isolation

import { ConnectionService } from '../../services/ConnectionService';
import { Connection, IConnection } from '../../models/Connection';
import logger from '../../utils/logger';

// Mock logger to prevent console noise during tests
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock Connection model with chainable query methods
jest.mock('../../models/Connection', () => ({
  Connection: {
    findOne: jest.fn(),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      then: function(resolve: any) {
        return Promise.resolve([]).then(resolve);
      }
    }),
    save: jest.fn()
  }
}));

describe('Module 3: Data Transformation Pipeline - ConnectionService', () => {
  let connectionService: ConnectionService;
  let mockConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    connectionService = new ConnectionService();
    mockConnection = require('../../models/Connection').Connection;
  });

  describe('🔒 Critical: Project Data Isolation in Connection Service', () => {
    
    test('should isolate ALPHA project connection data from BETA project', async () => {
      // Arrange: Mock different connections for different projects
      const alphaConnection: Partial<IConnection> = {
        _id: 'conn-alpha-123',
        userId: 'user-123',
        name: 'Alpha Jira Connection',
        platform: 'jira',
        config: {
          baseUrl: 'https://alpha-company.atlassian.net',
          email: 'alpha@company.com',
          apiToken: 'alpha-token-123'
        },
        status: 'connected',
        projectCount: 1
      };

      const betaConnection: Partial<IConnection> = {
        _id: 'conn-beta-456',
        userId: 'user-123',
        name: 'Beta Jira Connection',
        platform: 'jira',
        config: {
          baseUrl: 'https://beta-company.atlassian.net',
          email: 'beta@company.com',
          apiToken: 'beta-token-456'
        },
        status: 'connected',
        projectCount: 1
      };

      // Mock findOne to return different connections based on connectionId
      mockConnection.findOne.mockImplementation((query: any) => {
        if (query._id === 'conn-alpha-123') {
          return Promise.resolve(alphaConnection);
        } else if (query._id === 'conn-beta-456') {
          return Promise.resolve(betaConnection);
        }
        return Promise.resolve(null);
      });

      // Act: Get connection data for both projects
      const alphaResult = await connectionService.getConnection('user-123', 'conn-alpha-123');
      const betaResult = await connectionService.getConnection('user-123', 'conn-beta-456');

      // Assert: Connections are properly isolated
      expect(alphaResult).toBeDefined();
      expect(betaResult).toBeDefined();
      
      // Critical: Verify ALPHA connection isolation
      expect(alphaResult!._id).toBe('conn-alpha-123');
      expect(alphaResult!.name).toBe('Alpha Jira Connection');
      expect(alphaResult!.config.baseUrl).toBe('https://alpha-company.atlassian.net');
      expect(alphaResult!.config.email).toBe('alpha@company.com');
      expect(alphaResult!.config.apiToken).toBe('alpha-token-123');
      
      // Critical: Verify BETA connection isolation
      expect(betaResult!._id).toBe('conn-beta-456');
      expect(betaResult!.name).toBe('Beta Jira Connection');
      expect(betaResult!.config.baseUrl).toBe('https://beta-company.atlassian.net');
      expect(betaResult!.config.email).toBe('beta@company.com');
      expect(betaResult!.config.apiToken).toBe('beta-token-456');
      
      // Critical: Ensure no cross-contamination
      expect(alphaResult!.config.apiToken).not.toBe(betaResult!.config.apiToken);
      expect(alphaResult!.config.baseUrl).not.toBe(betaResult!.config.baseUrl);
      expect(alphaResult!.config.email).not.toBe(betaResult!.config.email);
    });

    test('should isolate user connections - User A cannot access User B connections', async () => {
      // Arrange: Mock connections for different users
      const userAConnection: Partial<IConnection> = {
        _id: 'conn-user-a-123',
        userId: 'user-a',
        name: 'User A Connection',
        platform: 'jira',
        config: { baseUrl: 'https://user-a.com', apiToken: 'user-a-token' },
        status: 'connected'
      };

      // Mock findOne to enforce user isolation
      mockConnection.findOne.mockImplementation((query: any) => {
        // Only return connection if userId matches
        if (query._id === 'conn-user-a-123' && query.userId === 'user-a') {
          return Promise.resolve(userAConnection);
        }
        return Promise.resolve(null); // Return null for unauthorized access
      });

      // Act: User B tries to access User A's connection
      const unauthorizedResult = await connectionService.getConnection('user-b', 'conn-user-a-123');
      const authorizedResult = await connectionService.getConnection('user-a', 'conn-user-a-123');

      // Assert: User isolation enforced
      expect(unauthorizedResult).toBeNull(); // User B cannot access User A's connection
      expect(authorizedResult).toBeDefined(); // User A can access their own connection
      expect(authorizedResult!.userId).toBe('user-a');
      
      // Verify MongoDB query was called with correct user isolation
      expect(mockConnection.findOne).toHaveBeenCalledWith({ 
        _id: 'conn-user-a-123', 
        userId: 'user-b' 
      });
      expect(mockConnection.findOne).toHaveBeenCalledWith({ 
        _id: 'conn-user-a-123', 
        userId: 'user-a' 
      });
    });

    test('should isolate platform-specific configurations during data transformation', async () => {
      // Arrange: Mock different platform connections with platform-specific configs
      const jiraConnection: Partial<IConnection> = {
        _id: 'conn-jira-123',
        userId: 'user-123',
        platform: 'jira',
        config: {
          baseUrl: 'https://company.atlassian.net',
          email: 'jira@company.com',
          apiToken: 'jira-token',
          projectKey: 'PROJ'
        }
      };

      const mondayConnection: Partial<IConnection> = {
        _id: 'conn-monday-456',
        userId: 'user-123',
        platform: 'monday',
        config: {
          apiKey: 'monday-api-key',
          boardId: '123456789',
          workspaceId: 'workspace-123'
        }
      };

      mockConnection.findOne.mockImplementation((query: any) => {
        if (query._id === 'conn-jira-123') {
          return Promise.resolve(jiraConnection);
        } else if (query._id === 'conn-monday-456') {
          return Promise.resolve(mondayConnection);
        }
        return Promise.resolve(null);
      });

      // Act: Get platform-specific connections
      const jiraResult = await connectionService.getConnection('user-123', 'conn-jira-123');
      const mondayResult = await connectionService.getConnection('user-123', 'conn-monday-456');

      // Assert: Platform-specific data isolation
      expect(jiraResult!.platform).toBe('jira');
      expect(jiraResult!.config).toHaveProperty('baseUrl');
      expect(jiraResult!.config).toHaveProperty('email');
      expect(jiraResult!.config).toHaveProperty('apiToken');
      expect(jiraResult!.config).toHaveProperty('projectKey');
      
      expect(mondayResult!.platform).toBe('monday');
      expect(mondayResult!.config).toHaveProperty('apiKey');
      expect(mondayResult!.config).toHaveProperty('boardId');
      expect(mondayResult!.config).toHaveProperty('workspaceId');
      
      // Critical: Ensure no cross-platform configuration bleeding
      expect(jiraResult!.config).not.toHaveProperty('boardId');
      expect(mondayResult!.config).not.toHaveProperty('baseUrl');
      expect(jiraResult!.config.apiToken).not.toBe(mondayResult!.config.apiKey);
    });
  });

  describe('🔄 Connection Data Transformation Integrity', () => {
    
    test('should preserve sensitive connection data during transformation', async () => {
      // Arrange: Mock connection with sensitive data
      const sensitiveConnection: Partial<IConnection> = {
        _id: 'conn-sensitive-123',
        userId: 'user-123',
        name: 'Sensitive Connection',
        platform: 'jira',
        config: {
          baseUrl: 'https://sensitive.atlassian.net',
          email: 'sensitive@company.com',
          apiToken: 'very-secret-token-123',
          webhookSecret: 'webhook-secret-456'
        },
        metadata: {
          selectedProjects: ['PROJ-1', 'PROJ-2'],
          defaultTemplate: 'standard'
        },
        status: 'connected'
      };

      mockConnection.findOne.mockResolvedValueOnce(sensitiveConnection);

      // Act: Get connection data
      const result = await connectionService.getConnection('user-123', 'conn-sensitive-123');

      // Assert: All sensitive data preserved correctly
      expect(result).toBeDefined();
      expect(result!.config.baseUrl).toBe('https://sensitive.atlassian.net');
      expect(result!.config.email).toBe('sensitive@company.com');
      expect(result!.config.apiToken).toBe('very-secret-token-123');
      expect(result!.config.webhookSecret).toBe('webhook-secret-456');
      
      // Verify metadata preservation (using actual metadata structure)
      expect(result!.metadata.selectedProjects).toEqual(['PROJ-1', 'PROJ-2']);
      expect(result!.metadata.defaultTemplate).toBe('standard');
      
      // Verify status preservation
      expect(result!.status).toBe('connected');
    });

    test('should handle multiple connection retrieval without data contamination', async () => {
      // Arrange: Mock multiple connections
      const connections = [
        {
          _id: 'conn-1',
          userId: 'user-123',
          name: 'Connection 1',
          platform: 'jira',
          config: { apiToken: 'token-1' }
        },
        {
          _id: 'conn-2',
          userId: 'user-123',
          name: 'Connection 2',
          platform: 'monday',
          config: { apiKey: 'key-2' }
        },
        {
          _id: 'conn-3',
          userId: 'user-123',
          name: 'Connection 3',
          platform: 'jira',
          config: { apiToken: 'token-3' }
        }
      ];

      mockConnection.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue(Promise.resolve(connections))
      });

      // Act: Get all connections for user
      const result = await connectionService.getConnections('user-123');

      // Assert: All connections returned with correct data
      expect(result).toHaveLength(3);
      
      // Verify each connection maintains its own data
      expect(result[0]._id).toBe('conn-1');
      expect(result[0].config.apiToken).toBe('token-1');
      expect(result[0].platform).toBe('jira');
      
      expect(result[1]._id).toBe('conn-2');
      expect(result[1].config.apiKey).toBe('key-2');
      expect(result[1].platform).toBe('monday');
      
      expect(result[2]._id).toBe('conn-3');
      expect(result[2].config.apiToken).toBe('token-3');
      expect(result[2].platform).toBe('jira');
      
      // Critical: Ensure no cross-contamination
      expect(result[0].config).not.toHaveProperty('apiKey');
      expect(result[1].config).not.toHaveProperty('apiToken');
      expect(result[0].config.apiToken).not.toBe(result[2].config.apiToken);
    });
  });

  describe('🌐 Platform-Specific Data Handling', () => {
    
    test('should handle Jira-specific connection configuration correctly', async () => {
      // Arrange: Mock Jira connection
      const jiraConnection: Partial<IConnection> = {
        _id: 'conn-jira-specific',
        userId: 'user-123',
        platform: 'jira',
        config: {
          baseUrl: 'https://jira.company.com',
          email: 'jira@company.com',
          apiToken: 'jira-api-token',
          projectKey: 'PROJ',
          customFields: {
            storyPoints: 'customfield_10001',
            epic: 'customfield_10002'
          }
        },
        metadata: {
          selectedProjects: ['PROJ'],
          defaultTemplate: 'detailed'
        }
      };

      mockConnection.findOne.mockResolvedValueOnce(jiraConnection);

      // Act: Get Jira connection
      const result = await connectionService.getConnection('user-123', 'conn-jira-specific');

      // Assert: Jira-specific data preserved
      expect(result!.platform).toBe('jira');
      expect(result!.config.baseUrl).toBe('https://jira.company.com');
      expect(result!.config.projectKey).toBe('PROJ');
      expect(result!.config.customFields.storyPoints).toBe('customfield_10001');
      expect(result!.config.customFields.epic).toBe('customfield_10002');
      expect(result!.metadata.selectedProjects).toEqual(['PROJ']);
    });

    test('should handle Monday.com-specific connection configuration correctly', async () => {
      // Arrange: Mock Monday.com connection
      const mondayConnection: Partial<IConnection> = {
        _id: 'conn-monday-specific',
        userId: 'user-123',
        platform: 'monday',
        config: {
          apiKey: 'monday-api-key-123',
          boardId: '987654321',
          workspaceId: 'workspace-456',
          columnMappings: {
            status: 'status_column',
            person: 'person_column',
            date: 'date_column'
          }
        },
        metadata: {
          selectedProjects: ['board-987654321'],
          reportPreferences: {
            includeCharts: true,
            includeTeamInfo: true
          }
        }
      };

      mockConnection.findOne.mockResolvedValueOnce(mondayConnection);

      // Act: Get Monday.com connection
      const result = await connectionService.getConnection('user-123', 'conn-monday-specific');

      // Assert: Monday.com-specific data preserved
      expect(result!.platform).toBe('monday');
      expect(result!.config.apiKey).toBe('monday-api-key-123');
      expect(result!.config.boardId).toBe('987654321');
      expect(result!.config.workspaceId).toBe('workspace-456');
      expect(result!.config.columnMappings.status).toBe('status_column');
      expect(result!.config.columnMappings.person).toBe('person_column');
      expect(result!.metadata.selectedProjects).toEqual(['board-987654321']);
    });
  });
});

// Test Execution Instructions:
// 1. Save this file as: backend/services/platform-integrations-service/src/__tests__/services/DataTransformationPipeline.test.ts
// 2. Run: npm test DataTransformationPipeline.test.ts
// 3. Expected: All tests should pass, verifying connection data isolation
// 4. Critical: Tests ensure no connection data bleeding between different projects/users