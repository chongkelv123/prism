# PowerShell script to create all missing TypeScript files for Platform Integrations Service
# Run this from: backend/services/platform-integrations-service/

Write-Host "🔧 Creating all missing TypeScript files..." -ForegroundColor Green

# Ensure we're in the right directory
if (!(Test-Path "src")) {
    Write-Host "❌ Error: src directory not found. Make sure you're in the platform-integrations-service directory." -ForegroundColor Red
    exit 1
}

# 1. Create src/routes/platformRoutes.ts
Write-Host "📝 Creating src/routes/platformRoutes.ts..." -ForegroundColor Yellow
$platformRoutesContent = @'
import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

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

    logger.info(`Validating configuration for platform: ${platformId}`);

    if (!config) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Configuration is required' 
      });
    }

    // Basic validation based on platform
    let isValid = true;
    let message = 'Configuration is valid';

    switch (platformId) {
      case 'monday':
        if (!config.apiKey) {
          isValid = false;
          message = 'API Key is required';
        }
        break;
        
      case 'jira':
        if (!config.domain || !config.email || !config.apiToken || !config.projectKey) {
          isValid = false;
          message = 'Domain, email, API token, and project key are required';
        }
        break;
        
      case 'trofos':
        if (!config.serverUrl || !config.apiKey || !config.projectId) {
          isValid = false;
          message = 'Server URL, API key, and project ID are required';
        }
        break;
        
      default:
        isValid = false;
        message = 'Unsupported platform';
    }

    logger.info(`Platform validation result for ${platformId}: ${isValid ? 'valid' : 'invalid'}`);
    res.json({ valid: isValid, message });
  } catch (error) {
    logger.error('Platform validation error:', error);
    res.status(500).json({ 
      valid: false, 
      message: 'Validation failed' 
    });
  }
});

export default router;
'@

$platformRoutesContent | Out-File -FilePath "src/routes/platformRoutes.ts" -Encoding UTF8
Write-Host "  ✓ src/routes/platformRoutes.ts created" -ForegroundColor Gray

