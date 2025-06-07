// backend/services/platform-integrations-service/src/clients/BaseClient.ts
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
        // Fix: Use type guard to safely access error properties
        if (axios.isAxiosError(error)) {
          logger.error('Response error:', error.response?.status, error.response?.data);
        } else {
          logger.error('Response error:', error);
        }
        return Promise.reject(error);
      }
    );
  }

  abstract testConnection(): Promise<boolean>;
  abstract getProjects(): Promise<ProjectData[]>;
  abstract getProject(projectId: string): Promise<ProjectData>;
  abstract getProjectMetrics(projectId: string): Promise<Metric[]>;
}

// Monday.com Client
export class MondayClient extends BaseClient {
  private get apiKey(): string {
    return this.connection.config.apiKey;
  }

  constructor(connection: PlatformConnection) {
    super(connection);
    this.http.defaults.baseURL = 'https://api.monday.com/v2';
    this.http.defaults.headers['Authorization'] = this.apiKey;
  }

  async testConnection(): Promise<boolean> {
    try {
      const query = `query { me { name email } }`;
      const response = await this.http.post('', { query });
      return !!response.data?.data?.me;
    } catch (error) {
      logger.error('Monday.com connection test failed:', error);
      return false;
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    // Implementation...
    return [];
  }

  async getProject(projectId: string): Promise<ProjectData> {
    throw new Error('Not implemented');
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    return [];
  }
}

// Jira Client
export class JiraClient extends BaseClient {
  private get domain(): string {
    return this.connection.config.domain.replace(/^https?:\/\//, '');
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
    this.http.defaults.baseURL = `https://${this.domain}/rest/api/3`;
    
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    this.http.defaults.headers['Authorization'] = `Basic ${auth}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.http.get('/myself');
      return !!response.data?.emailAddress;
    } catch (error) {
      logger.error('Jira connection test failed:', error);
      return false;
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    // Implementation...
    return [];
  }

  async getProject(projectId: string): Promise<ProjectData> {
    throw new Error('Not implemented');
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    return [];
  }
}

// TROFOS Client
export class TrofosClient extends BaseClient {
  private get serverUrl(): string {
    return this.connection.config.serverUrl.replace(/\/$/, '');
  }

  private get apiKey(): string {
    return this.connection.config.apiKey;
  }

  private get projectId(): string {
    return this.connection.config.projectId;
  }

  constructor(connection: PlatformConnection) {
    super(connection);
    this.http.defaults.baseURL = `${this.serverUrl}/v1`;
    this.http.defaults.headers['Authorization'] = `Bearer ${this.apiKey}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.http.post('/project', {
        pageNum: 1,
        pageSize: 1,
        sort: 'name',
        direction: 'ASC'
      });
      return response.status === 200;
    } catch (error) {
      logger.error('TROFOS connection test failed:', error);
      return false;
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    // Implementation...
    return [];
  }

  async getProject(projectId: string): Promise<ProjectData> {
    throw new Error('Not implemented');
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    return [];
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