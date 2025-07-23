// backend/services/platform-integrations-service/src/clients/JiraClient.ts

import { BaseClient } from './BaseClient';
import { PlatformConnection, ProjectData, Metric } from './BaseClient';
import logger from '../utils/logger';

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

  // ✅ KEEP THIS for backward compatibility
  private get configuredProjectKey(): string | undefined {
    return this.connection.config.projectKey;
  }

  constructor(connection: PlatformConnection) {
    super(connection);
    // ✅ Add validation
    if (!this.connection.config.domain || !this.connection.config.email || !this.connection.config.apiToken) {
      throw new Error('Missing required Jira configuration: domain, email, and apiToken are required');
    }

    this.http.defaults.baseURL = `https://${this.domain}/rest/api/3`;

    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    this.http.defaults.headers['Authorization'] = `Basic ${auth}`;
    this.http.defaults.headers['Accept'] = 'application/json';           // ✅ Add missing header
    this.http.defaults.headers['Content-Type'] = 'application/json';     // ✅ Add missing header
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.http.get('/myself');
      return response.status === 200 && !!response.data?.emailAddress;
    } catch (error) {
      logger.error('Jira connection test failed:', error);
      // For tests that expect thrown errors, throw them
      if ((error as any).response?.status === 401) {
        throw new Error('Authentication failed');
      }
      return false;
    }
  }

  // ✅ SAFE FIX: Try to get all projects, fallback to configured project
  async getProjects(): Promise<ProjectData[]> {
    try {
      logger.info('🔄 Fetching Jira projects');

      // First, try to get the configured project if it exists
      if (this.configuredProjectKey) {
        logger.info(`📋 Getting configured project: ${this.configuredProjectKey}`);
        try {
          const configuredProject = await this.getProject(this.configuredProjectKey);
          logger.info('✅ Successfully fetched configured project');
          return [configuredProject];
        } catch (error) {
          logger.warn(`⚠️ Failed to get configured project ${this.configuredProjectKey}, trying to fetch all projects:`, error);
        }
      }

      // If no configured project or it failed, try to get all accessible projects
      logger.info('📋 Fetching all accessible Jira projects');
      try {
        const projectsResponse = await this.http.get('/project/search?maxResults=50');
        const projects = projectsResponse.data.values || [];

        if (projects.length === 0) {
          logger.warn('No accessible Jira projects found');
          return [];
        }

        logger.info(`Found ${projects.length} accessible Jira projects`);

        // Transform first few projects to avoid timeout
        const projectDataPromises = projects.slice(0, 10).map(async (project: any) => {
          try {
            return await this.transformJiraProject(project);
          } catch (error) {
            logger.warn(`⚠️ Failed to process project ${project.key}:`, error);
            return null;
          }
        });

        const projectDataResults = await Promise.all(projectDataPromises);
        const validProjects = projectDataResults.filter(p => p !== null) as ProjectData[];

        logger.info(`✅ Successfully processed ${validProjects.length} Jira projects`);
        return validProjects;

      } catch (error: any) {
        logger.error('Failed to fetch all projects:', error);

        // Final fallback: if we have a configured project, try once more
        if (this.configuredProjectKey) {
          logger.info('🔄 Final fallback: trying configured project again');
          try {
            const fallbackProject = await this.getProject(this.configuredProjectKey);
            return [fallbackProject];
          } catch (fallbackError) {
            logger.error('All project fetching methods failed:', fallbackError);
          }
        }

        throw new Error(`Failed to fetch Jira projects: ${error.message}`);
      }

    } catch (error: any) {
      logger.error('Failed to fetch Jira projects:', error);
      throw new Error(`Failed to fetch Jira projects: ${error.message}`);
    }
  }

  // ✅ IMPROVED: Get specific project by projectId/key
  async getProject(projectId: string): Promise<ProjectData> {
    try {
      logger.info(`🎯 Fetching specific Jira project: ${projectId}`);

      // ✅ ADD THIS DEBUG LOG:
      console.log('🔍 DEBUG - JiraClient.getProject called:', {
        requestedProjectId: projectId,  // ← This should be different for different projects
        method: 'getProject'
      });

      // Get project details
      const projectResponse = await this.http.get(`/project/${projectId}`);
      const project = projectResponse.data;

      // Transform to ProjectData
      const projectData = await this.transformJiraProject(project);

      logger.info(`✅ Successfully fetched Jira project: ${project.name} (${project.key})`);
      return projectData;

    } catch (error: any) {
      logger.error(`Failed to fetch Jira project ${projectId}:`, error);

      if (error.response?.status === 404) {
        throw new Error(`Jira project '${projectId}' not found or not accessible`);
      } else if (error.response?.status === 403) {
        throw new Error(`No permission to access Jira project '${projectId}'`);
      } else if (error.response?.status === 401) {
        throw new Error(`Authentication failed for Jira project '${projectId}'. Please check your credentials.`);
      } else {
        throw new Error(`Failed to fetch Jira project: ${error.message}`);
      }
    }
  }

  // ✅ IMPROVED: Better error handling and logging
  private async transformJiraProject(jiraProject: any): Promise<ProjectData> {
    try {
      logger.info(`🔄 Transforming Jira project: ${jiraProject.key}`);

      // Get issues for this project with error handling
      let issues: any[] = [];
      try {
        const issuesResponse = await this.http.get('/search', {
          params: {
            jql: `project=${jiraProject.key}`,
            maxResults: 100,
            fields: 'summary,status,assignee,priority,created,updated,description,labels,components,issuelinks'
          }
        });
        issues = issuesResponse.data.issues || [];
        logger.info(`📋 Found ${issues.length} issues for project ${jiraProject.key}`);
      } catch (issueError) {
        logger.warn(`⚠️ Failed to get issues for project ${jiraProject.key}:`, issueError);
        // Continue without issues rather than failing completely
      }

      // Transform issues to tasks
      const tasks = issues.map((issue: any) => ({
        id: issue.key,
        title: issue.fields.summary,
        status: issue.fields.status?.name || 'Unknown',
        assignee: issue.fields.assignee ? {                     // ✅ Create TeamMember object
          id: issue.fields.assignee.accountId,
          name: issue.fields.assignee.displayName,
          email: issue.fields.assignee.emailAddress,
          role: 'Team Member',
          avatar: issue.fields.assignee.avatarUrls?.['32x32']
        } : undefined,
        priority: issue.fields.priority?.name || 'Medium',
        dueDate: issue.fields.duedate ? new Date(issue.fields.duedate) : undefined,  // ✅ Map to dueDate
        tags: issue.fields.labels || []                         // ✅ Changed to 'tags'
      }));

      // Extract unique assignees for team
      const uniqueAssignees = new Map();
      issues.forEach((issue: any) => {
        const assignee = issue.fields.assignee;
        if (assignee && !uniqueAssignees.has(assignee.accountId)) {
          uniqueAssignees.set(assignee.accountId, {
            id: assignee.accountId,
            name: assignee.displayName,
            role: 'Team Member',
            email: assignee.emailAddress,
            avatar: assignee.avatarUrls?.['32x32']
          });
        }
      });

      const team = Array.from(uniqueAssignees.values());

      // Calculate metrics
      const totalIssues = issues.length;
      const doneIssues = issues.filter((issue: any) =>
        issue.fields.status?.statusCategory?.key === 'done'
      ).length;
      const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

      const metrics = [
        { name: 'Total Issues', value: totalIssues, type: 'count' },
        { name: 'Completed Issues', value: doneIssues, type: 'count' },
        { name: 'Completion Rate', value: `${completionRate}%`, type: 'percentage' },
        { name: 'Team Size', value: team.length, type: 'count' }
      ];

      const projectData: ProjectData = {
        id: jiraProject.key,
        name: jiraProject.name,
        platform: 'jira',
        status: 'active',
        description: jiraProject.description,
        tasks,
        team,
        metrics,
        platformSpecific: {
          jira: {
            projectKey: jiraProject.key,
            projectType: jiraProject.projectTypeKey,
            lead: jiraProject.lead?.displayName,
            description: jiraProject.description,
            url: jiraProject.self,
            issueTypes: jiraProject.issueTypes?.map((it: any) => it.name) || [],
            components: jiraProject.components?.map((c: any) => c.name) || []
          }
        }
      };

      logger.info(`✅ Successfully transformed project ${jiraProject.key} with ${tasks.length} tasks and ${team.length} team members`);
      return projectData;

    } catch (error) {
      logger.error(`Failed to transform Jira project ${jiraProject.key}:`, error);
      throw error;
    }
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    const project = await this.getProject(projectId);
    return project.metrics || [];
  }
}