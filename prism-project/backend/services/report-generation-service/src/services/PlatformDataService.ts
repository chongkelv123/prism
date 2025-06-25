// backend/services/report-generation-service/src/services/PlatformDataService.ts
// Enhanced Platform Data Service - Windows Compatible (No Unicode/Symbols)
// ENHANCED: Better real data transformation and platform-specific handling

import axios, { AxiosResponse } from 'axios';
import logger from '../utils/logger';

export interface ProjectData {
  id: string;
  name: string;
  platform: string; // 'jira' | 'monday' | 'trofos'
  tasks: {
    id?: string;
    name: string;
    status: string; // Real platform statuses
    assignee?: string; // Real assignee names from platform
    priority?: string; // Real priority from platform
    created?: string;
    updated?: string;
    description?: string;
    labels?: string[];
    storyPoints?: number; // Jira specific
    timeEstimate?: string;
  }[];
  team?: {
    id?: string;
    name: string; // Real team member names
    role: string;
    email?: string;
    avatar?: string;
    department?: string;
    skills?: string[];
  }[];
  metrics: { name: string; value: string | number; type?: string }[];
  sprints?: {
    name: string;
    startDate: string;
    endDate: string;
    completed: string;
    velocity?: number;
    plannedPoints?: number;
    completedPoints?: number;
  }[];
  platformSpecific?: {
    jira?: {
      projectKey?: string;
      issueTypes?: string[];
      workflows?: { name: string; steps: string[] }[];
      components?: string[];
      versions?: string[];
    };
    monday?: {
      boardId?: string;
      groups?: { id: string; title: string; color?: string }[];
      columns?: { id: string; title: string; type: string }[];
      automations?: number;
    };
    trofos?: {
      projectType?: string;
      modules?: string[];
      integrations?: string[];
    };
  };
  fallbackData?: boolean; // Flag indicating if using demo data
  lastUpdated?: string;
  dataQuality?: {
    completeness: number;
    accuracy: number;
    freshness: number;
  };
}

export interface ReportGenerationConfig {
  platform: string;
  connectionId: string;
  projectId: string;
  templateId?: string;
  configuration?: any;
  includeHistoricalData?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface PlatformStatusMapping {
  [key: string]: {
    normalized: 'todo' | 'inprogress' | 'done' | 'blocked';
    category: string;
    color: string;
  };
}

interface PlatformPriorityMapping {
  [key: string]: {
    normalized: 'low' | 'medium' | 'high' | 'critical';
    numeric: number;
  };
}

export class PlatformDataService {
  private readonly PLATFORM_INTEGRATIONS_URL: string;
  private httpClient: any;
  private statusMappings: Record<string, PlatformStatusMapping>;
  private priorityMappings: Record<string, PlatformPriorityMapping>;

