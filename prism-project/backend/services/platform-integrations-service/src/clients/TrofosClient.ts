// backend/services/platform-integrations-service/src/clients/TrofosClient.ts
import { BaseClient, PlatformConnection, ProjectData, Metric, TeamMember, Task } from './BaseClient';
import logger from '../utils/logger';

export class TrofosClient extends BaseClient {
  private get serverUrl(): string {
    const url = this.connection.config.serverUrl;
    if (!url) throw new Error('TROFOS server URL is required');
    return url.replace(/\/$/, '').trim();
  }

  private get apiKey(): string {
    const apiKey = this.connection.config.apiKey;
    if (!apiKey) throw new Error('TROFOS API key is required');
    return apiKey.trim();
  }

  private get projectId(): string {
    const projectId = this.connection.config.projectId;
    if (!projectId) throw new Error('TROFOS project ID is required');
    return projectId.trim();
  }

  constructor(connection: PlatformConnection) {
    super(connection);
    
    // Set up TROFOS-specific HTTP client configuration
    this.http.defaults.baseURL = `${this.serverUrl}/v1`;    
    this.http.defaults.headers['x-api-key'] = this.apiKey;
    this.http.defaults.headers['Content-Type'] = 'application/json';
    this.http.defaults.headers['Accept'] = 'application/json';    
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.http.get(`/project/${this.projectId}`);
    
      if (response.status === 200) {
        logger.info('TROFOS authentication successful with x-api-key', { 
          status: response.status,
          projectId: this.projectId
        });
      return true;
    }
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid x-api-key. Please check your TROFOS API key.');
      }
      return false;
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    try {
      logger.info('Fetching TROFOS project data...');
      
      // Get project details
      const projectResponse = await this.http.get(`/project/${this.projectId}`);
      const project = projectResponse.data;

      if (!project) {
        throw new Error(`Project with ID ${this.projectId} not found`);
      }

      // Get project sprints
      const sprintsResponse = await this.http.get(`/project/${this.projectId}/sprints`);
      const sprints = sprintsResponse.data || [];

      // Get project backlog items
      const backlogResponse = await this.http.get(`/project/${this.projectId}/backlog`, {
        params: {
          pageNum: 1,
          pageSize: 100,
          sort: 'priority',
          direction: 'DESC'
        }
      });
      const backlogItems = backlogResponse.data?.data || [];

      // Get team members
      const teamResponse = await this.http.get(`/project/${this.projectId}/members`);
      const teamMembers = teamResponse.data || [];

      // Transform backlog items to tasks
      const tasks: Task[] = backlogItems.map((item: any) => {
        // Find assignee in team members
        let assignee: TeamMember | undefined;
        if (item.assigneeId) {
          const teamMember = teamMembers.find((member: any) => member.id === item.assigneeId);
          if (teamMember) {
            assignee = {
              id: teamMember.id.toString(),
              name: teamMember.name,
              email: teamMember.email,
              role: teamMember.role || 'Developer',
              avatar: teamMember.avatar
            };
          }
        }

        return {
          id: item.id.toString(),
          title: item.title || item.name,
          status: this.mapTrofosStatus(item.status),
          assignee,
          priority: this.mapTrofosPriority(item.priority),
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          tags: item.tags || []
        };
      });

      // Calculate sprint-related metrics
      const sprintMetrics = this.calculateSprintMetrics(sprints);
      
      // Calculate task status metrics
      const statusCounts = tasks.reduce((acc: any, task: Task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      const priorityCounts = tasks.reduce((acc: any, task: Task) => {
        acc[task.priority || 'Medium'] = (acc[task.priority || 'Medium'] || 0) + 1;
        return acc;
      }, {});

      // Combine all metrics
      const metrics: Metric[] = [
        { name: 'Total Backlog Items', value: tasks.length },
        { name: 'Active Sprints', value: sprintMetrics.activeSprints },
        { name: 'Completed Sprints', value: sprintMetrics.completedSprints },
        { name: 'To Do', value: statusCounts['To Do'] || 0 },
        { name: 'In Progress', value: statusCounts['In Progress'] || 0 },
        { name: 'Done', value: statusCounts['Done'] || 0 },
        { name: 'High Priority', value: priorityCounts['High'] || priorityCounts['Critical'] || 0 },
        { name: 'Medium Priority', value: priorityCounts['Medium'] || 0 },
        { name: 'Low Priority', value: priorityCounts['Low'] || 0 },
        { name: 'Total Story Points', value: sprintMetrics.totalStoryPoints },
        { name: 'Completed Story Points', value: sprintMetrics.completedStoryPoints }
      ];

      // Transform team members
      const team: TeamMember[] = teamMembers.map((member: any) => ({
        id: member.id.toString(),
        name: member.name,
        email: member.email,
        role: member.role || 'Developer',
        avatar: member.avatar
      }));

      const projectData: ProjectData = {
        id: project.id.toString(),
        name: project.name,
        description: project.description,
        status: project.status === 'ACTIVE' ? 'active' : 'inactive',
        progress: this.calculateProjectProgress(tasks),
        tasks,
        metrics,
        team
      } as any;

      logger.info('TROFOS project data fetched successfully', {
        projectId: project.id,
        backlogItemCount: tasks.length,
        sprintCount: sprints.length,
        teamSize: team.length
      });

      return [projectData];
    } catch (error: any) {
      logger.error('Failed to fetch TROFOS project data:', error);
      
      if (error.response?.status === 404) {
        throw new Error(`Project '${this.projectId}' not found or not accessible`);
      } else if (error.response?.status === 403) {
        throw new Error(`No permission to access project '${this.projectId}'`);
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please check your API key');
      } else {
        throw new Error(`Failed to fetch project data from TROFOS: ${error.message}`);
      }
    }
  }

  async getProject(projectId: string): Promise<ProjectData> {
    // For TROFOS, project ID should match the configured project ID
    if (projectId !== this.projectId) {
      throw new Error(`Project '${projectId}' does not match configured project '${this.projectId}'`);
    }
    
    const projects = await this.getProjects();
    return projects[0]; // TROFOS client only returns one project
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    const project = await this.getProject(projectId);
    return project.metrics || [];
  }

  /**
   * Map TROFOS status values to standardized status values
   */
  private mapTrofosStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'BACKLOG': 'To Do',
      'TODO': 'To Do',
      'IN_PROGRESS': 'In Progress',
      'DOING': 'In Progress',
      'REVIEW': 'In Review',
      'TESTING': 'Testing',
      'DONE': 'Done',
      'COMPLETED': 'Done'
    };

