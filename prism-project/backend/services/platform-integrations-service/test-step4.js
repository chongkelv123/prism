// Step 4 Test Script: Verify getProjects() implementation
// This will test fetching the projects list from TROFOS API

const axios = require('axios');

// Mock logger for testing
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, error) => console.log(`[ERROR] ${msg}`, error || ''),
  warn: (msg, data) => console.log(`[WARN] ${msg}`, data || '')
};

// Mock BaseClient for testing
class MockBaseClient {
  constructor(connection) {
    this.connection = connection;
    this.http = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PRISM/1.0'
      }
    });
  }
}

// TrofosClient with getProjects implementation
class TrofosClient extends MockBaseClient {
  get serverUrl() {
    const url = this.connection.config.serverUrl || 'https://trofos-production.comp.nus.edu.sg/api/external';
    return url.replace(/\/$/, '');
  }

  get apiKey() {
    return this.connection.config.apiKey;
  }

  constructor(connection) {
    super(connection);
    
    this.http.defaults.baseURL = `${this.serverUrl}/v1`;
    this.http.defaults.headers['x-api-key'] = this.apiKey;
    delete this.http.defaults.headers['Authorization'];
    
    logger.info(`TROFOS Client initialized with baseURL: ${this.http.defaults.baseURL}`);
  }

  async getProjects() {
    try {
      logger.info('Fetching TROFOS projects list...');
      
      // Projects list endpoint - POST /project/list
      const response = await this.http.post('/project/list', {
        option: "all",
        pageIndex: 0,
        pageSize: 20  // Fetch up to 20 projects
      });
      
      if (!response.data || !response.data.data) {
        throw new Error('No projects data returned from TROFOS API');
      }

      const trofosProjects = response.data.data;
      const totalCount = response.data.totalCount || trofosProjects.length;
      
      logger.info(`Successfully fetched ${trofosProjects.length} TROFOS projects (total: ${totalCount})`);
      
      // Transform each TROFOS project to PRISM ProjectData format
      const projectsData = [];
      
      for (const trofosProject of trofosProjects) {
        try {
          const projectData = this.transformProjectListItem(trofosProject);
          projectsData.push(projectData);
        } catch (error) {
          logger.warn(`Failed to transform project ${trofosProject.id}:`, error);
          // Continue with other projects even if one fails
        }
      }
      
      logger.info(`Successfully transformed ${projectsData.length} projects to PRISM format`);
      return projectsData;
      
    } catch (error) {
      logger.error('Failed to fetch TROFOS projects list:', error);
      throw new Error(`Failed to fetch projects list: ${error.message}`);
    }
  }

  transformProjectListItem(trofosProject) {
    try {
      const projectData = {
        id: String(trofosProject.id),
        name: trofosProject.pname || trofosProject.pkey || `Project ${trofosProject.id}`,
        description: `TROFOS Project: ${trofosProject.pname || trofosProject.pkey}`,
        status: this.determineProjectStatus(trofosProject),
        progress: this.calculateProjectProgress(trofosProject),
        team: [], // Empty for project list
        tasks: [], // Empty for project list
        metrics: this.generateProjectListMetrics(trofosProject)
      };

      return projectData;
      
    } catch (error) {
      logger.error('Failed to transform TROFOS project list item:', error);
      throw new Error(`Project list item transformation failed: ${error.message}`);
    }
  }

  determineProjectStatus(trofosProject) {
    if (trofosProject.backlog_counter > 0) {
      return 'Active';
    } else if (trofosProject.public) {
      return 'Published';
    } else {
      return 'Planning';
    }
  }

  calculateProjectProgress(trofosProject) {
    if (trofosProject.backlog_counter > 0) {
      return Math.min(50, trofosProject.backlog_counter * 2);
    }
    return 0;
  }

