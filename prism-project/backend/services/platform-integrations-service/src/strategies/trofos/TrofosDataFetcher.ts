// backend/services/platform-integrations-service/src/strategies/trofos/TrofosDataFetcher.ts
// TROFOS DATA FETCHER - Handles API data retrieval

import axios, { AxiosInstance } from 'axios';
import logger from '../../utils/logger';
import {
  ITrofosDataFetcher,
  TrofosConnectionConfig,
  TrofosProject,
  TrofosBacklogItem,
  TrofosSprint,
  TrofosResource
} from '../../interfaces/ITrofosStrategy';

export class TrofosDataFetcher implements ITrofosDataFetcher {
  private static readonly DEFAULT_PAGE_SIZE = 100;
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    logger.info('TrofosDataFetcher initialized');
  }

  async fetchProject(config: TrofosConnectionConfig, projectId: string): Promise<TrofosProject> {
    try {
      logger.info('Fetching TROFOS project', { projectId });

      const client = this.createHttpClient(config);
      const response = await this.executeWithRetry(
        () => client.get(`/api/external/projects/${projectId}`)
      );

      if (response.status === 200 && response.data) {
        const project = this.normalizeProject(response.data);
        logger.info('TROFOS project fetched successfully', {
          projectId: project.id,
          name: project.name
        });
        return project;
      }

      throw new Error(`Failed to fetch project: HTTP ${response.status}`);

    } catch (error) {
      logger.error('Failed to fetch TROFOS project', {
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async fetchProjects(config: TrofosConnectionConfig): Promise<TrofosProject[]> {
    try {
      logger.info('Fetching all TROFOS projects');

      const client = this.createHttpClient(config);
      const response = await this.executeWithRetry(
        () => client.get('/api/external/projects')
      );

      if (response.status === 200 && Array.isArray(response.data)) {
        const projects = response.data.map(project => this.normalizeProject(project));
        logger.info('TROFOS projects fetched successfully', {
          count: projects.length
        });
        return projects;
      }

      throw new Error(`Failed to fetch projects: HTTP ${response.status}`);

    } catch (error) {
      logger.error('Failed to fetch TROFOS projects', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async fetchBacklogItems(config: TrofosConnectionConfig, projectId: string): Promise<TrofosBacklogItem[]> {
    try {
      logger.info('Fetching TROFOS backlog items', { projectId });

      const client = this.createHttpClient(config);
      
      // Try different possible endpoints for backlog items
      const endpoints = [
        `/api/external/projects/${projectId}/backlog`,
        `/api/external/projects/${projectId}/items`,
        `/api/external/projects/${projectId}/stories`,
        `/api/external/backlogs?project_id=${projectId}`
      ];

      let backlogItems: TrofosBacklogItem[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await this.executeWithRetry(
            () => client.get(endpoint)
          );

          if (response.status === 200 && response.data) {
            const data = Array.isArray(response.data) ? response.data : response.data.items || [];
            backlogItems = data.map(item => this.normalizeBacklogItem(item));
            logger.info('TROFOS backlog items fetched successfully', {
              projectId,
              endpoint,
              count: backlogItems.length
            });
            break;
          }
        } catch (endpointError) {
          logger.debug(`TROFOS endpoint ${endpoint} not available`);
          continue;
        }
      }

      return backlogItems;

    } catch (error) {
      logger.error('Failed to fetch TROFOS backlog items', {
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return []; // Return empty array instead of throwing
    }
  }

  async fetchSprints(config: TrofosConnectionConfig, projectId: string): Promise<TrofosSprint[]> {
    try {
      logger.info('Fetching TROFOS sprints', { projectId });

      const client = this.createHttpClient(config);
      
      // Try different possible endpoints for sprints
      const endpoints = [
        `/api/external/projects/${projectId}/sprints`,
        `/api/external/projects/${projectId}/iterations`,
        `/api/external/sprints?project_id=${projectId}`
      ];

      let sprints: TrofosSprint[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await this.executeWithRetry(
            () => client.get(endpoint)
          );

          if (response.status === 200 && response.data) {
            const data = Array.isArray(response.data) ? response.data : response.data.sprints || [];
            sprints = data.map(sprint => this.normalizeSprint(sprint));
            logger.info('TROFOS sprints fetched successfully', {
              projectId,
              endpoint,
              count: sprints.length
            });
            break;
          }
        } catch (endpointError) {
          logger.debug(`TROFOS endpoint ${endpoint} not available`);
          continue;
        }
      }

      return sprints;

    } catch (error) {
      logger.error('Failed to fetch TROFOS sprints', {
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return []; // Return empty array instead of throwing
    }
  }

  async fetchTeamResources(config: TrofosConnectionConfig, projectId: string): Promise<TrofosResource[]> {
    try {
      logger.info('Fetching TROFOS team resources', { projectId });

      const client = this.createHttpClient(config);
      
      // Try different possible endpoints for team resources
      const endpoints = [
        `/api/external/projects/${projectId}/resources`,
        `/api/external/projects/${projectId}/team`,
        `/api/external/projects/${projectId}/members`,
        `/api/external/resources?project_id=${projectId}`
      ];

      let resources: TrofosResource[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await this.executeWithRetry(
            () => client.get(endpoint)
          );

          if (response.status === 200 && response.data) {
            const data = Array.isArray(response.data) ? response.data : response.data.resources || [];
            resources = data.map(resource => this.normalizeResource(resource));
            logger.info('TROFOS team resources fetched successfully', {
              projectId,
              endpoint,
              count: resources.length
            });
            break;
          }
        } catch (endpointError) {
          logger.debug(`TROFOS endpoint ${endpoint} not available`);
          continue;
        }
      }

      return resources;

    } catch (error) {
      logger.error('Failed to fetch TROFOS team resources', {
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return []; // Return empty array instead of throwing
    }
  }

  private createHttpClient(config: TrofosConnectionConfig): AxiosInstance {
    return axios.create({
      baseURL: config.serverUrl.replace(/\/$/, ''),
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': config.apiKey,
        'User-Agent': 'PRISM-TROFOS-Integration/1.0'
      }
    });
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= TrofosDataFetcher.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === TrofosDataFetcher.MAX_RETRY_ATTEMPTS) {
          break;
        }

        // Only retry on network errors or 5xx server errors
        if (axios.isAxiosError(error)) {
          const shouldRetry = !error.response || error.response.status >= 500;
          if (!shouldRetry) {
            break;
          }
        }

        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        logger.warn(`TROFOS API call failed, retrying in ${delay}ms`, {
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private normalizeProject(rawProject: any): TrofosProject {
    return {
      id: rawProject.id || rawProject.projectId || `project-${Math.random()}`,
      name: rawProject.name || rawProject.title || 'Unnamed Project',
      description: rawProject.description || '',
      status: rawProject.status || 'active',
      backlog_count: rawProject.backlog_count || rawProject.backlogCount || 0,
      sprint_count: rawProject.sprint_count || rawProject.sprintCount || 0,
      resources: Array.isArray(rawProject.resources) ? 
        rawProject.resources.map(r => this.normalizeResource(r)) : undefined,
      created_at: rawProject.created_at || rawProject.createdAt || new Date().toISOString(),
      updated_at: rawProject.updated_at || rawProject.updatedAt || new Date().toISOString()
    };
  }

  private normalizeBacklogItem(rawItem: any): TrofosBacklogItem {
    return {
      id: rawItem.id || `item-${Math.random()}`,
      title: rawItem.title || rawItem.name || 'Untitled Item',
      description: rawItem.description || '',
      priority: this.normalizePriority(rawItem.priority),
      status: rawItem.status || 'TODO',
      story_points: rawItem.story_points || rawItem.storyPoints || undefined,
      assignee: rawItem.assignee || rawItem.assigned_to || undefined,
      sprint_id: rawItem.sprint_id || rawItem.sprintId || undefined,
      created_at: rawItem.created_at || rawItem.createdAt || new Date().toISOString(),
      updated_at: rawItem.updated_at || rawItem.updatedAt || new Date().toISOString()
    };
  }

  private normalizeSprint(rawSprint: any): TrofosSprint {
    return {
      id: rawSprint.id || `sprint-${Math.random()}`,
      name: rawSprint.name || rawSprint.title || 'Unnamed Sprint',
      goal: rawSprint.goal || rawSprint.objective || undefined,
      start_date: rawSprint.start_date || rawSprint.startDate || new Date().toISOString(),
      end_date: rawSprint.end_date || rawSprint.endDate || new Date().toISOString(),
      status: this.normalizeSprintStatus(rawSprint.status),
      velocity: rawSprint.velocity || undefined,
      items: Array.isArray(rawSprint.items) ? 
        rawSprint.items.map(item => this.normalizeBacklogItem(item)) : undefined
    };
  }

  private normalizeResource(rawResource: any): TrofosResource {
    return {
      id: rawResource.id || `resource-${Math.random()}`,
      name: rawResource.name || rawResource.username || 'Unknown User',
      email: rawResource.email || '',
      role: rawResource.role || rawResource.position || 'Team Member',
      allocation: rawResource.allocation || rawResource.capacity || undefined
    };
  }

  private normalizePriority(priority: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (!priority) return 'MEDIUM';
    
    const p = priority.toString().toUpperCase();
    if (p.includes('HIGH') || p.includes('URGENT') || p.includes('CRITICAL')) return 'HIGH';
    if (p.includes('LOW') || p.includes('MINOR')) return 'LOW';
    return 'MEDIUM';
  }

  private normalizeSprintStatus(status: any): 'PLANNING' | 'ACTIVE' | 'COMPLETED' {
    if (!status) return 'PLANNING';
    
    const s = status.toString().toUpperCase();
    if (s.includes('ACTIVE') || s.includes('CURRENT') || s.includes('RUNNING')) return 'ACTIVE';
    if (s.includes('COMPLETED') || s.includes('DONE') || s.includes('FINISHED')) return 'COMPLETED';
    return 'PLANNING';
  }
}