// backend/services/platform-integrations-service/src/clients/JiraClient.ts
import axios, { AxiosInstance } from 'axios';
import { BaseClient, PlatformConnection, ProjectData, Metric } from './BaseClient';
import logger from '../utils/logger';

export class JiraClient extends BaseClient {
  private get domain(): string {
    // Normalize domain - remove protocol and trailing slashes
    let domain = this.connection.config.domain;
    if (!domain) throw new Error('Jira domain is required');
    
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '');
    
    // Remove trailing slashes and paths
    domain = domain.split('/')[0];
    
    // Ensure cloud domain format if it doesn't contain a dot
    if (!domain.includes('.') && !domain.endsWith('.atlassian.net')) {
      domain = `${domain}.atlassian.net`;
    }
    
    return domain.trim();
  }

  private get email(): string {
    const email = this.connection.config.email;
    if (!email) throw new Error('Jira email is required');
    return email.trim();
  }

  private get apiToken(): string {
    const token = this.connection.config.apiToken;
    if (!token) throw new Error('Jira API token is required');
    return token.trim();
  }

  private get projectKey(): string {
    const key = this.connection.config.projectKey;
    if (!key) throw new Error('Jira project key is required');
    return key.trim().toUpperCase();
  }

  constructor(connection: PlatformConnection) {
    super(connection);
    
    // Set up Jira-specific HTTP client configuration
    const domain = this.domain;
    this.http.defaults.baseURL = `https://${domain}/rest/api/3`;
    
    // Create Basic Auth header
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    this.http.defaults.headers['Authorization'] = `Basic ${auth}`;
    
    // Add Jira-specific headers
    this.http.defaults.headers['Accept'] = 'application/json';
    this.http.defaults.headers['Content-Type'] = 'application/json';
    
    logger.info('Jira client initialized', { 
      domain, 
      email: this.email,
      projectKey: this.projectKey 
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Jira connection...');
      
      // Test authentication by calling /myself endpoint
      const response = await this.http.get('/myself');
      
      if (response.status === 200 && response.data?.emailAddress) {
        logger.info('Jira authentication successful', { 
          userEmail: response.data.emailAddress,
          displayName: response.data.displayName 
        });
        return true;
      } else {
        logger.warn('Jira authentication response missing expected fields', response.data);
        return false;
      }
    } catch (error) {
      logger.error('Jira connection test failed:', {
        error: (error as Error).message,
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText,
        data: (error as any).response?.data
      });
      
      // Re-throw with more specific error information
      if ((error as any).response?.status === 401) {
        throw new Error('Invalid email or API token');
      } else if ((error as any).response?.status === 403) {
        throw new Error('API token does not have sufficient permissions');
      } else if ((error as any).response?.status === 404) {
        throw new Error('Jira instance not found. Please check your domain');
      } else if ((error as any).code === 'ENOTFOUND') {
        throw new Error(`Cannot resolve domain '${this.domain}'. Please check your Jira domain`);
      } else if ((error as any).code === 'ECONNREFUSED') {
        throw new Error('Connection refused. Please check your domain and internet connection');
      } else {
        throw new Error(`Connection test failed: ${(error as Error).message}`);
      }
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    try {
      logger.info('Fetching Jira project data...');
      
      // Get project details
      const projectResponse = await this.http.get(`/project/${this.projectKey}`);
      const project = projectResponse.data;

      // Get issues for the project with pagination
      const searchResponse = await this.http.get('/search', {
        params: {
          jql: `project = ${this.projectKey}`,
          fields: 'summary,status,assignee,priority,created,updated,labels,issuetype',
          maxResults: 100,
          startAt: 0
        }
      });

      const issues = searchResponse.data.issues || [];
      
      // Transform issues to tasks
      const tasks = issues.map((issue: any) => ({
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
        tags: issue.fields.labels || [],
        dueDate: issue.fields.duedate
      }));

      // Calculate comprehensive metrics
      const statusCounts = issues.reduce((acc: any, issue: any) => {
        const status = issue.fields.status?.name || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const priorityCounts = issues.reduce((acc: any, issue: any) => {
        const priority = issue.fields.priority?.name || 'None';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {});

      const typeCounts = issues.reduce((acc: any, issue: any) => {
        const type = issue.fields.issuetype?.name || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      // Create metrics array
      const metrics: Metric[] = [
        { name: 'Total Issues', value: issues.length },
        { name: 'To Do', value: statusCounts['To Do'] || 0 },
        { name: 'In Progress', value: statusCounts['In Progress'] || 0 },
        { name: 'Done', value: statusCounts['Done'] || 0 },
        { name: 'High Priority', value: priorityCounts['High'] || priorityCounts['Highest'] || 0 },
        { name: 'Stories', value: typeCounts['Story'] || 0 },
        { name: 'Bugs', value: typeCounts['Bug'] || 0 },
        { name: 'Tasks', value: typeCounts['Task'] || 0 }
      ];

      // Get unique assignees for team data
      const uniqueAssignees = new Map();
      issues.forEach((issue: any) => {
        if (issue.fields.assignee) {
          const assignee = issue.fields.assignee;
          if (!uniqueAssignees.has(assignee.accountId)) {
            uniqueAssignees.set(assignee.accountId, {
              id: assignee.accountId,
              name: assignee.displayName,
              email: assignee.emailAddress,
              role: 'Developer', // Default role since Jira doesn't provide this
              avatar: assignee.avatarUrls?.['32x32']
            });
          }
        }
      });

      const team = Array.from(uniqueAssignees.values());

      const projectData: ProjectData = {
        id: project.key,
        name: project.name,
        description: project.description,
        status: 'active',
        tasks,
        metrics,
        team
      };

      logger.info('Jira project data fetched successfully', {
        projectKey: project.key,
        issueCount: issues.length,
        teamSize: team.length
      });

      return [projectData];
    } catch (error) {
      logger.error('Failed to fetch Jira projects:', error);
      
      if ((error as any).response?.status === 404) {
        throw new Error(`Project '${this.projectKey}' not found or not accessible`);
      } else if ((error as any).response?.status === 403) {
        throw new Error(`No permission to access project '${this.projectKey}'`);
      } else if ((error as any).response?.status === 401) {
        throw new Error('Authentication failed. Please check your credentials');
      } else {
        throw new Error(`Failed to fetch projects from Jira: ${(error as Error).message}`);
      }
    }
  }

  async getProject(projectId: string): Promise<ProjectData> {
    // For Jira, project ID is the same as project key
    if (projectId !== this.projectKey) {
      throw new Error(`Project '${projectId}' does not match configured project '${this.projectKey}'`);
    }
    
    const projects = await this.getProjects();
    return projects[0]; // Jira client only returns one project
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    const project = await this.getProject(projectId);
    return project.metrics || [];
  }
}