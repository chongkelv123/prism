// test-fix.js - Simple test script to verify the fix
// Run this after applying the fix: node test-fix.js

const axios = require('axios');

const CONFIG = {
  API_BASE: 'http://localhost:3000/api',
  CONNECTION_ID: '6868f76408f6d530f38bd74f',  // ← UPDATED: Your actual Jira connection ID
  // Get your JWT token from browser dev tools: sessionStorage.getItem('token')
  // This should be a long JWT token starting with "eyJ...", NOT the TROFOS API key
  TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODE3NWQ5YjEwYTJiZjQwMDFmMzM4OTMiLCJlbWFpbCI6ImNob25na2VsdkBnbWFpbC5jb20iLCJpYXQiOjE3NTI2Mjk0MjUsImV4cCI6MTc1MjcxNTgyNX0.lPLQ5hRO8kfjTB3boyHAtebhnPNPuTFcKRYJ1013Zew'
};

async function testJiraProjectsFix() {
  console.log('🔧 Testing Jira Projects Fix');
  console.log('='.repeat(40));
  
  // Token validation removed since we have a valid JWT token

  try {
    console.log('📡 Calling projects endpoint...');
    const response = await axios.get(
      `${CONFIG.API_BASE}/connections/${CONFIG.CONNECTION_ID}/projects`,  // ← Now resolves to /api/connections/.../projects
      {
        headers: { 'Authorization': `Bearer ${CONFIG.TOKEN}` },
        timeout: 10000
      }
    );

    if (response.data?.projects) {
      const projects = response.data.projects;
      console.log(`✅ Got ${projects.length} projects`);
      
      // Check each project
      let hasUndefinedNames = false;
      projects.forEach((project, i) => {
        const nameStatus = project.name && project.name !== 'undefined' && project.name.trim().length > 0 ? '✅' : '❌';
        
        console.log(`  ${i + 1}. ${nameStatus} "${project.name}" (ID: ${project.id})`);
        
        if (!project.name || project.name === 'undefined' || project.name.trim().length === 0) {
          hasUndefinedNames = true;
        }
      });
      
      console.log('\n📊 Test Result:');
      if (hasUndefinedNames) {
        console.log('❌ FAILED: Some projects still have undefined/empty names');
        console.log('🔧 The fix needs to be applied or refined');
      } else {
        console.log('✅ SUCCESS: All projects have valid names!');
        console.log('🎉 The "undefined" issue has been fixed!');
      }
      
    } else {
      console.log('❌ No projects in response');
    }
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Authentication failed - check your token');
    } else if (error.response?.status === 404) {
      console.log('❌ Connection not found - check connection ID');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testJiraProjectsFix();