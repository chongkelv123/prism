// backend/services/platform-integrations-service/src/services/ConnectionService.ts
// CORRECTED VERSION - Fixed TypeScript errors and status field values
// Replace your ConnectionService.ts with this corrected version

import { Connection, IConnection } from '../models/Connection';
import logger from '../utils/logger';
import axios from 'axios';
import { ClientFactory, PlatformConnection, TeamMember, Task, Metric } from '../clients/BaseClient';

export interface ConnectionCreateData {
  name: string;
  platform: 'monday' | 'jira';
  config: Record<string, any>;
  metadata?: {
    selectedProjects?: string[];
    defaultTemplate?: string;
    reportPreferences?: {
      includeCharts?: boolean;
      includeTeamInfo?: boolean;
      dateRange?: number;
    };
  };
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface ConnectionSyncResult {
  success: boolean;
  message: string;
  projectCount?: number;
  lastSync?: Date;
  error?: string;
}

// Enhanced Project Data Interface for Report Generation
export interface ProjectData {
  id: string;
  name: string;
  platform: string;
  description?: string;
  status: string;
  progress?: number; // Percentage complete
  tasks: Task[];
  team?: TeamMember[];
  metrics: Metric[];
  sprints?: Array<{
    name: string;
    startDate: string;
    endDate: string;
    completed: string;
    velocity?: number;
    plannedPoints?: number;
    completedPoints?: number;
  }>;
  platformSpecific?: {
    jira?: {
      projectKey?: string;
      issueTypes?: string[];
      workflows?: Array<{ name: string; steps: string[] }>;
      components?: string[];
      versions?: string[];
    };
    monday?: {
      boardId?: string;
      groups?: Array<{ id: string; title: string; color?: string }>;
      columns?: Array<{ id: string; title: string; type: string }>;
      automations?: number;
    };
  };
  lastUpdated?: string;
  dataQuality?: {
    completeness: number;
    accuracy: number;
    freshness: number;
  };
}

export class ConnectionService {

  /**
   * Create a new platform connection
   */
  async createConnection(userId: string, data: ConnectionCreateData): Promise<IConnection> {
    try {
      logger.info(`Creating ${data.platform} connection for user ${userId}`);

      const connection = new Connection({
        userId,
        name: data.name,
        platform: data.platform,
        config: data.config,
        metadata: data.metadata || {},
        status: 'disconnected', // FIXED: Use correct status value
        createdAt: new Date(),
        lastSync: null,
        projectCount: 0
      });

      // Test the connection before saving
      const testResult = await this.testConnectionConfig(data.platform, data.config);

      if (testResult.success) {
        connection.status = 'connected';
        logger.info(`${data.platform} connection test successful`);
      } else {
        connection.status = 'error'; // FIXED: Use 'error' instead of 'failed'
        connection.lastSyncError = testResult.message;
        logger.warn(`${data.platform} connection test failed: ${testResult.message}`);
      }

      await connection.save();
      return connection;
    } catch (error) {
      logger.error('Failed to create connection:', error);
      throw error;
    }
  }

