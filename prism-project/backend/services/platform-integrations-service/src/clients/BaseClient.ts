// backend/services/platform-integrations-service/src/clients/BaseClient.ts
// CLEAN VERSION - Only abstract base class and interfaces, no concrete implementations

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
  platform: string;
  description?: string;
  status: string;
  progress?: number;
  team?: TeamMember[];
  tasks?: Task[];
  metrics?: Metric[];
  platformSpecific?: {        // ✅ ADD THIS PROPERTY
    jira?: {
      projectKey?: string;
      projectType?: string;
      lead?: string;
      description?: string;
      url?: string;
      issueTypes?: string[];
      components?: string[];
    };
    monday?: {
      boardId?: string;
      groups?: Array<{ id: string; title: string; color?: string }>;
      columns?: Array<{ id: string; title: string; type: string }>;
    };
    trofos?: {
      projectType?: string;
      modules?: string[];
    };
  };
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

/**
 * Abstract base class for platform integration clients
 * Provides common HTTP client setup and interceptors
 */
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
          logger.error('Response error:', {
            status: error.response?.status,
            data: error.response?.data
          });
        } else {
          logger.error('Response error:', error);
        }
        return Promise.reject(error);
      }
    );
  }

  // Abstract methods that must be implemented by concrete clients
  abstract testConnection(): Promise<boolean>;
  abstract getProjects(): Promise<ProjectData[]>;
  abstract getProject(projectId: string): Promise<ProjectData>;
  abstract getProjectMetrics(projectId: string): Promise<Metric[]>;
}

// ============================================================================
// CLIENT FACTORY - Imports all concrete implementations
// ============================================================================

import { MondayClient } from './MondayClient';
import { JiraClient } from './JiraClient';
import { TrofosClient } from './TrofosClient';

/**
 * Factory class for creating platform-specific client instances
 */
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