// src/routes/platformRoutes.ts - FIXED VERSION WITH CORRECT IMPORTS
import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
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

    // Basic validation based on platform
    let isValid = true;
    let message = 'Configuration is valid';

    switch (platformId) {
      case 'monday':
        if (!config.apiKey) {
          isValid = false;
          message = 'API Key is required';
        }
        break;
        
      case 'jira':
        if (!config.domain || !config.email || !config.apiToken || !config.projectKey) {
          isValid = false;
          message = 'Domain, email, API token, and project key are required';
        }
        break;
        
      case 'trofos':
        if (!config.serverUrl || !config.apiKey || !config.projectId) {
          isValid = false;
          message = 'Server URL, API key, and project ID are required';
        }
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

export default router;