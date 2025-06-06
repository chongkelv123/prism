// backend/services/platform-integrations-service/src/routes/platformRoutes.ts
import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { ClientFactory, PlatformConnection } from '../clients/BaseClient';
import logger from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Get supported platforms
router.get('/', (req, res) => {
  logger.info('Getting supported platforms');
  
  const platforms = [
    {
      id: 'monday',
      name: 'Monday.com',
      description: 'Connect to your Monday.com workspace to sync boards, items, and project data.',
      icon: '📊',
      configFields: [
        { name: 'apiKey', label: 'API Key', type: 'password', required: true }
      ],
      features: ['Boards & Items', 'Status Updates', 'Team Members', 'Time Tracking']
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Integrate with Jira to pull issues, sprints, and project metrics.',
      icon: '🔄',
      configFields: [
        { name: 'domain', label: 'Jira Domain', type: 'text', required: true, placeholder: 'company.atlassian.net' },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'apiToken', label: 'API Token', type: 'password', required: true },
        { name: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PRISM' }
      ],
      features: ['Issues & Epics', 'Sprint Data', 'Story Points', 'Workflow Status']
    },
    {
      id: 'trofos',
      name: 'TROFOS',
      description: 'Connect to TROFOS for comprehensive project and resource management data.',
      icon: '📈',
      configFields: [
        { name: 'serverUrl', label: 'Server URL', type: 'url', required: true, placeholder: 'https://your-trofos-server.com' },
        { name: 'apiKey', label: 'API Key', type: 'password', required: true },
        { name: 'projectId', label: 'Project ID', type: 'text', required: true }
      ],
      features: ['Project Metrics', 'Resource Allocation', 'Backlog Items', 'Sprint Progress']
    }
  ];

  res.json(platforms);
});

// Utility function to normalize Jira domain
function normalizeJiraDomain(domain: string): string {
  if (!domain) return '';
  
  // Remove any protocol prefix
  let normalized = domain.replace(/^https?:\/\//, '');
  
  // Remove trailing slashes and paths
  normalized = normalized.split('/')[0];
  
  // Ensure it ends with .atlassian.net for cloud instances
  if (!normalized.includes('.') && !normalized.endsWith('.atlassian.net')) {
    normalized = `${normalized}.atlassian.net`;
  }
  
  return normalized.trim();
}

// Validate platform configuration with REAL API testing
router.post('/:platformId/validate', async (req, res) => {
  try {
    const { platformId } = req.params;
    const { config } = req.body;

    logger.info(`Validating configuration for platform: ${platformId}`, {
      platformId,
      configKeys: Object.keys(config || {})
    });

    if (!config) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Configuration is required' 
      });
    }

    // Platform-specific validation with REAL API testing
    switch (platformId) {
      case 'monday':
        return await validateMondayConfig(config, res);
        
      case 'jira':
        return await validateJiraConfig(config, res);
        
      case 'trofos':
        return await validateTrofosConfig(config, res);
        
      default:
        return res.status(400).json({
          valid: false,
          message: 'Unsupported platform'
        });
    }
  } catch (error) {
    logger.error('Platform validation error:', error);
    
    // Return specific error message instead of generic one
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Validation failed due to unexpected error';
      
    res.status(500).json({ 
      valid: false, 
      message: errorMessage
    });
  }
});

// Monday.com validation with real API test
async function validateMondayConfig(config: any, res: any) {
  // Basic field validation
  if (!config.apiKey?.trim()) {
    return res.json({
      valid: false,
      message: 'API Key is required'
    });
  }

  try {
    // Create temporary connection for testing
    const tempConnection: PlatformConnection = {
      id: 'temp-monday',
      name: 'Test Connection',
      platform: 'monday',
      config: config,
      status: 'disconnected'
    };

    const client = ClientFactory.createClient(tempConnection);
    const isValid = await client.testConnection();

    if (isValid) {
      return res.json({
        valid: true,
        message: 'Monday.com connection successful'
      });
    } else {
      return res.json({
        valid: false,
        message: 'Invalid API key or insufficient permissions'
      });
    }
  } catch (error: any) {
    logger.error('Monday.com validation failed:', error);
    
    let errorMessage = 'Connection test failed';
    if (error?.response?.status === 401) {
      errorMessage = 'Invalid API key';
    } else if (error?.response?.status === 403) {
      errorMessage = 'API key does not have sufficient permissions';
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot reach Monday.com API. Please check your internet connection';
    }

    return res.json({
      valid: false,
      message: errorMessage
    });
  }
}

