// backend/services/platform-integrations-service/src/__tests__/__mocks__/MockFactory.ts
// Mock factory for creating test dependencies with consistent behavior

import { 
  IConnectionRepository, 
  IPlatformClientFactory, 
  IConfigValidator, 
  IDataTransformer,
  IJiraClient,
  IMondayClient,
  ITrofosClient,
  ConnectionTestResult,
  ValidationResult,
  ProjectData
} from '../../interfaces/ConnectionInterfaces';
import { IConnection } from '../../models/Connection';
import { 
  MOCK_JIRA_CONNECTION,
  MOCK_MONDAY_CONNECTION, 
  MOCK_TROFOS_CONNECTION,
  MOCK_JIRA_PROJECT_DATA,
  MOCK_MONDAY_PROJECT_DATA,
  MOCK_TROFOS_PROJECT_DATA
} from '../setup';

/**
 * Mock Factory for ConnectionService Dependencies
 * Provides consistent mock implementations for testing data isolation and bug prevention
 */
export class MockFactory {
  
  /**
   * Create mock connection repository with configurable behavior
   */
  static createMockConnectionRepository(): jest.Mocked<IConnectionRepository> {
    return {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };
  }

  /**
   * Create mock Jira client with standard responses
   */
  static createMockJiraClient(): jest.Mocked<IJiraClient> {
    return {
      testConnection: jest.fn().mockResolvedValue({ 
        success: true, 
        message: 'Jira connection successful' 
      }),
      getProjectData: jest.fn().mockResolvedValue({ 
        project: 'mock_jira_raw_data',
        issues: ['issue1', 'issue2'] 
      }),
      getProject: jest.fn().mockResolvedValue({ 
        key: 'TEST', 
        name: 'Test Project' 
      }),
      getIssues: jest.fn().mockResolvedValue({ 
        issues: [], 
        total: 0 
      }),
    };
  }

  /**
   * Create mock Monday client with standard responses  
   */
  static createMockMondayClient(): jest.Mocked<IMondayClient> {
    return {
      testConnection: jest.fn().mockResolvedValue({ 
        success: true, 
        message: 'Monday.com connection successful' 
      }),
      getProjectData: jest.fn().mockResolvedValue({ 
        board: 'mock_monday_raw_data',
        items: ['item1', 'item2'] 
      }),
      getBoards: jest.fn().mockResolvedValue({ 
        boards: [] 
      }),
      getBoardItems: jest.fn().mockResolvedValue({ 
        items: [] 
      }),
    };
  }

  /**
   * Create mock TROFOS client with standard responses
   */
  static createMockTrofosClient(): jest.Mocked<ITrofosClient> {
    return {
      testConnection: jest.fn().mockResolvedValue({ 
        success: true, 
        message: 'TROFOS connection successful' 
      }),
      getProjectData: jest.fn().mockResolvedValue({ 
        project: 'mock_trofos_raw_data',
        backlogs: ['backlog1', 'backlog2'] 
      }),
      getProject: jest.fn().mockResolvedValue({ 
        id: 'TROFOS_PROJ', 
        name: 'TROFOS Test Project' 
      }),
      getProjectMetrics: jest.fn().mockResolvedValue({ 
        velocity: 25, 
        burndown: [] 
      }),
    };
  }

  /**
   * Create mock platform client factory that returns isolated clients
   */
  static createMockPlatformClientFactory(
    jiraClient?: jest.Mocked<IJiraClient>,
    mondayClient?: jest.Mocked<IMondayClient>,
    trofosClient?: jest.Mocked<ITrofosClient>
  ): jest.Mocked<IPlatformClientFactory> {
    return {
      createJiraClient: jest.fn().mockReturnValue(
        jiraClient || this.createMockJiraClient()
      ),
      createMondayClient: jest.fn().mockReturnValue(
        mondayClient || this.createMockMondayClient()
      ),
      createTrofosClient: jest.fn().mockReturnValue(
        trofosClient || this.createMockTrofosClient()
      ),
    };
  }

  /**
   * Create mock config validator with platform-specific validation
   */
  static createMockConfigValidator(): jest.Mocked<IConfigValidator> {
    return {
      validateJiraConfig: jest.fn().mockReturnValue({ 
        valid: true, 
        message: 'Jira config valid' 
      }),
      validateMondayConfig: jest.fn().mockReturnValue({ 
        valid: true, 
        message: 'Monday config valid' 
      }),
      validateTrofosConfig: jest.fn().mockReturnValue({ 
        valid: true, 
        message: 'TROFOS config valid' 
      }),
    };
  }

