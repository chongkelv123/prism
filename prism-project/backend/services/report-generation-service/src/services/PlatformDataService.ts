// backend/services/report-generation-service/src/services/PlatformDataService.ts
// COMPLETE IMPLEMENTATION - Windows Compatible (No Unicode/Symbols)

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../utils/logger';

// Interface definitions
export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: string;
  platform: string;
  metrics: { name: string; value: string | number; type?: string }[];
  tasks: { 
    id?: string; 
    name: string; 
    status: string; 
    assignee?: string; 
    created?: string; 
    updated?: string; 
  }[];
  team?: { 
    id?: string; 
    name: string; 
    role: string; 
    email?: string; 
    avatar?: string; 
  }[];
  sprints?: { 
    name: string; 
    startDate: string; 
    endDate: string; 
    completed: string; 
  }[];
  [key: string]: any;
}

export interface ReportGenerationConfig {
  platform: string;
  connectionId: string;
  projectId: string;
  templateId: string;
  configuration: {
    title?: string;
    includeMetrics?: boolean;
    includeTasks?: boolean;
    includeTimeline?: boolean;
    includeResources?: boolean;
    [key: string]: any;
  };
}

export class PlatformDataService {
  private apiGatewayUrl: string;
  private authToken?: string;
  private httpClient: AxiosInstance;

