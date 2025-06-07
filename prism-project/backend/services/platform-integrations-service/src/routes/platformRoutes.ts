// backend/services/platform-integrations-service/src/routes/platformRoutes.ts
// ENHANCED VERSION with proper validation and axios import
import { Router } from 'express';
import axios from 'axios'; // IMPORTANT: Add this import
import { authenticateJWT } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Enhanced Jira validation function
async function validateJiraConnection(config: any): Promise<{valid: boolean, message: string, details?: any}> {
  console.log('🧪 Testing Jira connection to', `https://${config.domain}/rest/api/3...`);
  console.log('🔧 Created auth header for user:', config.email);
  
  try {
    // Step 1: Validate input parameters
    console.log('🔍 Step 0: Validating input parameters...');
    
    if (!config.domain || !config.email || !config.apiToken || !config.projectKey) {
      const missing = [];
      if (!config.domain) missing.push('domain');
      if (!config.email) missing.push('email');
      if (!config.apiToken) missing.push('apiToken');
      if (!config.projectKey) missing.push('projectKey');
      
      const error = `Missing required parameters: ${missing.join(', ')}`;
      console.error('❌', error);
      return { valid: false, message: error };
    }
    
    // Clean and trim all inputs
    const cleanDomain = config.domain.replace(/^https?:\/\//, '').trim();
    const cleanEmail = config.email.trim();
    const cleanApiToken = config.apiToken.trim();
    const cleanProjectKey = config.projectKey.trim();
    
    console.log('🔧 Using cleaned domain:', cleanDomain);
    console.log('🔧 Using email:', cleanEmail);
    console.log('🔧 Using project key:', cleanProjectKey);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const error = 'Invalid email format';
      console.error('❌', error);
      return { valid: false, message: error };
    }
    
    // Validate API token (should be a reasonable length)
    if (cleanApiToken.length < 10) {
      const error = 'API token appears to be too short';
      console.error('❌', error);
      return { valid: false, message: error };
    }
    
    // Create authentication header
    const auth = Buffer.from(`${cleanEmail}:${cleanApiToken}`).toString('base64');
    console.log('🔑 Auth header created (first 30 chars):', `Basic ${auth}`.substring(0, 30) + '...');
    
    // Create axios instance with proper configuration
    const axiosConfig = {
      timeout: 30000,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'PRISM-Integration/1.0'
      }
    };
    
    // Step 1: Test authentication by calling /myself
    console.log('🔍 Step 1: Testing Jira authentication...');
    const authUrl = `https://${cleanDomain}/rest/api/3/myself`;
    console.log('🌐 Auth URL:', authUrl);
    
    let authResponse;
    try {
      authResponse = await axios.get(authUrl, axiosConfig);
      console.log('✅ Authentication successful! Response status:', authResponse.status);
      console.log('👤 Logged in as:', authResponse.data.displayName, `(${authResponse.data.emailAddress})`);
    } catch (authError: any) {
      console.error('❌ Authentication failed:', authError.response?.status, authError.response?.statusText);
      console.error('❌ Auth error details:', authError.response?.data);
      
      if (authError.response?.status === 401) {
        return { 
          valid: false, 
          message: 'Invalid email or API token. Please check your credentials.',
          details: {
            status: authError.response.status,
            error: authError.response.data
          }
        };
      } else if (authError.response?.status === 403) {
        return { 
          valid: false, 
          message: 'Access forbidden. Please check your Jira permissions.',
          details: {
            status: authError.response.status,
            error: authError.response.data
          }
        };
      } else if (authError.code === 'ENOTFOUND') {
        return { 
          valid: false, 
          message: `Domain "${cleanDomain}" not found. Please check your Jira domain.`,
          details: {
            code: authError.code,
            hostname: authError.hostname
          }
        };
      } else {
        return { 
          valid: false, 
          message: `Connection failed: ${authError.message}`,
          details: {
            code: authError.code,
            status: authError.response?.status
          }
        };
      }
    }
    
    // Step 2: Test access to the specific project
    console.log('🔍 Step 2: Testing access to project "' + cleanProjectKey + '"...');
    const projectUrl = `https://${cleanDomain}/rest/api/3/project/${cleanProjectKey}`;
    console.log('🌐 Project URL:', projectUrl);
    
    let projectResponse;
    try {
      projectResponse = await axios.get(projectUrl, axiosConfig);
      console.log('✅ Project access successful! Response status:', projectResponse.status);
      console.log('📁 Found project:', `"${projectResponse.data.name}" (${projectResponse.data.key})`);
    } catch (projectError: any) {
      console.error('❌ Project access failed:', projectError.response?.status, projectError.response?.statusText);
      console.error('❌ Project error details:', projectError.response?.data);
      
      if (projectError.response?.status === 404) {
        return { 
          valid: false, 
          message: `Project "${cleanProjectKey}" not found. Please check the project key.`,
          details: {
            status: projectError.response.status,
            projectKey: cleanProjectKey
          }
        };
      } else if (projectError.response?.status === 403) {
        return { 
          valid: false, 
          message: `No access to project "${cleanProjectKey}". Please check your permissions.`,
          details: {
            status: projectError.response.status,
            projectKey: cleanProjectKey
          }
        };
      } else {
        return { 
          valid: false, 
          message: `Failed to access project: ${projectError.message}`,
          details: {
            code: projectError.code,
            status: projectError.response?.status
          }
        };
      }
    }
    
    console.log('🎉 All Jira connection tests passed!');
    
    return { 
      valid: true, 
      message: 'Connection successful! Your credentials are working correctly.',
      details: {
        user: authResponse.data.displayName,
        email: authResponse.data.emailAddress,
        project: projectResponse.data.name,
        projectKey: projectResponse.data.key
      }
    };
    
  } catch (error: any) {
    console.error('❌ Unexpected error during Jira validation:', error);
    return { 
      valid: false, 
      message: `Unexpected error: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack
      }
    };
  }
}

// Enhanced Monday.com validation function
async function validateMondayConnection(config: any): Promise<{valid: boolean, message: string, details?: any}> {
  console.log('🧪 Testing Monday.com connection...');
  
  try {
    if (!config.apiKey) {
      return { valid: false, message: 'API Key is required' };
    }
    
    const cleanApiKey = config.apiKey.trim();
    console.log('🔧 Using API key (first 10 chars):', cleanApiKey.substring(0, 10) + '...');
    
    const axiosConfig = {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PRISM-Integration/1.0'
      }
    };
    
    const query = `query { me { name email } }`;
    const response = await axios.post('https://api.monday.com/v2', { query }, axiosConfig);
    
    if (response.data?.data?.me) {
      console.log('✅ Monday.com authentication successful!');
      console.log('👤 Logged in as:', response.data.data.me.name, `(${response.data.data.me.email})`);
      
      return {
        valid: true,
        message: 'Connection successful! Your Monday.com API key is working correctly.',
        details: {
          user: response.data.data.me.name,
          email: response.data.data.me.email
        }
      };
    } else {
      return { valid: false, message: 'Invalid API response from Monday.com' };
    }
    
  } catch (error: any) {
    console.error('❌ Monday.com connection test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return { valid: false, message: 'Invalid API key. Please check your Monday.com API key.' };
    } else {
      return { valid: false, message: `Connection failed: ${error.message}` };
    }
  }
}

// Enhanced TROFOS validation function
async function validateTrofosConnection(config: any): Promise<{valid: boolean, message: string, details?: any}> {
  console.log('🧪 Testing TROFOS connection...');
  
  try {
    if (!config.serverUrl || !config.apiKey || !config.projectId) {
      const missing = [];
      if (!config.serverUrl) missing.push('serverUrl');
      if (!config.apiKey) missing.push('apiKey');
      if (!config.projectId) missing.push('projectId');
      
      return { valid: false, message: `Missing required parameters: ${missing.join(', ')}` };
    }
    
    const cleanServerUrl = config.serverUrl.replace(/\/$/, '').trim();
    const cleanApiKey = config.apiKey.trim();
    const cleanProjectId = config.projectId.trim();
    
    console.log('🔧 Using server URL:', cleanServerUrl);
    console.log('🔧 Using project ID:', cleanProjectId);
    
    const axiosConfig = {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PRISM-Integration/1.0'
      }
    };
    
    // Test with a simple project list request
    const response = await axios.post(`${cleanServerUrl}/v1/project`, {
      pageNum: 1,
      pageSize: 1,
      sort: 'name',
      direction: 'ASC'
    }, axiosConfig);
    
    if (response.status === 200) {
      console.log('✅ TROFOS connection successful!');
      
      return {
        valid: true,
        message: 'Connection successful! Your TROFOS credentials are working correctly.',
        details: {
          serverUrl: cleanServerUrl,
          projectId: cleanProjectId
        }
      };
    } else {
      return { valid: false, message: 'Unexpected response from TROFOS server' };
    }
    
  } catch (error: any) {
    console.error('❌ TROFOS connection test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return { valid: false, message: 'Invalid API key. Please check your TROFOS API key.' };
    } else if (error.code === 'ENOTFOUND') {
      return { valid: false, message: 'Server not found. Please check your TROFOS server URL.' };
    } else {
      return { valid: false, message: `Connection failed: ${error.message}` };
    }
  }
}

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

    console.log(`🔍 Validating configuration for platform: ${platformId}`);
    console.log('📝 Config keys provided:', Object.keys(config || {}));

    if (!config) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Configuration is required' 
      });
    }

    let result;

    switch (platformId) {
      case 'monday':
        result = await validateMondayConnection(config);
        break;
        
      case 'jira':
        result = await validateJiraConnection(config);
        break;
        
      case 'trofos':
        result = await validateTrofosConnection(config);
        break;
        
      default:
        result = { valid: false, message: 'Unsupported platform' };
    }

    console.log(`📊 Platform validation result for ${platformId}:`, result.valid ? 'VALID' : 'INVALID');
    if (!result.valid) {
      console.log('❌ Validation error:', result.message);
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('💥 Platform validation error:', error);
    res.status(500).json({ 
      valid: false, 
      message: 'Validation failed due to server error',
      details: error.message
    });
  }
});

export default router;