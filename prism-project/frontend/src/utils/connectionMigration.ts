// frontend/src/utils/connectionMigration.ts - COMPLETE VERSION
export interface LegacyConnection {
  id: string;
  name: string;
  platform: string;
  status?: string;
  projectCount?: number;
  lastSync?: string;
  createdAt?: string;
  metadata?: any;
}

export interface ValidConnection extends LegacyConnection {
  status: 'connected' | 'disconnected' | 'error';
  projectCount: number;
  createdAt: string;
}

export class ConnectionMigration {
  /**
   * Migrate and validate an array of connections
   * Ensures all connections have proper status field and required properties
   */
  static migrateAndValidateConnections(
    connections: LegacyConnection[]
  ): ValidConnection[] {
    console.log('🔄 Migrating and validating connections:', connections.length);
    
    if (!Array.isArray(connections)) {
      console.warn('⚠️  Invalid connections array, returning empty array');
      return [];
    }
    
    return connections.map(conn => {
      const migrated: ValidConnection = {
        ...conn,
        status: this.validateStatus(conn.status),
        projectCount: this.validateProjectCount(conn.projectCount),
        createdAt: conn.createdAt || new Date().toISOString(),
        metadata: conn.metadata || {}
      };
      
      // Log any corrections made
      if (conn.status !== migrated.status) {
        console.log(`📝 Fixed status for "${conn.name}": "${conn.status}" -> "${migrated.status}"`);
      }
      
      if (conn.projectCount !== migrated.projectCount) {
        console.log(`📝 Fixed projectCount for "${conn.name}": ${conn.projectCount} -> ${migrated.projectCount}`);
      }
      
      if (!conn.createdAt) {
        console.log(`📝 Added createdAt for "${conn.name}"`);
      }
      
      return migrated;
    });
  }

  /**
   * Validate and normalize connection status
   * Returns a valid status or defaults to 'connected' for backward compatibility
   */
  static validateStatus(status?: string): 'connected' | 'disconnected' | 'error' {
    const validStatuses: Array<'connected' | 'disconnected' | 'error'> = ['connected', 'disconnected', 'error'];
    
    if (validStatuses.includes(status as any)) {
      return status as 'connected' | 'disconnected' | 'error';
    }
    
    // Handle common variations and typos
    if (typeof status === 'string') {
      const normalizedStatus = status.toLowerCase().trim();
      
      switch (normalizedStatus) {
        case 'active':
        case 'online':
        case 'working':
        case 'success':
        case 'ok':
          return 'connected';
        
        case 'inactive':
        case 'offline':
        case 'disabled':
        case 'paused':
          return 'disconnected';
        
        case 'failed':
        case 'broken':
        case 'invalid':
        case 'timeout':
          return 'error';
      }
    }
    
    // Default to 'connected' for backward compatibility with existing data
    console.log(`🔧 Unknown status "${status}", defaulting to "connected"`);
    return 'connected';
  }

