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
    try {
      logger.info('Fetching TROFOS projects list...');

      // ✅ STEP 4: Projects list endpoint - POST /project/list
      const response = await this.http.post('/project/list', {
        option: "all",
        pageIndex: 0,
        pageSize: 20  // Fetch up to 20 projects
      });

      if (!response.data || !response.data.data) {
        throw new Error('No projects data returned from TROFOS API');
      }

      const trofosProjects = response.data.data;
      const totalCount = response.data.totalCount || trofosProjects.length;

      logger.info(`Successfully fetched ${trofosProjects.length} TROFOS projects (total: ${totalCount})`);

      // Transform each TROFOS project to PRISM ProjectData format
      const projectsData: ProjectData[] = [];

      for (const trofosProject of trofosProjects) {
        try {
          // For projects list, we have limited data, so we'll use a simplified transformation
          const projectData = this.transformProjectListItem(trofosProject);
          projectsData.push(projectData);
        } catch (error) {
          logger.warn(`Failed to transform project ${trofosProject.id}:`, error);
          // Continue with other projects even if one fails
        }
      }

      logger.info(`Successfully transformed ${projectsData.length} projects to PRISM format`);
      return projectsData;

    } catch (error) {
      logger.error('Failed to fetch TROFOS projects list:', error);
      throw new Error(`Failed to fetch projects list: ${error.message}`);
    }
  }

  /**
   * Transform TROFOS project list item to PRISM ProjectData format
   * (Simplified version for project list - less detailed than individual project)
   */
  private transformProjectListItem(trofosProject: any): ProjectData {
    try {
      // TROFOS project list format:
      // {
      //   "id": 2,
      //   "pname": "SPA [29]",
      //   "pkey": "SPA",
      //   "course_id": 16,
      //   "backlog_counter": 47
      // }

      const projectData: ProjectData = {
        id: String(trofosProject.id),
        name: trofosProject.pname || trofosProject.pkey || `Project ${trofosProject.id}`,
        description: `TROFOS Project: ${trofosProject.pname || trofosProject.pkey}`,
        status: this.determineProjectStatus(trofosProject),
        progress: this.calculateProjectProgress(trofosProject),
        team: [], // Empty for project list - would need individual project call for details
        tasks: [], // Empty for project list - would need individual project call for details
        metrics: this.generateProjectListMetrics(trofosProject)
      };

      return projectData;

    } catch (error) {
      logger.error('Failed to transform TROFOS project list item:', error);
      throw new Error(`Project list item transformation failed: ${error.message}`);
    }
  }

  /**
   * Generate simplified metrics for project list items
   */
  private generateProjectListMetrics(trofosProject: any): Metric[] {
    const metrics: Metric[] = [];

    // Add backlog counter metric
    if (trofosProject.backlog_counter !== undefined) {
      metrics.push({
        name: 'Total Backlog Items',
        value: trofosProject.backlog_counter,
        unit: 'items'
      });
    }

    // Add course ID metric
    if (trofosProject.course_id) {
      metrics.push({
        name: 'Course ID',
        value: trofosProject.course_id,
        unit: 'course'
      });
    }

    // Add project key if different from name
    if (trofosProject.pkey && trofosProject.pkey !== trofosProject.pname) {
      metrics.push({
        name: 'Project Key',
        value: trofosProject.pkey,
        unit: 'key'
      });
    }

    return metrics;
  }

  /**
 * Get detailed project data including sprints, backlogs, and team information
 */
  async getProjectWithSprints(projectId: string): Promise<ProjectData> {
    try {
      logger.info(`Fetching TROFOS project with sprint data for project ID: ${projectId}`);

      // Get basic project info first
      const basicProject = await this.getProject(projectId);

      // Get sprint data to populate team and tasks
      const sprintData = await this.getProjectSprints(projectId);

      // Enhance the project data with sprint information
      const enhancedProject: ProjectData = {
        ...basicProject,
        team: this.extractTeamMembers(sprintData),
        tasks: this.extractTasks(sprintData),
        metrics: [
          ...basicProject.metrics,
          ...this.generateSprintMetrics(sprintData)
        ]
      };

      logger.info(`Enhanced project ${projectId} with sprint data - ${enhancedProject.team.length} team members, ${enhancedProject.tasks.length} tasks`);
      return enhancedProject;

    } catch (error) {
      logger.error(`Failed to get project with sprints for ${projectId}:`, error);
      throw new Error(`Failed to get enhanced project data: ${error.message}`);
    }
  }

  /**
   * Get sprint data for a specific project
   */
  async getProjectSprints(projectId: string): Promise<any> {
    try {
      logger.info(`Fetching sprint data for project ${projectId}...`);

      // ✅ STEP 5: Sprint data endpoint - GET /project/{projectId}/sprint
      const response = await this.http.get(`/project/${projectId}/sprint`);

      if (!response.data) {
        throw new Error('No sprint data returned from TROFOS API');
      }

      const sprintData = response.data;
      logger.info(`Successfully fetched sprint data for project ${projectId} - ${sprintData.sprints?.length || 0} sprints`);

      return sprintData;

    } catch (error) {
      logger.error(`Failed to fetch sprint data for project ${projectId}:`, error);
      throw new Error(`Failed to fetch sprint data: ${error.message}`);
    }
  }

  /**
 * Extract team members from sprint data - FIXED VERSION
 */
  private extractTeamMembers(sprintData: any): TeamMember[] {
    const teamMembers = new Map<string, TeamMember>();

    try {
      if (!sprintData.sprints) {
        return [];
      }

      // Iterate through sprints and backlogs to find team members
      for (const sprint of sprintData.sprints) {
        if (!sprint.backlogs) continue;

        for (const backlog of sprint.backlogs) {
          // ✅ FIXED: Handle the actual TROFOS data structure
          // The backlog has an 'assignee' object, not separate assignee_id/assignee_name fields

          if (backlog.assignee && typeof backlog.assignee === 'object') {
            const assignee = backlog.assignee;
            const memberId = String(assignee.id || assignee.user_id || backlog.assignee_id);
            const memberName = assignee.name || assignee.username || assignee.display_name;

            if (memberId && memberName) {
              if (!teamMembers.has(memberId)) {
                teamMembers.set(memberId, {
                  id: memberId,
                  name: memberName,
                  email: assignee.email || undefined,
                  role: assignee.role || this.determineRole(backlog),
                  avatar: assignee.avatar || assignee.avatar_url || undefined
                });
              }
            }
          }

          // Fallback: Check for separate assignee_id/assignee_name fields
          else if (backlog.assignee_id && backlog.assignee_name) {
            const memberId = String(backlog.assignee_id);

            if (!teamMembers.has(memberId)) {
              teamMembers.set(memberId, {
                id: memberId,
                name: backlog.assignee_name,
                email: backlog.assignee_email || undefined,
                role: this.determineRole(backlog),
                avatar: undefined
              });
            }
          }

          // Also check for reporter information
          if (backlog.reporter_id) {
            const reporterId = String(backlog.reporter_id);
            const reporterName = backlog.reporter_name || `Reporter ${reporterId}`;

            if (!teamMembers.has(reporterId)) {
              teamMembers.set(reporterId, {
                id: reporterId,
                name: reporterName,
                email: backlog.reporter_email || undefined,
                role: 'Reporter',
                avatar: undefined
              });
            }
          }
        }
      }

      const members = Array.from(teamMembers.values());
      logger.info(`Extracted ${members.length} unique team members from sprint data`);
      return members;

    } catch (error) {
      logger.error('Failed to extract team members from sprint data:', error);
      return [];
    }
  }

  /**
   * Extract tasks from sprint data - ALSO IMPROVED for assignee handling
   */
  private extractTasks(sprintData: any): Task[] {
    const tasks: Task[] = [];

    try {
      if (!sprintData.sprints) {
        return [];
      }

      // Iterate through sprints and backlogs to create tasks
      for (const sprint of sprintData.sprints) {
        if (!sprint.backlogs) continue;

        for (const backlog of sprint.backlogs) {
          // ✅ IMPROVED: Better handling of assignee data
          let assigneeInfo = undefined;

          if (backlog.assignee && typeof backlog.assignee === 'object') {
            const assignee = backlog.assignee;
            assigneeInfo = {
              id: String(assignee.id || assignee.user_id || backlog.assignee_id),
              name: assignee.name || assignee.username || assignee.display_name,
              email: assignee.email || undefined,
              role: assignee.role || this.determineRole(backlog)
            };
          } else if (backlog.assignee_id && backlog.assignee_name) {
            assigneeInfo = {
              id: String(backlog.assignee_id),
              name: backlog.assignee_name,
              email: backlog.assignee_email || undefined,
              role: this.determineRole(backlog)
            };
          }

          const task: Task = {
            id: String(backlog.backlog_id || backlog.id),
            title: backlog.summary || backlog.title || `Task ${backlog.backlog_id || backlog.id}`,
            status: this.mapBacklogStatus(backlog.status),
            assignee: assigneeInfo,
            priority: this.mapPriority(backlog.priority),
            dueDate: backlog.due_date ? new Date(backlog.due_date) : undefined,
            tags: this.extractTags(backlog, sprint)
          };

          tasks.push(task);
        }
      }

      logger.info(`Extracted ${tasks.length} tasks from sprint data`);
      return tasks;

    } catch (error) {
      logger.error('Failed to extract tasks from sprint data:', error);
      return [];
    }
  }

  /**
   * Generate metrics from sprint data
   */
  private generateSprintMetrics(sprintData: any): Metric[] {
    const metrics: Metric[] = [];

    try {
      if (!sprintData.sprints) {
        return [];
      }

      // Count sprints
      metrics.push({
        name: 'Total Sprints',
        value: sprintData.sprints.length,
        unit: 'sprints'
      });

      // Count total tasks across all sprints
      let totalTasks = 0;
      let completedTasks = 0;
      let inProgressTasks = 0;

      for (const sprint of sprintData.sprints) {
        if (sprint.backlogs) {
          totalTasks += sprint.backlogs.length;

          for (const backlog of sprint.backlogs) {
            const status = this.mapBacklogStatus(backlog.status);
            if (status === 'Done' || status === 'Completed') {
              completedTasks++;
            } else if (status === 'In Progress' || status === 'Working on it') {
              inProgressTasks++;
            }
          }
        }
      }

      metrics.push({
        name: 'Total Tasks',
        value: totalTasks,
        unit: 'tasks'
      });

      if (completedTasks > 0) {
        metrics.push({
          name: 'Completed Tasks',
          value: completedTasks,
          unit: 'tasks'
        });
      }

      if (inProgressTasks > 0) {
        metrics.push({
          name: 'In Progress Tasks',
          value: inProgressTasks,
          unit: 'tasks'
        });
      }

      // Calculate completion rate
      if (totalTasks > 0) {
        const completionRate = Math.round((completedTasks / totalTasks) * 100);
        metrics.push({
          name: 'Completion Rate',
          value: completionRate,
          unit: '%'
        });
      }

      return metrics;

    } catch (error) {
      logger.error('Failed to generate sprint metrics:', error);
      return [];
    }
  }

  /**
   * Helper methods for data transformation
   */
  private determineRole(backlog: any): string {
    // Basic role determination based on available data
    if (backlog.assignee_role) return backlog.assignee_role;
    if (backlog.role) return backlog.role;
    return 'Developer'; // Default role
  }

  private mapBacklogStatus(status: any): string {
    if (!status) return 'Not Started';

    const statusStr = String(status).toLowerCase();

    // Map TROFOS status to standard status values
    if (statusStr.includes('done') || statusStr.includes('complete')) return 'Done';
    if (statusStr.includes('progress') || statusStr.includes('working')) return 'In Progress';
    if (statusStr.includes('review') || statusStr.includes('testing')) return 'In Review';
    if (statusStr.includes('blocked') || statusStr.includes('stuck')) return 'Blocked';

    return 'Not Started';
  }

  private mapPriority(priority: any): string {
    if (!priority) return 'Medium';

    const priorityStr = String(priority).toLowerCase();

    if (priorityStr.includes('high') || priorityStr.includes('urgent')) return 'High';
    if (priorityStr.includes('low')) return 'Low';

    return 'Medium';
  }

  private extractTags(backlog: any, sprint: any): string[] {
    const tags: string[] = [];

    // Add sprint name as a tag
    if (sprint.name) {
      tags.push(`Sprint: ${sprint.name}`);
    }

    // Add type if available
    if (backlog.type) {
      tags.push(`Type: ${backlog.type}`);
    }

    // Add priority as tag
    if (backlog.priority) {
      tags.push(`Priority: ${this.mapPriority(backlog.priority)}`);
    }

    // Add any labels if available
    if (backlog.labels && Array.isArray(backlog.labels)) {
      tags.push(...backlog.labels);
    }

    return tags;
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

// TROFOS Client - CORRECTED VERSION
export class TrofosClient extends BaseClient {
  private get serverUrl(): string {
    // Normalize the server URL - remove trailing slash
    const url = this.connection.config.serverUrl || 'https://trofos-production.comp.nus.edu.sg/api/external';
    return url.replace(/\/$/, '');
  }

  private get apiKey(): string {
    return this.connection.config.apiKey;
  }

  private get projectId(): string {
    return this.connection.config.projectId;
  }

  constructor(connection: PlatformConnection) {
    super(connection);

    // ✅ Set base URL to include /api/external/v1
    this.http.defaults.baseURL = `${this.serverUrl}/v1`;

    // ✅ Use x-api-key header instead of Authorization Bearer
    this.http.defaults.headers['x-api-key'] = this.apiKey;

    // Remove any Authorization header that might be set by parent
    delete this.http.defaults.headers['Authorization'];

    logger.info(`TROFOS Client initialized with baseURL: ${this.http.defaults.baseURL}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing TROFOS connection...');

      // ✅ Use POST endpoint with correct payload format
      const response = await this.http.post('/project/list', {
        option: "all",
        pageIndex: 0,
        pageSize: 1  // Just test with 1 project to verify connection
      });

      const success = response.status === 200 && response.data;
      logger.info(`TROFOS connection test result: ${success ? 'SUCCESS' : 'FAILED'}`);

      return success;
    } catch (error) {
      logger.error('TROFOS connection test failed:', error);
      return false;
    }
  }

  async getProject(projectId: string): Promise<ProjectData> {
    try {
      logger.info(`Fetching TROFOS project data for project ID: ${projectId}`);

      // ✅ Individual project endpoint - GET /project/{projectId}
      const response = await this.http.get(`/project/${projectId}`);

      if (!response.data) {
        throw new Error('No project data returned from TROFOS API');
      }

      const trofosProject = response.data;
      logger.info(`Successfully fetched TROFOS project: ${trofosProject.pname || 'Unknown'}`);

      // Transform TROFOS project data to PRISM ProjectData format
      const projectData: ProjectData = this.transformProjectData(trofosProject);

      return projectData;

    } catch (error) {
      logger.error(`Failed to fetch TROFOS project ${projectId}:`, error);
      throw new Error(`Failed to fetch project ${projectId}: ${error.message}`);
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    // Placeholder - will implement in Step 4
    logger.info('TrofosClient.getProjects() - placeholder, will implement in Step 4');
    return [];
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    // Placeholder - will implement later
    logger.info(`TrofosClient.getProjectMetrics(${projectId}) - placeholder`);
    return [];
  }

  /**
   * Transform TROFOS project data to PRISM ProjectData format
   */
  private transformProjectData(trofosProject: any): ProjectData {
    try {
      // TROFOS project format:
      // {
      //   "id": 127,
      //   "pname": "CS4218 2420 Team 40",
      //   "pkey": "CS4218 2420 Team 40", 
      //   "description": null,
      //   "course_id": 70,
      //   "owner_id": null,
      //   "public": false,
      //   "created_at": "2025-02-03T03:35:02.409Z",
      //   "backlog_counter": 137
      // }

      const projectData: ProjectData = {
        id: String(trofosProject.id),
        name: trofosProject.pname || trofosProject.pkey || `Project ${trofosProject.id}`,
        description: trofosProject.description || `TROFOS Project: ${trofosProject.pname}`,
        status: this.determineProjectStatus(trofosProject),
        progress: this.calculateProjectProgress(trofosProject),
        team: [], // Will be populated when we fetch sprint/backlog data
        tasks: [], // Will be populated when we fetch sprint/backlog data  
        metrics: this.generateProjectMetrics(trofosProject)
      };

      logger.info(`Transformed TROFOS project to PRISM format: ${projectData.name}`);
      return projectData;

    } catch (error) {
      logger.error('Failed to transform TROFOS project data:', error);
      throw new Error(`Data transformation failed: ${error.message}`);
    }
  }

  /**
   * Determine project status based on TROFOS data
   */
  private determineProjectStatus(trofosProject: any): string {
    // Basic status determination - can be enhanced later
    if (trofosProject.backlog_counter > 0) {
      return 'Active';
    } else if (trofosProject.public) {
      return 'Published';
    } else {
      return 'Planning';
    }
  }

  /**
   * Calculate project progress based on available data
   */
  private calculateProjectProgress(trofosProject: any): number {
    // Basic progress calculation - will be enhanced when we add sprint data
    if (trofosProject.backlog_counter > 0) {
      // Assume some progress if there are backlog items
      return Math.min(50, trofosProject.backlog_counter * 2);
    }
    return 0;
  }

  /**
   * Generate project metrics from TROFOS data
   */
  private generateProjectMetrics(trofosProject: any): Metric[] {
    const metrics: Metric[] = [];

    // Add backlog counter metric
    if (trofosProject.backlog_counter !== undefined) {
      metrics.push({
        name: 'Total Backlog Items',
        value: trofosProject.backlog_counter,
        unit: 'items'
      });
    }

    // Add course ID metric
    if (trofosProject.course_id) {
      metrics.push({
        name: 'Course ID',
        value: trofosProject.course_id,
        unit: 'course'
      });
    }

    // Add creation date metric
    if (trofosProject.created_at) {
      const createdDate = new Date(trofosProject.created_at);
      const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      metrics.push({
        name: 'Days Since Creation',
        value: daysSinceCreation,
        unit: 'days'
      });
    }

    return metrics;
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