# 2. Create src/models/Connection.ts (COMPLETE VERSION)
Write-Host "📝 Creating src/models/Connection.ts..." -ForegroundColor Yellow
$connectionModelContent = @'
import { Schema, model, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface IConnection extends Document {
  userId: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  config: Record<string, any>;
  encryptedConfig: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  lastSyncError?: string;
  projectCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema = new Schema<IConnection>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  platform: { 
    type: String, 
    required: true, 
    enum: ['monday', 'jira', 'trofos'] 
  },
  encryptedConfig: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['connected', 'disconnected', 'error'],
    default: 'disconnected'
  },
  lastSync: { type: Date },
  lastSyncError: { type: String },
  projectCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual for config (decrypt on access)
connectionSchema.virtual('config').get(function() {
  try {
    return JSON.parse(decrypt(this.encryptedConfig));
  } catch (error) {
    return {};
  }
});

// Set config (encrypt on save)
connectionSchema.virtual('config').set(function(value: Record<string, any>) {
  this.encryptedConfig = encrypt(JSON.stringify(value));
});

// Update timestamp on save
connectionSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Ensure virtual fields are serialized
connectionSchema.set('toJSON', { virtuals: true });
connectionSchema.set('toObject', { virtuals: true });

export const Connection = model<IConnection>('Connection', connectionSchema);
'@

$connectionModelContent | Out-File -FilePath "src/models/Connection.ts" -Encoding UTF8
Write-Host "  ✓ src/models/Connection.ts created" -ForegroundColor Gray

# 3. Create src/services/ConnectionService.ts
Write-Host "📝 Creating src/services/ConnectionService.ts..." -ForegroundColor Yellow
$connectionServiceContent = @'
import { Connection, IConnection } from '../models/Connection';
import { ClientFactory, BaseClient, PlatformConnection } from '../clients/BaseClient';
import logger from '../utils/logger';

export class ConnectionService {
  async createConnection(userId: string, connectionData: {
    name: string;
    platform: 'monday' | 'jira' | 'trofos';
    config: Record<string, any>;
  }): Promise<IConnection> {
    try {
      // Test the connection first
      const tempConnection: PlatformConnection = {
        id: 'temp',
        name: connectionData.name,
        platform: connectionData.platform,
        config: connectionData.config,
        status: 'disconnected'
      };

      const client = ClientFactory.createClient(tempConnection);
      const isConnected = await client.testConnection();

      if (!isConnected) {
        throw new Error('Connection test failed. Please check your credentials.');
      }

      // Get project count
      let projectCount = 0;
      try {
        const projects = await client.getProjects();
        projectCount = projects.length;
      } catch (error) {
        logger.warn('Could not get project count, defaulting to 0:', error);
      }

      // Create the connection
      const connection = new Connection({
        userId,
        name: connectionData.name,
        platform: connectionData.platform,
        config: connectionData.config, // This will be encrypted automatically
        status: 'connected',
        projectCount,
        lastSync: new Date()
      });

      await connection.save();
      logger.info(`Connection created: ${connection.id} for user ${userId}`);
      
      return connection;
    } catch (error) {
      logger.error('Failed to create connection:', error);
      throw error;
    }
  }

  async getConnections(userId: string): Promise<IConnection[]> {
    try {
      return await Connection.find({ userId }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Failed to get connections:', error);
      throw error;
    }
  }

  async getConnection(userId: string, connectionId: string): Promise<IConnection | null> {
    try {
      return await Connection.findOne({ _id: connectionId, userId });
    } catch (error) {
      logger.error('Failed to get connection:', error);
      throw error;
    }
  }

  async testConnection(userId: string, connectionId: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(userId, connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const platformConnection: PlatformConnection = {
        id: connection.id,
        name: connection.name,
        platform: connection.platform,
        config: connection.config,
        status: connection.status
      };

      const client = ClientFactory.createClient(platformConnection);
      const isConnected = await client.testConnection();

      // Update connection status
      connection.status = isConnected ? 'connected' : 'error';
      connection.lastSync = new Date();
      if (!isConnected) {
        connection.lastSyncError = 'Connection test failed';
      }
      await connection.save();

      return isConnected;
    } catch (error) {
      logger.error('Failed to test connection:', error);
      
      // Update connection with error status
      try {
        const connection = await this.getConnection(userId, connectionId);
        if (connection) {
          connection.status = 'error';
          connection.lastSyncError = error instanceof Error ? error.message : 'Unknown error';
          await connection.save();
        }
      } catch (updateError) {
        logger.error('Failed to update connection status:', updateError);
      }
      
      return false;
    }
  }

  async syncConnection(userId: string, connectionId: string): Promise<void> {
    try {
      const connection = await this.getConnection(userId, connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const platformConnection: PlatformConnection = {
        id: connection.id,
        name: connection.name,
        platform: connection.platform,
        config: connection.config,
        status: connection.status
      };

      const client = ClientFactory.createClient(platformConnection);
      
      // Test connection first
      const isConnected = await client.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed during sync');
      }

      // Get updated project data
      const projects = await client.getProjects();
      
      // Update connection
      connection.status = 'connected';
      connection.projectCount = projects.length;
      connection.lastSync = new Date();
      connection.lastSyncError = undefined;
      await connection.save();

      logger.info(`Connection synced: ${connectionId}`);
    } catch (error) {
      logger.error('Failed to sync connection:', error);
      
      // Update connection with error
      try {
        const connection = await this.getConnection(userId, connectionId);
        if (connection) {
          connection.status = 'error';
          connection.lastSyncError = error instanceof Error ? error.message : 'Sync failed';
          await connection.save();
        }
      } catch (updateError) {
        logger.error('Failed to update connection after sync error:', updateError);
      }
      
      throw error;
    }
  }

  async deleteConnection(userId: string, connectionId: string): Promise<void> {
    try {
      const result = await Connection.deleteOne({ _id: connectionId, userId });
      if (result.deletedCount === 0) {
        throw new Error('Connection not found');
      }
      logger.info(`Connection deleted: ${connectionId}`);
    } catch (error) {
      logger.error('Failed to delete connection:', error);
      throw error;
    }
  }

  async getProjectData(userId: string, connectionId: string, projectId?: string) {
    try {
      const connection = await this.getConnection(userId, connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const platformConnection: PlatformConnection = {
        id: connection.id,
        name: connection.name,
        platform: connection.platform,
        config: connection.config,
        status: connection.status
      };

      const client = ClientFactory.createClient(platformConnection);
      
      if (projectId) {
        return await client.getProject(projectId);
      } else {
        return await client.getProjects();
      }
    } catch (error) {
      logger.error('Failed to get project data:', error);
      throw error;
    }
  }
}
'@

$connectionServiceContent | Out-File -FilePath "src/services/ConnectionService.ts" -Encoding UTF8
Write-Host "  ✓ src/services/ConnectionService.ts created" -ForegroundColor Gray

# 4. Replace src/routes/connectionRoutes.ts with complete version
Write-Host "📝 Creating src/routes/connectionRoutes.ts..." -ForegroundColor Yellow
$connectionRoutesContent = @'
import { Router } from 'express';
import { ConnectionService } from '../services/ConnectionService';
import { authenticateJWT } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();
const connectionService = new ConnectionService();

// Apply authentication to all routes
router.use(authenticateJWT);

// Create a new connection
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const { name, platform, config } = req.body;

    if (!name || !platform || !config) {
      return res.status(400).json({ 
        message: 'Name, platform, and config are required' 
      });
    }

    const connection = await connectionService.createConnection(userId, {
      name,
      platform,
      config
    });

    // Return connection without sensitive config data
    const safeConnection = {
      id: connection.id,
      name: connection.name,
      platform: connection.platform,
      status: connection.status,
      projectCount: connection.projectCount,
      lastSync: connection.lastSync,
      createdAt: connection.createdAt
    };

    res.status(201).json(safeConnection);
  } catch (error) {
    logger.error('Create connection error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create connection';
    res.status(500).json({ message });
  }
});

// Get all connections for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const connections = await connectionService.getConnections(userId);
    
    // Return connections without sensitive config data
    const safeConnections = connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      platform: conn.platform,
      status: conn.status,
      projectCount: conn.projectCount,
      lastSync: conn.lastSync,
      lastSyncError: conn.lastSyncError,
      createdAt: conn.createdAt
    }));

    res.json(safeConnections);
  } catch (error) {
    logger.error('Get connections error:', error);
    res.status(500).json({ message: 'Failed to get connections' });
  }
});

