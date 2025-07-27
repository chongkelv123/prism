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

interface JiraProjectSearchResult {
  values: JiraProject[];
  total: number;
  [key: string]: any;
}

// Simple Jira proxy to bypass CORS during development
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    // ✅ UPDATED: Remove projectKey requirement
    const { email, apiToken, domain } = req.body;
    
    if (!email || !apiToken || !domain) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email, apiToken, and domain are required' 
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

    // ✅ UPDATED: Step 2 - Test project access (get accessible projects instead of testing specific project)
    try {
      const projectsResponse = await fetch(`${baseUrl}/rest/api/3/project/search?maxResults=50`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!projectsResponse.ok) {
        throw new Error(`Project access failed (${projectsResponse.status}): ${projectsResponse.statusText}`);
      }

      const projectsData = await projectsResponse.json() as JiraProjectSearchResult;
      const accessibleProjects = projectsData.values || [];
      
      steps.push({
        step: 'Testing project access...',
        status: 'success',
        message: `Found ${accessibleProjects.length} accessible project(s)`,
        details: {
          projectCount: accessibleProjects.length,
          projects: accessibleProjects.slice(0, 5).map(p => ({ // Show first 5 projects
            key: p.key,
            name: p.name,
            id: p.id
          }))
        }
      });
      
    } catch (error: any) {
      steps.push({
        step: 'Testing project access...',
        status: 'error',
        message: error.message
      });
      return res.json({ success: false, steps, error: error.message });
    }

    // ✅ UPDATED: Step 3 - Test data retrieval (use first available project or general search)
    try {
      // Try to get projects first to test with
      const projectsResponse = await fetch(`${baseUrl}/rest/api/3/project/search?maxResults=1`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json() as JiraProjectSearchResult;
        const firstProject = projectsData.values?.[0];
        
        if (firstProject) {
          // Test data retrieval with first available project
          const searchResponse = await fetch(`${baseUrl}/rest/api/3/search?jql=project=${firstProject.key}&maxResults=10`, {
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

          const searchData = await searchResponse.json() as JiraProjectSearchResult;
          steps.push({
            step: 'Testing data retrieval...',
            status: 'success',
            message: `Successfully retrieved ${searchData.total || 0} issues from project ${firstProject.key}`,
            details: {
              projectKey: firstProject.key,
              projectName: firstProject.name,
              issueCount: searchData.total || 0
            }
          });
        } else {
          // No projects found, but auth worked
          steps.push({
            step: 'Testing data retrieval...',
            status: 'success',
            message: 'Authentication successful, but no projects found. You may need project permissions.',
            details: { projectCount: 0 }
          });
        }
      } else {
        // Fallback: Just test general search capability
        const searchResponse = await fetch(`${baseUrl}/rest/api/3/search?jql=created>=-1d&maxResults=1`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!searchResponse.ok) {
          throw new Error(`Data retrieval test failed (${searchResponse.status}): ${searchResponse.statusText}`);
        }

        steps.push({
          step: 'Testing data retrieval...',
          status: 'success',
          message: 'Data retrieval capability confirmed',
          details: { testType: 'general_search' }
        });
      }
      
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