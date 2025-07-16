// backend/services/platform-integrations-service/src/interfaces/ITrofosStrategy.ts
// TROFOS-ONLY SOLID ARCHITECTURE - Strategy Pattern Interface
// This interface defines the contract for TROFOS operations following SOLID principles

/**
 * TROFOS Connection Configuration
 */
export interface TrofosConnectionConfig {
  serverUrl: string;
  apiKey: string;
  projectId?: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * TROFOS API Response Types
 */
export interface TrofosProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  backlog_count: number;
  sprint_count: number;
  resources?: TrofosResource[];
  created_at: string;
  updated_at: string;
}

export interface TrofosResource {
  id: string;
  name: string;
  email: string;
  role: string;
  allocation?: number;
}

export interface TrofosBacklogItem {
  id: string;
  title: string;
  description?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  story_points?: number;
  assignee?: string;
  sprint_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TrofosSprint {
  id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  velocity?: number;
  items?: TrofosBacklogItem[];
}

/**
 * Standardized Project Data (for report generation)
 */
export interface StandardizedTrofosProject {
  id: string;
  name: string;
  platform: 'trofos';
  description?: string;
  status: string;
  tasks: StandardizedTask[];
  team: StandardizedTeamMember[];
  metrics: StandardizedMetric[];
  sprints?: StandardizedSprint[];
  platformSpecific: {
    trofos: {
      projectId: string;
      backlogCount: number;
      sprintCount: number;
      apiEndpoint: string;
    };
  };
  lastUpdated: string;
  dataQuality: {
    completeness: number;
    accuracy: number;
    freshness: number;
  };
}

export interface StandardizedTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  assignee?: string;
  priority?: string;
  type?: string;
  created?: string;
  updated?: string;
  storyPoints?: number;
  sprint?: string;
  labels?: string[];
}

export interface StandardizedTeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  taskCount?: number;
  allocation?: number;
}

export interface StandardizedMetric {
  name: string;
  value: string | number;
  type: 'number' | 'percentage' | 'text' | 'status' | 'priority';
  category: string;
}

export interface StandardizedSprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: string;
  velocity?: number;
  plannedPoints?: number;
  completedPoints?: number;
  items?: StandardizedTask[];
}

/**
 * Operation Results
 */
export interface TrofosConnectionTestResult {
  success: boolean;
  message: string;
  serverVersion?: string;
  availableProjects?: Array<{
    id: string;
    name: string;
  }>;
  responseTime?: number;
  details?: any;
}

export interface TrofosDataFetchResult {
  success: boolean;
  data?: StandardizedTrofosProject[];
  error?: string;
  cached?: boolean;
  fetchTime?: number;
}

/**
 * SOLID PRINCIPLE: Interface Segregation Principle (ISP)
 * 
 * Instead of one large interface, we split TROFOS operations into focused interfaces.
 * Clients only depend on methods they actually use.
 */

/**
 * Connection Management Interface
 * Handles TROFOS server connection and authentication
 */
export interface ITrofosConnectionManager {
  /**
   * Test connection to TROFOS server
   */
  testConnection(config: TrofosConnectionConfig): Promise<TrofosConnectionTestResult>;
  
  /**
   * Validate API configuration
   */
  validateConfig(config: TrofosConnectionConfig): Promise<boolean>;
  
  /**
   * Get server information
   */
  getServerInfo(config: TrofosConnectionConfig): Promise<any>;
}

/**
 * Data Fetching Interface
 * Handles retrieving data from TROFOS API
 */
export interface ITrofosDataFetcher {
  /**
   * Fetch project data from TROFOS
   */
  fetchProject(config: TrofosConnectionConfig, projectId: string): Promise<TrofosProject>;
  
  /**
   * Fetch all accessible projects
   */
  fetchProjects(config: TrofosConnectionConfig): Promise<TrofosProject[]>;
  
  /**
   * Fetch backlog items for a project
   */
  fetchBacklogItems(config: TrofosConnectionConfig, projectId: string): Promise<TrofosBacklogItem[]>;
  
  /**
   * Fetch sprints for a project
   */
  fetchSprints(config: TrofosConnectionConfig, projectId: string): Promise<TrofosSprint[]>;
  
  /**
   * Fetch team resources for a project
   */
  fetchTeamResources(config: TrofosConnectionConfig, projectId: string): Promise<TrofosResource[]>;
}

/**
 * Data Transformation Interface
 * Handles converting TROFOS data to standardized format
 */
export interface ITrofosDataTransformer {
  /**
   * Transform TROFOS project to standardized format
   */
  transformProject(
    project: TrofosProject,
    backlogItems: TrofosBacklogItem[],
    sprints: TrofosSprint[],
    resources: TrofosResource[]
  ): StandardizedTrofosProject;
  
  /**
   * Transform backlog items to standardized tasks
   */
  transformBacklogItems(items: TrofosBacklogItem[]): StandardizedTask[];
  
  /**
   * Transform resources to standardized team members
   */
  transformResources(resources: TrofosResource[]): StandardizedTeamMember[];
  
  /**
   * Generate metrics from project data
   */
  generateMetrics(
    project: TrofosProject,
    backlogItems: TrofosBacklogItem[],
    sprints: TrofosSprint[]
  ): StandardizedMetric[];
}

/**
 * Main TROFOS Strategy Interface
 * SOLID PRINCIPLE: Single Responsibility Principle (SRP)
 * 
 * This interface has a single responsibility: defining the contract for TROFOS operations.
 * It composes the smaller interfaces to provide a complete TROFOS integration strategy.
 */
export interface ITrofosStrategy {
  /**
   * Connection manager for TROFOS operations
   */
  readonly connectionManager: ITrofosConnectionManager;
  
  /**
   * Data fetcher for TROFOS API calls
   */
  readonly dataFetcher: ITrofosDataFetcher;
  
  /**
   * Data transformer for standardization
   */
  readonly dataTransformer: ITrofosDataTransformer;
  
  /**
   * Test TROFOS connection
   */
  testConnection(config: TrofosConnectionConfig): Promise<TrofosConnectionTestResult>;
  
  /**
   * Fetch and transform project data for report generation
   */
  getProjectData(config: TrofosConnectionConfig, projectId?: string): Promise<TrofosDataFetchResult>;
  
  /**
   * Get platform identifier
   */
  getPlatform(): 'trofos';
  
  /**
   * Get strategy version for compatibility
   */
  getVersion(): string;
}

/**
 * SOLID PRINCIPLE: Dependency Inversion Principle (DIP)
 * 
 * High-level modules (like TrofosConnectionHandler) will depend on this abstraction,
 * not on concrete implementations. This allows for easy testing and future modifications.
 */