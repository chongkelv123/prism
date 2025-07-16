// get-connections.js - Find your actual connection IDs
const axios = require('axios');

const CONFIG = {
  API_BASE: 'http://localhost:3000/api',
  // Use your working JWT token
  TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODE3NWQ5YjEwYTJiZjQwMDFmMzM4OTMiLCJlbWFpbCI6ImNob25na2VsdkBnbWFpbC5jb20iLCJpYXQiOjE3NTI2Mjk0MjUsImV4cCI6MTc1MjcxNTgyNX0.lPLQ5hRO8kfjTB3boyHAtebhnPNPuTFcKRYJ1013Zew'
};

async function getYourConnections() {
  console.log('🔍 Finding Your Connection IDs');
  console.log('='.repeat(40));
  
  try {
    console.log('📡 Getting your connections...');
    const response = await axios.get(
      `${CONFIG.API_BASE}/connections`,
      {
        headers: { 'Authorization': `Bearer ${CONFIG.TOKEN}` },
        timeout: 10000
      }
    );

    if (response.data && Array.isArray(response.data)) {
      const connections = response.data;
      console.log(`✅ Found ${connections.length} connections:`);
      
      connections.forEach((conn, i) => {
        console.log(`\n  ${i + 1}. ${conn.name || 'Unnamed'}`);
        console.log(`     ID: ${conn.id}`);
        console.log(`     Platform: ${conn.platform}`);
        console.log(`     Status: ${conn.status}`);
        console.log(`     Projects: ${conn.projectCount || 0}`);
        
        if (conn.platform === 'jira') {
          console.log(`     🎯 JIRA CONNECTION - Use this ID: ${conn.id}`);
        }
      });
      
      const jiraConnections = connections.filter(c => c.platform === 'jira');
      
      if (jiraConnections.length > 0) {
        console.log(`\n🔧 UPDATE YOUR TEST SCRIPT:`);
        console.log(`   CONNECTION_ID: '${jiraConnections[0].id}'`);
      } else {
        console.log(`\n❌ No Jira connections found!`);
        console.log(`   You need to create a Jira connection first in the PRISM frontend.`);
      }
      
    } else {
      console.log('❌ Unexpected response format:', response.data);
    }
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Authentication failed - token might be expired');
    } else if (error.response?.status === 404) {
      console.log('❌ Connections endpoint not found - check API base URL');
    } else {
      console.log(`❌ Error: ${error.message}`);
      if (error.response?.data) {
        console.log(`   Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
}

getYourConnections();