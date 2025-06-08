// backend/api-gateway/src/routes/jiraProxy.ts
import { Router, Request, Response } from 'express';

const router = Router();

// Define interfaces for Jira API responses
interface JiraUser {
  displayName: string;
  emailAddress: string;
  accountId: string;
  [key: string]: any;
}

interface JiraProject {
  name: string;
  key: string;
  id: string;
  [key: string]: any;
}

interface JiraSearchResult {
  total: number;
  issues: any[];
  [key: string]: any;
}

// Simple Jira proxy to bypass CORS during development
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { email, apiToken, domain, projectKey } = req.body;
    
    if (!email || !apiToken || !domain || !projectKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Create Basic Auth header (same as your PowerShell script)
    const authString = `${email}:${apiToken}`;
    const authBytes = Buffer.from(authString).toString('base64');
    const authHeader = `Basic ${authBytes}`;
    
    const baseUrl = `https://${domain}`;
    const steps = [];
    
    // Step 1: Test connection (/myself endpoint)
    console.log('Testing Jira connection for:', email);
    try {
      const userResponse = await fetch(`${baseUrl}/rest/api/3/myself`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`Authentication failed (${userResponse.status}): ${userResponse.statusText}`);
      }

      const userData = await userResponse.json() as JiraUser;
      steps.push({
        step: 'Testing connection to Jira...',
        status: 'success',
        message: `Connected as ${userData.displayName} (${userData.emailAddress})`,
        details: userData
      });
      
    } catch (error: any) {
      steps.push({
        step: 'Testing connection to Jira...',
        status: 'error', 
        message: error.message
      });
      return res.json({ success: false, steps, error: error.message });
    }

    // Step 2: Test project access
    try {
      const projectResponse = await fetch(`${baseUrl}/rest/api/3/project/${projectKey}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!projectResponse.ok) {
        if (projectResponse.status === 404) {
          throw new Error(`Project '${projectKey}' not found or not accessible`);
        }
        throw new Error(`Project access failed (${projectResponse.status}): ${projectResponse.statusText}`);
      }

      const projectData = await projectResponse.json() as JiraProject;
      steps.push({
        step: 'Testing project access...',
        status: 'success',
        message: `Project access granted: ${projectData.name} (${projectData.key})`,
        details: projectData
      });
      
    } catch (error: any) {
      steps.push({
        step: 'Testing project access...',
        status: 'error',
        message: error.message
      });
      return res.json({ success: false, steps, error: error.message });
    }

    // Step 3: Test data retrieval  
    try {
      const searchResponse = await fetch(`${baseUrl}/rest/api/3/search?jql=project=${projectKey}&maxResults=10`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!searchResponse.ok) {
        throw new Error(`Data retrieval failed (${searchResponse.status}): ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json() as JiraSearchResult;
      steps.push({
        step: 'Testing data retrieval...',
        status: 'success',
        message: `Successfully retrieved ${searchData.total} issues from project ${projectKey}`,
        details: searchData
      });
      
    } catch (error: any) {
      steps.push({
        step: 'Testing data retrieval...',
        status: 'error',
        message: error.message
      });
      return res.json({ success: false, steps, error: error.message });
    }

    // All tests passed
    return res.json({ success: true, steps });

  } catch (error: any) {
    console.error('Jira proxy error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;