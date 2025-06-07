// frontend/src/services/connection.service.ts - FIXED ERROR HANDLING
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

  // Validate platform configuration with DETAILED error handling
  async validatePlatformConfig(platformId: string, config: Record<string, any>): Promise<{valid: boolean, message: string}> {
    try {
      console.log(`🔍 Validating ${platformId} config with backend...`, { 
        platformId, 
        configKeys: Object.keys(config) 
      });
      
      const response = await apiClient.post(`/api/platforms/${platformId}/validate`, { config });
      
      console.log(`✅ Backend validation response for ${platformId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Platform validation failed for ${platformId}:`, error);
      
      // Extract detailed error message from response
      let errorMessage = 'Validation failed';
      
      if (error.response?.data?.message) {
        // Backend returned a specific error message
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.response?.status === 403) {
        errorMessage = 'Insufficient permissions';
      } else if (error.response?.status === 404) {
        errorMessage = 'Platform validation endpoint not found';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error during validation';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = 'Cannot connect to validation service';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log(`🚨 Returning specific error for ${platformId}:`, errorMessage);
      return { valid: false, message: errorMessage };
    }
  }

  // Create a new connection
  async createConnection(connectionData: ConnectionConfig): Promise<Connection> {
    try {
      const response = await apiClient.post('/api/connections', connectionData);
      return this.formatConnection(response.data);
    } catch (error) {
      console.error('Failed to create connection:', error);
      
      // Extract detailed error message
      let errorMessage = 'Failed to create connection';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid connection configuration';
      } else if (error.response?.status === 409) {
        errorMessage = 'Connection with this name already exists';
      } else if (error.response?.status === 500) {
        // For 500 errors, the backend might have more specific information
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = 'Server error during connection creation';
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // Get all connections for the current user
  async getConnections(): Promise<Connection[]> {
    try {
      const response = await apiClient.get('/api/connections');
      return response.data.map(this.formatConnection);
    } catch (error) {
      console.error('Failed to get connections:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      } else if (error.response?.status === 503) {
        throw new Error('Service unavailable');
      }
      
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
      
      if (error.response?.status === 404) {
        throw new Error('Connection not found');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      
      throw new Error('Failed to load connection');
    }
  }

  // Test a connection with detailed error handling
  async testConnection(connectionId: string): Promise<{success: boolean, message: string}> {
    try {
      const response = await apiClient.post(`/api/connections/${connectionId}/test`);
      return response.data;
    } catch (error) {
      console.error('Failed to test connection:', error);
      
      let errorMessage = 'Connection test failed';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'Connection not found';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error during connection test';
      }
      
      return { 
        success: false, 
        message: errorMessage
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
      
      let errorMessage = 'Connection sync failed';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'Connection not found';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error during connection sync';
      }
      
      return { 
        success: false, 
        message: errorMessage
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
      
      let errorMessage = 'Failed to delete connection';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'Connection not found';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error during connection deletion';
      }
      
      return { 
        success: false, 
        message: errorMessage
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
      
      let errorMessage = 'Failed to load project data';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = projectId ? 'Project not found' : 'Connection not found';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.response?.status === 403) {
        errorMessage = 'Insufficient permissions to access project data';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error while fetching project data';
      }
      
      throw new Error(errorMessage);
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