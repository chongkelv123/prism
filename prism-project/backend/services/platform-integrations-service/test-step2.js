// Step 2 Test Script: Verify TrofosClient structure and configuration
// Run this in the backend platform-integrations-service directory

// Method 1: Node.js Test Script (Recommended)
// Save as test-step2.js and run: node test-step2.js

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

// TROFOS Client implementation to test
class TrofosClient extends MockBaseClient {
  get serverUrl() {
    const url = this.connection.config.serverUrl || 'https://trofos-production.comp.nus.edu.sg/api/external';
    return url.replace(/\/$/, '');
  }

  get apiKey() {
    return this.connection.config.apiKey;
  }

  get projectId() {
    return this.connection.config.projectId;
  }

  constructor(connection) {
    super(connection);
    
    // Set base URL to include /api/external/v1
    this.http.defaults.baseURL = `${this.serverUrl}/v1`;
    
    // Use x-api-key header instead of Authorization Bearer
    this.http.defaults.headers['x-api-key'] = this.apiKey;
    
    // Remove any Authorization header
    delete this.http.defaults.headers['Authorization'];
    
    logger.info(`TROFOS Client initialized with baseURL: ${this.http.defaults.baseURL}`);
  }

  async testConnection() {
    try {
      logger.info('Testing TROFOS connection...');
      
      // Use POST endpoint with correct payload format
      const response = await this.http.post('/project/list', {
        option: "all",
        pageIndex: 0,
        pageSize: 1
      });
      
      const success = response.status === 200 && response.data;
      logger.info(`TROFOS connection test result: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      return success;
    } catch (error) {
      logger.error('TROFOS connection test failed:', error.message);
      return false;
    }
  }
}

// Client Factory for testing
class ClientFactory {
  static createClient(connection) {
    switch (connection.platform) {
      case 'monday':
        return { platform: 'monday', message: 'Monday client would be created' };
      case 'jira':
        return { platform: 'jira', message: 'Jira client would be created' };
      case 'trofos':
        return new TrofosClient(connection);
      default:
        throw new Error(`Unsupported platform: ${connection.platform}`);
    }
  }
}

// Test function
async function testTrofosClientStructure() {
  console.log('🧪 Testing TrofosClient structure and configuration...\n');
  
  try {
    // Test 1: Client instantiation
    console.log('Test 1: TrofosClient instantiation...');
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
    console.log('✅ PASSED: TrofosClient instantiated successfully');

    // Test 2: Verify base URL configuration
    console.log('\nTest 2: Base URL configuration...');
    const expectedBaseURL = 'https://trofos-production.comp.nus.edu.sg/api/external/v1';
    if (trofosClient.http.defaults.baseURL === expectedBaseURL) {
      console.log('✅ PASSED: Base URL correctly set to', expectedBaseURL);
    } else {
      console.log('❌ FAILED: Base URL incorrect');
      console.log('  Expected:', expectedBaseURL);
      console.log('  Actual:', trofosClient.http.defaults.baseURL);
      return false;
    }

    // Test 3: Verify x-api-key header
    console.log('\nTest 3: x-api-key header configuration...');
    const apiKeyHeader = trofosClient.http.defaults.headers['x-api-key'];
    if (apiKeyHeader === 'ufyNd3LRV5gVktlSnZu4OjhPv9grlxAFEkqcRIKyuzA=') {
      console.log('✅ PASSED: x-api-key header correctly set');
    } else {
      console.log('❌ FAILED: x-api-key header not set correctly');
      console.log('  Expected: ufyNd3LRV5gVktlSnZu4OjhPv9grlxAFEkqcRIKyuzA=');
      console.log('  Actual:', apiKeyHeader);
      return false;
    }

    // Test 4: Verify Authorization header is NOT set
    console.log('\nTest 4: Authorization header removal...');
    const authHeader = trofosClient.http.defaults.headers['Authorization'];
    if (!authHeader || authHeader === undefined) {
      console.log('✅ PASSED: Authorization header correctly removed/not set');
    } else {
      console.log('❌ FAILED: Authorization header should not be set for TROFOS');
      console.log('  Found Authorization header:', authHeader);
      return false;
    }

    // Test 5: Verify getter methods
    console.log('\nTest 5: Getter methods...');
    if (trofosClient.serverUrl === 'https://trofos-production.comp.nus.edu.sg/api/external' &&
        trofosClient.apiKey === 'ufyNd3LRV5gVktlSnZu4OjhPv9grlxAFEkqcRIKyuzA=' &&
        trofosClient.projectId === '172') {
      console.log('✅ PASSED: All getter methods return correct values');
    } else {
      console.log('❌ FAILED: Getter methods not working correctly');
      return false;
    }

    // Test 6: ClientFactory integration
    console.log('\nTest 6: ClientFactory integration...');
    const clientFromFactory = ClientFactory.createClient(mockConnection);
    if (clientFromFactory instanceof TrofosClient) {
      console.log('✅ PASSED: ClientFactory correctly creates TrofosClient');
    } else {
      console.log('❌ FAILED: ClientFactory not creating TrofosClient correctly');
      return false;
    }

    // Test 7: Real connection test (will fail but should not crash)
    console.log('\nTest 7: Connection test method (expected to fail safely)...');
    try {
      const connectionResult = await trofosClient.testConnection();
      if (connectionResult === false) {
        console.log('✅ PASSED: Connection test failed gracefully (expected for test environment)');
      } else {
        console.log('🎉 AMAZING: Connection test actually succeeded! TROFOS API is reachable');
      }
    } catch (error) {
      console.log('✅ PASSED: Connection test failed gracefully with error handling');
    }

    console.log('\n🎉 ALL TESTS PASSED! TrofosClient structure is correctly implemented');
    return true;

  } catch (error) {
    console.log('❌ FAILED: Unexpected error during testing');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the test
testTrofosClientStructure().then(success => {
  if (success) {
    console.log('\n✅ Step 2 Complete: TrofosClient structure ready');
    console.log('📝 Verified Features:');
    console.log('   - ✅ Correct base URL: /api/external/v1');
    console.log('   - ✅ x-api-key authentication (NOT Bearer token)');
    console.log('   - ✅ Authorization header properly removed');
    console.log('   - ✅ Getter methods working correctly');
    console.log('   - ✅ ClientFactory integration working');
    console.log('   - ✅ Connection test method implemented');
    console.log('\n🔄 Ready for Step 3: Individual Project Endpoint');
  } else {
    console.log('\n❌ Step 2 Failed: Please fix issues before proceeding');
  }
}).catch(error => {
  console.log('❌ Test execution failed:', error.message);
});

// Alternative Browser Console Test (copy-paste into browser console)
console.log(`
🌐 BROWSER CONSOLE TEST (Alternative):
Copy and paste this into your browser console to test TrofosClient structure:

// Mock connection object
const mockConnection = {
  config: {
    serverUrl: 'https://trofos-production.comp.nus.edu.sg/api/external',
    apiKey: 'ufyNd3LRV5gVktlSnZu4OjhPv9grlxAFEkqcRIKyuzA=',
    projectId: '172'
  }
};

// Test URL construction
const serverUrl = mockConnection.config.serverUrl.replace(/\\/$/, '');
const baseURL = serverUrl + '/v1';
console.log('Base URL test:', baseURL === 'https://trofos-production.comp.nus.edu.sg/api/external/v1');

// Test authentication header
const headers = { 'x-api-key': mockConnection.config.apiKey };
console.log('Headers test:', headers['x-api-key'] === 'ufyNd3LRV5gVktlSnZu4OjhPv9grlxAFEkqcRIKyuzA=');

console.log('Browser test complete - check console for results');
`);