// backend/services/report-generation-service/src/services/PlatformDataService.ts
// COMPLETE FIXED VERSION - Replace your existing PlatformDataService.ts with this
// This service connects report generation to real platform data

import axios, { AxiosResponse } from 'axios';
import logger from '../utils/logger';

export interface ProjectData {
  id: string;
  name: string;
  platform: string; // 'jira' | 'monday' | 'trofos'
  status?: string;
  description?: string;
  itemsCount?: number;
  boardState?: string;
  groups?: {
    d: string;
    title: string;
    name?: string;
    color?: string;
    status?: string;
    itemsCount?: number;
    items?: any[];
  }[];
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
    group?: string; // Monday.com groups / Jira components
  }[];
  team?: {
    id?: string;
    name: string; // Real team member names
    role: string;
    email?: string;
    avatar?: string;
    department?: string;
    skills?: string[];
    taskCount?: number;
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

export class PlatformDataService {
  private readonly PLATFORM_INTEGRATIONS_URL: string;
  private httpClient: any;

  constructor(authToken?: string) {
    this.PLATFORM_INTEGRATIONS_URL = process.env.PLATFORM_INTEGRATIONS_SERVICE_URL || 'http://localhost:4005';

    this.httpClient = axios.create({
      baseURL: this.PLATFORM_INTEGRATIONS_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use((config: any) => {
      logger.info(`[Platform-Integrations] 🔄 Making request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.info(`[Platform-Integrations] ✅ Request successful: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        const status = error.response?.status || 'Network Error';
        const url = error.config?.url || 'Unknown URL';
        logger.warn(`[Platform-Integrations] ❌ Request failed: ${status} ${url}`);
        logger.warn(`[Platform-Integrations] Error details:`, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * MAIN METHOD: Fetch project data for report generation
   * This is called by the report generation service
   */
  async fetchProjectData(config: ReportGenerationConfig): Promise<ProjectData[]> {

    logger.info(`[Platform-Integrations] 🎯 Fetching project data for ${config.platform} platform`);
    logger.info(`[Platform-Integrations] Config:`, {
      platform: config.platform,
      connectionId: config.connectionId,
      projectId: config.projectId,
      baseUrl: this.PLATFORM_INTEGRATIONS_URL
    });

    // ✅ ADD THIS DEBUG LOG:
    console.log('🔍 DEBUG - PlatformDataService calling platform-integrations:', {
      platform: config.platform,
      connectionId: config.connectionId,
      projectId: config.projectId,  // ← This should be different for different projects
      url: `${this.PLATFORM_INTEGRATIONS_URL}/api/connections/${config.connectionId}/projects?projectId=${config.projectId}`
    });

    // 🔍 ADD THIS DIAGNOSTIC CODE HERE:
    console.log('\n🌐 === PLATFORM DATA SERVICE DIAGNOSTIC ===');
    console.log('📋 Service received config:');
    console.log('   - Platform:', config.platform);
    console.log('   - Connection ID:', config.connectionId);
    console.log('   - Project ID:', config.projectId);
    console.log('   - Template ID:', config.templateId);

    // Build endpoint URL
    const baseUrl = this.PLATFORM_INTEGRATIONS_URL;
    const primaryEndpoint = `${baseUrl}/api/connections/${config.connectionId}/projects?projectId=${config.projectId}`;
    console.log('   - Target Endpoint:', primaryEndpoint);

    try {
      // Try multiple endpoint patterns to ensure compatibility
      const endpointsToTry = [
        // Primary endpoint - most specific (THIS IS THE MISSING ENDPOINT)
        `/api/connections/${config.connectionId}/projects?projectId=${config.projectId}`,
        // Platform-specific endpoints for backward compatibility
        `/api/connections/${config.connectionId}/${config.platform}/projects/${config.projectId}`,
        // General projects endpoint
        `/api/connections/${config.connectionId}/projects`,
        // Fallback endpoint pattern
        `/api/platform-integrations/connections/${config.connectionId}/projects/${config.projectId}`
      ];

      let projectData: ProjectData[] | null = null;
      let lastError: any = null;
      
      let response;

      // Try each endpoint until one works
      for (const endpoint of endpointsToTry) {
        try {
          logger.info(`[Platform-Integrations] 🔍 Trying endpoint: ${endpoint}`);

          response = await this.httpClient.get(endpoint);

          if (response.status === 200 && response.data) {
            logger.info(`[Platform-Integrations] 🎉 SUCCESS: Got data from ${endpoint}`);
            projectData = this.parseProjectDataResponse(response.data, config.platform);

            if (projectData && projectData.length > 0) {
              break; // Success! Exit the loop
            } else {
              logger.warn(`[Platform-Integrations] ⚠️ Endpoint returned empty data: ${endpoint}`);
              continue; // Try next endpoint
            }
          }
        } catch (endpointError: any) {
          logger.warn(`[Platform-Integrations] ❌ Endpoint ${endpoint} failed:`, endpointError.message);
          lastError = endpointError;
          continue; // Try next endpoint
        }
      }

      // If all endpoints failed or returned no data, use enhanced fallback
      if (!projectData || projectData.length === 0) {
        logger.error(`[Platform-Integrations] 💥 All endpoints failed. Last error:`, lastError?.message);
        logger.warn(`[Platform-Integrations] 🔄 Using enhanced fallback data for report generation`);

        // Return enhanced fallback data instead of throwing error
        return this.generateEnhancedFallbackData(config.platform, config.projectId);
      }

      // Success - return real data
      logger.info(`[Platform-Integrations] 🎉 Successfully fetched ${projectData.length} projects`);

      // Mark as real data (not fallback)
      projectData.forEach(project => {
        project.fallbackData = false;
        project.lastUpdated = project.lastUpdated || new Date().toISOString();
      });

      // 🔍 ADD THIS DIAGNOSTIC CODE AFTER RESPONSE:
      console.log('\n📡 Platform Integrations API Response:');
      console.log('   - Status:', response.status);
      console.log('   - URL Called:', response.config.url);
      console.log('   - Response Type:', Array.isArray(response.data) ? 'Array' : 'Object');

      if (Array.isArray(response.data)) {
        console.log('   - Projects Found:', response.data.length);
        response.data.forEach((project, index) => {
          console.log(`   - Project ${index + 1}:`, {
            id: project.id,
            name: project.name,
            key: project.key
          });
        });
      } else {
        console.log('   - Single Project:', {
          id: response.data.id,
          name: response.data.name,
          key: response.data.key
        });
      }

      return projectData;

    } catch (error) {
      logger.error(`[Platform-Integrations] 💥 Critical error fetching project data:`, error);
      logger.warn(`[Platform-Integrations] 🔄 Using enhanced fallback data for report generation`);

      // Return enhanced fallback data to ensure reports can still be generated
      return this.generateEnhancedFallbackData(config.platform, config.projectId);
    }
  }

  /**
   * Parse the response from platform integrations service
   */
  private parseProjectDataResponse(responseData: any, platform: string): ProjectData[] {
    try {
      // Handle different response formats
      let projects: ProjectData[] = [];

      if (responseData.projects) {
        // Format: { projects: [...], connectionInfo: {...} }
        projects = Array.isArray(responseData.projects) ? responseData.projects : [responseData.projects];
      } else if (responseData.project) {
        // Format: { project: {...}, connectionInfo: {...} }
        projects = [responseData.project];
      } else if (Array.isArray(responseData)) {
        // Format: [...]
        projects = responseData;
      } else if (responseData.id && responseData.name) {
        // Format: { id, name, ... } (single project)
        projects = [responseData];
      } else {
        logger.warn('[Platform-Integrations] ⚠️ Unexpected response format:', responseData);
        return [];
      }

      // Validate and clean up projects
      const validProjects = projects
        .filter(project => project && project.id && project.name)
        .map(project => ({
          ...project,
          platform: project.platform || platform,
          fallbackData: false, // Mark as real data
          lastUpdated: project.lastUpdated || new Date().toISOString()
        }));

      logger.info(`[Platform-Integrations] ✅ Parsed ${validProjects.length} valid projects from response`);
      return validProjects;

    } catch (error) {
      logger.error('[Platform-Integrations] ❌ Failed to parse project data response:', error);
      return [];
    }
  }

  /**
   * Generate enhanced fallback data based on your Monday.com and Jira test data
   * This ensures reports can still be generated even if platform integration fails
   */
  private generateEnhancedFallbackData(platform: string, projectId?: string): ProjectData[] {
    logger.info(`[Platform-Integrations] 🔄 Generating enhanced fallback data for ${platform}`);

    if (platform === 'monday') {
      return this.generateMondayFallbackData(projectId);
    } else if (platform === 'jira') {
      return this.generateJiraFallbackData(projectId);
    } else {
      return this.generateGenericFallbackData(platform, projectId);
    }
  }

  /**
   * Generate Monday.com fallback data based on your test data structure (26 tasks, 6 groups)
   */
  private generateMondayFallbackData(projectId?: string): ProjectData[] {
    const project: ProjectData = {
      id: projectId || '2021562995',
      name: 'PRISM Test Project',
      platform: 'monday',
      tasks: [
        // Project Setup & Planning (4 tasks)
        {
          id: 'task_1',
          name: 'Create project repository and initial structure',
          status: 'Done',
          assignee: 'Kelvin Chong',
          priority: 'High',
          group: 'Project Setup & Planning',
          description: 'Set up Git repository and basic project structure'
        },
        {
          id: 'task_2',
          name: 'Define project requirements and scope',
          status: 'Done',
          assignee: 'Kelvin Chong',
          priority: 'High',
          group: 'Project Setup & Planning'
        },
        {
          id: 'task_3',
          name: 'Set up development environment and tools',
          status: 'Done',
          assignee: 'Chan Jian Da',
          priority: 'Medium',
          group: 'Project Setup & Planning'
        },
        {
          id: 'task_4',
          name: 'Create project documentation structure',
          status: 'Working on it',
          assignee: 'Bryan Limasarian',
          priority: 'Medium',
          group: 'Project Setup & Planning'
        },
        // Frontend Development (5 tasks)
        {
          id: 'task_5',
          name: 'Design user interface mockups',
          status: 'Done',
          assignee: 'Bryan Limasarian',
          priority: 'High',
          group: 'Frontend Development'
        },
        {
          id: 'task_6',
          name: 'Implement React frontend framework',
          status: 'Working on it',
          assignee: 'Bryan Limasarian',
          priority: 'High',
          group: 'Frontend Development'
        },
        {
          id: 'task_7',
          name: 'Create dashboard and reporting interface',
          status: 'Working on it',
          assignee: 'Bryan Limasarian',
          priority: 'High',
          group: 'Frontend Development'
        },
        {
          id: 'task_8',
          name: 'Implement platform connection management UI',
          status: 'Not Started',
          assignee: 'Bryan Limasarian',
          priority: 'Medium',
          group: 'Frontend Development'
        },
        {
          id: 'task_9',
          name: 'Add responsive design and mobile support',
          status: 'Not Started',
          assignee: 'Bryan Limasarian',
          priority: 'Low',
          group: 'Frontend Development'
        },
        // Backend Development (5 tasks)
        {
          id: 'task_10',
          name: 'Set up Node.js backend architecture',
          status: 'Done',
          assignee: 'Kelvin Chong',
          priority: 'High',
          group: 'Backend Development'
        },
        {
          id: 'task_11',
          name: 'Implement authentication service',
          status: 'Done',
          assignee: 'Kelvin Chong',
          priority: 'High',
          group: 'Backend Development'
        },
        {
          id: 'task_12',
          name: 'Create database models and migrations',
          status: 'Working on it',
          assignee: 'Chan Jian Da',
          priority: 'High',
          group: 'Backend Development'
        },
        {
          id: 'task_13',
          name: 'Implement report generation service',
          status: 'Working on it',
          assignee: 'Kelvin Chong',
          priority: 'High',
          group: 'Backend Development'
        },
        {
          id: 'task_14',
          name: 'Set up API gateway and routing',
          status: 'Stuck',
          assignee: 'Chan Jian Da',
          priority: 'Medium',
          group: 'Backend Development'
        },
        // API Integration (4 tasks)
        {
          id: 'task_15',
          name: 'Implement Monday.com API integration',
          status: 'Working on it',
          assignee: 'Kelvin Chong',
          priority: 'High',
          group: 'API Integration'
        },
        {
          id: 'task_16',
          name: 'Implement Jira API integration',
          status: 'Working on it',
          assignee: 'Chan Jian Da',
          priority: 'High',
          group: 'API Integration'
        },
        {
          id: 'task_17',
          name: 'Implement TROFOS API integration',
          status: 'Not Started',
          assignee: 'Kelvin Chong',
          priority: 'Medium',
          group: 'API Integration'
        },
        {
          id: 'task_18',
          name: 'Create platform data synchronization service',
          status: 'Not Started',
          assignee: 'Chan Jian Da',
          priority: 'Medium',
          group: 'API Integration'
        },
        // Testing & QA (4 tasks)
        {
          id: 'task_19',
          name: 'Write unit tests for backend services',
          status: 'Not Started',
          assignee: 'Kelvin Chong',
          priority: 'Medium',
          group: 'Testing & QA'
        },
        {
          id: 'task_20',
          name: 'Create integration tests for API endpoints',
          status: 'Not Started',
          assignee: 'Chan Jian Da',
          priority: 'Medium',
          group: 'Testing & QA'
        },
        {
          id: 'task_21',
          name: 'Implement frontend testing suite',
          status: 'Not Started',
          assignee: 'Bryan Limasarian',
          priority: 'Low',
          group: 'Testing & QA'
        },
        {
          id: 'task_22',
          name: 'Conduct user acceptance testing',
          status: 'Stuck',
          assignee: 'Professor Ganesh',
          priority: 'High',
          group: 'Testing & QA'
        },
        // Deployment & Launch (4 tasks)
        {
          id: 'task_23',
          name: 'Set up production infrastructure',
          status: 'Not Started',
          assignee: 'Chan Jian Da',
          priority: 'High',
          group: 'Deployment & Launch'
        },
        {
          id: 'task_24',
          name: 'Configure monitoring and logging',
          status: 'Not Started',
          assignee: 'Chan Jian Da',
          priority: 'Medium',
          group: 'Deployment & Launch'
        },
        {
          id: 'task_25',
          name: 'Create deployment documentation',
          status: 'Not Started',
          assignee: 'Professor Ganesh',
          priority: 'Medium',
          group: 'Deployment & Launch'
        },
        {
          id: 'task_26',
          name: 'Launch beta version and gather feedback',
          status: 'Not Started',
          assignee: 'All Team Members',
          priority: 'High',
          group: 'Deployment & Launch'
        }
      ],
      team: [
        {
          id: 'user_1',
          name: 'Kelvin Chong',
          role: 'Team Lead/Backend Developer',
          email: 'kelvin.chong@example.com',
          taskCount: 8
        },
        {
          id: 'user_2',
          name: 'Chan Jian Da',
          role: 'DevOps/Backend Developer',
          email: 'jianda.chan@example.com',
          taskCount: 7
        },
        {
          id: 'user_3',
          name: 'Bryan Limasarian',
          role: 'Frontend/Design Developer',
          email: 'bryan.lima@example.com',
          taskCount: 6
        },
        {
          id: 'user_4',
          name: 'Professor Ganesh',
          role: 'Project Advisor',
          email: 'ganesh@university.edu',
          taskCount: 2
        }
      ],
      metrics: [
        { name: 'Done', value: '8', type: 'status' },
        { name: 'Working on it', value: '7', type: 'status' },
        { name: 'Stuck', value: '2', type: 'status' },
        { name: 'Not Started', value: '9', type: 'status' },
        { name: 'Total Tasks', value: '26', type: 'number' },
        { name: 'High Priority', value: '12', type: 'priority' },
        { name: 'Medium Priority', value: '10', type: 'priority' },
        { name: 'Low Priority', value: '4', type: 'priority' },
        { name: 'Completion Rate', value: '31%', type: 'percentage' }
      ],
      platformSpecific: {
        monday: {
          boardId: '2021562995',
          groups: [
            { id: 'group_1', title: 'Project Setup & Planning', color: 'blue' },
            { id: 'group_2', title: 'Frontend Development', color: 'green' },
            { id: 'group_3', title: 'Backend Development', color: 'orange' },
            { id: 'group_4', title: 'API Integration', color: 'purple' },
            { id: 'group_5', title: 'Testing & QA', color: 'red' },
            { id: 'group_6', title: 'Deployment & Launch', color: 'yellow' }
          ],
          columns: [
            { id: 'name', title: 'Task', type: 'text' },
            { id: 'status', title: 'Status', type: 'color' },
            { id: 'person', title: 'Assignee', type: 'person' },
            { id: 'priority', title: 'Priority', type: 'color' },
            { id: 'date', title: 'Due Date', type: 'date' }
          ]
        }
      },
      fallbackData: true,
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: 95,
        accuracy: 90,
        freshness: 85
      }
    };

    return [project];
  }

  /**
   * Generate Jira fallback data based on your PRISM project
   */
  private generateJiraFallbackData(projectId?: string): ProjectData[] {
    const project: ProjectData = {
      id: projectId || 'PRISM',
      name: 'PRISM Development Project',
      platform: 'jira',
      tasks: [
        {
          id: 'PRISM-1',
          name: 'Core System Infrastructure',
          status: 'In Progress',
          assignee: 'Chong Kelvin',
          priority: 'High',
          description: 'Set up the basic system architecture and infrastructure',
          labels: ['infrastructure', 'backend']
        },
        {
          id: 'PRISM-2',
          name: 'Report Generation Engine',
          status: 'To Do',
          assignee: 'Chong Kelvin',
          priority: 'High',
          description: 'Implement the core PowerPoint generation functionality',
          labels: ['reports', 'integration']
        },
        {
          id: 'PRISM-3',
          name: 'User Registration and Authentication System',
          status: 'To Do',
          assignee: 'Chong Kelvin',
          priority: 'High',
          description: 'Create secure user authentication system',
          labels: ['security', 'backend', 'authentication']
        },
        {
          id: 'PRISM-5',
          name: 'Project Dashboard Interface',
          status: 'To Do',
          assignee: 'Unassigned',
          priority: 'High',
          description: 'Design and implement the main dashboard UI',
          labels: ['ui', 'dashboard', 'frontend']
        },
        {
          id: 'PRISM-6',
          name: 'Monday.com API Integration',
          status: 'To Do',
          assignee: 'Unassigned',
          priority: 'Medium',
          description: 'Integrate with Monday.com GraphQL API for project data',
          labels: ['integration', 'api', 'monday']
        },
        {
          id: 'PRISM-8',
          name: 'Template Management System',
          status: 'To Do',
          assignee: 'Chong Kelvin',
          priority: 'Medium',
          description: 'System for managing PowerPoint templates',
          labels: ['management', 'templates', 'frontend']
        },
        {
          id: 'PRISM-15',
          name: 'JWT Token Validation Middleware',
          status: 'In Progress',
          assignee: 'Chong Kelvin',
          priority: 'Medium',
          description: 'Middleware for validating JWT tokens across services',
          labels: ['security', 'jwt', 'middleware']
        },
        {
          id: 'PRISM-19',
          name: 'System Architecture Design',
          status: 'Done',
          assignee: 'Chong Kelvin',
          priority: 'High',
          description: 'Overall system architecture and design documentation',
          labels: ['planning', 'design', 'architecture']
        }
      ],
      team: [
        {
          id: 'user_1',
          name: 'Chong Kelvin',
          role: 'Project Lead/Developer',
          email: 'chong.kelvin@example.com',
          taskCount: 6
        },
        {
          id: 'user_2',
          name: 'Unassigned',
          role: 'Team Member',
          taskCount: 2
        }
      ],
      metrics: [
        { name: 'Done', value: '1', type: 'status' },
        { name: 'In Progress', value: '2', type: 'status' },
        { name: 'To Do', value: '5', type: 'status' },
        { name: 'Total Issues', value: '8', type: 'number' },
        { name: 'High Priority', value: '5', type: 'priority' },
        { name: 'Medium Priority', value: '3', type: 'priority' },
        { name: 'Completion Rate', value: '13%', type: 'percentage' }
      ],
      platformSpecific: {
        jira: {
          projectKey: 'PRISM',
          issueTypes: ['Epic', 'Story', 'Task', 'Bug'],
          components: ['Backend', 'Frontend', 'API', 'Infrastructure'],
          versions: ['1.0.0', '0.1.0']
        }
      },
      fallbackData: true,
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: 85,
        accuracy: 90,
        freshness: 80
      }
    };

    return [project];
  }

  /**
   * Generate generic fallback data for other platforms
   */
  private generateGenericFallbackData(platform: string, projectId?: string): ProjectData[] {
    const project: ProjectData = {
      id: projectId || `${platform}_demo_project`,
      name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Demo Project`,
      platform: platform,
      tasks: [
        {
          id: 'task_1',
          name: 'Set up project foundation',
          status: 'Completed',
          assignee: 'Team Lead',
          priority: 'High'
        },
        {
          id: 'task_2',
          name: 'Implement core features',
          status: 'In Progress',
          assignee: 'Developer 1',
          priority: 'High'
        },
        {
          id: 'task_3',
          name: 'Testing and QA',
          status: 'Pending',
          assignee: 'QA Engineer',
          priority: 'Medium'
        }
      ],
      team: [
        {
          id: 'user_1',
          name: 'Team Lead',
          role: 'Project Manager',
          taskCount: 1
        },
        {
          id: 'user_2',
          name: 'Developer 1',
          role: 'Software Developer',
          taskCount: 1
        },
        {
          id: 'user_3',
          name: 'QA Engineer',
          role: 'Quality Assurance',
          taskCount: 1
        }
      ],
      metrics: [
        { name: 'Completed', value: '1', type: 'status' },
        { name: 'In Progress', value: '1', type: 'status' },
        { name: 'Pending', value: '1', type: 'status' },
        { name: 'Total Tasks', value: '3', type: 'number' },
        { name: 'Completion Rate', value: '33%', type: 'percentage' }
      ],
      fallbackData: true,
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: 70,
        accuracy: 85,
        freshness: 75
      }
    };

    return [project];
  }

  /**
   * Health check for platform integrations service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.error('[Platform-Integrations] Health check failed:', error);
      return false;
    }
  }
}