  /**
   * Get all connections for a user
   */
  async getConnections(userId: string): Promise<IConnection[]> {
    try {
      return await Connection.find({ userId }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Failed to get connections:', error);
      throw error;
    }
  }

  /**
   * Get a specific connection
   */
  async getConnection(userId: string, connectionId: string): Promise<IConnection | null> {
    try {
      return await Connection.findOne({ _id: connectionId, userId });
    } catch (error) {
      logger.error('Failed to get connection:', error);
      throw error;
    }
  }

  /**
   * CRITICAL: Get project data - This is what the report generation service calls
   */
  async getProjectData(userId: string, connectionId: string, projectId?: string): Promise<ProjectData[]> {
    try {
      logger.info(`🔄 Getting project data for connection ${connectionId}, project: ${projectId || 'all'}`);

      // Get the connection
      const connection = await this.getConnection(userId, connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      if (connection.status !== 'connected') {
        throw new Error(`Connection is not active (status: ${connection.status})`);
      }

      // Get platform-specific data
      let rawData: any;

      switch (connection.platform) {
        case 'jira':
          rawData = await this.getJiraProjectData(connection, projectId);
          break;
        case 'monday':
          rawData = await this.getMondayProjectData(connection, projectId);
          break;
        case 'trofos':  // ✅ ADDED: TROFOS case
          rawData = await this.getTrofosProjectData(connection, projectId);
          break;
        default:
          throw new Error(`Unsupported platform: ${connection.platform}`);
      }

      if (!rawData) {
        logger.warn(`⚠️ No raw data returned from ${connection.platform} platform`);
        return [];
      }

      // Transform the data into standardized format
      const transformedData = this.transformProjectData(rawData, connection.platform);

      logger.info(`✅ Successfully transformed ${transformedData.length} projects from ${connection.platform}`);
      return transformedData;

    } catch (error) {
      logger.error('❌ Failed to get project data:', error);
      throw error;
    }
  }

  /**
 * Get TROFOS project data using real API calls
 */
  private async getTrofosProjectData(connection: IConnection, projectId?: string): Promise<any> {
    try {
      const { serverUrl, apiKey } = connection.config;

      if (!serverUrl || !apiKey) {
        throw new Error('Missing TROFOS configuration (serverUrl, apiKey required)');
      }

      logger.info(`🎯 Fetching TROFOS project data - Project ID: ${projectId || 'all projects'}`);

      // Use ClientFactory to create TROFOS client
      const trofosClient = ClientFactory.createClient(connection as PlatformConnection);

      if (projectId) {
        // Fetch specific project with enhanced sprint data
        logger.info(`Fetching individual TROFOS project: ${projectId}`);

        // Use the enhanced method that includes sprint data
        if ('getProjectWithSprints' in trofosClient) {
          const enhancedProject = await (trofosClient as any).getProjectWithSprints(projectId);
          return [enhancedProject]; // Return as array for consistency
        } else {
          const basicProject = await trofosClient.getProject(projectId);
          return [basicProject];
        }
      } else {
        // Fetch all projects
        logger.info('Fetching all TROFOS projects');
        const allProjects = await trofosClient.getProjects();
        return allProjects;
      }

    } catch (error) {
      logger.error('❌ Failed to fetch TROFOS project data:', error);
      throw new Error(`TROFOS API error: ${(error as Error).message}`);
    }
  }

  /**
   * Get Jira project data using real API calls
   */
  private async getJiraProjectData(connection: IConnection, projectId?: string): Promise<any> {
    try {
      const { domain, email, apiToken, projectKey } = connection.config;

      if (!domain || !email || !apiToken) {
        throw new Error('Missing Jira configuration');
      }

      const baseUrl = `https://${domain.replace(/^https?:\/\//, '')}/rest/api/3`;
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

      const headers = {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // If specific project requested, get it directly
      if (projectId) {
        logger.info(`📋 Fetching specific Jira project: ${projectId}`);
        const projectResponse = await axios.get(`${baseUrl}/project/${projectId}`, { headers });

        // Get issues for this project
        const issuesResponse = await axios.get(
          `${baseUrl}/search?jql=project=${projectId}&maxResults=100&fields=summary,status,assignee,priority,created,updated,description,labels,components,issuelinks`,
          { headers }
        );

        return {
          project: projectResponse.data,
          issues: issuesResponse.data.issues || []
        };
      }

      // Get all accessible projects
      logger.info('📋 Fetching all accessible Jira projects');
      const projectsResponse = await axios.get(`${baseUrl}/project/search?maxResults=50`, { headers });
      const projects = projectsResponse.data.values || [];

      // For each project, get a sample of issues
      const projectsWithIssues = await Promise.all(
        projects.slice(0, 5).map(async (project: any) => {
          try {
            const issuesResponse = await axios.get(
              `${baseUrl}/search?jql=project=${project.key}&maxResults=50&fields=summary,status,assignee,priority,created,updated,description,labels,components`,
              { headers }
            );

            return {
              project: project,
              issues: issuesResponse.data.issues || []
            };
          } catch (error) {
            logger.warn(`⚠️ Failed to get issues for project ${project.key}:`, error);
            return {
              project: project,
              issues: []
            };
          }
        })
      );

      return projectsWithIssues;

    } catch (error) {
      logger.error('❌ Failed to get Jira project data:', error);
      throw error;
    }
  }

  /**
 * Get Monday.com project data using real API calls - FIXED VERSION
 */
  private async getMondayProjectData(connection: IConnection, projectId?: string): Promise<any> {
    try {
      const { apiToken } = connection.config;

      if (!apiToken) {
        throw new Error('Missing Monday.com API token');
      }

      const headers = {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      };

      const mondayApiUrl = 'https://api.monday.com/v2';

      // If specific board/project requested
      if (projectId) {
        logger.info(`📋 Fetching specific Monday.com board: ${projectId}`);

        const query = `
        query($boardId: ID!) {
          boards(ids: [$boardId]) {
            id
            name
            description
            state
            items_count
            groups {
              id
              title
              color
            }
            columns {
              id
              title
              type
              settings_str
            }
            items_page(limit: 100) {
              cursor
              items {
                id
                name
                created_at
                updated_at
                state
                group {
                  id
                  title
                }
                column_values {
                  id
                  title
                  type
                  value
                  text
                }
              }
            }
            subscribers {
              id
              name
              email
            }
          }
        }
      `;

        try {
          const response = await axios.post(mondayApiUrl, {
            query: query,
            variables: { boardId: projectId }
          }, {
            headers: {
              ...headers,
              'API-Version': '2024-01'
            },
            timeout: 15000
          });

          if (response.data.errors) {
            const errorMessage = response.data.errors.map((e: any) => e.message).join('; ');
            logger.error(`Monday.com API returned errors: ${errorMessage}`);
            throw new Error(`Monday.com API error: ${errorMessage}`);
          }

          const board = response.data.data?.boards?.[0];
          if (!board) {
            logger.warn(`Monday.com board ${projectId} not found or not accessible`);
            return null;
          }

          logger.info(`✅ Successfully fetched Monday.com board: ${board.name} (${board.items_count} items)`);
          return board;

        } catch (apiError: any) {
          const errorInfo = {
            message: apiError.message,
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            code: apiError.code
          };

          logger.error(`❌ Monday.com API call failed for board ${projectId}`, errorInfo);
          throw new Error(`Monday.com API failed: ${apiError.message}`);
        }
      }

      // Get all accessible boards - ENHANCED with better filtering
      logger.info('📋 Fetching all accessible Monday.com boards');

      const boardsQuery = `
      query {
        boards(limit: 10) {
          id
          name
          description
          state
          items_count
          groups {
            id
            title
            color
          }
          columns {
            id
            title
            type
          }
        }
      }
    `;

      try {
        const boardsResponse = await axios.post(mondayApiUrl, {
          query: boardsQuery
        }, {
          headers,
          timeout: 15000
        });

        if (boardsResponse.data.errors) {
          const errorMessage = boardsResponse.data.errors.map((e: any) => e.message).join('; ');
          logger.error(`Monday.com boards API returned errors: ${errorMessage}`);
          throw new Error(`Monday.com API error: ${errorMessage}`);
        }

        let boards = boardsResponse.data.data?.boards || [];
        logger.info(`✅ Found ${boards.length} accessible Monday.com boards`);

        // ✨ CRITICAL FIX: Filter and prioritize boards
        boards = this.filterMainBoards(boards);

        // For each board, get items with enhanced data
        const boardsWithItems = await Promise.all(
          boards.slice(0, 3).map(async (board: any) => {
            try {
              const itemsQuery = `
                query($boardId: ID!) {
                  boards(ids: [$boardId]) {
                    items(limit: 50) {
                      id
                      name
                      created_at
                      updated_at
                      state
                      group {
                        id
                        title
                      }
                      column_values {
                        id
                        title
                        type
                        value
                        text
                      }
                    }
                    subscribers {
                      id
                      name
                      email
                    }
                  }
                }
              `;

              const itemsResponse = await axios.post(mondayApiUrl, {
                query: itemsQuery,
                variables: { boardId: board.id }
              }, {
                headers: {
                  ...headers,
                  'API-Version': '2024-01'
                },
                timeout: 10000
              });

              if (itemsResponse.data.errors) {
                logger.warn(`Monday.com items API returned errors for board ${board.id}`);
                return { ...board, items: [], subscribers: [] };
              }

              const boardData = itemsResponse.data.data?.boards?.[0];
              const items = boardData?.items || [];
              const subscribers = boardData?.subscribers || [];

              // CRITICAL: Add detailed logging to see what's happening
              logger.info(`🔍 DETAILED items processing for board "${board.name}":`, {
                boardId: board.id,
                boardName: board.name,
                expectedItems: board.items_count,
                hasBoardData: !!boardData,
                hasItemsPage: !!boardData?.items_page,
                actualItemsReturned: items.length,
                subscribersCount: subscribers.length,
                itemsPreview: items.slice(0, 3).map(item => ({
                  id: item.id,
                  name: item.name,
                  state: item.state,
                  group: item.group?.title,
                  hasColumnValues: !!item.column_values
                }))
              });

              // If no items but board reports items, log detailed debug info
              if (items.length === 0 && board.items_count > 0) {
                logger.error('🚨 ITEMS MISMATCH DETECTED:', {
                  boardName: board.name,
                  boardId: board.id,
                  reportedItems: board.items_count,
                  returnedItems: items.length,
                  rawBoardData: JSON.stringify(boardData, null, 2).substring(0, 500),
                  itemsPageStructure: boardData?.items_page ? Object.keys(boardData.items_page) : 'No items_page'
                });
              }

              logger.info(`✅ Fetched ${items.length} items and ${subscribers.length} subscribers for board ${board.name}`);

              return {
                ...board,
                items: items,
                subscribers: subscribers
              };
            } catch (itemError: any) {
              logger.warn(`⚠️ Failed to get items for board ${board.id}: ${itemError.message}`);
              return {
                ...board,
                items: [],
                subscribers: []
              };
            }
          })
        );

        return boardsWithItems;

      } catch (boardsError: any) {
        const errorInfo = {
          message: boardsError.message,
          status: boardsError.response?.status,
          statusText: boardsError.response?.statusText,
          code: boardsError.code
        };

        logger.error('❌ Monday.com boards API call failed', errorInfo);
        throw new Error(`Monday.com boards API failed: ${boardsError.message}`);
      }

    } catch (error: any) {
      const safeError = {
        message: error.message,
        name: error.name,
        stack: error.stack
      };

      logger.error('❌ Failed to get Monday.com project data', safeError);
      throw error;
    }
  }

  /**
 * Filter boards to exclude subitems and prioritize main boards
 */
  private filterMainBoards(boards: any[]): any[] {
    if (!boards || boards.length === 0) {
      return [];
    }

    logger.info('🔍 Filtering Monday.com boards:', {
      original: boards.map(b => ({ name: b.name, id: b.id, items: b.items_count }))
    });

    // Step 1: Filter out subitems boards
    const mainBoards = boards.filter(board => {
      const name = (board.name || '').toLowerCase();
      const isSubitems = name.includes('subitems') || name.includes('sub-items') || name.includes('sub items');

      if (isSubitems) {
        logger.info(`🚫 Filtering out subitems board: "${board.name}" (ID: ${board.id})`);
        return false;
      }

      return true;
    });

    // Step 2: CRITICAL - Prioritize "PRISM Test Project" board FIRST
    const prioritizedBoards = mainBoards.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();

      // Priority 1: EXACT "PRISM Test Project" match gets TOP priority
      if (aName === 'prism test project' && bName !== 'prism test project') return -1;
      if (bName === 'prism test project' && aName !== 'prism test project') return 1;

      // Priority 2: Contains "prism" (but not subitems)
      const aIsPrism = aName.includes('prism') && !aName.includes('subitems');
      const bIsPrism = bName.includes('prism') && !bName.includes('subitems');
      if (aIsPrism && !bIsPrism) return -1;
      if (!aIsPrism && bIsPrism) return 1;

      // Priority 3: More items
      return (b.items_count || 0) - (a.items_count || 0);
    });

    logger.info('✅ Board filtering complete:', {
      originalCount: boards.length,
      filteredCount: prioritizedBoards.length,
      finalOrder: prioritizedBoards.map((b, index) =>
        `${index + 1}. "${b.name}" (${b.items_count} items) ${b.name === 'PRISM Test Project' ? '🎯 MAIN BOARD' : ''}`
      )
    });

    return prioritizedBoards;
  }

  /**
   * Transform platform-specific data into standardized ProjectData format
   */
  private transformProjectData(rawData: any, platform: string): ProjectData[] {
    try {
      logger.info(`🔄 Transforming data for platform: ${platform}`);

      if (!Array.isArray(rawData)) {
        logger.warn('Raw data is not an array, converting...');
        rawData = [rawData];
      }

      const transformedProjects: ProjectData[] = rawData.map((project: any) => {
        let enhancedProject: ProjectData;

        switch (platform) {
          case 'monday':
            enhancedProject = this.transformMondayProject(project);
            break;
          case 'jira':
            enhancedProject = this.transformJiraProject(project);
            break;
          case 'trofos':
            enhancedProject = this.transformTrofosProject(project);
            break;
          default:
            // Fallback: assume data is already in ProjectData format
            enhancedProject = project;
        }

        // Add universal platform metadata to all projects
        enhancedProject.metrics = [
          ...(enhancedProject.metrics || []),
          {
            name: 'Data Source',
            value: platform.toUpperCase(),
            unit: 'platform'
          },
          {
            name: 'Last Updated',
            value: new Date().toISOString().split('T')[0],
            unit: 'date'
          }
        ];

        return enhancedProject;
      });

      logger.info(`✅ Successfully transformed ${transformedProjects.length} projects for ${platform} platform`);
      return transformedProjects;

    } catch (error) {
      logger.error('❌ Failed to transform project data:', error);
      throw new Error(`Data transformation failed: ${(error as Error).message}`);
    }
  }

  /**
 * Transform TROFOS project data to PRISM format (data is already mostly transformed by TrofosClient)
 */
  private transformTrofosProject(trofosProject: any): ProjectData {
    try {
      // TROFOS data is already in PRISM format from TrofosClient, but add quality scoring
      const enhancedProject = {
        ...trofosProject,
        metrics: [
          ...(trofosProject.metrics || []),
          {
            name: 'Data Quality',
            value: this.calculateTrofosDataQuality(trofosProject),
            unit: 'score'
          }
        ]
      };

      return enhancedProject;
    } catch (error) {
      logger.error('Failed to transform TROFOS project:', error);
      throw error;
    }
  }

  /**
 * Transform Monday.com project data to PRISM format
 */
  private transformMondayProject(mondayProject: any): ProjectData {
    try {
      return {
        id: String(mondayProject.id || mondayProject.board_id),
        name: mondayProject.name || mondayProject.title || `Monday Project ${mondayProject.id}`,
        description: mondayProject.description || `Monday.com Board: ${mondayProject.name}`,
        status: this.mapMondayStatus(mondayProject.status || mondayProject.state),
        progress: this.calculateMondayProgress(mondayProject),
        platform: 'monday',
        team: this.extractMondayTeam(mondayProject),
        tasks: this.extractMondayTasks(mondayProject),
        metrics: [
          {
            name: 'Board ID',
            value: mondayProject.id || mondayProject.board_id,
            unit: 'board'
          },
          {
            name: 'Total Items',
            value: mondayProject.items?.length || 0,
            unit: 'items'
          },
          {
            name: 'Data Quality',
            value: this.calculateMondayDataQuality(mondayProject),
            unit: 'score'
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to transform Monday project:', error);
      throw error;
    }
  }

  private mapMondayStatus(status: any): string {
    if (!status) return 'Active';
    const statusStr = String(status).toLowerCase();

    if (statusStr.includes('done') || statusStr.includes('complete')) return 'Completed';
    if (statusStr.includes('progress') || statusStr.includes('working')) return 'In Progress';
    if (statusStr.includes('archived')) return 'Archived';

    return 'Active';
  }

  private calculateMondayProgress(project: any): number {
    if (!project.items || project.items.length === 0) return 0;

    let completed = 0;
    for (const item of project.items) {
      if (item.column_values) {
        const statusColumn = item.column_values.find((col: any) => col.type === 'color');
        if (statusColumn && statusColumn.text && statusColumn.text.toLowerCase().includes('done')) {
          completed++;
        }
      }
    }

    return Math.round((completed / project.items.length) * 100);
  }

  private extractMondayTeam(project: any): TeamMember[] {
    const team = new Map<string, TeamMember>();

    if (project.items) {
      for (const item of project.items) {
        if (item.column_values) {
          const personColumn = item.column_values.find((col: any) => col.type === 'multiple-person');
          if (personColumn && personColumn.personsAndTeams) {
            for (const person of personColumn.personsAndTeams) {
              if (!team.has(person.id)) {
                team.set(person.id, {
                  id: String(person.id),
                  name: person.name,
                  email: person.email,
                  role: 'Team Member'
                });
              }
            }
          }
        }
      }
    }

    return Array.from(team.values());
  }

  private extractMondayTasks(project: any): Task[] {
    if (!project.items) return [];

    return project.items.map((item: any) => ({
      id: String(item.id),
      title: item.name || `Task ${item.id}`,
      status: this.extractMondayItemStatus(item),
      assignee: this.extractMondayItemAssignee(item),
      priority: 'Medium',
      tags: [`Board: ${project.name}`]
    }));
  }

  private extractMondayItemStatus(item: any): string {
    if (!item.column_values) return 'Not Started';

    const statusColumn = item.column_values.find((col: any) => col.type === 'color');
    return statusColumn?.text || 'Not Started';
  }

  private extractMondayItemAssignee(item: any): TeamMember | undefined {
    if (!item.column_values) return undefined;

    const personColumn = item.column_values.find((col: any) => col.type === 'multiple-person');
    if (personColumn && personColumn.personsAndTeams && personColumn.personsAndTeams.length > 0) {
      const person = personColumn.personsAndTeams[0];
      return {
        id: String(person.id),
        name: person.name,
        email: person.email,
        role: 'Assignee'
      };
    }

    return undefined;
  }

  private calculateMondayDataQuality(project: any): number {
    let score = 0;
    let maxScore = 0;

    // Basic info check
    maxScore += 20;
    if (project.name && project.description) score += 20;
    else if (project.name) score += 10;

    // Items check
    maxScore += 30;
    if (project.items && project.items.length > 0) score += 30;

    // Team data check
    maxScore += 25;
    const team = this.extractMondayTeam(project);
    if (team.length > 0) score += 25;

    // Column structure check
    maxScore += 25;
    if (project.columns && project.columns.length > 0) score += 25;

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
 * Transform Jira project data to PRISM format
 */
  private transformJiraProject(jiraProject: any): ProjectData {
    try {
      return {
        id: String(jiraProject.id || jiraProject.key),
        name: jiraProject.name || jiraProject.key || `Jira Project ${jiraProject.id}`,
        description: jiraProject.description || `Jira Project: ${jiraProject.name}`,
        status: this.mapJiraStatus(jiraProject.projectCategory?.name || 'Active'),
        progress: this.calculateJiraProgress(jiraProject),
        platform: 'jira',
        team: this.extractJiraTeam(jiraProject),
        tasks: this.extractJiraTasks(jiraProject),
        metrics: [
          {
            name: 'Project Key',
            value: jiraProject.key,
            unit: 'key'
          },
          {
            name: 'Total Issues',
            value: jiraProject.issues?.length || 0,
            unit: 'issues'
          },
          {
            name: 'Components',
            value: jiraProject.components?.length || 0,
            unit: 'components'
          },
          {
            name: 'Data Quality',
            value: this.calculateJiraDataQuality(jiraProject),
            unit: 'score'
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to transform Jira project:', error);
      throw error;
    }
  }

  private mapJiraStatus(status: any): string {
    if (!status) return 'Active';
    const statusStr = String(status).toLowerCase();

    if (statusStr.includes('complete') || statusStr.includes('done')) return 'Completed';
    if (statusStr.includes('progress')) return 'In Progress';
    if (statusStr.includes('archived')) return 'Archived';

    return 'Active';
  }

  private calculateJiraProgress(project: any): number {
    if (!project.issues || project.issues.length === 0) return 0;

    let completed = 0;
    for (const issue of project.issues) {
      const status = issue.fields?.status?.name?.toLowerCase();
      if (status && (status.includes('done') || status.includes('resolved') || status.includes('closed'))) {
        completed++;
      }
    }

    return Math.round((completed / project.issues.length) * 100);
  }

  private extractJiraTeam(project: any): TeamMember[] {
    const team = new Map<string, TeamMember>();

    if (project.issues) {
      for (const issue of project.issues) {
        // Add assignee
        const assignee = issue.fields?.assignee;
        if (assignee && !team.has(assignee.accountId)) {
          team.set(assignee.accountId, {
            id: assignee.accountId,
            name: assignee.displayName,
            email: assignee.emailAddress,
            role: 'Developer',
            avatar: assignee.avatarUrls?.['32x32']
          });
        }

        // Add reporter
        const reporter = issue.fields?.reporter;
        if (reporter && !team.has(reporter.accountId)) {
          team.set(reporter.accountId, {
            id: reporter.accountId,
            name: reporter.displayName,
            email: reporter.emailAddress,
            role: 'Reporter',
            avatar: reporter.avatarUrls?.['32x32']
          });
        }
      }
    }

    return Array.from(team.values());
  }

  private extractJiraTasks(project: any): Task[] {
    if (!project.issues) return [];

    return project.issues.map((issue: any) => ({
      id: issue.key,
      title: issue.fields?.summary || `Issue ${issue.key}`,
      status: issue.fields?.status?.name || 'Unknown',
      assignee: issue.fields?.assignee ? {
        id: issue.fields.assignee.accountId,
        name: issue.fields.assignee.displayName,
        email: issue.fields.assignee.emailAddress,
        role: 'Assignee'
      } : undefined,
      priority: issue.fields?.priority?.name || 'Medium',
      dueDate: issue.fields?.duedate ? new Date(issue.fields.duedate) : undefined,
      tags: [
        `Type: ${issue.fields?.issuetype?.name}`,
        `Project: ${project.key}`
      ]
    }));
  }

  private calculateJiraDataQuality(project: any): number {
    let score = 0;
    let maxScore = 0;

    // Basic info check
    maxScore += 20;
    if (project.name && project.description) score += 20;
    else if (project.name) score += 10;

    // Issues check
    maxScore += 30;
    if (project.issues && project.issues.length > 0) score += 30;

    // Team data check
    maxScore += 25;
    const team = this.extractJiraTeam(project);
    if (team.length > 0) score += 25;

    // Project configuration check
    maxScore += 25;
    if (project.components && project.components.length > 0) score += 15;
    if (project.versions && project.versions.length > 0) score += 10;

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Transform Jira data to ProjectData format
   */
  private transformJiraData(rawData: any): ProjectData[] {
    try {
      // Handle both single project and multiple projects
      const projectsData = Array.isArray(rawData) ? rawData : [rawData];

      return projectsData.map((projectData: any) => {
        const project = projectData.project || projectData;
        const issues = projectData.issues || [];

        // Status distribution
        const statusCounts: Record<string, number> = {};
        const priorityCounts: Record<string, number> = {};
        const assigneeCounts: Record<string, number> = {};

        issues.forEach((issue: any) => {
          // Count statuses
          const status = issue.fields?.status?.name || 'Unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          // Count priorities
          const priority = issue.fields?.priority?.name || 'None';
          priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

          // Count assignees
          const assignee = issue.fields?.assignee?.displayName || 'Unassigned';
          assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
        });

        // Transform tasks
        const tasks = issues.map((issue: any) => ({
          id: issue.key,
          name: issue.fields?.summary || 'Untitled Issue',
          status: issue.fields?.status?.name || 'Unknown',
          assignee: issue.fields?.assignee?.displayName || 'Unassigned',
          priority: issue.fields?.priority?.name || 'None',
          created: issue.fields?.created || '',
          updated: issue.fields?.updated || '',
          description: issue.fields?.description?.content?.[0]?.content?.[0]?.text || '',
          labels: issue.fields?.labels || [],
          group: issue.fields?.components?.[0]?.name || 'General'
        }));

        // Transform team members
        const teamMembers = Object.entries(assigneeCounts).map(([name, count]) => ({
          id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: name,
          role: name === 'Unassigned' ? 'Unassigned' : 'Developer',
          email: undefined, 
          avatar: undefined
        }));

        // Create metrics
        const metrics = [
          { name: 'Total Issues', value: issues.length, type: 'number', category: 'overview' },
          { name: 'Project Type', value: project.projectTypeKey || 'Software', type: 'text', category: 'info' },
          { name: 'Project Lead', value: project.lead?.displayName || 'Not Set', type: 'text', category: 'team' },
          ...Object.entries(statusCounts).map(([status, count]) => ({
            name: status,
            value: count,
            type: 'status' as const,
            category: 'status'
          })),
          ...Object.entries(priorityCounts).map(([priority, count]) => ({
            name: `${priority} Priority`,
            value: count,
            type: 'priority' as const,
            category: 'priority'
          }))
        ];

        return {
          id: project.key || project.id,
          name: project.name || 'Unnamed Jira Project',
          platform: 'jira',
          description: project.description || '',
          status: 'active',
          tasks: tasks,
          team: teamMembers,
          metrics: metrics,
          platformSpecific: {
            jira: {
              projectKey: project.key,
              issueTypes: project.issueTypes?.map((t: any) => t.name) || [],
              components: project.components?.map((c: any) => c.name) || [],
              versions: project.versions?.map((v: any) => v.name) || []
            }
          },
          lastUpdated: new Date().toISOString(),
          dataQuality: {
            completeness: issues.length > 0 ? 90 : 50,
            accuracy: 95,
            freshness: 100
          }
        };
      });

    } catch (error) {
      logger.error('❌ Failed to transform Jira data:', error);
      return [];
    }
  }

  /**
   * Transform Monday.com data to ProjectData format using correct column_values structure
   */
  private transformMondayData(rawData: any): ProjectData[] {
    try {
      if (!rawData) {
        logger.warn('⚠️ No raw data to transform for Monday.com');
        return [];
      }
      // Handle both single board and multiple boards
      const boardsData = Array.isArray(rawData) ? rawData : [rawData];

      logger.info('🔄 Starting Monday.com data transformation:', {
        boardsToTransform: boardsData.length,
        boardNames: boardsData.map(b => b.name),
        totalItemsInRaw: boardsData.reduce((sum, b) => sum + (b.items?.length || 0), 0)
      });

      return boardsData.map((board: any) => {
        const items = board.items || [];
        const groups = board.groups || [];
        const columns = board.columns || [];
        const subscribers = board.subscribers || [];

        // Status distribution from color column
        const statusCounts: Record<string, number> = {};
        const priorityCounts: Record<string, number> = {};
        const assigneeCounts: Record<string, number> = {};
        const groupCounts: Record<string, number> = {};

        items.forEach((item: any) => {
          // Find columns by type and title - Monday.com specific structure
          const statusColumn = item.column_values?.find((col: any) =>
            col.type === 'color' || col.title?.toLowerCase().includes('status')
          );

          const personColumn = item.column_values?.find((col: any) =>
            col.type === 'person' || col.title?.toLowerCase().includes('person')
          );

          const priorityColumn = item.column_values?.find((col: any) =>
            col.title?.toLowerCase().includes('priority')
          );

          const textColumn = item.column_values?.find((col: any) =>
            col.type === 'text' || col.title?.toLowerCase().includes('text')
          );

          // Extract status - Monday.com color columns
          const status = statusColumn?.text || statusColumn?.value || 'Not Started';
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          // Extract assignee - Monday.com person columns have different structure
          let assignee = 'Unassigned';
          if (personColumn?.text && personColumn.text.trim()) {
            assignee = personColumn.text.trim();
          } else if (textColumn?.text) {
            // Look for role pattern in text: "(Role: Name - Title)"
            const roleMatch = textColumn.text.match(/Role:\s*([^)]+)/);
            if (roleMatch) {
              const roleInfo = roleMatch[1].trim();
              assignee = roleInfo.split(' - ')[0]; // Get name before role title
            }
          }

          if (assignee !== 'Unassigned') {
            assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
          }

          // Get group
          const groupName = item.group?.title || 'General';
          groupCounts[groupName] = (groupCounts[groupName] || 0) + 1;

          // Extract priority
          const priority = priorityColumn?.text || priorityColumn?.value || 'Medium';
          priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
        });

        // Transform tasks with correct Monday.com data extraction
        const tasks = items.map((item: any) => {
          // Find columns by type and title
          const statusColumn = item.column_values?.find((col: any) =>
            col.type === 'color' || col.title?.toLowerCase().includes('status')
          );

          const personColumn = item.column_values?.find((col: any) =>
            col.type === 'person' || col.title?.toLowerCase().includes('person')
          );

          const priorityColumn = item.column_values?.find((col: any) =>
            col.title?.toLowerCase().includes('priority')
          );

          const textColumn = item.column_values?.find((col: any) =>
            col.type === 'text' || col.title?.toLowerCase().includes('text')
          );

          // Extract assignee with correct Monday.com logic
          let assignee = 'Unassigned';
          if (personColumn?.text && personColumn.text.trim()) {
            assignee = personColumn.text.trim();
          } else if (textColumn?.text) {
            const roleMatch = textColumn.text.match(/Role:\s*([^)]+)/);
            if (roleMatch) {
              assignee = roleMatch[1].trim().split(' - ')[0];
            }
          }

          return {
            id: item.id,
            name: item.name || 'Untitled Task',
            status: statusColumn?.text || statusColumn?.value || 'Not Started',
            assignee: assignee,
            priority: priorityColumn?.text || priorityColumn?.value || 'Medium',
            created: item.created_at || '',
            updated: item.updated_at || '',
            description: textColumn?.text || '',
            group: item.group?.title || 'General'
          };
        });

        // Transform team members with correct role extraction
        const teamMembers = Object.entries(assigneeCounts)
          .filter(([name]) => name !== 'Unassigned' && name.trim().length > 0)
          .map(([name, count]) => {
            // Extract role from the text column data
            let role = 'Team Member';

            // Look through items to find role information for this person
            items.forEach((item: any) => {
              const textColumn = item.column_values?.find((col: any) => col.type === 'text');
              if (textColumn?.text && textColumn.text.includes(name)) {
                const roleMatch = textColumn.text.match(/Role:\s*[^-]*-\s*([^)]+)/);
                if (roleMatch) {
                  role = roleMatch[1].trim();
                }
              }
            });

            return {
              id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              name: name.trim(),
              role: role,
              email: undefined,
              avatar: undefined
            };
          });

        // Create metrics
        const completedTasks = statusCounts['Done'] || 0;
        const totalTasks = items.length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const metrics = [
          { name: 'Total Tasks', value: totalTasks, type: 'number', category: 'overview' },
          { name: 'Completion Rate', value: `${completionRate}%`, type: 'percentage', category: 'overview' },
          { name: 'Board State', value: board.state || 'active', type: 'text', category: 'info' },
          ...Object.entries(statusCounts).map(([status, count]) => ({
            name: status,
            value: count,
            type: 'status' as const,
            category: 'status'
          })),
          ...Object.entries(priorityCounts).map(([priority, count]) => ({
            name: `${priority} Priority`,
            value: count,
            type: 'priority' as const,
            category: 'priority'
          }))
        ];

        const result = {
          id: board.id,
          name: board.name || 'Unnamed Monday.com Board',
          platform: 'monday',
          description: board.description || '',
          status: 'active',
          tasks: tasks,
          team: teamMembers,
          metrics: metrics,
          platformSpecific: {
            monday: {
              boardId: board.id,
              groups: groups.map((g: any) => ({
                id: g.id,
                title: g.title,
                color: g.color
              })),
              columns: columns.map((c: any) => ({
                id: c.id,
                title: c.title,
                type: c.type
              }))
            }
          },
          lastUpdated: new Date().toISOString(),
          dataQuality: {
            completeness: items.length > 0 ? 85 : 50,
            accuracy: 90,
            freshness: 100
          }
        };

        logger.info(`✅ Board transformation complete: "${result.name}"`, {
          originalItems: board.items_count,
          transformedTasks: result.tasks.length,
          teamMembers: result.team.length,
          metricsCount: result.metrics.length,
          hasRealData: result.tasks.length > 0
        });

        return result;
      });
    } catch (error) {
      logger.error('❌ Failed to transform Monday.com data:', error);
      return [];
    }
  }

  /**
 * Test connection configuration for all platforms including TROFOS
 */
  async testConnectionConfig(platform: string, config: Record<string, any>): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(`🧪 Testing ${platform} connection configuration`);

      // Create a temporary connection object for testing
      const testConnection: IConnection = {
        platform: platform as any,
        config: config,
        status: 'disconnected'
      } as IConnection;

      const client = ClientFactory.createClient(testConnection as PlatformConnection);
      const isConnected = await client.testConnection();

      if (isConnected) {
        logger.info(`✅ ${platform} connection test successful`);
        return { success: true, message: `${platform} connection successful` };
      } else {
        logger.warn(`❌ ${platform} connection test failed`);
        return { success: false, message: `${platform} connection failed - check credentials` };
      }

    } catch (error) {
      logger.error(`❌ ${platform} connection test error:`, error);
      return {
        success: false,
        message: `${platform} connection error: ${(error as Error).message}`
      };
    }
  }

  /**
 * Calculate data quality score for TROFOS projects
 */
  private calculateTrofosDataQuality(project: ProjectData): number {
    let score = 0;
    let maxScore = 0;

    // Check if project has basic info
    maxScore += 20;
    if (project.name && project.description) score += 20;
    else if (project.name) score += 10;

    // Check if project has team data
    maxScore += 30;
    if (project.team && project.team.length > 0) score += 30;

    // Check if project has task data
    maxScore += 30;
    if (project.tasks && project.tasks.length > 0) score += 30;

    // Check if project has metrics
    maxScore += 20;
    if (project.metrics && project.metrics.length > 3) score += 20;
    else if (project.metrics && project.metrics.length > 0) score += 10;

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Test Jira connection
   */
  private async testJiraConnection(config: any): Promise<ConnectionTestResult> {
    try {
      const { domain, email, apiToken } = config;

      if (!domain || !email || !apiToken) {
        return {
          success: false,
          message: 'Missing required fields: domain, email, and apiToken'
        };
      }

      const baseUrl = `https://${domain.replace(/^https?:\/\//, '')}/rest/api/3`;
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

      const response = await axios.get(`${baseUrl}/myself`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data.emailAddress) {
        return {
          success: true,
          message: `Successfully connected as ${response.data.displayName}`,
          details: {
            user: response.data.displayName,
            accountId: response.data.accountId
          }
        };
      }

      return {
        success: false,
        message: 'Invalid response from Jira API'
      };

    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Authentication failed. Please check your email and API token.'
        };
      }

      if (error.response?.status === 403) {
        return {
          success: false,
          message: 'Access denied. Please check your permissions.'
        };
      }

      return {
        success: false,
        message: `Connection failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Test Monday.com connection
   */
  private async testMondayConnection(config: any): Promise<ConnectionTestResult> {
    try {
      const { apiToken } = config;

      if (!apiToken) {
        return {
          success: false,
          message: 'Missing required field: apiToken'
        };
      }

      const response = await axios.post('https://api.monday.com/v2', {
        query: '{ me { name email id } }'
      }, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'API-Version': '2024-01'
        },
        timeout: 10000
      });

      if (response.data.data?.me) {
        const user = response.data.data.me;
        return {
          success: true,
          message: `Successfully connected as ${user.name}`,
          details: {
            user: user.name,
            email: user.email,
            id: user.id
          }
        };
      }

      if (response.data.errors) {
        return {
          success: false,
          message: `Monday.com API error: ${response.data.errors[0]?.message || 'Unknown error'}`
        };
      }

      return {
        success: false,
        message: 'Invalid response from Monday.com API'
      };

    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Authentication failed. Please check your API token.'
        };
      }

      return {
        success: false,
        message: `Connection failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Test an existing connection
   */
  async testConnection(userId: string, connectionId: string): Promise<ConnectionTestResult> {
    try {
      const connection = await this.getConnection(userId, connectionId);
      if (!connection) {
        return {
          success: false,
          message: 'Connection not found'
        };
      }

      return await this.testConnectionConfig(connection.platform, connection.config);
    } catch (error) {
      logger.error('Test connection failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }

  /**
   * Sync connection data
   */
  async syncConnection(userId: string, connectionId: string): Promise<ConnectionSyncResult> {
    try {
      const connection = await this.getConnection(userId, connectionId);
      if (!connection) {
        return {
          success: false,
          message: 'Connection not found'
        };
      }

      // Test connection first
      const testResult = await this.testConnectionConfig(connection.platform, connection.config);
      if (!testResult.success) {
        return {
          success: false,
          message: `Connection test failed: ${testResult.message}`
        };
      }

      // Get project data to count projects
      const projectData = await this.getProjectData(userId, connectionId);

      // Update connection
      connection.lastSync = new Date();
      connection.projectCount = projectData.length;
      connection.status = 'connected';
      connection.lastSyncError = undefined;

      await connection.save();

      return {
        success: true,
        message: 'Sync completed successfully',
        projectCount: projectData.length,
        lastSync: connection.lastSync
      };

    } catch (error) {
      logger.error('Sync connection failed:', error);

      // Update connection with error
      try {
        const connection = await this.getConnection(userId, connectionId);
        if (connection) {
          connection.status = 'error'; // FIXED: Use 'error' instead of 'failed'
          connection.lastSyncError = error instanceof Error ? error.message : 'Sync failed';
          await connection.save();
        }
      } catch (updateError) {
        logger.error('Failed to update connection with error:', updateError);
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(userId: string, connectionId: string): Promise<void> {
    try {
      const result = await Connection.deleteOne({ _id: connectionId, userId });
      if (result.deletedCount === 0) {
        throw new Error('Connection not found or already deleted');
      }
      logger.info(`Connection ${connectionId} deleted for user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete connection:', error);
      throw error;
    }
  }
}