// Test connection
router.post('/:connectionId/test', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const isConnected = await connectionService.testConnection(userId, connectionId);
    
    res.json({ 
      success: isConnected,
      status: isConnected ? 'connected' : 'error',
      message: isConnected ? 'Connection successful' : 'Connection failed'
    });
  } catch (error) {
    logger.error('Test connection error:', error);
    const message = error instanceof Error ? error.message : 'Connection test failed';
    res.status(500).json({ success: false, message });
  }
});

export default router;
'@

$connectionRoutesContent | Out-File -FilePath "src/routes/connectionRoutes.ts" -Encoding UTF8
Write-Host "  ✓ src/routes/connectionRoutes.ts created" -ForegroundColor Gray

Write-Host ""
Write-Host "🎉 All missing files created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Files created:" -ForegroundColor Yellow
Write-Host "  ✓ src/routes/platformRoutes.ts" -ForegroundColor Gray
Write-Host "  ✓ src/models/Connection.ts (complete)" -ForegroundColor Gray
Write-Host "  ✓ src/services/ConnectionService.ts" -ForegroundColor Gray
Write-Host "  ✓ src/routes/connectionRoutes.ts (complete)" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Still need to create:" -ForegroundColor Red
Write-Host "  - src/clients/BaseClient.ts (API client implementations)" -ForegroundColor Gray
Write-Host ""
Write-Host "Try running: npm run dev" -ForegroundColor Cyan