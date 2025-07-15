// backend/api-gateway/src/routes/trofosProxy.ts - TROFOS Proxy with TypeScript fixes
import { Router, Request, Response } from 'express';

const router = Router();

// Define interfaces for TROFOS API responses
interface TrofosProject {
  id: string;
  name: string;
  description?: string;
  status?: string;
  [key: string]: any;
}

interface TrofosProjectListData {
  projects: TrofosProject[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

interface TrofosProjectListResponse {
  success: boolean;
  data: TrofosProjectListData;
}

// TROFOS proxy to bypass CORS during development
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { serverUrl, apiKey, projectId } = req.body;
    
    if (!serverUrl || !apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: serverUrl and apiKey' 
      });
    }

    // Clean up server URL
    const baseUrl = serverUrl.replace(/\/$/, '');
    
    console.log('Testing TROFOS connection:', {
      baseUrl,
      hasApiKey: !!apiKey,
      keyLength: apiKey?.length
    });
    
    const steps = [];
    
    // Step 1: Test connection by fetching projects list
    try {
      console.log('Step 1: Testing TROFOS projects list endpoint...');
      
      const projectsResponse = await fetch(`${baseUrl}/v1/project/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey  // Use x-api-key header (NOT Bearer token)
        },
        body: JSON.stringify({
          option: "all",
          pageIndex: 0,
          pageSize: 10
        })
      });

      if (!projectsResponse.ok) {
        const errorText = await projectsResponse.text();
        console.error('TROFOS projects list failed:', {
          status: projectsResponse.status,
          statusText: projectsResponse.statusText,
          error: errorText
        });
        
        if (projectsResponse.status === 401) {
          return res.status(401).json({
            success: false,
            error: 'Invalid API key. Please check your TROFOS API key.',
            details: 'Authentication failed with TROFOS server'
          });
        }
        
        if (projectsResponse.status === 403) {
          return res.status(403).json({
            success: false,
            error: 'Access denied. Please check your TROFOS permissions.',
            details: 'Your API key does not have sufficient permissions'
          });
        }
        
        return res.status(projectsResponse.status).json({
          success: false,
          error: `TROFOS API error: ${projectsResponse.status} ${projectsResponse.statusText}`,
          details: errorText
        });
      }

      const projectsData = await projectsResponse.json() as TrofosProjectListResponse;
      console.log('✅ TROFOS projects list successful:', {
        projectCount: projectsData.data?.projects?.length || 0
      });
      
      steps.push({
        step: 'projects_list',
        status: 'success',
        message: `Found ${projectsData.data?.projects?.length || 0} projects`,
        details: projectsData.data
      });

    } catch (fetchError) {
      console.error('TROFOS fetch error:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Network error connecting to TROFOS server',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
      });
    }
    
    // Step 2: If projectId provided, test individual project endpoint
    if (projectId) {
      try {
        console.log(`Step 2: Testing individual project endpoint for ID: ${projectId}`);
        
        const projectResponse = await fetch(`${baseUrl}/v1/project/${projectId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          }
        });

        if (projectResponse.ok) {
          const projectData = await projectResponse.json() as TrofosProject;
          console.log('✅ TROFOS individual project successful');
          
          steps.push({
            step: 'individual_project',
            status: 'success',
            message: `Project "${projectData.name || projectId}" found`,
            details: projectData
          });
        } else {
          console.log(`⚠️ Individual project ${projectId} not accessible:`, projectResponse.status);
          steps.push({
            step: 'individual_project',
            status: 'warning',
            message: `Project ${projectId} not accessible (${projectResponse.status})`,
            details: null
          });
        }
      } catch (projectError) {
        console.log('⚠️ Individual project test failed:', projectError);
        steps.push({
          step: 'individual_project',
          status: 'warning',
          message: 'Could not test individual project access',
          details: projectError instanceof Error ? projectError.message : 'Unknown error'
        });
      }
    }

    // Return success response
    console.log('✅ TROFOS connection test completed successfully');
    
    return res.json({
      success: true,
      message: 'TROFOS connection successful',
      steps: steps,
      connectionInfo: {
        serverUrl: baseUrl,
        projectsFound: (steps[0]?.details as TrofosProjectListData)?.projects?.length || 0,
        apiVersion: 'v1'
      }
    });

  } catch (error) {
    console.error('❌ TROFOS connection test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'TROFOS connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get TROFOS projects list
router.post('/get-projects', async (req: Request, res: Response) => {
  try {
    const { serverUrl, apiKey } = req.body;
    
    if (!serverUrl || !apiKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: serverUrl and apiKey' 
      });
    }

    const baseUrl = serverUrl.replace(/\/$/, '');
    
    const response = await fetch(`${baseUrl}/v1/project/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        option: "all",
        pageIndex: 0,
        pageSize: 50  // Get more projects for selection
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `TROFOS API error: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }

    const data = await response.json() as TrofosProjectListResponse;
    
    // Transform TROFOS project data to standardized format
    const projects = (data.data?.projects || []).map((project: any) => ({
      id: project.id,
      name: project.name,
      description: project.description || `Project ${project.id}`,
      status: project.status || 'active'
    }));

    return res.json({
      projects: projects,
      totalCount: data.data?.totalCount || projects.length,
      serverInfo: {
        baseUrl: baseUrl,
        apiVersion: 'v1'
      }
    });

  } catch (error) {
    console.error('❌ Get TROFOS projects failed:', error);
    
    return res.status(500).json({
      error: 'Failed to get TROFOS projects',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;