import { Schema, model, Document } from 'mongoose';

export interface IReport extends Document {
  title: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  platform: string;
  template: string;
  configuration: Record<string, any>;
  progress?: number;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
}

const reportSchema = new Schema<IReport>({
  title: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  platform: { type: String, required: true },
  template: { type: String, required: true },
  configuration: { type: Object, default: {} },
  progress: { type: Number, min: 0, max: 100 },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  downloadUrl: { type: String }
});

export const Report = model<IReport>('Report', reportSchema);