  /**
   * Create mock data transformer with platform-specific transformations
   */
  static createMockDataTransformer(): jest.Mocked<IDataTransformer> {
    return {
      transformJiraData: jest.fn().mockReturnValue(MOCK_JIRA_PROJECT_DATA),
      transformMondayData: jest.fn().mockReturnValue(MOCK_MONDAY_PROJECT_DATA),
      transformTrofosData: jest.fn().mockReturnValue(MOCK_TROFOS_PROJECT_DATA),
    };
  }

  /**
   * Create a complete set of mocks for ConnectionService testing
   */
  static createConnectionServiceMocks() {
    const mockJiraClient = this.createMockJiraClient();
    const mockMondayClient = this.createMockMondayClient();
    const mockTrofosClient = this.createMockTrofosClient();

    return {
      connectionRepository: this.createMockConnectionRepository(),
      platformClientFactory: this.createMockPlatformClientFactory(
        mockJiraClient, 
        mockMondayClient,
        mockTrofosClient
      ),
      configValidator: this.createMockConfigValidator(),
      dataTransformer: this.createMockDataTransformer(),
      // Individual clients for direct verification
      jiraClient: mockJiraClient,
      mondayClient: mockMondayClient,
      trofosClient: mockTrofosClient,
    };
  }

  /**
   * Configure repository mock for specific user/connection scenarios
   */
  static configureRepositoryForUserAccess(
    repository: jest.Mocked<IConnectionRepository>,
    userId: string,
    connectionId: string,
    connection: IConnection | null
  ) {
    repository.findOne.mockImplementation((query: any) => {
      if (query._id === connectionId && query.userId === userId) {
        return Promise.resolve(connection);
      }
      return Promise.resolve(null); // Simulate user isolation
    });
  }

  /**
   * Configure platform clients for data isolation testing
   */
  static configurePlatformClientForIsolation(
    client: jest.Mocked<IJiraClient | IMondayClient | ITrofosClient>,
    platform: string,
    projectId?: string
  ) {
    const platformData = {
      jira: { project: `jira_data_${projectId || 'all'}` },
      monday: { board: `monday_data_${projectId || 'all'}` },
      trofos: { project: `trofos_data_${projectId || 'all'}` }
    };

    (client.getProjectData as jest.Mock).mockResolvedValue(
      platformData[platform as keyof typeof platformData]
    );
  }

  /**
   * Create error scenarios for testing error handling
   */
  static createErrorScenarios() {
    return {
      connectionNotFound: () => Promise.resolve(null),
      connectionDisconnected: () => Promise.resolve({
        ...MOCK_JIRA_CONNECTION,
        status: 'disconnected'
      }),
      apiTimeout: () => Promise.reject(new Error('API timeout')),
      invalidConfig: () => ({ valid: false, message: 'Invalid configuration' }),
      transformationError: () => { throw new Error('Transformation failed'); }
    };
  }
}

/**
 * Utility functions for test data manipulation
 */
export class TestDataUtils {
  
  /**
   * Create connection with specific platform and config
   */
  static createConnection(
    platform: 'jira' | 'monday' | 'trofos',
    overrides: Partial<IConnection> = {}
  ): IConnection {
    const baseConnections = {
      jira: MOCK_JIRA_CONNECTION,
      monday: MOCK_MONDAY_CONNECTION,
      trofos: MOCK_TROFOS_CONNECTION
    };

    return {
      ...baseConnections[platform],
      ...overrides
    } as IConnection;
  }

  /**
   * Create project data with specific platform characteristics
   */
  static createProjectData(
    platform: 'jira' | 'monday' | 'trofos',
    projectId: string,
    overrides: Partial<ProjectData> = {}
  ): ProjectData[] {
    const baseData = {
      jira: MOCK_JIRA_PROJECT_DATA,
      monday: MOCK_MONDAY_PROJECT_DATA,
      trofos: MOCK_TROFOS_PROJECT_DATA
    };

    return baseData[platform].map(project => ({
      ...project,
      id: projectId,
      ...overrides
    }));
  }

  /**
   * Verify data isolation - no cross-platform contamination
   */
  static verifyDataIsolation(
    projectData: ProjectData[],
    expectedPlatform: string
  ): boolean {
    return projectData.every(project => project.platform === expectedPlatform);
  }

  /**
   * Verify user isolation - no cross-user data access
   */
  static verifyUserIsolation(
    mockRepository: jest.Mocked<IConnectionRepository>,
    userId: string,
    connectionId: string
  ): boolean {
    const calls = mockRepository.findOne.mock.calls;
    return calls.every(call => {
      const query = call[0];
      return query.userId === userId && query._id === connectionId;
    });
  }
}