import axios from 'axios';
import logger from '../utils/logger';

// Interfaces for platform configuration
interface MondayConfig {
  apiKey: string;
  boardId: string;
}

interface JiraConfig {
  domain: string;
  apiToken: string;
  projectKey: string;
}

interface TrofosConfig {
  apiKey: string;
  projectId: string;
}

// Generic report data interface
export interface PlatformReportData {
  metrics: { name: string; value: string }[];
  tasks: { name: string; status: string; assignee?: string }[];
  team?: { name: string; role: string }[];
  sprints?: { name: string; startDate: string; endDate: string; completed: string }[];
  [key: string]: any;
}

/**
 * Fetch data from Monday.com
 */
export async function fetchMondayData(config: MondayConfig): Promise<PlatformReportData> {
  try {
    logger.info('Fetching data from Monday.com', { boardId: config.boardId });
    
    // In a real implementation, you would make API calls to Monday.com
    // For demo purposes, returning mock data
    
    const mockData: PlatformReportData = {
      metrics: [
        { name: 'Tasks Completed', value: '45' },
        { name: 'In Progress', value: '15' },
        { name: 'Blocked', value: '5' }
      ],
      tasks: [
        { name: 'Design UI Components', status: 'Done', assignee: 'Bryan' },
        { name: 'Implement API Gateway', status: 'Working on it', assignee: 'Jian Da' },
        { name: 'Write Unit Tests', status: 'Working on it', assignee: 'Kelvin' },
        { name: 'Setup CI/CD Pipeline', status: 'Stuck', assignee: 'Jian Da' }
      ],
      team: [
        { name: 'Bryan', role: 'UI/UX Designer' },
        { name: 'Jian Da', role: 'Backend Developer' },
        { name: 'Kelvin', role: 'Full Stack Developer' }
      ]
    };
    
    return mockData;
  } catch (error) {
    logger.error('Error fetching data from Monday.com:', error);
    throw new Error('Failed to fetch data from Monday.com');
  }
}

/**
 * Fetch data from Jira
 */
export async function fetchJiraData(config: JiraConfig): Promise<PlatformReportData> {
  try {
    logger.info('Fetching data from Jira', { projectKey: config.projectKey });
    
    // In a real implementation, you would make API calls to Jira
    // For demo purposes, returning mock data
    
    const mockData: PlatformReportData = {
      metrics: [
        { name: 'Story Points Completed', value: '34' },
        { name: 'Open Issues', value: '23' },
        { name: 'Bugs', value: '7' }
      ],
      tasks: [
        { name: 'PRISM-1: Setup Project Repository', status: 'Done', assignee: 'Kelvin' },
        { name: 'PRISM-2: Implement Auth Service', status: 'In Progress', assignee: 'Jian Da' },
        { name: 'PRISM-3: Create Frontend Components', status: 'In Progress', assignee: 'Bryan' },
        { name: 'PRISM-4: Fix Login Bug', status: 'To Do', assignee: 'Kelvin' }
      ],
      sprints: [
        { name: 'Sprint 1', startDate: '2025-04-01', endDate: '2025-04-14', completed: '100%' },
        { name: 'Sprint 2', startDate: '2025-04-15', endDate: '2025-04-28', completed: '65%' }
      ]
    };
    
    return mockData;
  } catch (error) {
    logger.error('Error fetching data from Jira:', error);
    throw new Error('Failed to fetch data from Jira');
  }
}

/**
 * Fetch data from TROFOS
 */
export async function fetchTrofosData(config: TrofosConfig): Promise<PlatformReportData> {
  try {
    logger.info('Fetching data from TROFOS', { projectId: config.projectId });
    
    // In a real implementation, you would make API calls to TROFOS
    // For demo purposes, returning mock data
    
    const mockData: PlatformReportData = {
      metrics: [
        { name: 'Tasks Completed', value: '27' },
        { name: 'Resources Utilized', value: '85%' },
        { name: 'Budget Consumed', value: '32%' }
      ],
      tasks: [
        { name: 'Market Research', status: 'Completed', assignee: 'Bryan' },
        { name: 'Competitor Analysis', status: 'Completed', assignee: 'Kelvin' },
        { name: 'Platform Development', status: 'In Progress', assignee: 'Jian Da' },
        { name: 'User Testing', status: 'Pending', assignee: 'Bryan' }
      ],
      team: [
        { name: 'Bryan', role: 'Research Lead' },
        { name: 'Jian Da', role: 'Technical Lead' },
        { name: 'Kelvin', role: 'Project Manager' }
      ]
    };
    
    return mockData;
  } catch (error) {
    logger.error('Error fetching data from TROFOS:', error);
    throw new Error('Failed to fetch data from TROFOS');
  }
}

/**
 * Fetch data from the appropriate platform based on platform ID
 */
export async function fetchPlatformData(platformId: string, config: any): Promise<PlatformReportData> {
  switch (platformId) {
    case 'monday':
      return fetchMondayData(config);
    case 'jira':
      return fetchJiraData(config);
    case 'trofos':
      return fetchTrofosData(config);
    default:
      throw new Error(`Unsupported platform: ${platformId}`);
  }
}