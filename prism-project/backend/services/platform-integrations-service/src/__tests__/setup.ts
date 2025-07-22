// backend/services/platform-integrations-service/src/__tests__/setup.ts
// FIXED: Test setup file with proper environment variable configuration

import { jest } from '@jest/globals';

// ==============================================
// SMART ENVIRONMENT CONFIGURATION
// ==============================================
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_testing_only';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test_encryption_key_32_characters';
process.env.PORT = process.env.PORT || '4005';

// MongoDB URI Configuration for Testing
// Priority: MONGODB_URI_TEST > derived from MONGODB_URI > safe default
const getTestMongoUri = (): string => {
  // 1. Check for test-specific URI first
  if (process.env.MONGODB_URI_TEST) {
    console.log('Using test-specific MONGODB_URI_TEST');
    return process.env.MONGODB_URI_TEST;
  }
  
  // 2. Derive from existing MONGODB_URI but change database name
  if (process.env.MONGODB_URI) {
    const existingUri = process.env.MONGODB_URI;
    console.log('Deriving test URI from existing MONGODB_URI');
    
    // Extract base URI and replace database name with test version
    if (existingUri.includes('prism-integrations')) {
      return existingUri.replace('prism-integrations', 'prism-integrations-test');
    } else if (existingUri.includes('/')) {
      // Generic approach: add -test suffix to database name
      const lastSlashIndex = existingUri.lastIndexOf('/');
      const baseUri = existingUri.substring(0, lastSlashIndex + 1);
      const dbName = existingUri.substring(lastSlashIndex + 1);
      const queryIndex = dbName.indexOf('?');
      
      if (queryIndex !== -1) {
        const actualDbName = dbName.substring(0, queryIndex);
        const queryString = dbName.substring(queryIndex);
        return `${baseUri}${actualDbName}-test${queryString}`;
      } else {
        return `${baseUri}${dbName}-test`;
      }
    }
  }
  
  // 3. Safe default for testing (won't interfere with real data)
  console.log('Using safe default test database URI');
  return 'mongodb://localhost:27017/prism-platform-integrations-test';
};

// Set the test MongoDB URI
process.env.MONGODB_URI = getTestMongoUri();
console.log(`Test database URI configured: ${process.env.MONGODB_URI}`);

// Global test timeout for async operations
jest.setTimeout(10000);

// ==============================================
// DATABASE MOCKING - MongoDB/Mongoose
// ==============================================
jest.mock('mongoose', () => ({
  connect: jest.fn(() => Promise.resolve()),
  connection: {
    readyState: 1, // Connected state
    close: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    once: jest.fn(),
  },
  model: jest.fn(),
  Schema: jest.fn().mockImplementation(() => ({
    pre: jest.fn(),
    post: jest.fn(),
    index: jest.fn(),
  })),
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => ({
      toString: () => id || 'mock_object_id',
      toHexString: () => id || 'mock_object_id',
    })),
  },
}));

// ==============================================
// HTTP CLIENT MOCKING - Axios
// ==============================================
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: {
      baseURL: '',
      headers: {},
    },
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    headers: {},
  },
}));

// ==============================================
// CRYPTO MOCKING - For encryption/decryption
// ==============================================
jest.mock('crypto', () => ({
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'encrypted'),
    final: jest.fn(() => 'data'),
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(() => 'decrypted'),
    final: jest.fn(() => 'data'),
  })),
  randomBytes: jest.fn(() => Buffer.from('random_test_bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'hashed_value'),
  })),
}));

// ==============================================
// LOGGER MOCKING - Winston
// ==============================================
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
}));

// ==============================================
// PLATFORM CLIENT MOCKING
// ==============================================

// Mock Jira Client
export const mockJiraClient = {
  testConnection: jest.fn(),
  getProjectData: jest.fn(),
  getProject: jest.fn(),
  getIssues: jest.fn(),
};

// Mock Monday Client  
export const mockMondayClient = {
  testConnection: jest.fn(),
  getProjectData: jest.fn(),
  getBoards: jest.fn(),
  getBoardItems: jest.fn(),
};

// Mock TROFOS Client
export const mockTrofosClient = {
  testConnection: jest.fn(),
  getProjectData: jest.fn(),
  getProject: jest.fn(),
  getProjectMetrics: jest.fn(),
};

// ==============================================
// TEST DATA CONSTANTS
// ==============================================
export const TEST_USER_ID = 'test_user_123';
export const TEST_CONNECTION_ID = 'test_conn_456';
export const TEST_PROJECT_ID = 'test_proj_789';
export const DIFFERENT_USER_ID = 'different_user_999';
export const DIFFERENT_CONNECTION_ID = 'different_conn_888';