  /**
   * Validate and normalize project count
   */
  static validateProjectCount(projectCount?: number): number {
    if (typeof projectCount === 'number' && projectCount >= 0) {
      return Math.floor(projectCount); // Ensure integer
    }
    
    // Try to parse as string
    if (typeof projectCount === 'string') {
      const parsed = parseInt(projectCount, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    
    // Default to 1 for backward compatibility
    return 1;
  }

  /**
   * Migrate global connections to user-specific storage
   * Returns true if migration was performed, false if not needed
   */
  static migrateGlobalToUserStorage(userId: string): boolean {
    try {
      const globalKey = 'prism-connections';
      const userKey = `prism-connections-${userId}`;
      
      // Check if user already has data
      const existingUserData = localStorage.getItem(userKey);
      if (existingUserData) {
        console.log('📦 User already has connection data, skipping migration');
        
        // Still validate existing user data
        try {
          const existingConnections = JSON.parse(existingUserData);
          const validatedConnections = this.migrateAndValidateConnections(existingConnections);
          
          // Update if any changes were made
          if (JSON.stringify(existingConnections) !== JSON.stringify(validatedConnections)) {
            localStorage.setItem(userKey, JSON.stringify(validatedConnections));
            console.log('📝 Updated existing user connections with validation fixes');
          }
        } catch (parseError) {
          console.error('💥 Failed to parse existing user data:', parseError);
          // Clear invalid data
          localStorage.removeItem(userKey);
        }
        
        return false;
      }
      
      // Check for global data to migrate
      const globalData = localStorage.getItem(globalKey);
      if (!globalData) {
        console.log('📭 No global connection data to migrate');
        return false;
      }
      
      try {
        const globalConnections = JSON.parse(globalData);
        console.log(`🚀 Migrating ${globalConnections.length} connections from global to user storage`);
        
        // Validate and migrate
        const validatedConnections = this.migrateAndValidateConnections(globalConnections);
        
        // Save to user-specific storage
        localStorage.setItem(userKey, JSON.stringify(validatedConnections));
        
        console.log(`✅ Successfully migrated ${validatedConnections.length} connections for user ${userId}`);
        return true;
        
      } catch (parseError) {
        console.error('💥 Failed to parse global connection data:', parseError);
        // Don't clear global data in case it's needed elsewhere
        return false;
      }
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
  }

  /**
   * Debug connection storage state
   * Logs detailed information about localStorage contents
   */
  static debugConnectionStorage(userId?: string): void {
    console.log('🔍 Connection Storage Debug:');
    
    const globalKey = 'prism-connections';
    const globalData = localStorage.getItem(globalKey);
    
    if (globalData) {
      try {
        const globalConnections = JSON.parse(globalData);
        console.log('  Global storage:', globalConnections.length + ' connections');
        console.log('  Global connection names:', globalConnections.map(c => c.name));
        console.log('  Global connection statuses:', globalConnections.map(c => ({ name: c.name, status: c.status })));
      } catch (error) {
        console.log('  Global storage: invalid JSON data');
      }
    } else {
      console.log('  Global storage: empty');
    }
    
    if (userId) {
      const userKey = `prism-connections-${userId}`;
      const userData = localStorage.getItem(userKey);
      
      if (userData) {
        try {
          const userConnections = JSON.parse(userData);
          console.log(`  User storage (${userId}):`, userConnections.length + ' connections');
          console.log('  User connection names:', userConnections.map(c => c.name));
          console.log('  User connection statuses:', userConnections.map(c => ({ name: c.name, status: c.status })));
          
          // Check for data inconsistencies
          const invalidStatuses = userConnections.filter(c => 
            !['connected', 'disconnected', 'error'].includes(c.status)
          );
          
          if (invalidStatuses.length > 0) {
            console.warn('  ⚠️  Found connections with invalid status:', invalidStatuses.map(c => ({ 
              name: c.name, 
              status: c.status 
            })));
          }
          
        } catch (error) {
          console.log(`  User storage (${userId}): invalid JSON data`);
        }
      } else {
        console.log(`  User storage (${userId}): empty`);
      }
    }
    
    // Check for other connection-related keys
    const allKeys = Object.keys(localStorage);
    const connectionKeys = allKeys.filter(key => key.includes('connection'));
    
    if (connectionKeys.length > 0) {
      console.log('  Other connection-related keys:', connectionKeys);
    }
  }

  /**
   * Clean up duplicate or invalid connection data
   */
  static cleanupConnectionStorage(userId: string): void {
    console.log('🧹 Cleaning up connection storage for user:', userId);
    
    try {
      const userKey = `prism-connections-${userId}`;
      const userData = localStorage.getItem(userKey);
      
      if (!userData) {
        console.log('  No user data to clean');
        return;
      }
      
      const connections = JSON.parse(userData);
      const originalCount = connections.length;
      
      // Remove duplicates by ID
      const seenIds = new Set();
      const uniqueConnections = connections.filter(conn => {
        if (seenIds.has(conn.id)) {
          console.log(`  🗑️  Removing duplicate connection: ${conn.name} (${conn.id})`);
          return false;
        }
        seenIds.add(conn.id);
        return true;
      });
      
      // Remove connections with invalid required fields
      const validConnections = uniqueConnections.filter(conn => {
        if (!conn.id || !conn.name || !conn.platform) {
          console.log(`  🗑️  Removing invalid connection:`, conn);
          return false;
        }
        return true;
      });
      
      // Apply validation and migration
      const cleanedConnections = this.migrateAndValidateConnections(validConnections);
      
      if (cleanedConnections.length !== originalCount) {
        console.log(`  📊 Cleanup summary: ${originalCount} -> ${cleanedConnections.length} connections`);
        localStorage.setItem(userKey, JSON.stringify(cleanedConnections));
      } else {
        console.log('  ✨ No cleanup needed');
      }
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * Backup connection data before performing operations
   */
  static backupConnectionData(userId: string): boolean {
    try {
      const userKey = `prism-connections-${userId}`;
      const backupKey = `prism-connections-backup-${userId}-${Date.now()}`;
      
      const userData = localStorage.getItem(userKey);
      if (userData) {
        localStorage.setItem(backupKey, userData);
        console.log(`💾 Connection data backed up to: ${backupKey}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return false;
    }
  }
}

/**
 * Auto-migration function to call in ConnectionsContext
 * Performs comprehensive migration and validation
 */
export function autoMigrateConnections(userId: string): void {
  console.log('🔧 Auto-migration check for user:', userId);
  
  try {
    // Debug current state
    ConnectionMigration.debugConnectionStorage(userId);
    
    // Backup existing data
    ConnectionMigration.backupConnectionData(userId);
    
    // Clean up any invalid data
    ConnectionMigration.cleanupConnectionStorage(userId);
    
    // Attempt migration from global to user storage
    const migrated = ConnectionMigration.migrateGlobalToUserStorage(userId);
    
    if (migrated) {
      console.log('✅ Auto-migration completed successfully');
    } else {
      console.log('ℹ️  No migration needed');
    }
    
    // Final debug to show results
    console.log('🏁 Post-migration state:');
    ConnectionMigration.debugConnectionStorage(userId);
    
  } catch (error) {
    console.error('❌ Auto-migration failed:', error);
  }
}

/**
 * Utility function to check if connections need migration
 */
export function checkConnectionsMigrationNeeded(userId: string): boolean {
  const userKey = `prism-connections-${userId}`;
  const globalKey = 'prism-connections';
  
  const hasUserData = !!localStorage.getItem(userKey);
  const hasGlobalData = !!localStorage.getItem(globalKey);
  
  return !hasUserData && hasGlobalData;
}

/**
 * Get connection statistics for debugging
 */
export function getConnectionStats(userId: string): {
  userConnections: number;
  globalConnections: number;
  needsMigration: boolean;
  hasInvalidStatuses: boolean;
} {
  const userKey = `prism-connections-${userId}`;
  const globalKey = 'prism-connections';
  
  let userConnections = 0;
  let globalConnections = 0;
  let hasInvalidStatuses = false;
  
  try {
    const userData = localStorage.getItem(userKey);
    if (userData) {
      const connections = JSON.parse(userData);
      userConnections = connections.length;
      hasInvalidStatuses = connections.some(c => 
        !['connected', 'disconnected', 'error'].includes(c.status)
      );
    }
  } catch (error) {
    console.warn('Failed to parse user connections for stats');
  }
  
  try {
    const globalData = localStorage.getItem(globalKey);
    if (globalData) {
      const connections = JSON.parse(globalData);
      globalConnections = connections.length;
    }
  } catch (error) {
    console.warn('Failed to parse global connections for stats');
  }
  
  return {
    userConnections,
    globalConnections,
    needsMigration: checkConnectionsMigrationNeeded(userId),
    hasInvalidStatuses
  };
}