// debug-project-data.js
// Debug the actual API response to see what's being returned
// Run with: node debug-project-data.js

const https = require('https');
const http = require('http');

// Configuration
const API_BASE = 'http://localhost:3000';
const JIRA_CONNECTION_ID = '684e1f2d5767b628243a8183'; // Your Jira connection ID
const MONDAY_CONNECTION_ID = '684e1cff5767b628243a8175'; // Your Monday.com connection ID
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODE3NWQ5YjEwYTJiZjQwMDFmMzM4OTMiLCJlbWFpbCI6ImNob25na2VsdkBnbWFpbC5jb20iLCJpYXQiOjE3NDk5Nzc0MDYsImV4cCI6MTc1MDA2MzgwNn0.aWL9KZbgblgYk2xgpMgr3e4XhEynEIgkd30R2AZOrxw'; // Replace with your JWT token

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PRISM-Debug/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Debug a specific connection's project data
 */
async function debugProjectData(connectionId, connectionName) {
  console.log(`\n🔍 Debugging ${connectionName} Project Data`);
  console.log('='.repeat(60));
  console.log(`Connection ID: ${connectionId}`);
  
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('❌ Please replace YOUR_JWT_TOKEN_HERE with your actual JWT token');
    return null;
  }
  
  const headers = { 'Authorization': `Bearer ${AUTH_TOKEN}` };
  
  try {
    const response = await makeRequest(
      `${API_BASE}/api/connections/${connectionId}/projects`, 
      { headers }
    );
    
    console.log(`📊 API Response Status: ${response.status}`);
    
    if (response.status === 200) {
      const projects = response.data;
      
      console.log(`📋 Response Type: ${Array.isArray(projects) ? 'Array' : typeof projects}`);
      console.log(`📊 Projects Count: ${Array.isArray(projects) ? projects.length : 'Not an array'}`);
      
      // Log raw response structure
      console.log(`\n🔍 Raw Response Structure:`);
      console.log(JSON.stringify(projects, null, 2));
      
      if (Array.isArray(projects)) {
        console.log(`\n📋 Project Analysis:`);
        projects.forEach((project, index) => {
          console.log(`\n  Project ${index + 1}:`);
          console.log(`    Type: ${typeof project}`);
          console.log(`    Is null/undefined: ${project == null}`);
          
          if (project != null) {
            console.log(`    Has 'id' property: ${'id' in project}`);
            console.log(`    Has 'name' property: ${'name' in project}`);
            console.log(`    Has 'platform' property: ${'platform' in project}`);
            console.log(`    All properties: [${Object.keys(project).join(', ')}]`);
            console.log(`    Values:`);
            console.log(`      id: ${project.id} (${typeof project.id})`);
            console.log(`      name: ${project.name} (${typeof project.name})`);
            console.log(`      platform: ${project.platform} (${typeof project.platform})`);
          } else {
            console.log(`    ❌ Project is null or undefined!`);
          }
        });
        
        // Check for undefined/null items
        const nullItems = projects.filter(p => p == null);
        const undefinedIds = projects.filter(p => p != null && !p.id);
        
        if (nullItems.length > 0) {
          console.log(`\n⚠️  Found ${nullItems.length} null/undefined projects!`);
        }
        
        if (undefinedIds.length > 0) {
          console.log(`\n⚠️  Found ${undefinedIds.length} projects without 'id' property!`);
          undefinedIds.forEach((project, index) => {
            console.log(`    Missing ID Project ${index + 1}:`, project);
          });
        }
        
        if (nullItems.length === 0 && undefinedIds.length === 0) {
          console.log(`\n✅ All projects have valid structure!`);
        }
      } else {
        console.log(`\n❌ Response is not an array! This will cause frontend errors.`);
      }
      
      return projects;
      
    } else if (response.status === 401) {
      console.log(`❌ Authentication failed - check your JWT token`);
    } else if (response.status === 404) {
      console.log(`❌ Connection not found - check the connection ID`);
    } else if (response.status === 500) {
      console.log(`❌ Server error:`);
      console.log(`   Message: ${response.data?.message || 'Unknown error'}`);
      console.log(`   Full response:`, response.data);
    } else {
      console.log(`❓ Unexpected status ${response.status}:`);
      console.log(`   Response:`, response.data);
    }
    
    return null;
    
  } catch (error) {
    console.log(`💥 Network error: ${error.message}`);
    return null;
  }
}

/**
 * Main debug function
 */
async function runProjectDataDebug() {
  console.log('🚀 PRISM Project Data Debug Tool');
  console.log('='.repeat(60));
  console.log(`📍 API Base: ${API_BASE}`);
  console.log(`🔗 Testing Connection IDs:`);
  console.log(`   Jira: ${JIRA_CONNECTION_ID}`);
  console.log(`   Monday.com: ${MONDAY_CONNECTION_ID}`);
  
  // Test Jira projects
  const jiraProjects = await debugProjectData(JIRA_CONNECTION_ID, 'Jira');
  
  // Test Monday.com projects  
  const mondayProjects = await debugProjectData(MONDAY_CONNECTION_ID, 'Monday.com');
  
  console.log('\n📊 SUMMARY');
  console.log('='.repeat(60));
  
  if (jiraProjects) {
    console.log(`✅ Jira: Returned ${jiraProjects.length} projects`);
  } else {
    console.log(`❌ Jira: Failed to get projects`);
  }
  
  if (mondayProjects) {
    console.log(`✅ Monday.com: Returned ${mondayProjects.length} projects`);
  } else {
    console.log(`❌ Monday.com: Failed to get projects`);
  }
  
  console.log('\n🔧 TROUBLESHOOTING:');
  console.log('   1. If no projects returned: Check backend transformation logic');
  console.log('   2. If null/undefined projects: Fix transformation to filter them out');
  console.log('   3. If missing id/name/platform: Fix transformation to add required fields');
  console.log('   4. If 500 errors: Check backend logs for detailed error messages');
  
  console.log('\n🎯 FRONTEND FIX:');
  console.log('   If projects have null/undefined items, add this to frontend:');
  console.log('   const validProjects = projects.filter(p => p && p.id && p.name);');
}

// Run the debug
runProjectDataDebug().catch(error => {
  console.error('\n💥 Debug script failed:', error.message);
  process.exit(1);
});