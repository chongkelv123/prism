// backend/services/platform-integrations-service/src/models/Connection.ts
// STEP 1: Add 'trofos' to platform enum

import { Schema, model, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface IConnection extends Document {
  userId: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos'; // ✅ ADDED: 'trofos' to enum
  config: Record<string, any>;
  encryptedConfig: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  lastSyncError?: string;
  projectCount: number;
  metadata?: {
    selectedProjects?: string[];
    defaultTemplate?: string;
    reportPreferences?: {
      includeCharts?: boolean;
      includeTeamInfo?: boolean;
      dateRange?: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema = new Schema<IConnection>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  platform: { 
    type: String, 
    required: true, 
    enum: ['monday', 'jira', 'trofos'] // ✅ ADDED: 'trofos' to enum
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
  metadata: {
    selectedProjects: [{ type: String }],
    defaultTemplate: { type: String, default: 'standard' },
    reportPreferences: {
      includeCharts: { type: Boolean, default: true },
      includeTeamInfo: { type: Boolean, default: true },
      dateRange: { type: Number, default: 30 }
    }
  },
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