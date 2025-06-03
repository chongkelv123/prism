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