// backend/services/report-generation-service/src/models/Report.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  userId: string; 
  title: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  platform: string;
  template: string;
  configuration: {
    title?: string;
    connectionId: string;
    projectId: string;
    includeMetrics?: boolean;
    includeTasks?: boolean;
    includeTimeline?: boolean;
    includeResources?: boolean;
  };
  progress?: number;
  filePath?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  projectInfo?: {
    projectId: string;
    projectName: string;
    platform: string;
  };
}

const ReportSchema = new Schema<IReport>({
  userId: {  // ✅ ADD THIS FIELD
    type: String,
    required: true,
    index: true // Index for faster user-specific queries
  },
  title: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  platform: {
    type: String,
    required: true
  },
  template: {
    type: String,
    required: true
  },
  configuration: {
    type: Schema.Types.Mixed,
    required: true
  },
  progress: {
    type: Number,
    default: 0
  },
  filePath: {
    type: String
  },
  error: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

export const Report = mongoose.model<IReport>('Report', ReportSchema);