  constructor(authToken?: string) {
    this.PLATFORM_INTEGRATIONS_URL = process.env.PLATFORM_INTEGRATIONS_URL || 'http://localhost:4005';
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }) // Optional auth token
      }
    });

    // Initialize platform-specific mappings
    this.initializePlatformMappings();
  }

  /**
   * Initialize platform-specific status and priority mappings
   */
  private initializePlatformMappings(): void {
    // Jira Status Mappings
    this.statusMappings = {
      jira: {
        'to do': { normalized: 'todo', category: 'Backlog', color: '6B7280' },
        'todo': { normalized: 'todo', category: 'Backlog', color: '6B7280' },
        'open': { normalized: 'todo', category: 'Open', color: '6B7280' },
        'new': { normalized: 'todo', category: 'New', color: '6B7280' },
        'created': { normalized: 'todo', category: 'Created', color: '6B7280' },
        'backlog': { normalized: 'todo', category: 'Backlog', color: '6B7280' },

        'in progress': { normalized: 'inprogress', category: 'Active', color: '3B82F6' },
        'progress': { normalized: 'inprogress', category: 'Active', color: '3B82F6' },
        'in review': { normalized: 'inprogress', category: 'Review', color: '8B5CF6' },
        'review': { normalized: 'inprogress', category: 'Review', color: '8B5CF6' },
        'testing': { normalized: 'inprogress', category: 'Testing', color: 'F59E0B' },
        'development': { normalized: 'inprogress', category: 'Development', color: '3B82F6' },

        'done': { normalized: 'done', category: 'Complete', color: '10B981' },
        'completed': { normalized: 'done', category: 'Complete', color: '10B981' },
        'closed': { normalized: 'done', category: 'Closed', color: '10B981' },
        'resolved': { normalized: 'done', category: 'Resolved', color: '10B981' },
        'finished': { normalized: 'done', category: 'Finished', color: '10B981' },

        'blocked': { normalized: 'blocked', category: 'Blocked', color: 'EF4444' },
        'stuck': { normalized: 'blocked', category: 'Stuck', color: 'EF4444' },
        'on hold': { normalized: 'blocked', category: 'On Hold', color: 'EF4444' },
        'waiting': { normalized: 'blocked', category: 'Waiting', color: 'EF4444' },
        'impediment': { normalized: 'blocked', category: 'Impediment', color: 'EF4444' }
      },
      monday: {
        'working on it': { normalized: 'inprogress', category: 'Working', color: 'FDBA13' },
        'done': { normalized: 'done', category: 'Done', color: '00C875' },
        'stuck': { normalized: 'blocked', category: 'Stuck', color: 'E2445C' },
        'waiting for review': { normalized: 'inprogress', category: 'Review', color: '579BFC' },
        'approved': { normalized: 'done', category: 'Approved', color: '00C875' },
        'not started': { normalized: 'todo', category: 'Not Started', color: 'C4C4C4' }
      },
      trofos: {
        'new': { normalized: 'todo', category: 'New', color: '6B7280' },
        'assigned': { normalized: 'todo', category: 'Assigned', color: '8B5CF6' },
        'in progress': { normalized: 'inprogress', category: 'In Progress', color: '3B82F6' },
        'completed': { normalized: 'done', category: 'Completed', color: '10B981' },
        'on hold': { normalized: 'blocked', category: 'On Hold', color: 'F59E0B' }
      }
    };

    // Priority Mappings
    this.priorityMappings = {
      jira: {
        'lowest': { normalized: 'low', numeric: 1 },
        'low': { normalized: 'low', numeric: 2 },
        'medium': { normalized: 'medium', numeric: 3 },
        'high': { normalized: 'high', numeric: 4 },
        'highest': { normalized: 'critical', numeric: 5 },
        'critical': { normalized: 'critical', numeric: 5 },
        'blocker': { normalized: 'critical', numeric: 5 }
      },
      monday: {
        'low': { normalized: 'low', numeric: 1 },
        'medium': { normalized: 'medium', numeric: 3 },
        'high': { normalized: 'high', numeric: 4 },
        'critical': { normalized: 'critical', numeric: 5 },
        'urgent': { normalized: 'critical', numeric: 5 }
      },
      trofos: {
        'p4': { normalized: 'low', numeric: 1 },
        'p3': { normalized: 'medium', numeric: 3 },
        'p2': { normalized: 'high', numeric: 4 },
        'p1': { normalized: 'critical', numeric: 5 },
        'p0': { normalized: 'critical', numeric: 5 }
      }
    };
  }

  /**
   * Normalize status based on platform
   */
  private normalizeStatus(status: string, platform: string): { normalized: string; category: string; color: string } {
    const platformMappings = this.statusMappings[platform.toLowerCase()];
    if (!platformMappings) {
      return { normalized: 'todo', category: 'Unknown', color: '9CA3AF' };
    }

    const normalizedStatus = status.toLowerCase().trim();
    const mapping = platformMappings[normalizedStatus];

    if (mapping) {
      return mapping;
    }

    // Fallback logic for unmapped statuses
    if (normalizedStatus.includes('done') || normalizedStatus.includes('complete') || normalizedStatus.includes('close')) {
      return { normalized: 'done', category: 'Complete', color: '10B981' };
    } else if (normalizedStatus.includes('progress') || normalizedStatus.includes('develop') || normalizedStatus.includes('work')) {
      return { normalized: 'inprogress', category: 'In Progress', color: '3B82F6' };
    } else if (normalizedStatus.includes('block') || normalizedStatus.includes('stuck') || normalizedStatus.includes('wait')) {
      return { normalized: 'blocked', category: 'Blocked', color: 'EF4444' };
    } else {
      return { normalized: 'todo', category: 'To Do', color: '6B7280' };
    }
  }

  /**
   * Normalize priority based on platform
   */
  private normalizePriority(priority: string, platform: string): { normalized: string; numeric: number } {
    const platformMappings = this.priorityMappings[platform.toLowerCase()];
    if (!platformMappings) {
      return { normalized: 'medium', numeric: 3 };
    }

    const normalizedPriority = priority.toLowerCase().trim();
    const mapping = platformMappings[normalizedPriority];

    return mapping || { normalized: 'medium', numeric: 3 };
  }

  /**
   * Extract real team members from platform data
   */
  private extractTeamMembers(rawData: any, platform: string): ProjectData['team'] {
    const teamMembers = new Set<string>();
    const teamMap = new Map<string, any>();

    // Extract from tasks/issues
    if (rawData.issues || rawData.tasks || rawData.items) {
      const items = rawData.issues || rawData.tasks || rawData.items || [];
      items.forEach((item: any) => {
        let assignee = null;

        // Platform-specific assignee extraction
        switch (platform.toLowerCase()) {
          case 'jira':
            assignee = item.assignee?.displayName || item.assignee?.name;
            if (assignee && item.assignee) {
              teamMap.set(assignee, {
                id: item.assignee.accountId || item.assignee.key,
                name: assignee,
                role: 'Team Member',
                email: item.assignee.emailAddress,
                avatar: item.assignee.avatarUrls?.['48x48']
              });
            }
            break;

          case 'monday':
            // Monday.com might have assignee as string or object
            if (typeof item.assignee === 'string') {
              assignee = item.assignee;
            } else if (item.assignee?.name) {
              assignee = item.assignee.name;
            }
            if (assignee) {
              teamMap.set(assignee, {
                name: assignee,
                role: 'Team Member'
              });
            }
            break;

          case 'trofos':
            assignee = item.assignedTo || item.assignee;
            if (assignee) {
              teamMap.set(assignee, {
                name: assignee,
                role: 'Team Member'
              });
            }
            break;
        }

        if (assignee && assignee !== 'Unassigned' && !assignee.startsWith('User')) {
          teamMembers.add(assignee);
        }
      });
    }

    // Extract from dedicated team/members field
    if (rawData.team || rawData.members || rawData.users) {
      const teamArray = rawData.team || rawData.members || rawData.users || [];
      teamArray.forEach((member: any) => {
        const name = member.displayName || member.name || member.username;
        if (name && !name.startsWith('User')) {
          teamMap.set(name, {
            id: member.id || member.accountId || member.key,
            name: name,
            role: member.role || member.jobTitle || 'Team Member',
            email: member.email || member.emailAddress,
            avatar: member.avatar || member.avatarUrls?.['48x48'],
            department: member.department,
            skills: member.skills || []
          });
        }
      });
    }

    return Array.from(teamMap.values()).filter(member =>
      member.name && !member.name.startsWith('User')
    );
  }

  /**
   * Extract real metrics from platform data
   */
  private extractPlatformMetrics(rawData: any, platform: string): ProjectData['metrics'] {
    const metrics: ProjectData['metrics'] = [];

    switch (platform.toLowerCase()) {
      case 'jira':
        if (rawData.total !== undefined) metrics.push({ name: 'Total Issues', value: rawData.total, type: 'count' });
        if (rawData.openIssues !== undefined) metrics.push({ name: 'Open Issues', value: rawData.openIssues, type: 'count' });
        if (rawData.closedIssues !== undefined) metrics.push({ name: 'Closed Issues', value: rawData.closedIssues, type: 'count' });
        if (rawData.velocity !== undefined) metrics.push({ name: 'Velocity', value: rawData.velocity, type: 'points' });
        if (rawData.projectKey) metrics.push({ name: 'Project Key', value: rawData.projectKey, type: 'text' });
        if (rawData.issueTypes) metrics.push({ name: 'Issue Types', value: rawData.issueTypes.length, type: 'count' });
        break;

      case 'monday':
        if (rawData.itemsCount !== undefined) metrics.push({ name: 'Total Items', value: rawData.itemsCount, type: 'count' });
        if (rawData.boardId) metrics.push({ name: 'Board ID', value: rawData.boardId, type: 'text' });
        if (rawData.groups) metrics.push({ name: 'Groups', value: rawData.groups.length, type: 'count' });
        if (rawData.columns) metrics.push({ name: 'Columns', value: rawData.columns.length, type: 'count' });
        if (rawData.automations !== undefined) metrics.push({ name: 'Automations', value: rawData.automations, type: 'count' });
        break;

      case 'trofos':
        if (rawData.modules) metrics.push({ name: 'Modules', value: rawData.modules.length, type: 'count' });
        if (rawData.projectType) metrics.push({ name: 'Project Type', value: rawData.projectType, type: 'text' });
        if (rawData.integrations) metrics.push({ name: 'Integrations', value: rawData.integrations.length, type: 'count' });
        break;
    }

    // Add calculated metrics
    const tasks = this.extractTasks(rawData, platform);
    const completedTasks = tasks.filter(task => {
      const normalized = this.normalizeStatus(task.status, platform);
      return normalized.normalized === 'done';
    }).length;

    if (tasks.length > 0) {
      metrics.push({
        name: 'Completion Rate',
        value: `${Math.round((completedTasks / tasks.length) * 100)}%`,
        type: 'percentage'
      });
    }

    return metrics;
  }

  /**
   * Extract tasks with real platform data
   */
  private extractTasks(rawData: any, platform: string): ProjectData['tasks'] {
    let items = [];

    // Get items based on platform structure
    switch (platform.toLowerCase()) {
      case 'jira':
        items = rawData.issues || rawData.tasks || [];
        break;
      case 'monday':
        items = rawData.items || rawData.tasks || [];
        break;
      case 'trofos':
        items = rawData.tasks || rawData.items || [];
        break;
      default:
        items = rawData.tasks || rawData.items || rawData.issues || [];
    }

    return items.map((item: any, index: number) => {
      // Platform-specific field mapping
      let task: ProjectData['tasks'][0] = {
        id: item.id || item.key || `${platform}_${index}`,
        name: '',
        status: 'Unknown'
      };

      switch (platform.toLowerCase()) {
        case 'jira':
          task = {
            id: item.id || item.key,
            name: item.summary || item.title || 'Unnamed Issue',
            status: item.status?.name || item.status || 'Unknown',
            assignee: item.assignee?.displayName || item.assignee?.name || 'Unassigned',
            priority: item.priority?.name || item.priority,
            created: item.created,
            updated: item.updated,
            description: item.description,
            labels: item.labels || [],
            storyPoints: item.storyPoints || item.customfield_10016, // Common story points field
            timeEstimate: item.timeoriginalestimate
          };
          break;

        case 'monday':
          task = {
            id: item.id,
            name: item.name || 'Unnamed Item',
            status: item.status || 'Not Started',
            assignee: item.assignee || 'Unassigned',
            priority: item.priority,
            created: item.created_at,
            updated: item.updated_at,
            description: item.description
          };
          break;

        case 'trofos':
          task = {
            id: item.id,
            name: item.title || item.name || 'Unnamed Task',
            status: item.status || 'New',
            assignee: item.assignedTo || item.assignee || 'Unassigned',
            priority: item.priority,
            created: item.createdDate,
            updated: item.lastModified,
            description: item.description
          };
          break;
      }

      // Ensure no mock data leaks through
      if (task.assignee && task.assignee.startsWith('User')) {
        task.assignee = 'Unassigned';
      }

      return task;
    }).filter(task => task.name && task.name.length > 0);
  }

  /**
   * Extract sprint data from platform
   */
  private extractSprints(rawData: any, platform: string): ProjectData['sprints'] {
    const sprints: ProjectData['sprints'] = [];

    switch (platform.toLowerCase()) {
      case 'jira':
        if (rawData.sprints) {
          rawData.sprints.forEach((sprint: any) => {
            sprints.push({
              name: sprint.name || `Sprint ${sprint.id}`,
              startDate: sprint.startDate || new Date().toISOString(),
              endDate: sprint.endDate || new Date().toISOString(),
              completed: sprint.completedIssuesEstimateSum ?
                `${Math.round((sprint.completedIssuesEstimateSum / (sprint.issuesEstimateSum || 1)) * 100)}%` : '0%',
              velocity: sprint.completedIssuesEstimateSum || 0,
              plannedPoints: sprint.issuesEstimateSum || 0,
              completedPoints: sprint.completedIssuesEstimateSum || 0
            });
          });
        }
        break;

      case 'monday':
        // Monday.com doesn't have traditional sprints, but we can create from timeline
        if (rawData.timeline || rawData.milestones) {
          const timeline = rawData.timeline || rawData.milestones || [];
          timeline.forEach((milestone: any, index: number) => {
            sprints.push({
              name: milestone.title || `Milestone ${index + 1}`,
              startDate: milestone.start_date || new Date().toISOString(),
              endDate: milestone.end_date || new Date().toISOString(),
              completed: milestone.completion || '0%'
            });
          });
        }
        break;

      case 'trofos':
        if (rawData.iterations || rawData.phases) {
          const iterations = rawData.iterations || rawData.phases || [];
          iterations.forEach((iteration: any) => {
            sprints.push({
              name: iteration.name || iteration.title,
              startDate: iteration.startDate || new Date().toISOString(),
              endDate: iteration.endDate || new Date().toISOString(),
              completed: iteration.completionPercentage ? `${iteration.completionPercentage}%` : '0%'
            });
          });
        }
        break;
    }

    return sprints;
  }

  /**
   * Calculate data quality metrics
   */
  private calculateDataQuality(projectData: ProjectData): ProjectData['dataQuality'] {
    const tasks = projectData.tasks || [];
    const team = projectData.team || [];

    // Completeness: percentage of tasks with all required fields
    const completeTasksCount = tasks.filter(task =>
      task.name && task.status && task.assignee && task.assignee !== 'Unassigned'
    ).length;
    const completeness = tasks.length > 0 ? Math.round((completeTasksCount / tasks.length) * 100) : 0;

    // Accuracy: percentage of tasks with valid assignees from team
    const teamNames = new Set(team.map(t => t.name));
    const accurateTasksCount = tasks.filter(task =>
      !task.assignee || task.assignee === 'Unassigned' || teamNames.has(task.assignee)
    ).length;
    const accuracy = tasks.length > 0 ? Math.round((accurateTasksCount / tasks.length) * 100) : 0;

    // Freshness: percentage of tasks updated in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const freshTasksCount = tasks.filter(task =>
      task.updated && new Date(task.updated) > thirtyDaysAgo
    ).length;
    const freshness = tasks.length > 0 ? Math.round((freshTasksCount / tasks.length) * 100) : 0;

    return { completeness, accuracy, freshness };
  }

  /**
   * Enhanced fetch project data with better transformation
   */
  async fetchProjectData(config: ReportGenerationConfig): Promise<ProjectData> {
    try {
      logger.info('Fetching enhanced project data', {
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

      // Enhanced data transformation and validation
      projectData = this.enhanceProjectData(projectData, config.platform);

      // Calculate data quality
      projectData.dataQuality = this.calculateDataQuality(projectData);

      logger.info('Enhanced project data fetched successfully', {
        platform: projectData.platform,
        taskCount: projectData.tasks?.length || 0,
        teamSize: projectData.team?.length || 0,
        dataQuality: projectData.dataQuality,
        fallbackData: projectData.fallbackData || false
      });

      return projectData;

    } catch (error: any) {
      logger.error('Failed to fetch enhanced project data:', {
        platform: config.platform,
        connectionId: config.connectionId,
        error: error.message
      });

      // Return enhanced fallback data instead of empty data
      return this.getEnhancedFallbackProjectData(config);
    }
  }

  /**
   * Enhanced Jira data fetching
   */
  private async fetchJiraProjectData(config: ReportGenerationConfig): Promise<ProjectData> {
    const possibleUrls = [
      `/api/connections/${config.connectionId}/projects/${config.projectId}`,
      `/api/connections/${config.connectionId}/jira/projects/${config.projectId}`,
      `/api/platform-integrations/connections/${config.connectionId}/projects/${config.projectId}`,
      `/api/jira/projects/${config.projectId}?connectionId=${config.connectionId}`
    ];

    let lastError: any;

    for (const url of possibleUrls) {
      try {
        logger.info(`Trying enhanced Jira API endpoint: ${url}`);
        const response: AxiosResponse = await this.httpClient.get(`${this.PLATFORM_INTEGRATIONS_URL}${url}`);

        if (response.status === 200 && response.data) {
          const jiraData = response.data;

          return {
            id: config.projectId,
            name: jiraData.name || jiraData.displayName || `Jira Project ${config.projectId}`,
            platform: 'jira',
            tasks: this.extractTasks(jiraData, 'jira'),
            team: this.extractTeamMembers(jiraData, 'jira'),
            metrics: this.extractPlatformMetrics(jiraData, 'jira'),
            sprints: this.extractSprints(jiraData, 'jira'),
            platformSpecific: {
              jira: {
                projectKey: jiraData.key,
                issueTypes: jiraData.issueTypes || [],
                workflows: jiraData.workflows || [],
                components: jiraData.components || [],
                versions: jiraData.versions || []
              }
            },
            lastUpdated: new Date().toISOString(),
            fallbackData: false
          };
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Enhanced Jira API endpoint failed: ${url}`, {
          status: error.response?.status,
          message: error.message
        });
        continue;
      }
    }

    throw lastError || new Error('All enhanced Jira API endpoints failed');
  }

  /**
   * Enhanced Monday.com data fetching
   */
  private async fetchMondayBoardData(config: ReportGenerationConfig): Promise<ProjectData> {
    const possibleUrls = [
      `/api/connections/${config.connectionId}/projects/${config.projectId}`,
      `/api/connections/${config.connectionId}/monday/boards/${config.projectId}`,
      `/api/platform-integrations/connections/${config.connectionId}/boards/${config.projectId}`,
      `/api/monday/boards/${config.projectId}?connectionId=${config.connectionId}`
    ];

    let lastError: any;

    for (const url of possibleUrls) {
      try {
        logger.info(`Trying enhanced Monday.com API endpoint: ${url}`);
        const response: AxiosResponse = await this.httpClient.get(`${this.PLATFORM_INTEGRATIONS_URL}${url}`);

        if (response.status === 200 && response.data) {
          const mondayData = response.data;

          return {
            id: config.projectId,
            name: mondayData.name || `Monday Board ${config.projectId}`,
            platform: 'monday',
            tasks: this.extractTasks(mondayData, 'monday'),
            team: this.extractTeamMembers(mondayData, 'monday'),
            metrics: this.extractPlatformMetrics(mondayData, 'monday'),
            sprints: this.extractSprints(mondayData, 'monday'),
            platformSpecific: {
              monday: {
                boardId: mondayData.id,
                groups: mondayData.groups || [],
                columns: mondayData.columns || [],
                automations: mondayData.automations || 0
              }
            },
            lastUpdated: new Date().toISOString(),
            fallbackData: false
          };
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Enhanced Monday.com API endpoint failed: ${url}`, {
          status: error.response?.status,
          message: error.message
        });
        continue;
      }
    }

    throw lastError || new Error('All enhanced Monday.com API endpoints failed');
  }

  /**
   * Enhanced TROFOS data fetching
   */
  private async fetchTrofosProjectData(config: ReportGenerationConfig): Promise<ProjectData> {
    const possibleUrls = [
      `/api/connections/${config.connectionId}/projects/${config.projectId}`,
      `/api/connections/${config.connectionId}/trofos/projects/${config.projectId}`,
      `/api/platform-integrations/connections/${config.connectionId}/trofos/${config.projectId}`,
      `/api/trofos/projects/${config.projectId}?connectionId=${config.connectionId}`
    ];

    let lastError: any;

    for (const url of possibleUrls) {
      try {
        logger.info(`Trying enhanced TROFOS API endpoint: ${url}`);
        const response: AxiosResponse = await this.httpClient.get(`${this.PLATFORM_INTEGRATIONS_URL}${url}`);

        if (response.status === 200 && response.data) {
          const trofosData = response.data;

          return {
            id: config.projectId,
            name: trofosData.name || trofosData.title || `TROFOS Project ${config.projectId}`,
            platform: 'trofos',
            tasks: this.extractTasks(trofosData, 'trofos'),
            team: this.extractTeamMembers(trofosData, 'trofos'),
            metrics: this.extractPlatformMetrics(trofosData, 'trofos'),
            sprints: this.extractSprints(trofosData, 'trofos'),
            platformSpecific: {
              trofos: {
                projectType: trofosData.projectType,
                modules: trofosData.modules || [],
                integrations: trofosData.integrations || []
              }
            },
            lastUpdated: new Date().toISOString(),
            fallbackData: false
          };
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Enhanced TROFOS API endpoint failed: ${url}`, {
          status: error.response?.status,
          message: error.message
        });
        continue;
      }
    }

    throw lastError || new Error('All enhanced TROFOS API endpoints failed');
  }

  /**
   * Enhance project data with additional processing
   */
  private enhanceProjectData(projectData: ProjectData, platform: string): ProjectData {
    // Normalize all statuses and priorities
    if (projectData.tasks) {
      projectData.tasks = projectData.tasks.map(task => {
        const statusInfo = this.normalizeStatus(task.status, platform);
        const priorityInfo = task.priority ? this.normalizePriority(task.priority, platform) : null;

        return {
          ...task,
          status: statusInfo.category, // Use the display category
          priority: priorityInfo ? priorityInfo.normalized : task.priority
        };
      });
    }

    // Ensure team members have roles
    if (projectData.team) {
      projectData.team = projectData.team.map(member => ({
        ...member,
        role: member.role || 'Team Member'
      }));
    }

    // Add derived metrics
    const additionalMetrics = this.calculateDerivedMetrics(projectData);
    projectData.metrics = [...(projectData.metrics || []), ...additionalMetrics];

    return projectData;
  }

  /**
   * Calculate derived metrics from project data
   */
  private calculateDerivedMetrics(projectData: ProjectData): ProjectData['metrics'] {
    const metrics: ProjectData['metrics'] = [];
    const tasks = projectData.tasks || [];
    const team = projectData.team || [];

    // Task distribution metrics
    const statusCounts = new Map<string, number>();
    tasks.forEach(task => {
      const count = statusCounts.get(task.status) || 0;
      statusCounts.set(task.status, count + 1);
    });

    statusCounts.forEach((count, status) => {
      const percentage = Math.round((count / tasks.length) * 100);
      metrics.push({
        name: `${status} Tasks`,
        value: `${count} (${percentage}%)`,
        type: 'distribution'
      });
    });

    // Team productivity metrics
    const assigneeMap = new Map<string, number>();
    tasks.forEach(task => {
      if (task.assignee && task.assignee !== 'Unassigned') {
        const count = assigneeMap.get(task.assignee) || 0;
        assigneeMap.set(task.assignee, count + 1);
      }
    });

    const unassignedTasks = tasks.filter(task => !task.assignee || task.assignee === 'Unassigned').length;
    if (unassignedTasks > 0) {
      metrics.push({
        name: 'Unassigned Tasks',
        value: unassignedTasks,
        type: 'count'
      });
    }

    // Average tasks per team member
    if (team.length > 0) {
      const avgTasksPerMember = Math.round(tasks.length / team.length);
      metrics.push({
        name: 'Avg Tasks per Member',
        value: avgTasksPerMember,
        type: 'average'
      });
    }

    // Most productive team member
    if (assigneeMap.size > 0) {
      const topContributor = Array.from(assigneeMap.entries()).sort(([, a], [, b]) => b - a)[0];
      metrics.push({
        name: 'Top Contributor',
        value: `${topContributor[0]} (${topContributor[1]} tasks)`,
        type: 'text'
      });
    }

    return metrics;
  }

  /**
   * Generate enhanced realistic fallback data
   */
  private getEnhancedFallbackProjectData(config: ReportGenerationConfig): ProjectData {
    logger.warn('Using enhanced fallback data for report generation', {
      platform: config.platform,
      projectId: config.projectId
    });

    // Platform-specific realistic demo data
    const platformTeams = {
      jira: [
        { name: 'Sarah Chen', role: 'Product Manager', email: 'sarah.chen@company.com', skills: ['Product Strategy', 'Agile'] },
        { name: 'Marcus Johnson', role: 'Senior Developer', email: 'marcus.j@company.com', skills: ['Java', 'Spring Boot', 'Microservices'] },
        { name: 'Elena Rodriguez', role: 'Frontend Developer', email: 'elena.r@company.com', skills: ['React', 'TypeScript', 'UI/UX'] },
        { name: 'David Kim', role: 'QA Engineer', email: 'david.kim@company.com', skills: ['Test Automation', 'Selenium', 'Performance Testing'] },
        { name: 'Lisa Wang', role: 'DevOps Engineer', email: 'lisa.wang@company.com', skills: ['Docker', 'Kubernetes', 'CI/CD'] }
      ],
      monday: [
        { name: 'Alex Thompson', role: 'Project Manager', email: 'alex.t@company.com', skills: ['Project Management', 'Scrum'] },
        { name: 'Maya Patel', role: 'Designer', email: 'maya.p@company.com', skills: ['UI Design', 'Figma', 'User Research'] },
        { name: 'James Wilson', role: 'Backend Developer', email: 'james.w@company.com', skills: ['Node.js', 'MongoDB', 'APIs'] },
        { name: 'Sofia Garcia', role: 'Marketing Specialist', email: 'sofia.g@company.com', skills: ['Digital Marketing', 'Analytics'] }
      ],
      trofos: [
        { name: 'Robert Chang', role: 'Technical Lead', email: 'robert.c@company.com', skills: ['Architecture', 'Leadership'] },
        { name: 'Jennifer Lee', role: 'Full Stack Developer', email: 'jennifer.l@company.com', skills: ['React', 'Python', 'AWS'] },
        { name: 'Ahmed Hassan', role: 'Data Analyst', email: 'ahmed.h@company.com', skills: ['SQL', 'Python', 'Data Visualization'] }
      ]
    };

    const platformTasks = {
      jira: [
        { name: 'Implement user authentication system', status: 'In Progress', assignee: 'Marcus Johnson', priority: 'High' },
        { name: 'Design responsive dashboard layout', status: 'Done', assignee: 'Elena Rodriguez', priority: 'Medium' },
        { name: 'Set up automated testing pipeline', status: 'In Progress', assignee: 'David Kim', priority: 'High' },
        { name: 'Configure production deployment', status: 'To Do', assignee: 'Lisa Wang', priority: 'Medium' },
        { name: 'Conduct user acceptance testing', status: 'Done', assignee: 'David Kim', priority: 'Low' },
        { name: 'Optimize database queries', status: 'In Progress', assignee: 'Marcus Johnson', priority: 'Medium' },
        { name: 'Create API documentation', status: 'To Do', assignee: 'Marcus Johnson', priority: 'Low' },
        { name: 'Implement error handling', status: 'Done', assignee: 'Elena Rodriguez', priority: 'Medium' }
      ],
      monday: [
        { name: 'Launch product marketing campaign', status: 'Working on it', assignee: 'Sofia Garcia', priority: 'High' },
        { name: 'Finalize brand guidelines', status: 'Done', assignee: 'Maya Patel', priority: 'Medium' },
        { name: 'Develop mobile app prototype', status: 'Working on it', assignee: 'James Wilson', priority: 'High' },
        { name: 'Plan Q4 product roadmap', status: 'Not Started', assignee: 'Alex Thompson', priority: 'Medium' },
        { name: 'Conduct competitor analysis', status: 'Done', assignee: 'Sofia Garcia', priority: 'Low' },
        { name: 'Design user onboarding flow', status: 'Working on it', assignee: 'Maya Patel', priority: 'High' }
      ],
      trofos: [
        { name: 'Migrate legacy system to cloud', status: 'In Progress', assignee: 'Robert Chang', priority: 'Critical' },
        { name: 'Implement real-time analytics dashboard', status: 'In Progress', assignee: 'Jennifer Lee', priority: 'High' },
        { name: 'Analyze customer behavior patterns', status: 'Completed', assignee: 'Ahmed Hassan', priority: 'Medium' },
        { name: 'Optimize system performance', status: 'New', assignee: 'Robert Chang', priority: 'High' },
        { name: 'Create data backup strategy', status: 'On Hold', assignee: 'Jennifer Lee', priority: 'Medium' }
      ]
    };

    const team = platformTeams[config.platform as keyof typeof platformTeams] || platformTeams.jira;
    const tasks = platformTasks[config.platform as keyof typeof platformTasks] || platformTasks.jira;

    // Add realistic timestamps
    const now = new Date();
    const enhancedTasks = tasks.map((task, index) => ({
      id: `${config.platform}_demo_${index + 1}`,
      ...task,
      created: new Date(now.getTime() - (30 - index) * 24 * 60 * 60 * 1000).toISOString(),
      updated: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: `Detailed description for ${task.name.toLowerCase()}`,
      labels: ['demo', config.platform, 'enhancement']
    }));

    // Platform-specific sprints
    const sprints = [
      {
        name: 'Sprint 1 - Foundation',
        startDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed: '95%',
        velocity: 23,
        plannedPoints: 25,
        completedPoints: 23
      },
      {
        name: 'Sprint 2 - Development',
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed: '72%',
        velocity: 18,
        plannedPoints: 25,
        completedPoints: 18
      }
    ];

    // Enhanced platform-specific metrics
    const baseMetrics = [
      { name: 'Total Tasks', value: enhancedTasks.length, type: 'count' },
      { name: 'Team Size', value: team.length, type: 'count' },
      { name: 'Active Sprints', value: 1, type: 'count' },
      { name: 'Platform', value: config.platform.toUpperCase(), type: 'text' }
    ];

    // Platform-specific additional metrics
    const platformSpecificMetrics = {
      jira: [
        { name: 'Story Points Completed', value: 41, type: 'points' },
        { name: 'Issue Types', value: 4, type: 'count' },
        { name: 'Project Key', value: 'DEMO', type: 'text' },
        { name: 'Velocity', value: '20.5 points/sprint', type: 'text' }
      ],
      monday: [
        { name: 'Board Items', value: enhancedTasks.length, type: 'count' },
        { name: 'Automations', value: 3, type: 'count' },
        { name: 'Status Columns', value: 4, type: 'count' },
        { name: 'Groups', value: 2, type: 'count' }
      ],
      trofos: [
        { name: 'Project Modules', value: 3, type: 'count' },
        { name: 'Integrations', value: 2, type: 'count' },
        { name: 'Project Type', value: 'Enterprise', type: 'text' },
        { name: 'Phase', value: 'Development', type: 'text' }
      ]
    };

    const allMetrics = [
      ...baseMetrics,
      ...(platformSpecificMetrics[config.platform as keyof typeof platformSpecificMetrics] || [])
    ];

    const enhancedProjectData: ProjectData = {
      id: config.projectId,
      name: `${config.platform.toUpperCase()} Demo Project - Enhanced Analytics`,
      platform: config.platform,
      tasks: enhancedTasks,
      team: team.map((member, index) => ({
        id: `demo_${index + 1}`,
        ...member
      })),
      metrics: allMetrics,
      sprints: sprints,
      platformSpecific: this.generatePlatformSpecificData(config.platform),
      fallbackData: true,
      lastUpdated: now.toISOString(),
      dataQuality: {
        completeness: 95,
        accuracy: 98,
        freshness: 85
      }
    };

    return enhancedProjectData;
  }

  /**
   * Generate platform-specific demo data
   */
  private generatePlatformSpecificData(platform: string): ProjectData['platformSpecific'] {
    switch (platform.toLowerCase()) {
      case 'jira':
        return {
          jira: {
            projectKey: 'DEMO',
            issueTypes: ['Story', 'Bug', 'Task', 'Epic'],
            workflows: [
              { name: 'Default Workflow', steps: ['To Do', 'In Progress', 'Code Review', 'Testing', 'Done'] }
            ],
            components: ['Frontend', 'Backend', 'Database', 'API'],
            versions: ['v1.0.0', 'v1.1.0', 'v2.0.0-beta']
          }
        };

      case 'monday':
        return {
          monday: {
            boardId: 'demo_board_123',
            groups: [
              { id: 'group1', title: 'Development Tasks', color: '#0086c0' },
              { id: 'group2', title: 'Testing & QA', color: '#00c875' }
            ],
            columns: [
              { id: 'status', title: 'Status', type: 'color' },
              { id: 'person', title: 'Assignee', type: 'person' },
              { id: 'date', title: 'Due Date', type: 'date' },
              { id: 'priority', title: 'Priority', type: 'color' }
            ],
            automations: 3
          }
        };

      case 'trofos':
        return {
          trofos: {
            projectType: 'Enterprise Development',
            modules: ['Authentication', 'Analytics', 'Reporting'],
            integrations: ['LDAP', 'REST API']
          }
        };

      default:
        return {};
    }
  }

  /**
   * Validate and sanitize project data
   */
  private validateAndSanitizeProjectData(projectData: ProjectData, platform: string): ProjectData {
    // Ensure required fields
    projectData.id = projectData.id || 'unknown';
    projectData.name = projectData.name || `${platform} Project`;
    projectData.platform = platform;
    projectData.tasks = projectData.tasks || [];
    projectData.team = projectData.team || [];
    projectData.metrics = projectData.metrics || [];
    projectData.sprints = projectData.sprints || [];

    // Remove any mock data that might have leaked through
    projectData.tasks = projectData.tasks.filter(task =>
      task.name &&
      !task.name.includes('Mock') &&
      !task.name.includes('Example') &&
      (!task.assignee || !task.assignee.startsWith('User'))
    );

    projectData.team = projectData.team?.filter(member =>
      member.name &&
      !member.name.startsWith('User') &&
      !member.name.includes('Mock')
    ) || [];

    // Ensure data consistency
    if (projectData.tasks.length === 0) {
      logger.warn('No valid tasks found after sanitization', { platform, projectId: projectData.id });
    }

    if (projectData.team.length === 0) {
      logger.warn('No valid team members found after sanitization', { platform, projectId: projectData.id });
    }

    return projectData;
  }
}