// Jira validation with real API test
async function validateJiraConfig(config: any, res: any) {
  // Basic field validation
  const requiredFields = ['domain', 'email', 'apiToken', 'projectKey'];
  const missingFields = requiredFields.filter(field => !config[field]?.trim());
  
  if (missingFields.length > 0) {
    return res.json({
      valid: false,
      message: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  // Normalize and validate domain
  const normalizedDomain = normalizeJiraDomain(config.domain);
  if (!normalizedDomain) {
    return res.json({
      valid: false,
      message: 'Invalid Jira domain format'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(config.email)) {
    return res.json({
      valid: false,
      message: 'Invalid email address format'
    });
  }

  try {
    // Create temporary connection for testing with normalized domain
    const tempConnection: PlatformConnection = {
      id: 'temp-jira',
      name: 'Test Connection',
      platform: 'jira',
      config: {
        ...config,
        domain: normalizedDomain // Use normalized domain
      },
      status: 'disconnected'
    };

    logger.info('Testing Jira connection with normalized domain:', { 
      originalDomain: config.domain,
      normalizedDomain,
      email: config.email,
      projectKey: config.projectKey 
    });

    const client = ClientFactory.createClient(tempConnection);
    const isValid = await client.testConnection();

    if (isValid) {
      // Additional validation: try to access the specific project
      try {
        await client.getProject(config.projectKey);
        return res.json({
          valid: true,
          message: `Successfully connected to Jira project ${config.projectKey}`
        });
      } catch (projectError: any) {
        logger.warn('Jira connection valid but project not accessible:', projectError);
        
        if (projectError?.response?.status === 404) {
          return res.json({
            valid: false,
            message: `Project '${config.projectKey}' not found or not accessible`
          });
        } else if (projectError?.response?.status === 403) {
          return res.json({
            valid: false,
            message: `No permission to access project '${config.projectKey}'`
          });
        } else {
          // Connection works but project access failed for other reasons
          return res.json({
            valid: true,
            message: 'Jira connection successful (project access verification failed)'
          });
        }
      }
    } else {
      return res.json({
        valid: false,
        message: 'Invalid credentials or domain'
      });
    }
  } catch (error: any) {
    logger.error('Jira validation failed:', error);
    
    let errorMessage = 'Connection test failed';
    
    if (error?.response?.status === 401) {
      errorMessage = 'Invalid email or API token';
    } else if (error?.response?.status === 403) {
      errorMessage = 'API token does not have sufficient permissions';
    } else if (error?.response?.status === 404) {
      errorMessage = 'Jira instance not found. Please check your domain';
    } else if (error?.code === 'ENOTFOUND') {
      errorMessage = `Cannot resolve domain '${normalizedDomain}'. Please check your Jira domain`;
    } else if (error?.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Please check your domain and internet connection';
    } else if (error?.message?.includes('certificate')) {
      errorMessage = 'SSL certificate error. Please verify your Jira domain';
    }

    return res.json({
      valid: false,
      message: errorMessage
    });
  }
}

// TROFOS validation with real API test
async function validateTrofosConfig(config: any, res: any) {
  // Basic field validation
  const requiredFields = ['serverUrl', 'apiKey', 'projectId'];
  const missingFields = requiredFields.filter(field => !config[field]?.trim());
  
  if (missingFields.length > 0) {
    return res.json({
      valid: false,
      message: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  // Validate URL format
  try {
    new URL(config.serverUrl);
  } catch {
    return res.json({
      valid: false,
      message: 'Invalid server URL format. Please include http:// or https://'
    });
  }

  try {
    // Create temporary connection for testing
    const tempConnection: PlatformConnection = {
      id: 'temp-trofos',
      name: 'Test Connection',
      platform: 'trofos',
      config: config,
      status: 'disconnected'
    };

    const client = ClientFactory.createClient(tempConnection);
    const isValid = await client.testConnection();

    if (isValid) {
      // Try to access the specific project
      try {
        await client.getProject(config.projectId);
        return res.json({
          valid: true,
          message: `Successfully connected to TROFOS project ${config.projectId}`
        });
      } catch (projectError: any) {
        logger.warn('TROFOS connection valid but project not accessible:', projectError);
        
        if (projectError?.response?.status === 404) {
          return res.json({
            valid: false,
            message: `Project '${config.projectId}' not found`
          });
        } else {
          return res.json({
            valid: true,
            message: 'TROFOS connection successful (project verification failed)'
          });
        }
      }
    } else {
      return res.json({
        valid: false,
        message: 'Invalid API key or server URL'
      });
    }
  } catch (error: any) {
    logger.error('TROFOS validation failed:', error);
    
    let errorMessage = 'Connection test failed';
    
    if (error?.response?.status === 401) {
      errorMessage = 'Invalid API key';
    } else if (error?.response?.status === 403) {
      errorMessage = 'API key does not have sufficient permissions';
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot reach TROFOS server. Please check your server URL';
    }

    return res.json({
      valid: false,
      message: errorMessage
    });
  }
}

export default router;