// Mock connection data for testing
export const MOCK_JIRA_CONNECTION = {
  id: TEST_CONNECTION_ID,
  userId: TEST_USER_ID,
  name: 'Test Jira Connection',
  platform: 'jira',
  config: {
    domain: 'test.atlassian.net',
    email: 'test@example.com',
    apiToken: 'test_jira_token',
    projectKey: 'TEST'
  },
  status: 'connected',
  projectCount: 2,
  createdAt: new Date('2024-01-01'),
  lastSync: new Date('2024-01-01'),
  metadata: {}
};

export const MOCK_MONDAY_CONNECTION = {
  id: 'monday_conn_123',
  userId: TEST_USER_ID,
  name: 'Test Monday Connection',
  platform: 'monday',
  config: {
    apiToken: 'test_monday_token',
    boardId: 'board_123'
  },
  status: 'connected',
  projectCount: 1,
  createdAt: new Date('2024-01-01'),
  lastSync: new Date('2024-01-01'),
  metadata: {}
};

export const MOCK_TROFOS_CONNECTION = {
  id: 'trofos_conn_456',
  userId: TEST_USER_ID,
  name: 'Test TROFOS Connection',
  platform: 'trofos',
  config: {
    serverUrl: 'https://test-trofos.example.com',
    apiKey: 'test_trofos_api_key',
    projectId: 'TROFOS_PROJ_123'
  },
  status: 'connected',
  projectCount: 3,
  createdAt: new Date('2024-01-01'),
  lastSync: new Date('2024-01-01'),
  metadata: {}
};

// Mock project data for testing
export const MOCK_JIRA_PROJECT_DATA = [
  {
    id: TEST_PROJECT_ID,
    name: 'Jira Test Project',
    platform: 'jira',
    status: 'Active',
    tasks: [
      {
        id: 'JIRA-1',
        name: 'Test Jira Task',
        status: 'In Progress',
        assignee: 'john@example.com',
        priority: 'High'
      }
    ],
    metrics: [
      { name: 'Total Issues', value: 1, type: 'count' }
    ],
    lastUpdated: '2024-01-01T00:00:00Z'
  }
];

export const MOCK_MONDAY_PROJECT_DATA = [
  {
    id: 'monday_proj_123',
    name: 'Monday Test Project',
    platform: 'monday',
    status: 'Active',
    tasks: [
      {
        id: 'MONDAY-1',
        name: 'Test Monday Task',
        status: 'Working on it',
        assignee: 'jane@example.com',
        group: 'Development'
      }
    ],
    metrics: [
      { name: 'Total Items', value: 1, type: 'count' }
    ],
    lastUpdated: '2024-01-01T00:00:00Z'
  }
];

export const MOCK_TROFOS_PROJECT_DATA = [
  {
    id: 'trofos_proj_456',
    name: 'TROFOS Test Project',
    platform: 'trofos',
    status: 'Active',
    tasks: [
      {
        id: 'TROFOS-1',
        name: 'Test TROFOS Task',
        status: 'In Sprint',
        assignee: 'alice@example.com',
        priority: 'Medium'
      }
    ],
    metrics: [
      { name: 'Sprint Velocity', value: 25, type: 'velocity' }
    ],
    lastUpdated: '2024-01-01T00:00:00Z'
  }
];

// ==============================================
// GLOBAL TEST CLEANUP
// ==============================================
beforeEach(() => {
  // Clear all mock calls before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Reset all mocks after each test
  jest.resetAllMocks();
});

afterAll(async () => {
  // Cleanup any open handles
  await new Promise(resolve => setTimeout(resolve, 100));
});

// ==============================================
// CUSTOM MATCHERS FOR BUG DETECTION
// ==============================================

// Custom matcher to check data isolation
expect.extend({
  toHaveIsolatedData(received: any[], platform: string) {
    const pass = received.every(item => item.platform === platform);
    return {
      message: () => 
        pass 
          ? `Expected data to NOT be isolated to platform "${platform}"`
          : `Expected all data items to have platform "${platform}", but found mixed platforms`,
      pass,
    };
  },
  
  toPreventDataBleeding(received: any[], expectedUserId: string) {
    const pass = received.every(item => 
      !item.userId || item.userId === expectedUserId
    );
    return {
      message: () => 
        pass 
          ? `Expected data bleeding to occur`
          : `Data bleeding detected: found data from different users`,
      pass,
    };
  }
});

// Extend Jest matchers type definition
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveIsolatedData(platform: string): R;
      toPreventDataBleeding(expectedUserId: string): R;
    }
  }
}