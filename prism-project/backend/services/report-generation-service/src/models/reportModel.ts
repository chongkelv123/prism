import { MongoClient, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'prism-reports';
const client = new MongoClient(uri);
let db;

// Connect to MongoDB
export async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Disconnect from MongoDB
export async function disconnectDB() {
  await client.close();
  logger.info('Disconnected from MongoDB');
}

// Report interface
export interface Report {
  id: string;
  userId: string;
  platformId: string;
  templateId: string;
  title?: string;
  configuration: any;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  filePath?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Save a new report
export async function saveReport(report: Omit<Report, 'id'>): Promise<string> {
  try {
    if (!db) await connectDB();
    
    const reportId = uuidv4();
    const reportsCollection = db.collection('reports');
    
    await reportsCollection.insertOne({
      _id: reportId,
      ...report
    });
    
    return reportId;
  } catch (error) {
    logger.error('Failed to save report:', error);
    throw error;
  }
}

// Get a report by ID
export async function getReport(id: string): Promise<Report | null> {
  try {
    if (!db) await connectDB();
    
    const reportsCollection = db.collection('reports');
    const report = await reportsCollection.findOne({ _id: id });
    
    if (!report) {
      return null;
    }
    
    return {
      id: report._id,
      userId: report.userId,
      platformId: report.platformId,
      templateId: report.templateId,
      title: report.title,
      configuration: report.configuration,
      status: report.status,
      filePath: report.filePath,
      createdAt: report.createdAt,
      completedAt: report.completedAt
    };
  } catch (error) {
    logger.error('Failed to get report:', error);
    throw error;
  }
}

// Update report status
export async function updateReportStatus(id: string, status: Report['status'], filePath?: string): Promise<boolean> {
  try {
    if (!db) await connectDB();
    
    const reportsCollection = db.collection('reports');
    const update: any = { status };
    
    if (status === 'completed') {
      update.completedAt = new Date();
      if (filePath) {
        update.filePath = filePath;
      }
    }
    
    const result = await reportsCollection.updateOne(
      { _id: id },
      { $set: update }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('Failed to update report status:', error);
    throw error;
  }
}

// Find reports based on query
export async function findReports(query: Partial<Report>): Promise<Report[]> {
  try {
    if (!db) await connectDB();
    
    const reportsCollection = db.collection('reports');
    const reports = await reportsCollection.find(query).toArray();
    
    return reports.map(report => ({
        id: report._id,
        userId: report.userId,
        platformId: report.platformId,
        templateId: report.templateId,
        title: report.title,
        configuration: report.configuration,
        status: report.status,
        filePath: report.filePath,
        createdAt: report.createdAt,
        completedAt: report.completedAt
      }));
    } catch (error) {
      logger.error('Failed to find reports:', error);
      throw error;
    }
  }
  
  // Mock function to fetch report data from platform
  export async function getReportData(platformId: string, configuration: any): Promise<any> {
    // In a real implementation, this would fetch data from the specific
    // project management system API based on platformId and configuration
    
    // For now, return mock data
    const mockData = {
      title: configuration.title || 'Project Status Report',
      date: new Date().toLocaleDateString(),
      metrics: [
        { name: 'Tasks Completed', value: '32' },
        { name: 'In Progress', value: '12' },
        { name: 'Blockers', value: '3' }
      ],
      team: [
        { name: 'Professor Ganesh', role: 'Project Manager' },
        { name: 'Kelvin Chong', role: 'Developer' },
        { name: 'Chan Jian Da', role: 'DevOps' },
        { name: 'Bryan', role: 'Designer' }
      ],
      tasks: [
        { name: 'Create API Gateway', status: 'Completed', assignee: 'Chan Jian Da' },
        { name: 'Implement Authentication', status: 'In Progress', assignee: 'Kelvin Chong' },
        { name: 'Design UI Mockups', status: 'Completed', assignee: 'Bryan' },
        { name: 'Setup CI/CD Pipeline', status: 'In Progress', assignee: 'Chan Jian Da' },
        { name: 'Implement Report Generation', status: 'In Progress', assignee: 'Kelvin Chong' }
      ],
      sprints: [
        { name: 'Sprint 1', startDate: '2025-04-01', endDate: '2025-04-14', completed: '100%' },
        { name: 'Sprint 2', startDate: '2025-04-15', endDate: '2025-04-28', completed: '75%' },
        { name: 'Sprint 3', startDate: '2025-04-29', endDate: '2025-05-12', completed: '0%' }
      ]
    };
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockData;
  }