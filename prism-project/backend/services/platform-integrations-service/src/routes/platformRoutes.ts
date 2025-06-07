// backend/services/platform-integrations-service/src/routes/platformRoutes.ts
import { Router, Request, Response } from 'express';
import authenticateJWT from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

const router = Router();

// Apply authentication middleware to all platform routes
router.use(authenticateJWT);

// Validate Jira configuration
const validateJiraConfig = async (config: JiraConfig): Promise<{ valid: boolean; message: string }> => {
  try {
    console.log('Validating configuration for platform: jira');
    
    // 1. Required Fields Check
    const requiredFields = ['domain', 'email', 'apiToken', 'projectKey'];
    const missingFields = requiredFields.filter(field => !config[field as keyof JiraConfig]?.trim());
    
    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      console.warn('Validation failed - missing fields:', missingFields);
      return { valid: false, message };
    }

    // 2. Domain Normalization
    let normalizedDomain = config.domain.trim();
    
    // Remove protocol if present
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '');
    
    // Remove trailing slashes and paths
    normalizedDomain = normalizedDomain.split('/')[0];
    
    // Validate domain format
    if (!normalizedDomain.includes('.')) {
      return { 
        valid: false, 
        message: 'Invalid domain format. Please provide a complete domain (e.g., company.atlassian.net)' 
      };
    }

    console.log('Using normalized domain:', normalizedDomain);

    // 3. Constructing the Authorization header (Basic Auth)
    const email = config.email.trim();
    const apiToken = config.apiToken.trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Invalid email format' };
    }

    // Create Basic Auth header
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const authHeader = `Basic ${credentials}`;
    
    console.log('Testing Jira connection with Basic Auth for:', email);

    // 4. Jira API Call (/myself)
    const axios = require('axios');
    
    const response = await axios.get(`https://${normalizedDomain}/rest/api/3/myself`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    // 5. Evaluating the Response
    if (response.data && response.data.emailAddress) {
      console.log('Jira connection successful for user:', response.data.emailAddress);
      return { valid: true, message: 'Jira connection successful' };
    } else {
      console.warn('Unexpected response format from Jira:', response.data);
      return { valid: false, message: 'Unexpected response from Jira API' };
    }

  } catch (error: any) {
    console.error('Jira validation error:', error.message);
    
    if (error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 401:
          return { valid: false, message: 'Invalid email or API token' };
        case 403:
          return { valid: false, message: 'API token does not have sufficient permissions' };
        case 404:
          return { valid: false, message: 'Jira instance not found. Please check your domain.' };
        case 429:
          return { valid: false, message: 'Rate limited. Please try again in a moment.' };
        default:
          return { valid: false, message: `Jira API error (${status}): ${error.response.data?.message || 'Unknown error'}` };
      }
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return { valid: false, message: 'Cannot reach Jira instance. Please check your domain.' };
    }
    
    if (error.code === 'ETIMEDOUT') {
      return { valid: false, message: 'Connection timeout. Please try again.' };
    }
    
    return { valid: false, message: 'Connection test failed. Please check your configuration.' };
  }
};

// POST /api/platforms/:platformId/validate
router.post('/:platformId/validate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { platformId } = req.params;
    const { config } = req.body;

    console.log(`Validation request for platform: ${platformId} by user: ${req.user?.email}`);

    if (!config) {
      return res.status(400).json({
        valid: false,
        message: 'Configuration is required',
      });
    }

    let result;

    switch (platformId.toLowerCase()) {
      case 'jira':
        result = await validateJiraConfig(config);
        break;
      
      // Add other platforms here as needed
      case 'github':
        result = { valid: false, message: 'GitHub integration not yet implemented' };
        break;
      
      case 'slack':
        result = { valid: false, message: 'Slack integration not yet implemented' };
        break;
      
      default:
        return res.status(400).json({
          valid: false,
          message: `Unsupported platform: ${platformId}`,
        });
    }

    console.log(`Validation result for ${platformId}:`, { valid: result.valid, hasMessage: !!result.message });

    res.json(result);

  } catch (error: any) {
    console.error('Platform validation error:', error);
    
    res.status(500).json({
      valid: false,
      message: 'Internal server error during validation',
    });
  }
});

// GET /api/platforms (list available platforms)
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const platforms = [
    {
      id: 'jira',
      name: 'Jira',
      description: 'Sync issues, epics, and sprint data from Jira Cloud',
      supported: true,
      configFields: ['domain', 'email', 'apiToken', 'projectKey'],
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Sync repositories, issues, and pull requests',
      supported: false,
      configFields: ['token', 'organization', 'repository'],
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send notifications and sync team communication',
      supported: false,
      configFields: ['webhookUrl', 'channel'],
    },
  ];

  res.json({ platforms });
});

// GET /api/platforms/:platformId (get platform details)
router.get('/:platformId', (req: AuthenticatedRequest, res: Response) => {
  const { platformId } = req.params;
  
  const platformDetails: Record<string, any> = {
    jira: {
      id: 'jira',
      name: 'Jira',
      description: 'Sync issues, epics, and sprint data from Jira Cloud',
      supported: true,
      configFields: [
        { name: 'domain', label: 'Jira Domain', type: 'text', placeholder: 'company.atlassian.net', required: true },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'your-email@company.com', required: true },
        { name: 'apiToken', label: 'API Token', type: 'password', placeholder: 'Your Jira API token', required: true },
        { name: 'projectKey', label: 'Project Key', type: 'text', placeholder: 'PROJ', required: true },
      ],
      documentation: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
    },
  };

  const platform = platformDetails[platformId.toLowerCase()];
  
  if (!platform) {
    return res.status(404).json({
      error: 'Platform not found',
      message: `Platform '${platformId}' is not supported`,
    });
  }

  res.json(platform);
});

export default router;