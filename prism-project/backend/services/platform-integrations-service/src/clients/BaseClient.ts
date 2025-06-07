// backend/services/platform-integrations-service/src/clients/BaseClient.ts
// FIXED VERSION with proper headers and credential trimming
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import logger from '../utils/logger';

export interface PlatformConnection {
  id: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
}

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress?: number;
  team?: TeamMember[];
  tasks?: Task[];
  metrics?: Metric[];
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  assignee?: TeamMember;
  priority?: string;
  dueDate?: Date;
  tags?: string[];
}

export interface Metric {
  name: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
  unit?: string;
}

export abstract class BaseClient {
  protected http: AxiosInstance;
  protected connection: PlatformConnection;

  constructor(connection: PlatformConnection) {
    this.connection = connection;
    this.http = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PRISM/1.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.http.interceptors.request.use(
      (config) => {
        logger.info(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    this.http.interceptors.response.use(
      (response) => {
        logger.info(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('Response error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  abstract testConnection(): Promise<boolean>;
  abstract getProjects(): Promise<ProjectData[]>;
  abstract getProject(projectId: string): Promise<ProjectData>;
  abstract getProjectMetrics(projectId: string): Promise<Metric[]>;
}

// Monday.com Client - FIXED
export class MondayClient extends BaseClient {
  private get apiKey(): string {
    return this.connection.config.apiKey;
  }

  private get boardIds(): string[] {
    return this.connection.config.boardIds || [];
  }

  constructor(connection: PlatformConnection) {
    super(connection);
    this.http.defaults.baseURL = 'https://api.monday.com/v2';
    
    // FIX: Use headers.common and trim the API key
    this.http.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey.trim()}`;
    
    logger.info('Monday.com client initialized with API key');
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Monday.com connection...');
      const query = `query { me { name email } }`;
      const response = await this.http.post('', { query });
      
      const isValid = !!response.data?.data?.me;
      logger.info(`Monday.com connection test result: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      
      if (isValid) {
        logger.info(`Connected as: ${response.data.data.me.name} (${response.data.data.me.email})`);
      }
      
      return isValid;
    } catch (error) {
      logger.error('Monday.com connection test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    try {
      const query = `
        query {
          boards(limit: 50) {
            id
            name
            description
            state
            columns {
              id
              title
              type
            }
            items {
              id
              name
              state
              column_values {
                id
                text
                value
              }
            }
          }
        }
      `;

      const response = await this.http.post('', { query });
      const boards = response.data?.data?.boards || [];

      return boards.map((board: any) => ({
        id: board.id,
        name: board.name,
        description: board.description,
        status: board.state,
        tasks: board.items?.map((item: any) => ({
          id: item.id,
          title: item.name,
          status: item.state || 'active',
          tags: []
        })) || [],
        metrics: [
          { name: 'Total Items', value: board.items?.length || 0 },
          { name: 'Active Items', value: board.items?.filter((i: any) => i.state === 'active').length || 0 }
        ]
      }));
    } catch (error) {
      logger.error('Failed to fetch Monday.com projects:', error);
      throw new Error('Failed to fetch projects from Monday.com');
    }
  }

  async getProject(projectId: string): Promise<ProjectData> {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    return project;
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    const project = await this.getProject(projectId);
    return project.metrics || [];
  }
}

// Jira Client - FIXED
export class JiraClient extends BaseClient {
  private get domain(): string {
    return this.connection.config.domain.replace(/^https?:\/\//, '').trim();
  }

  private get email(): string {
    return this.connection.config.email;
  }

  private get apiToken(): string {
    return this.connection.config.apiToken;
  }

  private get projectKey(): string {
    return this.connection.config.projectKey;
  }

  constructor(connection: PlatformConnection) {
    super(connection);
    
    // FIX: Trim domain and use proper URL construction
    this.http.defaults.baseURL = `https://${this.domain}/rest/api/3`;
    
    // FIX: Trim email and apiToken, use headers.common
    const auth = Buffer.from(`${this.email.trim()}:${this.apiToken.trim()}`).toString('base64');
    this.http.defaults.headers.common['Authorization'] = `Basic ${auth}`;
    
    logger.info(`Jira client initialized for domain: ${this.domain}`);
    logger.info(`Auth header created for user: ${this.email.trim()}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Jira connection...');
      logger.info(`Connecting to: ${this.http.defaults.baseURL}/myself`);
      
      const response = await this.http.get('/myself');
      const isValid = !!response.data?.emailAddress;
      
      logger.info(`Jira connection test result: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      
      if (isValid) {
        logger.info(`Connected as: ${response.data.displayName} (${response.data.emailAddress})`);
      }
      
      return isValid;
    } catch (error) {
      logger.error('Jira connection test failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return false;
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    try {
      // Get project details
      const projectResponse = await this.http.get(`/project/${this.projectKey}`);
      const project = projectResponse.data;

      // Get issues for the project
      const searchResponse = await this.http.get('/search', {
        params: {
          jql: `project = ${this.projectKey}`,
          fields: 'summary,status,assignee,priority,created,updated,labels',
          maxResults: 100
        }
      });

      const issues = searchResponse.data.issues || [];
      const tasks: Task[] = issues.map((issue: any) => ({
        id: issue.key,
        title: issue.fields.summary,
        status: issue.fields.status?.name || 'Unknown',
        assignee: issue.fields.assignee ? {
          id: issue.fields.assignee.accountId,
          name: issue.fields.assignee.displayName,
          email: issue.fields.assignee.emailAddress,
          avatar: issue.fields.assignee.avatarUrls?.['32x32']
        } : undefined,
        priority: issue.fields.priority?.name,
        tags: issue.fields.labels || []
      }));

      // Calculate metrics
      const statusCounts = issues.reduce((acc: any, issue: any) => {
        const status = issue.fields.status?.name || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const metrics: Metric[] = [
        { name: 'Total Issues', value: issues.length },
        { name: 'Open Issues', value: statusCounts['To Do'] || 0 },
        { name: 'In Progress', value: statusCounts['In Progress'] || 0 },
        { name: 'Done', value: statusCounts['Done'] || 0 }
      ];

      return [{
        id: project.key,
        name: project.name,
        description: project.description,
        status: 'active',
        tasks,
        metrics
      }];
    } catch (error) {
      logger.error('Failed to fetch Jira projects:', error);
      throw new Error('Failed to fetch projects from Jira');
    }
  }

  async getProject(projectId: string): Promise<ProjectData> {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    return project;
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    const project = await this.getProject(projectId);
    return project.metrics || [];
  }
}

// TROFOS Client - FIXED
export class TrofosClient extends BaseClient {
  private get serverUrl(): string {
    return this.connection.config.serverUrl.replace(/\/$/, '').trim();
  }

  private get apiKey(): string {
    return this.connection.config.apiKey;
  }

  private get projectId(): string {
    return this.connection.config.projectId;
  }

  constructor(connection: PlatformConnection) {
    super(connection);
    
    // FIX: Proper URL handling and trim apiKey, use headers.common
    this.http.defaults.baseURL = `${this.serverUrl}/v1`;
    this.http.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey.trim()}`;
    
    logger.info(`TROFOS client initialized for server: ${this.serverUrl}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing TROFOS connection...');
      logger.info(`Connecting to: ${this.http.defaults.baseURL}/project`);
      
      // Test with a simple project list request
      const response = await this.http.post('/project', {
        pageNum: 1,
        pageSize: 1,
        sort: 'name',
        direction: 'ASC'
      });
      
      const isValid = response.status === 200;
      logger.info(`TROFOS connection test result: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      
      return isValid;
    } catch (error) {
      logger.error('TROFOS connection test failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return false;
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    try {
      // Get specific project details
      const projectResponse = await this.http.get(`/project/${this.projectId}`);
      const project = projectResponse.data;

      // Get sprints and backlogs
      const sprintResponse = await this.http.get(`/project/${this.projectId}/sprint`);
      const sprints = sprintResponse.data.sprints || [];

      // Aggregate tasks from all sprints
      const tasks: Task[] = [];
      let totalBacklogs = 0;
      let completedBacklogs = 0;

      sprints.forEach((sprint: any) => {
        const sprintBacklogs = sprint.backlogs || [];
        totalBacklogs += sprintBacklogs.length;
        
        sprintBacklogs.forEach((backlog: any) => {
          if (backlog.status === 'Done' || backlog.status === 'Completed') {
            completedBacklogs++;
          }
          
          tasks.push({
            id: backlog.id,
            title: backlog.title,
            status: backlog.status || 'To Do',
            assignee: backlog.assigned_user ? {
              id: backlog.assigned_user,
              name: backlog.assigned_user,
              role: 'Team Member'
            } : undefined,
            tags: [`Sprint: ${sprint.name}`]
          });
        });
      });

      const metrics: Metric[] = [
        { name: 'Total Backlogs', value: totalBacklogs },
        { name: 'Completed', value: completedBacklogs },
        { name: 'In Progress', value: totalBacklogs - completedBacklogs },
        { name: 'Sprints', value: sprints.length }
      ];

      return [{
        id: project.id,
        name: project.name,
        description: project.description,
        status: 'active',
        tasks,
        metrics
      }];
    } catch (error) {
      logger.error('Failed to fetch TROFOS projects:', error);
      throw new Error('Failed to fetch projects from TROFOS');
    }
  }

  async getProject(projectId: string): Promise<ProjectData> {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    return project;
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    const project = await this.getProject(projectId);
    return project.metrics || [];
  }
}

// Client Factory
export class ClientFactory {
  static createClient(connection: PlatformConnection): BaseClient {
    switch (connection.platform) {
      case 'monday':
        return new MondayClient(connection);
      case 'jira':
        return new JiraClient(connection);
      case 'trofos':
        return new TrofosClient(connection);
      default:
        throw new Error(`Unsupported platform: ${connection.platform}`);
    }
  }
}