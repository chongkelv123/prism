// backend/services/platform-integrations-service/src/interfaces/ConnectionInterfaces.ts
// Interface abstractions for ConnectionService dependency injection

import { IConnection } from '../models/Connection';

// Repository abstraction for database operations
export interface IConnectionRepository {
  findOne(query: any): Promise<IConnection | null>;
  create(data: any): Promise<IConnection>;
  find(query: any): Promise<IConnection[]>;
  save(connection: IConnection): Promise<IConnection>;
}

// HTTP client abstraction for API calls
export interface IHttpClient {
  get(url: string, config?: any): Promise<any>;
  post(url: string, data?: any, config?: any): Promise<any>;
  put(url: string, data?: any, config?: any): Promise<any>;
  delete(url: string, config?: any): Promise<any>;
}

// Platform client abstractions
export interface IJiraClient {
  testConnection(): Promise<ConnectionTestResult>;
  getProjectData(projectId?: string): Promise<any>;
  getProject(projectKey: string): Promise<any>;
  getIssues(projectKey: string, maxResults?: number): Promise<any>;
}

export interface IMondayClient {
  testConnection(): Promise<ConnectionTestResult>;
  getProjectData(projectId?: string): Promise<any>;
  getBoards(): Promise<any>;
  getBoardItems(boardId: string): Promise<any>;
}

export interface ITrofosClient {
  testConnection(): Promise<ConnectionTestResult>;
  getProjectData(projectId?: string): Promise<any>;
  getProject(projectId: string): Promise<any>;
  getProjectMetrics(projectId: string): Promise<any>;
}

// Factory pattern for platform clients
export interface IPlatformClientFactory {
  createJiraClient(config: any): IJiraClient;
  createMondayClient(config: any): IMondayClient;
  createTrofosClient(config: any): ITrofosClient;
}

// Configuration validation abstraction
export interface IConfigValidator {
  validateJiraConfig(config: any): ValidationResult;
  validateMondayConfig(config: any): ValidationResult;
  validateTrofosConfig(config: any): ValidationResult;
}

// Data transformation abstraction
export interface IDataTransformer {
  transformJiraData(rawData: any): ProjectData[];
  transformMondayData(rawData: any): ProjectData[];
  transformTrofosData(rawData: any): ProjectData[];
}

// Shared interfaces
export interface ValidationResult {
  valid: boolean;
  message: string;
  details?: any;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
}

// Enhanced Project Data Interface (unchanged from original)
export interface ProjectData {
  id: string;
  name: string;
  platform: string;
  description?: string;
  status: string;
  tasks: Array<{
    id?: string;
    name: string;
    status: string;
    assignee?: string;
    priority?: string;
    created?: string;
    updated?: string;
    description?: string;
    labels?: string[];
    storyPoints?: number;
    timeEstimate?: string;
    group?: string;
  }>;
  team?: Array<{
    id?: string;
    name: string;
    role: string;
    email?: string;
    avatar?: string;
    department?: string;
    taskCount?: number;
  }>;
  metrics: Array<{
    name: string;
    value: string | number;
    type?: string;
    category?: string;
  }>;
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
    trofos?: {
      serverUrl?: string;
      projectId?: string;
      backlogs?: Array<{ id: string; name: string; status: string }>;
      resources?: Array<{ id: string; name: string; role: string }>;
      sprints?: Array<{ id: string; name: string; status: string }>;
    };
  };
  lastUpdated?: string;
  dataQuality?: {
    completeness: number;
    accuracy: number;
    freshness: number;
  };
}

export interface ConnectionCreateData {
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
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