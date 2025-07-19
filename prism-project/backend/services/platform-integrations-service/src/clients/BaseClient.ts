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
          logger.error('Response error:', `${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
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
      throw new Error(`Failed to fetch projects list: ${(error as Error).message}`);
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
        status: 'Active',
        progress: 50,
        team: [], // Empty for project list - would need individual project call for details
        tasks: [], // Empty for project list - would need individual project call for details
        metrics: this.generateProjectListMetrics(trofosProject)
      };

      return projectData;

    } catch (error) {
      logger.error('Failed to transform TROFOS project list item:', error);
      throw new Error(`Project list item transformation failed: ${(error as Error).message}`);
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
      throw new Error(`Failed to get enhanced project data: ${(error as Error).message}`);
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
      throw new Error(`Failed to fetch sprint data: ${(error as Error).message}`);
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

    // FIXED: Correct base URL - serverUrl already includes /api/external
    this.http.defaults.baseURL = `${this.serverUrl}/v1`;

    // FIXED: Use x-api-key header instead of Authorization Bearer
    this.http.defaults.headers['x-api-key'] = this.apiKey;

    // Remove the incorrect Authorization header
    delete this.http.defaults.headers['Authorization'];

    logger.info('TrofosClient: Initialized with corrected configuration', {
      baseURL: this.http.defaults.baseURL,
      hasApiKey: !!this.apiKey,
      projectId: this.projectId
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('TrofosClient: Testing connection with project list endpoint');

      // FIXED: Use /project/list endpoint (POST) as per your PowerShell script
      const response = await this.http.post('/project/list', {
        pageNum: 1,
        pageSize: 1,
        sort: 'name',
        direction: 'ASC'
      });

      // FIXED: TROFOS returns projects in response.data.data, not response.data.projects
      const isValid = response.status === 200 &&
        response.data &&
        Array.isArray(response.data.data);

      logger.info('TrofosClient: Connection test result', {
        status: response.status,
        valid: isValid,
        projectCount: response.data?.data?.length || 0
      });

      return isValid;
    } catch (error: any) {
      logger.error('TrofosClient: Connection test failed', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    try {
      logger.info('TrofosClient: Fetching all projects');

      // FIXED: Use /project/list endpoint (POST) as per your PowerShell script
      const response = await this.http.post('/project/list', {
        pageNum: 1,
        pageSize: 100,
        sort: 'name',
        direction: 'ASC'
      });

      // FIXED: TROFOS returns projects in response.data.data, not response.data.projects
      if (!response.data || !Array.isArray(response.data.data)) {
        logger.warn('TrofosClient: Invalid response format for project list');
        return [];
      }

      const projects = response.data.data.map((project: any) =>
        this.transformProjectData(project)
      );

      logger.info(`TrofosClient: Successfully fetched ${projects.length} projects`);
      return projects.filter(p => p.id && p.name); // Filter valid projects
    } catch (error: any) {
      logger.error('TrofosClient: Failed to fetch projects', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return [];
    }
  }

  async getProject(projectId: string): Promise<ProjectData> {
    try {
      logger.info(`TrofosClient: Fetching single project ${projectId}`);

      // FIXED: Use /project/{id} endpoint (GET) as per your PowerShell script
      const response = await this.http.get(`/project/${projectId}`);

      if (!response.data) {
        throw new Error(`No data returned for project ${projectId}`);
      }

      const projectData = this.transformProjectData(response.data);

      logger.info(`TrofosClient: Successfully fetched project: ${projectData.name}`);
      return projectData;
    } catch (error: any) {
      logger.error(`TrofosClient: Failed to fetch project ${projectId}`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to fetch TROFOS project ${projectId}: ${error.message}`);
    }
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    try {
      const project = await this.getProject(projectId);
      return project.metrics || [];
    } catch (error) {
      logger.error(`TrofosClient: Failed to get metrics for project ${projectId}`, error);
      return [];
    }
  }

  // ADDED: Transform TROFOS project data to PRISM format
  private transformProjectData(trofosProject: any): ProjectData {
    return {
      id: trofosProject.id?.toString() || trofosProject.projectId?.toString() || 'unknown',
      name: trofosProject.name || trofosProject.pname || trofosProject.title || `Project ${trofosProject.id}`,
      description: trofosProject.description || trofosProject.desc || '',
      status: this.mapTrofosStatus(trofosProject.status),
      progress: trofosProject.progress || 0,
      team: this.transformTeamData(trofosProject.members || trofosProject.team || []),
      tasks: this.transformTaskData(trofosProject.backlog || trofosProject.tasks || trofosProject.items || []),
      metrics: this.transformMetricsData(trofosProject)
    };
  }

  // ADDED: Map TROFOS status to PRISM status
  private mapTrofosStatus(status: any): string {
    if (!status) return 'unknown';
    const statusStr = status.toString().toLowerCase();

    if (statusStr.includes('active') || statusStr.includes('progress') || statusStr.includes('ongoing')) {
      return 'active';
    }
    if (statusStr.includes('complete') || statusStr.includes('done') || statusStr.includes('finished')) {
      return 'completed';
    }
    if (statusStr.includes('plan') || statusStr.includes('draft') || statusStr.includes('pending')) {
      return 'planning';
    }
    if (statusStr.includes('pause') || statusStr.includes('hold')) {
      return 'paused';
    }
    return statusStr;
  }

  // ADDED: Transform team member data
  private transformTeamData(members: any[]): TeamMember[] {
    if (!Array.isArray(members)) return [];

    return members.map((member: any) => ({
      id: member.id?.toString() || member.userId?.toString() || member.memberId?.toString() || 'unknown',
      name: member.name || member.displayName || member.username || member.fullName || 'Unknown User',
      email: member.email || member.emailAddress || '',
      role: member.role || member.position || member.title || 'Team Member',
      avatar: member.avatar || member.profilePicture || member.photo || ''
    }));
  }

  // ADDED: Transform task/backlog data  
  private transformTaskData(tasks: any[]): Task[] {
    if (!Array.isArray(tasks)) return [];

    return tasks.map((task: any) => ({
      id: task.id?.toString() || task.taskId?.toString() || task.itemId?.toString() || 'unknown',
      title: task.title || task.name || task.summary || task.description || 'Untitled Task',
      status: this.mapTrofosStatus(task.status || task.state),
      assignee: task.assignee ? {
        id: task.assignee.id?.toString() || 'unknown',
        name: task.assignee.name || task.assignee.displayName || 'Unknown',
        email: task.assignee.email || '',
        role: task.assignee.role || ''
      } : undefined,
      priority: task.priority || task.importance || 'medium',
      dueDate: task.dueDate || task.deadline ? new Date(task.dueDate || task.deadline) : undefined,
      tags: task.tags || task.labels || task.categories || []
    }));
  }

  // ADDED: Transform metrics data
  private transformMetricsData(project: any): Metric[] {
    const metrics: Metric[] = [];

    // Add common TROFOS metrics
    if (project.totalTasks !== undefined || project.taskCount !== undefined) {
      metrics.push({
        name: 'Total Tasks',
        value: project.totalTasks || project.taskCount || 0,
        unit: 'tasks'
      });
    }

    if (project.completedTasks !== undefined || project.completedCount !== undefined) {
      metrics.push({
        name: 'Completed Tasks',
        value: project.completedTasks || project.completedCount || 0,
        unit: 'tasks'
      });
    }

    if (project.progress !== undefined) {
      metrics.push({
        name: 'Progress',
        value: project.progress,
        unit: '%'
      });
    }

    if (project.budget !== undefined || project.cost !== undefined) {
      metrics.push({
        name: 'Budget',
        value: project.budget || project.cost,
        unit: 'currency'
      });
    }

    if (project.duration !== undefined || project.timeSpent !== undefined) {
      metrics.push({
        name: 'Duration',
        value: project.duration || project.timeSpent,
        unit: 'hours'
      });
    }

    // Add team size metric
    const teamSize = project.members?.length || project.team?.length || 0;
    if (teamSize > 0) {
      metrics.push({
        name: 'Team Size',
        value: teamSize,
        unit: 'members'
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