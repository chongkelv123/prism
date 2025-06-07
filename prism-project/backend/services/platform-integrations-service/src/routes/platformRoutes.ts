// backend/services/platform-integrations-service/src/routes/platformRoutes.ts
import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import logger from '../utils/logger';
import axios from 'axios';

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

// Validate platform configuration
router.post('/:platformId/validate', async (req, res) => {
  try {
    const { platformId } = req.params;
    const { config } = req.body;

    logger.info(`Validating configuration for platform: ${platformId}`);

    if (!config) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Configuration is required' 
      });
    }

    let isValid = true;
    let message = 'Configuration is valid';

    switch (platformId) {
      case 'monday':
        const mondayResult = await validateMondayConfig(config);
        isValid = mondayResult.valid;
        message = mondayResult.message;
        break;
        
      case 'jira':
        const jiraResult = await validateJiraConfig(config);
        isValid = jiraResult.valid;
        message = jiraResult.message;
        break;
        
      case 'trofos':
        const trofosResult = await validateTrofosConfig(config);
        isValid = trofosResult.valid;
        message = trofosResult.message;
        break;
        
      default:
        isValid = false;
        message = 'Unsupported platform';
    }

    logger.info(`Platform validation result for ${platformId}: ${isValid ? 'valid' : 'invalid'}`);
    res.json({ valid: isValid, message });
  } catch (error) {
    logger.error('Platform validation error:', error);
    res.status(500).json({ 
      valid: false, 
      message: 'Validation failed' 
    });
  }
});

// Monday.com validation function
async function validateMondayConfig(config: any): Promise<{ valid: boolean; message: string }> {
  if (!config.apiKey) {
    return { valid: false, message: 'API Key is required' };
  }

  try {
    const query = `query { me { name email } }`;
    const response = await axios.post('https://api.monday.com/v2', 
      { query },
      {
        headers: {
          'Authorization': config.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data?.data?.me) {
      return { valid: true, message: 'Monday.com connection successful' };
    } else {
      return { valid: false, message: 'Invalid response from Monday.com API' };
    }
  } catch (error) {
    logger.error('Monday.com validation failed:', error);
    
    let errorMessage = 'Connection test failed';
    
    // Fix: Use type guard for Axios errors
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (error.response?.status === 403) {
        errorMessage = 'API key does not have sufficient permissions';
      }
    }
    
    return { valid: false, message: errorMessage };
  }
}

// Jira validation function  
async function validateJiraConfig(config: any): Promise<{ valid: boolean; message: string }> {
  if (!config.domain || !config.email || !config.apiToken || !config.projectKey) {
    return { valid: false, message: 'Domain, email, API token, and project key are required' };
  }

  try {
    const normalizedDomain = config.domain.replace(/^https?:\/\//, '');
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    
    const userResponse = await axios.get(`https://${normalizedDomain}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (userResponse.data?.emailAddress) {
      return { valid: true, message: 'Jira connection successful' };
    } else {
      return { valid: false, message: 'Invalid authentication response' };
    }
  } catch (error) {
    logger.error('Jira validation failed:', error);
    
    let errorMessage = 'Connection test failed';
    
    // Fix: Use type guard for Axios errors
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or API token';
      } else if (error.response?.status === 403) {
        errorMessage = 'API token does not have sufficient permissions';
      } else if (error.response?.status === 404) {
        errorMessage = 'Jira instance not found';
      }
    }
    
    return { valid: false, message: errorMessage };
  }
}

// TROFOS validation function
async function validateTrofosConfig(config: any): Promise<{ valid: boolean; message: string }> {
  if (!config.serverUrl || !config.apiKey || !config.projectId) {
    return { valid: false, message: 'Server URL, API key, and project ID are required' };
  }

  try {
    const serverUrl = config.serverUrl.replace(/\/$/, '');
    
    const response = await axios.post(`${serverUrl}/v1/project`, {
      pageNum: 1,
      pageSize: 1,
      sort: 'name',
      direction: 'ASC'
    }, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.status === 200) {
      return { valid: true, message: 'TROFOS connection successful' };
    } else {
      return { valid: false, message: 'Unexpected response from TROFOS server' };
    }
  } catch (error) {
    logger.error('TROFOS validation failed:', error);
    
    let errorMessage = 'Connection test failed';
    
    // Fix: Use type guard for Axios errors
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (error.response?.status === 403) {
        errorMessage = 'API key does not have sufficient permissions';
      }
    }
    
    return { valid: false, message: errorMessage };
  }
}

export default router;