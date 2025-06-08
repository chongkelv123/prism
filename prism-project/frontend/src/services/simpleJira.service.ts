// frontend/src/services/simpleJira.service.ts - UPDATED TO USE BACKEND PROXY
export interface JiraCredentials {
  email: string;
  apiToken: string;
  domain: string;
  projectKey: string;
}

export interface JiraConnectionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface JiraTestStep {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

class SimpleJiraService {
  
  /**
   * Test Jira connection using backend proxy (bypasses CORS)
   */
  async testConnection(credentials: JiraCredentials): Promise<{
    success: boolean;
    steps: JiraTestStep[];
    error?: string;
  }> {
    try {
      console.log('Testing Jira connection through backend proxy...');
      
      // Use backend proxy instead of direct API calls to bypass CORS
      const response = await fetch('/api/jira-proxy/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ All Jira connection tests passed!');
        return {
          success: true,
          steps: result.steps
        };
      } else {
        console.log('❌ Jira connection tests failed:', result.error);
        return {
          success: false,
          steps: result.steps || [],
          error: result.error
        };
      }

    } catch (error: any) {
      console.error('❌ Jira connection test failed:', error);
      
      // Create error steps for display
      const errorSteps: JiraTestStep[] = [
        {
          step: 'Testing connection to Jira...',
          status: 'error',
          message: error.message || 'Connection failed'
        }
      ];
      
      return {
        success: false,
        steps: errorSteps,
        error: error.message || 'Connection test failed'
      };
    }
  }

  /**
   * Save connection (placeholder - you can implement backend save later)
   */
  async saveConnection(connectionName: string, credentials: JiraCredentials): Promise<JiraConnectionResult> {
    try {
      // For now, just save to localStorage (you can implement backend save later)
      const connectionData = {
        id: Date.now().toString(),
        name: connectionName,
        platform: 'jira',
        credentials: {
          domain: credentials.domain,
          email: credentials.email,
          projectKey: credentials.projectKey,
          // Note: In production, don't store API token in localStorage
          // This is just for testing - implement secure backend storage
        },
        createdAt: new Date().toISOString(),
        status: 'connected'
      };

      const savedConnections = JSON.parse(localStorage.getItem('prism-connections') || '[]');
      savedConnections.push(connectionData);
      localStorage.setItem('prism-connections', JSON.stringify(savedConnections));

      return {
        success: true,
        message: `Connection '${connectionName}' saved successfully`,
        data: connectionData
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to save connection',
        error: error.message
      };
    }
  }
}

export const simpleJiraService = new SimpleJiraService();
export default simpleJiraService;