// backend/services/platform-integrations-service/src/clients/MondayClient.ts
import { BaseClient, PlatformConnection, ProjectData, Metric, TeamMember, Task } from './BaseClient';
import logger from '../utils/logger';

export class MondayClient extends BaseClient {
  private get apiKey(): string {
    const apiKey = this.connection.config.apiKey;
    if (!apiKey) throw new Error('Monday.com API key is required');
    return apiKey.trim();
  }

  private get boardId(): string {
    const boardId = this.connection.config.boardId;
    if (!boardId) throw new Error('Monday.com board ID is required');
    return boardId.trim();
  }

  constructor(connection: PlatformConnection) {
    super(connection);
    
    // Set up Monday.com-specific HTTP client configuration
    this.http.defaults.baseURL = 'https://api.monday.com/v2';
    this.http.defaults.headers['Authorization'] = this.apiKey;
    this.http.defaults.headers['Content-Type'] = 'application/json';
    this.http.defaults.headers['API-Version'] = '2023-10';
    
    logger.info('Monday.com client initialized', { 
      boardId: this.boardId 
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Monday.com connection...');
      
      const query = `query { me { name email id } }`;
      const response = await this.http.post('', { query });
      
      if (response.status === 200 && response.data?.data?.me) {
        const user = response.data.data.me;
        logger.info('Monday.com authentication successful', { 
          userName: user.name,
          userEmail: user.email,
          userId: user.id 
        });
        return true;
      } else {
        logger.warn('Monday.com authentication response missing expected fields', response.data);
        return false;
      }
    } catch (error: any) {
      logger.error('Monday.com connection test failed:', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Re-throw with more specific error information
      if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your Monday.com API key.');
      } else if (error.response?.status === 403) {
        throw new Error('API key does not have sufficient permissions');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Cannot connect to Monday.com. Please check your internet connection.');
      } else {
        throw new Error(`Connection test failed: ${error.message}`);
      }
    }
  }

  async getProjects(): Promise<ProjectData[]> {
    try {
      logger.info('Fetching Monday.com board data...');
      
      // Get board details with items, groups, and columns
      const query = `
        query {
          boards(ids: [${this.boardId}]) {
            id
            name
            description
            state
            items {
              id
              name
              state
              column_values {
                id
                text
                value
                column {
                  id
                  title
                  type
                }
              }
              creator {
                id
                name
                email
                photo_thumb
              }
            }
            groups {
              id
              title
              color
            }
            columns {
              id
              title
              type
              settings_str
            }
            owners {
              id
              name
              email
              photo_thumb
            }
          }
        }
      `;

      const response = await this.http.post('', { query });
      
      if (!response.data?.data?.boards || response.data.data.boards.length === 0) {
        throw new Error(`Board with ID ${this.boardId} not found or not accessible`);
      }

      const board = response.data.data.boards[0];
      
      // Transform Monday.com items to tasks
      const tasks: Task[] = board.items.map((item: any) => {
        // Extract status from status column
        const statusColumn = item.column_values.find((cv: any) => 
          cv.column.type === 'color' || cv.column.title.toLowerCase().includes('status')
        );
        
        // Extract assignee from person column
        const personColumn = item.column_values.find((cv: any) => 
          cv.column.type === 'multiple-person' || cv.column.type === 'person'
        );
        
        // Extract priority from priority column
        const priorityColumn = item.column_values.find((cv: any) => 
          cv.column.title.toLowerCase().includes('priority')
        );
        
        // Extract due date from date column
        const dateColumn = item.column_values.find((cv: any) => 
          cv.column.type === 'date' || cv.column.title.toLowerCase().includes('due')
        );
        
        // Extract tags from text columns
        const tagsColumn = item.column_values.find((cv: any) => 
          cv.column.title.toLowerCase().includes('tag') || 
          cv.column.title.toLowerCase().includes('label')
        );

        let assignee: TeamMember | undefined;
        if (personColumn && personColumn.value) {
          try {
            const personData = JSON.parse(personColumn.value);
            if (personData.personsAndTeams && personData.personsAndTeams.length > 0) {
              const person = personData.personsAndTeams[0];
              assignee = {
                id: person.id.toString(),
                name: person.name,
                email: person.email,
                avatar: person.photo_thumb
              };
            }
          } catch (e) {
            logger.warn('Failed to parse person column data', e);
          }
        }

        return {
          id: item.id,
          title: item.name,
          status: statusColumn?.text || item.state || 'Unknown',
          assignee,
          priority: priorityColumn?.text || 'Medium',
          dueDate: dateColumn?.text ? new Date(dateColumn.text) : undefined,
          tags: tagsColumn?.text ? tagsColumn.text.split(',').map(t => t.trim()) : []
        };
      });

      // Calculate metrics
      const statusCounts = tasks.reduce((acc: any, task: Task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      const priorityCounts = tasks.reduce((acc: any, task: Task) => {
        acc[task.priority || 'Medium'] = (acc[task.priority || 'Medium'] || 0) + 1;
        return acc;
      }, {});

      const metrics: Metric[] = [
        { name: 'Total Items', value: tasks.length },
        { name: 'Done', value: statusCounts['Done'] || statusCounts['Completed'] || 0 },
        { name: 'In Progress', value: statusCounts['Working on it'] || statusCounts['In Progress'] || 0 },
        { name: 'Stuck', value: statusCounts['Stuck'] || 0 },
        { name: 'High Priority', value: priorityCounts['High'] || priorityCounts['Critical'] || 0 },
        { name: 'Medium Priority', value: priorityCounts['Medium'] || 0 },
        { name: 'Low Priority', value: priorityCounts['Low'] || 0 }
      ];

      // Get unique team members
      const uniqueTeamMembers = new Map();
      
      // Add board owners
      board.owners?.forEach((owner: any) => {
        uniqueTeamMembers.set(owner.id, {
          id: owner.id.toString(),
          name: owner.name,
          email: owner.email,
          role: 'Owner',
          avatar: owner.photo_thumb
        });
      });

      // Add task assignees
      tasks.forEach((task: Task) => {
        if (task.assignee && !uniqueTeamMembers.has(task.assignee.id)) {
          uniqueTeamMembers.set(task.assignee.id, {
            ...task.assignee,
            role: 'Member'
          });
        }
      });

      const team = Array.from(uniqueTeamMembers.values());

      const projectData: ProjectData = {
        id: board.id,
        name: board.name,
        description: board.description,
        status: board.state === 'active' ? 'active' : 'inactive',
        tasks,
        metrics,
        team
      } as any;

      logger.info('Monday.com board data fetched successfully', {
        boardId: board.id,
        itemCount: tasks.length,
        teamSize: team.length
      });

      return [projectData];
    } catch (error: any) {
      logger.error('Failed to fetch Monday.com board data:', error);
      
      if (error.response?.status === 404) {
        throw new Error(`Board '${this.boardId}' not found or not accessible`);
      } else if (error.response?.status === 403) {
        throw new Error(`No permission to access board '${this.boardId}'`);
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please check your API key');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later');
      } else {
        throw new Error(`Failed to fetch board data from Monday.com: ${error.message}`);
      }
    }
  }

  async getProject(projectId: string): Promise<ProjectData> {
    // For Monday.com, project ID is the same as board ID
    if (projectId !== this.boardId) {
      throw new Error(`Board '${projectId}' does not match configured board '${this.boardId}'`);
    }
    
    const projects = await this.getProjects();
    return projects[0]; // Monday.com client only returns one board
  }

  async getProjectMetrics(projectId: string): Promise<Metric[]> {
    const project = await this.getProject(projectId);
    return project.metrics || [];
  }
}