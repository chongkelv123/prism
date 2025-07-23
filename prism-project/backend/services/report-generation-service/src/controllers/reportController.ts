// backend/services/report-generation-service/src/controllers/reportController.ts
// FIXED VERSION - Add user filtering and userId storage

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import { Report } from '../models/Report';
import { PlatformDataService, ReportGenerationConfig } from '../services/PlatformDataService';
import { DataAnalyticsService } from '../services/DataAnalyticsService';
import {
  TemplateReportGenerator,
  EnhancedMondayReportGenerator,
  TrofosReportGenerator,
  TemplateRecommendationService
} from '../generators/TemplateReportGenerator';
import { EnhancedJiraReportGenerator } from '../generators/EnhancedJiraReportGenerator';

// ✅ EXTEND REQUEST TYPE FOR AUTHENTICATED REQUESTS
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
  };
}

// Get JWT token from request
function getAuthToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// Generate a new report with template support
export async function generateReport(req: AuthenticatedRequest, res: Response) {
  const { platform, connectionId, projectId, templateId, configuration } = req.body;

  try {
    // ✅ GET USER ID FROM AUTHENTICATED REQUEST
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Validate inputs
    if (!platform || !connectionId || !projectId) {
      return res.status(400).json({
        message: 'Platform, Connection ID, and Project ID are required'
      });
    }

    // Default to standard template if not specified
    const selectedTemplate = templateId || 'standard';

    // Validate template ID
    if (!['standard', 'executive', 'detailed'].includes(selectedTemplate)) {
      return res.status(400).json({
        message: `Invalid template ID: ${selectedTemplate}. Valid options: standard, executive, detailed`
      });
    }

    // ✅ CREATE REPORT WITH USER ID
    const report = new Report({
      userId: userId,
      title: configuration?.title || `${platform} Report - ${selectedTemplate}`,
      status: 'queued',
      platform,
      template: selectedTemplate,
      configuration: {
        title: configuration?.title,
        connectionId,
        projectId,
        includeMetrics: configuration?.includeMetrics || true,
        includeTasks: configuration?.includeTasks || true,
        includeTimeline: configuration?.includeTimeline || true,
        includeResources: configuration?.includeResources || true,
        ...configuration
      }
    });

    await report.save();

    // Get auth token for platform integrations service
    const authToken = getAuthToken(req);

    // ✅ START BACKGROUND PROCESSING (This was missing!)
    processReportWithTemplateSystem(report._id.toString(), authToken);

    logger.info(`Report generation queued for user ${userId}:`, {
      reportId: report._id,
      platform,
      template: selectedTemplate,
      userId
    });

    // ✅ FIXED RESPONSE FORMAT - Frontend expects 'id' not 'reportId'
    return res.status(201).json({
      id: report._id.toString(),        // ✅ Use 'id' field (not 'reportId')
      _id: report._id.toString(),       // ✅ Also provide _id for compatibility
      reportId: report._id.toString(),  // ✅ Keep reportId for logging compatibility
      status: report.status,
      title: report.title,
      template: selectedTemplate,
      platform: platform,
      userId: userId,
      message: 'Report generation started',
      createdAt: report.createdAt
    });

  } catch (error) {
    logger.error('Error generating report:', error);
    return res.status(500).json({
      message: 'Server error generating report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function processReportWithTemplateSystem(reportId: string, authToken?: string) {
  try {
    const report = await Report.findById(reportId);

    if (!report) {
      logger.error(`Report not found for processing: ${reportId}`);
      return;
    }

    const reportConfig: ReportGenerationConfig = {
      platform: report.platform,
      connectionId: report.configuration.connectionId,
      projectId: report.configuration.projectId,
      templateId: report.template,
      configuration: report.configuration
    };

    // ✅ ADD THIS DEBUG LOG:
    console.log('🔍 DEBUG - ReportConfig created:', {
      platform: reportConfig.platform,
      connectionId: reportConfig.connectionId,
      projectId: reportConfig.projectId,  // ← This should be different for different projects
      reportTitle: report.title
    });

    // Update status to processing
    report.status = 'processing';
    report.progress = 0;
    await report.save();

    logger.info(`Starting background processing for report ${reportId}`);

    // Initialize services
    const platformDataService = new PlatformDataService(authToken);

    try {
      // Update progress
      report.progress = 10;
      await report.save();

      // Create proper ReportGenerationConfig object
      const reportConfig: ReportGenerationConfig = {
        platform: report.platform,
        connectionId: report.configuration.connectionId,
        projectId: report.configuration.projectId,
        templateId: report.template,
        configuration: report.configuration
      };

      logger.info('Fetching platform data', {
        platform: report.platform,
        connectionId: reportConfig.connectionId
      });

      // Fetch real project data from platform integrations service
      const projectData = await platformDataService.fetchProjectData(reportConfig);

      // Update progress
      report.progress = 30;
      await report.save();

      if (!projectData || projectData.length === 0) {
        throw new Error('No project data returned from platform');
      }

      // Log what data was fetched
      const firstProject = projectData[0];
      logger.info(`Project data fetched successfully:`, {
        platform: firstProject?.platform,
        name: firstProject?.name,
        tasks: firstProject?.tasks?.length || 0,
        metrics: firstProject?.metrics?.length || 0,
        team: firstProject?.team?.length || 0,
        fallbackData: firstProject?.fallbackData
      });

      // Generate PowerPoint using template system
      let filePath: string;

      // Update progress
      report.progress = 40;
      await report.save();

      // Use enhanced generators with template support
      if (report.platform === 'jira') {
        const jiraGenerator = new EnhancedJiraReportGenerator();
        filePath = await jiraGenerator.generate(
          projectData[0],
          report.configuration,
          async (progress) => {
            report.progress = 40 + (progress * 0.5); // 40-90%
            await report.save();
          }
        );
      } else if (report.platform === 'monday') {
        const mondayGenerator = new EnhancedMondayReportGenerator();
        filePath = await mondayGenerator.generate(
          projectData[0],
          report.configuration,
          async (progress) => {
            report.progress = 40 + (progress * 0.5); // 40-90%
            await report.save();
          }
        );
      } else if (report.platform === 'trofos') {
        const trofosGenerator = new TrofosReportGenerator();
        filePath = await trofosGenerator.generate(
          projectData[0],
          report.configuration,
          async (progress) => {
            report.progress = 40 + (progress * 0.5); // 40-90%
            await report.save();
          }
        );
      } else {
        throw new Error(`Unsupported platform: ${report.platform}`);
      }

      // Update report with file path and completion
      report.filePath = filePath;
      report.status = 'completed';
      report.progress = 100;
      report.completedAt = new Date();
      await report.save();

      logger.info(`Report generated successfully: ${reportId}`, {
        filePath,
        platform: report.platform,
        template: report.template,
        realData: !projectData[0]?.fallbackData
      });

    } catch (error) {
      logger.error(`Error generating report content for ${reportId}:`, error);

      // Update status to failed
      report.status = 'failed';
      report.error = error instanceof Error ? error.message : 'Unknown error';
      await report.save();
    }

  } catch (error) {
    logger.error(`Error processing report ${reportId}:`, error);

    // Update status to failed if we can still access the database
    try {
      await Report.findByIdAndUpdate(reportId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (updateError) {
      logger.error(`Failed to update report status: ${updateError}`);
    }
  }
}

// ✅ GET ALL REPORTS - FILTER BY USER
export async function getAllReports(req: AuthenticatedRequest, res: Response) {
  try {
    // ✅ GET USER ID FROM AUTHENTICATED REQUEST
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // ✅ FILTER REPORTS BY USER ID
    const reports = await Report.find({ userId: userId }).sort({ createdAt: -1 });

    // Add template metadata to each report
    const reportsWithTemplateInfo = reports.map(report => ({
      ...report.toObject(),
      templateInfo: TemplateReportGenerator.getTemplateMetadata()[report.template] || null
    }));

    logger.info(`Retrieved ${reports.length} reports for user ${userId}`);

    return res.json(reportsWithTemplateInfo);
  } catch (error) {
    logger.error('Error fetching reports:', error);
    return res.status(500).json({ message: 'Server error fetching reports' });
  }
}

// ✅ GET SPECIFIC REPORT - VERIFY USER OWNERSHIP
export async function getReportById(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // ✅ FIND REPORT BY ID AND USER ID
    const report = await Report.findOne({
      _id: req.params.id,
      userId: userId
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found or access denied' });
    }

    return res.json(report);
  } catch (error) {
    logger.error('Error fetching report:', error);
    return res.status(500).json({ message: 'Server error fetching report' });
  }
}

// ✅ GET REPORT STATUS - VERIFY USER OWNERSHIP
export async function getReportStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // ✅ FIND REPORT BY ID AND USER ID
    const report = await Report.findOne({
      _id: req.params.id,
      userId: userId
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found or access denied' });
    }

    return res.json({
      status: report.status,
      progress: report.progress || 0,
      template: report.template,
      error: report.error || null,
      createdAt: report.createdAt,
      completedAt: report.completedAt
    });
  } catch (error) {
    logger.error('Error fetching report status:', error);
    return res.status(500).json({ message: 'Server error fetching report status' });
  }
}

// ✅ DOWNLOAD REPORT - VERIFY USER OWNERSHIP
export async function downloadReport(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const reportId = req.params.id;

    // ✅ FIND REPORT BY ID AND USER ID
    const report = await Report.findOne({
      _id: reportId,
      userId: userId
    });

    // Enhanced debug logging
    logger.info('=== DOWNLOAD DEBUG START ===');
    logger.info('Report ID:', reportId);
    logger.info('User ID:', userId);
    logger.info('Report found:', !!report);

    if (report) {
      logger.info('Report status:', report.status);
      logger.info('Report filePath stored in DB:', report.filePath);
      logger.info('Report title:', report.title);
      logger.info('Report template:', report.template);
      logger.info('Report created:', report.createdAt);
    }

    if (!report) {
      return res.status(404).json({ message: 'Report not found or access denied' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({
        message: 'Report is not ready for download',
        status: report.status,
        progress: report.progress || 0
      });
    }

    // ✅ COMPREHENSIVE FILE PATH RESOLUTION
    let filePath: string | null = null;

    // Define possible storage locations
    const possibleStorageDirs = [
      // 1. Standard storage directory (relative to controller)
      path.join(__dirname, '../../storage'),
      // 2. Process working directory + storage
      path.join(process.cwd(), 'storage'),
      // 3. Service root + storage  
      path.join(__dirname, '../../../storage'),
      // 4. Environment variable storage
      process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
      // 5. Temp directory fallback
      path.join(require('os').tmpdir(), 'prism-reports')
    ];

    logger.info('Searching in storage directories:', possibleStorageDirs);

    if (report.filePath) {
      // Try to resolve file path in multiple ways
      const filePathVariations = [
        // 1. Use stored path as-is (if absolute)
        report.filePath,
        // 2. Try each storage directory + stored filename
        ...possibleStorageDirs.map(dir => path.join(dir, report.filePath!)),
        // 3. If stored path includes directories, try basename only
        ...possibleStorageDirs.map(dir => path.join(dir, path.basename(report.filePath!))),
      ];

      logger.info('Trying file path variations:', filePathVariations.length);

      // Test each variation for file existence
      for (const testPath of filePathVariations) {
        try {
          if (fs.existsSync(testPath)) {
            const stats = fs.statSync(testPath);
            if (stats.isFile() && stats.size > 0) {
              filePath = testPath;
              logger.info(`✅ Found file at: ${testPath} (${stats.size} bytes)`);
              break;
            } else {
              logger.warn(`⚠️ Found path but not a valid file: ${testPath}`);
            }
          }
        } catch (pathError) {
          logger.debug(`Path check failed: ${testPath} - ${(pathError as any).message}`);
        }
      }
    }

    // ✅ FALLBACK: SEARCH FOR RECENT FILES BY PATTERN
    if (!filePath) {
      logger.warn('Direct file path not found, searching by pattern...');

      for (const storageDir of possibleStorageDirs) {
        try {
          if (fs.existsSync(storageDir)) {
            const files = fs.readdirSync(storageDir);

            // Look for files that match the report pattern
            const matchingFiles = files.filter(file => {
              const isCorrectType = file.endsWith('.pptx');
              const hasReportId = file.includes(reportId.slice(-8)); // Last 8 chars of report ID
              const isRecent = () => {
                try {
                  const filePath = path.join(storageDir, file);
                  const stats = fs.statSync(filePath);
                  const ageMs = Date.now() - stats.mtime.getTime();
                  const ageMinutes = ageMs / (1000 * 60);
                  return ageMinutes < 60; // File created within last hour
                } catch {
                  return false;
                }
              };

              return isCorrectType && (hasReportId || isRecent());
            });

            logger.info(`Found ${matchingFiles.length} matching files in ${storageDir}`);

            if (matchingFiles.length > 0) {
              // Sort by modification time (newest first)
              const sortedFiles = matchingFiles
                .map(file => ({
                  name: file,
                  path: path.join(storageDir, file),
                  mtime: fs.statSync(path.join(storageDir, file)).mtime
                }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

              filePath = sortedFiles[0].path;
              logger.info(`✅ Using best match: ${sortedFiles[0].name}`);
              break;
            }
          }
        } catch (dirError) {
          logger.debug(`Directory search failed: ${storageDir} - ${(dirError as Error).message}`);
        }
      }
    }

    // ✅ FINAL EXISTENCE CHECK
    if (!filePath || !fs.existsSync(filePath)) {
      logger.error('=== FILE NOT FOUND SUMMARY ===');
      logger.error('Report ID:', reportId);
      logger.error('Stored file path:', report.filePath);
      logger.error('Searched directories:', possibleStorageDirs);
      logger.error('Final resolved path:', filePath);
      logger.error('=== END SUMMARY ===');

      return res.status(404).json({
        message: 'Report file not found on disk',
        debug: {
          reportId,
          storedPath: report.filePath,
          searchedDirs: possibleStorageDirs.length,
          timestamp: new Date().toISOString()
        }
      });
    }

    // ✅ VERIFY FILE IS READABLE AND NOT EMPTY
    try {
      const stats = fs.statSync(filePath);
      if (!stats.isFile() || stats.size === 0) {
        logger.error('File exists but is not valid:', {
          path: filePath,
          isFile: stats.isFile(),
          size: stats.size
        });
        return res.status(404).json({ message: 'Report file is corrupted or empty' });
      }

      logger.info(`✅ File verified: ${stats.size} bytes`);
    } catch (statError) {
      logger.error('Error checking file stats:', statError);
      return res.status(500).json({ message: 'Error accessing report file' });
    }

    // ✅ GENERATE DOWNLOAD FILENAME
    const fileName = path.basename(filePath);
    const templateSuffix = report.template ? `_${report.template}` : '';
    const sanitizedTitle = report.title.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const downloadFileName = `${sanitizedTitle}${templateSuffix}_${new Date().toISOString().slice(0, 10)}.pptx`;

    // ✅ SET PROPER DOWNLOAD HEADERS
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size.toString());
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // ✅ STREAM FILE TO RESPONSE
    const fileStream = fs.createReadStream(filePath);

    // Handle stream errors
    fileStream.on('error', (streamError) => {
      logger.error('Error streaming file:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming report file' });
      }
    });

    fileStream.on('end', () => {
      logger.info(`✅ Download completed successfully: ${downloadFileName}`);
    });

    // Pipe file to response
    fileStream.pipe(res);

    logger.info('=== DOWNLOAD SUCCESS ===');
    logger.info('Report ID:', reportId);
    logger.info('User ID:', userId);
    logger.info('File path:', filePath);
    logger.info('Download name:', downloadFileName);
    logger.info('File size:', fs.statSync(filePath).size);
    logger.info('=== DOWNLOAD DEBUG END ===');

  } catch (error) {
    logger.error('Error downloading report:', error);
    return res.status(500).json({
      message: 'Server error downloading report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}