  constructor(authToken?: string) {
    this.apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    this.authToken = authToken;
    
    // Initialize HTTP client with default configuration
    this.httpClient = axios.create({
      baseURL: this.apiGatewayUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use(
      (config) => {
        const headers = this.getAuthHeaders();
        Object.assign(config.headers, headers);
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('HTTP request failed:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Main method to fetch project data based on platform
   */
  async fetchProjectData(config: ReportGenerationConfig): Promise<ProjectData> {
    try {
      logger.info('Fetching project data', {
        platform: config.platform,
        connectionId: config.connectionId,
        projectId: config.projectId
      });

      let projectData: ProjectData;

      switch (config.platform.toLowerCase()) {
        case 'jira':
          projectData = await this.fetchJiraProjectData(config);
          break;
        case 'monday':
        case 'monday.com':
          projectData = await this.fetchMondayBoardData(config);
          break;
        case 'trofos':
          projectData = await this.fetchTrofosProjectData(config);
          break;
        default:
          throw new Error(`Unsupported platform: ${config.platform}`);
      }

      // Validate and sanitize the returned data
      return this.validateAndSanitizeProjectData(projectData, config.platform);

    } catch (error: any) {
      logger.error('Failed to fetch project data:', {
        platform: config.platform,
        connectionId: config.connectionId,
        error: error.message
      });
      
      // Return mock data as fallback to prevent complete failure
      return this.getFallbackProjectData(config);
    }
  }

  /**
   * Fetch Jira project data via platform integrations service
   */
  private async fetchJiraProjectData(config: ReportGenerationConfig): Promise<ProjectData> {
    try {
      logger.info('Fetching Jira project data', {
        connectionId: config.connectionId,
        projectId: config.projectId
      });

      // Call platform integrations service via API Gateway
      const response: AxiosResponse = await this.httpClient.get(
        `/api/connections/${config.connectionId}/projects/${config.projectId}`
      );

      if (!response.data) {
        throw new Error('No project data received from Jira');
      }

      const jiraData = response.data;

      // Transform Jira data to standard format
      return {
        id: jiraData.id || config.projectId,
        name: jiraData.name || 'Unnamed Jira Project',
        description: jiraData.description || '',
        status: jiraData.status || 'active',
        platform: 'jira',
        metrics: [
          ...(jiraData.metrics || []),
          {
            name: 'Project Type',
            value: jiraData.projectType || 'Standard',
            type: 'text'
          },
          {
            name: 'Project Key',
            value: jiraData.projectKey || config.projectId,
            type: 'text'
          }
        ],
        tasks: (jiraData.tasks || []).map((task: any, index: number) => ({
          id: task.id || `task_${index}`,
          name: task.name || task.summary || 'Unnamed Task',
          status: task.status || 'Unknown',
          assignee: task.assignee || 'Unassigned',
          created: task.created || task.createdAt,
          updated: task.updated || task.updatedAt
        })),
        team: jiraData.team || [],
        sprints: jiraData.sprints || [],
        lastUpdated: new Date().toISOString(),
        projectKey: jiraData.projectKey,
        projectType: jiraData.projectType,
        lead: jiraData.lead
      };

    } catch (error: any) {
      logger.error('Error fetching Jira project data:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Jira authentication failed. Please check your connection credentials.');
      } else if (error.response?.status === 404) {
        throw new Error(`Jira project "${config.projectId}" not found.`);
      } else {
        throw new Error(`Failed to fetch Jira project data: ${error.message}`);
      }
    }
  }

  /**
   * Fetch Monday.com board data via platform integrations service
   */
  private async fetchMondayBoardData(config: ReportGenerationConfig): Promise<ProjectData> {
    try {
      logger.info('Fetching Monday.com board data', {
        connectionId: config.connectionId,
        projectId: config.projectId
      });

      // Call platform integrations service via API Gateway
      const response: AxiosResponse = await this.httpClient.get(
        `/api/connections/${config.connectionId}/projects/${config.projectId}`
      );

      if (!response.data) {
        throw new Error('No board data received from Monday.com');
      }

      const mondayData = response.data;

      // Transform Monday.com data to standard format
      return {
        id: mondayData.id || config.projectId,
        name: mondayData.name || 'Unnamed Monday.com Board',
        description: mondayData.description || '',
        status: mondayData.status || mondayData.boardState || 'active',
        platform: 'monday',
        metrics: [
          ...(mondayData.metrics || []),
          {
            name: 'Board Items',
            value: mondayData.itemsCount || 0,
            type: 'number'
          },
          {
            name: 'Board State',
            value: mondayData.boardState || 'Active',
            type: 'text'
          }
        ],
        tasks: (mondayData.tasks || []).map((task: any, index: number) => ({
          id: task.id || `item_${index}`,
          name: task.name || task.title || 'Unnamed Item',
          status: task.status || 'Unknown',
          assignee: task.assignee || 'Unassigned',
          created: task.created || task.created_at,
          updated: task.updated || task.updated_at
        })),
        team: mondayData.team || [],
        groups: mondayData.groups || [],
        columns: mondayData.columns || [],
        itemsCount: mondayData.itemsCount,
        boardState: mondayData.boardState,
        lastUpdated: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('Error fetching Monday.com board data:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Monday.com authentication failed. Please check your connection credentials.');
      } else if (error.response?.status === 404) {
        throw new Error(`Monday.com board "${config.projectId}" not found.`);
      } else {
        throw new Error(`Failed to fetch Monday.com board data: ${error.message}`);
      }
    }
  }

  /**
   * Fetch TROFOS project data via platform integrations service
   */
  private async fetchTrofosProjectData(config: ReportGenerationConfig): Promise<ProjectData> {
    try {
      logger.info('Fetching TROFOS project data', {
        connectionId: config.connectionId,
        projectId: config.projectId
      });

      // Call platform integrations service via API Gateway
      const response: AxiosResponse = await this.httpClient.get(
        `/api/connections/${config.connectionId}/projects/${config.projectId}`
      );

      if (!response.data) {
        throw new Error('No project data received from TROFOS');
      }

      const trofosData = response.data;

      // Transform TROFOS data to standard format
      return {
        id: trofosData.id || config.projectId,
        name: trofosData.name || 'Unnamed TROFOS Project',
        description: trofosData.description || '',
        status: trofosData.status || 'active',
        platform: 'trofos',
        metrics: trofosData.metrics || [],
        tasks: (trofosData.tasks || []).map((task: any, index: number) => ({
          id: task.id || `task_${index}`,
          name: task.name || 'Unnamed Task',
          status: task.status || 'Unknown',
          assignee: task.assignee || 'Unassigned',
          created: task.created,
          updated: task.updated
        })),
        team: trofosData.team || [],
        sprints: trofosData.sprints || [],
        lastUpdated: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('Error fetching TROFOS project data:', error);
      
      if (error.response?.status === 401) {
        throw new Error('TROFOS authentication failed. Please check your connection credentials.');
      } else if (error.response?.status === 404) {
        throw new Error(`TROFOS project "${config.projectId}" not found.`);
      } else {
        throw new Error(`Failed to fetch TROFOS project data: ${error.message}`);
      }
    }
  }

  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Validate and sanitize project data to ensure consistency
   */
  private validateAndSanitizeProjectData(data: ProjectData, platform: string): ProjectData {
    // Ensure required fields exist
    const sanitized: ProjectData = {
      id: data.id || 'unknown',
      name: data.name || `Unnamed ${platform} Project`,
      description: data.description || '',
      status: data.status || 'active',
      platform: platform.toLowerCase(),
      metrics: Array.isArray(data.metrics) ? data.metrics : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      team: Array.isArray(data.team) ? data.team : [],
      lastUpdated: new Date().toISOString()
    };

    // Add sprints if they exist
    if (Array.isArray(data.sprints)) {
      sanitized.sprints = data.sprints;
    }

    // Preserve additional platform-specific fields
    Object.keys(data).forEach(key => {
      if (!sanitized.hasOwnProperty(key)) {
        sanitized[key] = data[key];
      }
    });

    return sanitized;
  }

  /**
   * Provide fallback data when real platform data cannot be fetched
   */
  private getFallbackProjectData(config: ReportGenerationConfig): ProjectData {
    logger.warn('Using fallback project data', {
      platform: config.platform,
      projectId: config.projectId
    });

    return {
      id: config.projectId,
      name: config.configuration.title || `${config.platform} Project - ${config.projectId}`,
      description: 'Fallback data - unable to fetch from platform',
      status: 'active',
      platform: config.platform.toLowerCase(),
      metrics: [
        { name: 'Status', value: 'Data Unavailable', type: 'text' },
        { name: 'Connection', value: 'Failed', type: 'text' }
      ],
      tasks: [
        {
          id: 'fallback_1',
          name: 'Unable to fetch real tasks from platform',
          status: 'Data Unavailable',
          assignee: 'Unknown'
        }
      ],
      team: [
        {
          id: 'fallback_user',
          name: 'Platform data unavailable',
          role: 'Unknown'
        }
      ],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Test connection to platform integrations service
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.httpClient.get('/api/platform-integrations/health');
      
      if (response.status === 200) {
        return {
          success: true,
          message: 'Successfully connected to platform integrations service'
        };
      } else {
        return {
          success: false,
          message: `Platform integrations service returned status: ${response.status}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to platform integrations service: ${error.message}`
      };
    }
  }

  /**
   * Get available projects for a connection
   */
  async getConnectionProjects(connectionId: string): Promise<ProjectData[]> {
    try {
      logger.info('Fetching projects for connection', { connectionId });

      const response: AxiosResponse = await this.httpClient.get(
        `/api/connections/${connectionId}/projects`
      );

      if (!response.data || !Array.isArray(response.data)) {
        logger.warn('No projects found for connection', { connectionId });
        return [];
      }

      // Transform and validate each project
      return response.data
        .filter(project => project && project.id && project.name)
        .map(project => this.validateAndSanitizeProjectData(project, project.platform || 'unknown'));

    } catch (error: any) {
      logger.error('Error fetching connection projects:', {
        connectionId,
        error: error.message
      });
      
      // Return empty array instead of throwing to prevent breaking the UI
      return [];
    }
  }
}

export default PlatformDataService;