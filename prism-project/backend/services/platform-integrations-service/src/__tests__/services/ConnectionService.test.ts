// backend/services/platform-integrations-service/src/__tests__/services/ConnectionService.test.ts
// Jest Test Suite for ConnectionService Core Logic - Module 1 (Part 1)
// Focus: getProjectData() method project filtering and data isolation

import { ConnectionService } from '../../services/ConnectionService.refactored';
import { MockFactory, TestDataUtils } from '../__mocks__/MockFactory';
import { 
  TEST_USER_ID, 
  TEST_CONNECTION_ID, 
  TEST_PROJECT_ID,
  DIFFERENT_USER_ID,
  MOCK_JIRA_CONNECTION,
  MOCK_MONDAY_CONNECTION,
  MOCK_TROFOS_CONNECTION,
  MOCK_JIRA_PROJECT_DATA,
  MOCK_MONDAY_PROJECT_DATA,
  MOCK_TROFOS_PROJECT_DATA
} from '../setup';
import logger from '../../utils/logger';

// Mock logger to prevent console noise during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('ConnectionService - Core Logic (Module 1)', () => {
  let connectionService: ConnectionService;
  let mocks: ReturnType<typeof MockFactory.createConnectionServiceMocks>;

  // Test setup - create fresh mocks for each test
  beforeEach(() => {
    mocks = MockFactory.createConnectionServiceMocks();
    
    connectionService = new ConnectionService(
      mocks.connectionRepository,
      mocks.platformClientFactory,
      mocks.configValidator,
      mocks.dataTransformer
    );

    // Clear all mock calls
    jest.clearAllMocks();
  });

  describe('getProjectData() - Core Project Filtering Logic', () => {
    
    describe('Happy Path: Single Project Retrieval', () => {
      
      it('should successfully retrieve project data for valid Jira connection', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          TEST_CONNECTION_ID,
          MOCK_JIRA_CONNECTION as any
        );
        
        mocks.jiraClient.getProjectData.mockResolvedValue({ 
          project: 'jira_raw_data',
          issues: ['issue1', 'issue2'] 
        });
        
        mocks.dataTransformer.transformJiraData.mockReturnValue(MOCK_JIRA_PROJECT_DATA);

        // Act
        const result = await connectionService.getProjectData(
          TEST_USER_ID, 
          TEST_CONNECTION_ID, 
          TEST_PROJECT_ID
        );

        // Assert
        expect(result).toEqual(MOCK_JIRA_PROJECT_DATA);
        expect(result).toHaveIsolatedData('jira');
        
        // Verify repository called with correct user isolation
        expect(mocks.connectionRepository.findOne).toHaveBeenCalledWith({
          _id: TEST_CONNECTION_ID,
          userId: TEST_USER_ID
        });
        
        // Verify platform client factory created isolated client
        expect(mocks.platformClientFactory.createJiraClient).toHaveBeenCalledWith(
          MOCK_JIRA_CONNECTION.config
        );
        
        // Verify platform client called with correct project
        expect(mocks.jiraClient.getProjectData).toHaveBeenCalledWith(TEST_PROJECT_ID);
        
        // Verify data transformer called with platform-specific data
        expect(mocks.dataTransformer.transformJiraData).toHaveBeenCalledWith({
          project: 'jira_raw_data',
          issues: ['issue1', 'issue2']
        });
      });

      it('should successfully retrieve project data for valid Monday connection', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          'monday_conn_123',
          MOCK_MONDAY_CONNECTION as any
        );
        
        mocks.mondayClient.getProjectData.mockResolvedValue({ 
          board: 'monday_raw_data',
          items: ['item1', 'item2'] 
        });
        
        mocks.dataTransformer.transformMondayData.mockReturnValue(MOCK_MONDAY_PROJECT_DATA);

        // Act
        const result = await connectionService.getProjectData(
          TEST_USER_ID, 
          'monday_conn_123', 
          'monday_project'
        );

        // Assert
        expect(result).toEqual(MOCK_MONDAY_PROJECT_DATA);
        expect(result).toHaveIsolatedData('monday');
        
        // Verify platform client factory isolation
        expect(mocks.platformClientFactory.createMondayClient).toHaveBeenCalledWith(
          MOCK_MONDAY_CONNECTION.config
        );
        
        // Verify correct project parameter passing
        expect(mocks.mondayClient.getProjectData).toHaveBeenCalledWith('monday_project');
        
        // Verify data transformation
        expect(mocks.dataTransformer.transformMondayData).toHaveBeenCalledWith({
          board: 'monday_raw_data',
          items: ['item1', 'item2']
        });
      });

      it('should successfully retrieve project data for valid TROFOS connection', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          'trofos_conn_456',
          MOCK_TROFOS_CONNECTION as any
        );
        
        mocks.trofosClient.getProjectData.mockResolvedValue({ 
          project: 'trofos_raw_data',
          backlogs: ['backlog1', 'backlog2'] 
        });
        
        mocks.dataTransformer.transformTrofosData.mockReturnValue(MOCK_TROFOS_PROJECT_DATA);

        // Act
        const result = await connectionService.getProjectData(
          TEST_USER_ID, 
          'trofos_conn_456', 
          'trofos_project'
        );

        // Assert
        expect(result).toEqual(MOCK_TROFOS_PROJECT_DATA);
        expect(result).toHaveIsolatedData('trofos');
        
        // Verify TROFOS client factory isolation
        expect(mocks.platformClientFactory.createTrofosClient).toHaveBeenCalledWith(
          MOCK_TROFOS_CONNECTION.config
        );
        
        // Verify correct project parameter passing
        expect(mocks.trofosClient.getProjectData).toHaveBeenCalledWith('trofos_project');
        
        // Verify TROFOS data transformation
        expect(mocks.dataTransformer.transformTrofosData).toHaveBeenCalledWith({
          project: 'trofos_raw_data',
          backlogs: ['backlog1', 'backlog2']
        });
      });

      it('should retrieve all projects when no projectId specified', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          TEST_CONNECTION_ID,
          MOCK_JIRA_CONNECTION as any
        );
        
        mocks.jiraClient.getProjectData.mockResolvedValue({ 
          projects: 'all_jira_data',
          totalCount: 5 
        });
        
        mocks.dataTransformer.transformJiraData.mockReturnValue(MOCK_JIRA_PROJECT_DATA);

        // Act
        const result = await connectionService.getProjectData(TEST_USER_ID, TEST_CONNECTION_ID);

        // Assert
        expect(result).toEqual(MOCK_JIRA_PROJECT_DATA);
        
        // Verify no specific project was requested
        expect(mocks.jiraClient.getProjectData).toHaveBeenCalledWith(undefined);
        
        // Verify logger shows 'all' projects
        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining('project: all')
        );
      });
    });

    describe('Edge Cases: Non-existent Projects and Invalid IDs', () => {
      
      it('should throw error when connection not found', async () => {
        // Arrange - Repository returns null (connection not found)
        mocks.connectionRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(
          connectionService.getProjectData(TEST_USER_ID, 'nonexistent_conn')
        ).rejects.toThrow('Connection not found');

        // Verify correct repository query
        expect(mocks.connectionRepository.findOne).toHaveBeenCalledWith({
          _id: 'nonexistent_conn',
          userId: TEST_USER_ID
        });
        
        // Verify no platform clients were created
        expect(mocks.platformClientFactory.createJiraClient).not.toHaveBeenCalled();
        expect(mocks.platformClientFactory.createMondayClient).not.toHaveBeenCalled();
        expect(mocks.platformClientFactory.createTrofosClient).not.toHaveBeenCalled();
      });

      it('should throw error for invalid projectId', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          TEST_CONNECTION_ID,
          MOCK_JIRA_CONNECTION as any
        );
        
        // Mock Jira client to reject invalid project
        mocks.jiraClient.getProjectData.mockRejectedValue(
          new Error('Project not found')
        );

        // Act & Assert
        await expect(
          connectionService.getProjectData(TEST_USER_ID, TEST_CONNECTION_ID, 'invalid_project')
        ).rejects.toThrow('Project not found');

        // Verify platform client was called with invalid project
        expect(mocks.jiraClient.getProjectData).toHaveBeenCalledWith('invalid_project');
        
        // Verify error was logged
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to get project data:', 
          expect.any(Error)
        );
      });

      it('should return empty array when platform returns no data', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          TEST_CONNECTION_ID,
          MOCK_JIRA_CONNECTION as any
        );
        
        // Platform returns null/empty data
        mocks.jiraClient.getProjectData.mockResolvedValue(null);

        // Act
        const result = await connectionService.getProjectData(TEST_USER_ID, TEST_CONNECTION_ID);

        // Assert
        expect(result).toEqual([]);
        
        // Verify warning was logged
        expect(logger.warn).toHaveBeenCalledWith(
          'No raw data returned from jira platform'
        );
        
        // Verify data transformer was not called
        expect(mocks.dataTransformer.transformJiraData).not.toHaveBeenCalled();
      });

      it('should return empty array when platform returns undefined', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          TEST_CONNECTION_ID,
          MOCK_JIRA_CONNECTION as any
        );
        
        // Platform returns undefined
        mocks.jiraClient.getProjectData.mockResolvedValue(undefined);

        // Act
        const result = await connectionService.getProjectData(TEST_USER_ID, TEST_CONNECTION_ID);

        // Assert
        expect(result).toEqual([]);
        
        // Verify appropriate warning
        expect(logger.warn).toHaveBeenCalledWith(
          'No raw data returned from jira platform'
        );
      });
    });

    describe('Boundary Conditions: Empty Responses and Malformed Data', () => {
      
      it('should handle empty response from platform gracefully', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          TEST_CONNECTION_ID,
          MOCK_JIRA_CONNECTION as any
        );
        
        // Platform returns empty object
        mocks.jiraClient.getProjectData.mockResolvedValue({});
        mocks.dataTransformer.transformJiraData.mockReturnValue([]);

        // Act
        const result = await connectionService.getProjectData(TEST_USER_ID, TEST_CONNECTION_ID);

        // Assert
        expect(result).toEqual([]);
        
        // Verify transformer was called with empty data
        expect(mocks.dataTransformer.transformJiraData).toHaveBeenCalledWith({});
        
        // Verify success log with 0 projects
        expect(logger.info).toHaveBeenCalledWith(
          'Successfully transformed 0 projects from jira'
        );
      });

      it('should handle malformed data from platform', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          TEST_CONNECTION_ID,
          MOCK_JIRA_CONNECTION as any
        );
        
        const malformedData = { malformed: 'data', invalid: true };
        mocks.jiraClient.getProjectData.mockResolvedValue(malformedData);
        mocks.dataTransformer.transformJiraData.mockReturnValue([]);

        // Act
        const result = await connectionService.getProjectData(TEST_USER_ID, TEST_CONNECTION_ID);

        // Assert
        expect(result).toEqual([]);
        
        // Verify transformer received malformed data
        expect(mocks.dataTransformer.transformJiraData).toHaveBeenCalledWith(malformedData);
      });

      it('should handle transformer returning empty array', async () => {
        // Arrange
        MockFactory.configureRepositoryForUserAccess(
          mocks.connectionRepository,
          TEST_USER_ID,
          TEST_CONNECTION_ID,
          MOCK_JIRA_CONNECTION as any
        );
        
        mocks.jiraClient.getProjectData.mockResolvedValue({ valid: 'data' });
        mocks.dataTransformer.transformJiraData.mockReturnValue([]); // Empty result

        // Act
        const result = await connectionService.getProjectData(TEST_USER_ID, TEST_CONNECTION_ID);

        // Assert
        expect(result).toEqual([]);
        
        // Verify success message with 0 count
        expect(logger.info).toHaveBeenCalledWith(
          'Successfully transformed 0 projects from jira'
        );
      });
    });
  });
});