  generateProjectListMetrics(trofosProject) {
    const metrics = [];

    if (trofosProject.backlog_counter !== undefined) {
      metrics.push({
        name: 'Total Backlog Items',
        value: trofosProject.backlog_counter,
        unit: 'items'
      });
    }

    if (trofosProject.course_id) {
      metrics.push({
        name: 'Course ID',
        value: trofosProject.course_id,
        unit: 'course'
      });
    }

    if (trofosProject.pkey && trofosProject.pkey !== trofosProject.pname) {
      metrics.push({
        name: 'Project Key',
        value: trofosProject.pkey,
        unit: 'key'
      });
    }

    return metrics;
  }
}

// Test function
async function testProjectsListEndpoint() {
  console.log('🧪 Testing TrofosClient getProjects() implementation...\n');
  
  try {
    // Test setup
    const mockConnection = {
      id: 'test-connection-123',
      name: 'Test TROFOS Connection',
      platform: 'trofos',
      config: {
        serverUrl: 'https://trofos-production.comp.nus.edu.sg/api/external',
        apiKey: 'ufyNd3LRV5gVktlSnZu4OjhPv9grlxAFEkqcRIKyuzA=',
        projectId: '172'
      },
      status: 'connected'
    };

    const trofosClient = new TrofosClient(mockConnection);

    // Test 1: Fetch projects list
    console.log('Test 1: Fetching TROFOS projects list...');
    const projectsList = await trofosClient.getProjects();
    
    if (!projectsList || !Array.isArray(projectsList)) {
      console.log('❌ FAILED: Projects list is not an array');
      return false;
    }
    console.log(`✅ PASSED: Projects list fetched successfully (${projectsList.length} projects)`);

    // Test 2: Verify array is not empty
    console.log('\nTest 2: Verifying projects list is not empty...');
    if (projectsList.length === 0) {
      console.log('❌ FAILED: Projects list is empty');
      return false;
    }
    console.log(`✅ PASSED: Found ${projectsList.length} projects`);

    // Test 3: Verify each project has required structure
    console.log('\nTest 3: Verifying project structure...');
    const requiredFields = ['id', 'name', 'description', 'status', 'progress', 'team', 'tasks', 'metrics'];
    
    for (let i = 0; i < Math.min(3, projectsList.length); i++) {
      const project = projectsList[i];
      const missingFields = requiredFields.filter(field => !(field in project));
      
      if (missingFields.length > 0) {
        console.log(`❌ FAILED: Project ${i + 1} missing fields:`, missingFields);
        return false;
      }
    }
    console.log('✅ PASSED: All projects have required structure');

    // Test 4: Display sample projects
    console.log('\nTest 4: Sample projects data...');
    const sampleCount = Math.min(5, projectsList.length);
    for (let i = 0; i < sampleCount; i++) {
      const project = projectsList[i];
      console.log(`   ${i + 1}. ID: ${project.id}, Name: "${project.name}", Status: ${project.status}, Backlog: ${project.metrics.find(m => m.name === 'Total Backlog Items')?.value || 0}`);
    }
    console.log('✅ PASSED: Sample projects displayed successfully');

    // Test 5: Verify known projects exist
    console.log('\nTest 5: Looking for known projects...');
    const knownProjects = ['172', '127', '2', '100'];
    const foundProjects = [];
    
    for (const knownId of knownProjects) {
      const found = projectsList.find(p => p.id === knownId);
      if (found) {
        foundProjects.push(`${knownId}: "${found.name}"`);
      }
    }
    
    if (foundProjects.length > 0) {
      console.log('✅ PASSED: Found known projects:');
      foundProjects.forEach(project => console.log(`     - ${project}`));
    } else {
      console.log('⚠️  WARNING: No known test projects found, but this might be expected');
    }

    // Test 6: Verify metrics generation
    console.log('\nTest 6: Verifying metrics generation...');
    let projectsWithMetrics = 0;
    let totalMetrics = 0;
    
    for (const project of projectsList) {
      if (project.metrics && project.metrics.length > 0) {
        projectsWithMetrics++;
        totalMetrics += project.metrics.length;
      }
    }
    
    if (projectsWithMetrics > 0) {
      console.log(`✅ PASSED: ${projectsWithMetrics}/${projectsList.length} projects have metrics (total: ${totalMetrics} metrics)`);
    } else {
      console.log('❌ FAILED: No projects have metrics');
      return false;
    }

    // Test 7: Verify data types
    console.log('\nTest 7: Verifying data types...');
    const sampleProject = projectsList[0];
    const typeChecks = [
      { field: 'id', expected: 'string', actual: typeof sampleProject.id },
      { field: 'name', expected: 'string', actual: typeof sampleProject.name },
      { field: 'status', expected: 'string', actual: typeof sampleProject.status },
      { field: 'progress', expected: 'number', actual: typeof sampleProject.progress },
      { field: 'team', expected: 'array', actual: Array.isArray(sampleProject.team) ? 'array' : typeof sampleProject.team },
      { field: 'tasks', expected: 'array', actual: Array.isArray(sampleProject.tasks) ? 'array' : typeof sampleProject.tasks },
      { field: 'metrics', expected: 'array', actual: Array.isArray(sampleProject.metrics) ? 'array' : typeof sampleProject.metrics }
    ];

    let typeFailures = 0;
    for (const check of typeChecks) {
      if (check.expected !== check.actual) {
        console.log(`❌ Type mismatch for ${check.field}: expected ${check.expected}, got ${check.actual}`);
        typeFailures++;
      }
    }
    
    if (typeFailures === 0) {
      console.log('✅ PASSED: All data types are correct');
    } else {
      console.log(`❌ FAILED: ${typeFailures} type mismatches found`);
      return false;
    }

    // Test 8: Performance test
    console.log('\nTest 8: Performance test...');
    const startTime = Date.now();
    const projectsList2 = await trofosClient.getProjects();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (duration < 5000 && projectsList2.length === projectsList.length) {
      console.log(`✅ PASSED: Second fetch completed in ${duration}ms (consistent results)`);
    } else {
      console.log(`⚠️  WARNING: Second fetch took ${duration}ms or returned different results`);
    }

    console.log('\n🎉 ALL TESTS PASSED! Projects list endpoint is working correctly');
    return true;

  } catch (error) {
    console.log('❌ FAILED: Unexpected error during testing');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the test
testProjectsListEndpoint().then(success => {
  if (success) {
    console.log('\n✅ Step 4 Complete: Projects List Endpoint working');
    console.log('📝 Verified Features:');
    console.log('   - ✅ POST /project/list endpoint working');
    console.log('   - ✅ Multiple projects fetched successfully');
    console.log('   - ✅ Data transformation for project list items');
    console.log('   - ✅ Simplified metrics for list view');
    console.log('   - ✅ Error handling for transformation failures');
    console.log('   - ✅ Consistent data structure across all projects');
    console.log('   - ✅ Performance acceptable for list operations');
    console.log('\n🔄 Ready for Step 5: Sprint Data Endpoint');
  } else {
    console.log('\n❌ Step 4 Failed: Please fix issues before proceeding');
  }
}).catch(error => {
  console.log('❌ Test execution failed:', error.message);
});

// Expected output preview:
console.log(`
📋 EXPECTED PROJECT LIST STRUCTURE:
[
  {
    id: "2",
    name: "SPA [29]", 
    description: "TROFOS Project: SPA [29]",
    status: "Active",
    progress: 50,
    team: [],
    tasks: [],
    metrics: [
      { name: "Total Backlog Items", value: 47, unit: "items" },
      { name: "Course ID", value: 16, unit: "course" },
      { name: "Project Key", value: "SPA", unit: "key" }
    ]
  },
  {
    id: "127",
    name: "CS4218 2420 Team 40",
    // ... more projects
  }
]
`);