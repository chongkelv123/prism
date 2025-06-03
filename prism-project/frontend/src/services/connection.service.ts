// frontend/src/services/connection.service.ts
import apiClient from './api.service';

export interface Connection {
  id: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  status: 'connected' | 'disconnected' | 'error';
  projectCount: number;
  lastSync?: string;
  lastSyncError?: string;
  createdAt: string;
}

export interface ConnectionConfig {
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  config: Record<string, any>;
}

export interface Platform {
  id: string;
  name: string;
  description: string;
  icon: string;
  configFields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    isArray?: boolean;
  }>;
  features: string[];
}

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress?: number;
  team?: Array<{
    id: string;
    name: string;
    email?: string;
    role?: string;
    avatar?: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    assignee?: {
      id: string;
      name: string;
      email?: string;
      role?: string;
    };
    priority?: string;
    dueDate?: string;
    tags?: string[];
  }>;
  metrics?: Array<{
    name: string;
    value: number | string;
    trend?: 'up' | 'down' | 'stable';
    unit?: string;
  }>;
}

class ConnectionService {
  // Get all supported platforms
  async getPlatforms(): Promise<Platform[]> {
    try {
      const response = await apiClient.get('/api/platforms');
      return response.data;
    } catch (error) {
      console.error('Failed to get platforms:', error);
      throw new Error('Failed to load supported platforms');
    }
  }

  // Validate platform configuration
  async validatePlatformConfig(platformId: string, config: Record<string, any>): Promise<{valid: boolean, message: string}> {
    try {
      const response = await apiClient.post(`/api/platforms/${platformId}/validate`, { config });
      return response.data;
    } catch (error) {
      console.error('Failed to validate platform config:', error);
      return { valid: false, message: 'Validation failed' };
    }
  }

  // Create a new connection
  async createConnection(connectionData: ConnectionConfig): Promise<Connection> {
    try {
      const response = await apiClient.post('/api/connections', connectionData);
      return this.formatConnection(response.data);
    } catch (error) {
      console.error('Failed to create connection:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to create connection');
    }
  }

  // Get all connections for the current user
  async getConnections(): Promise<Connection[]> {
    try {
      const response = await apiClient.get('/api/connections');
      return response.data.map(this.formatConnection);
    } catch (error) {
      console.error('Failed to get connections:', error);
      throw new Error('Failed to load connections');
    }
  }

  // Get a specific connection
  async getConnection(connectionId: string): Promise<Connection> {
    try {
      const response = await apiClient.get(`/api/connections/${connectionId}`);
      return this.formatConnection(response.data);
    } catch (error) {
      console.error('Failed to get connection:', error);
      throw new Error('Failed to load connection');
    }
  }

  // Test a connection
  async testConnection(connectionId: string): Promise<{success: boolean, message: string}> {
    try {
      const response = await apiClient.post(`/api/connections/${connectionId}/test`);
      return response.data;
    } catch (error) {
      console.error('Failed to test connection:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Connection test failed' 
      };
    }
  }

  // Sync a connection
  async syncConnection(connectionId: string): Promise<{success: boolean, message: string}> {
    try {
      const response = await apiClient.post(`/api/connections/${connectionId}/sync`);
      return response.data;
    } catch (error) {
      console.error('Failed to sync connection:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Connection sync failed' 
      };
    }
  }

  // Delete a connection
  async deleteConnection(connectionId: string): Promise<{success: boolean, message: string}> {
    try {
      const response = await apiClient.delete(`/api/connections/${connectionId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete connection:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to delete connection' 
      };
    }
  }

  // Get project data from a connection
  async getProjectData(connectionId: string, projectId?: string): Promise<ProjectData | ProjectData[]> {
    try {
      const url = projectId 
        ? `/api/connections/${connectionId}/projects?projectId=${projectId}`
        : `/api/connections/${connectionId}/projects`;
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to get project data:', error);
      throw new Error('Failed to load project data');
    }
  }

  // Format connection data with relative time
  private formatConnection(connection: any): Connection {
    return {
      ...connection,
      lastSync: connection.lastSync ? this.formatRelativeTime(connection.lastSync) : undefined
    };
  }

  // Format relative time (e.g., "2 hours ago")
  private formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }
}

export default new ConnectionService();