    return statusMap[status?.toUpperCase()] || status || 'Unknown';
  }

  /**
   * Map TROFOS priority values to standardized priority values
   */
  private mapTrofosPriority(priority: number | string): string {
    if (typeof priority === 'number') {
      if (priority >= 4) return 'Critical';
      if (priority === 3) return 'High';
      if (priority === 2) return 'Medium';
      if (priority === 1) return 'Low';
    }

    const priorityMap: { [key: string]: string } = {
      'CRITICAL': 'Critical',
      'HIGH': 'High',
      'MEDIUM': 'Medium',
      'LOW': 'Low'
    };

    return priorityMap[priority?.toString().toUpperCase()] || 'Medium';
  }

  /**
   * Calculate sprint-related metrics
   */
  private calculateSprintMetrics(sprints: any[]): any {
    const now = new Date();
    let activeSprints = 0;
    let completedSprints = 0;
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;

    sprints.forEach(sprint => {
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);

      if (sprint.status === 'COMPLETED') {
        completedSprints++;
        completedStoryPoints += sprint.completedStoryPoints || 0;
      } else if (sprint.status === 'ACTIVE' || (now >= startDate && now <= endDate)) {
        activeSprints++;
      }

      totalStoryPoints += sprint.totalStoryPoints || 0;
    });

    return {
      activeSprints,
      completedSprints,
      totalStoryPoints,
      completedStoryPoints
    };
  }

  /**
   * Calculate overall project progress based on task completion
   */
  private calculateProjectProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter(task => task.status === 'Done').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }
}