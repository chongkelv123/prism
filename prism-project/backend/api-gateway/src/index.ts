// backend/api-gateway/src/index.ts - FIXED VERSION
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import proxy from 'express-http-proxy';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      gateway: 'running',
      auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',
      platformIntegrations: process.env.PLATFORM_INTEGRATIONS_SERVICE_URL || 'http://localhost:4005',
      reportGeneration: process.env.REPORT_SERVICE_URL || 'http://localhost:4002',
      notifications: 'not implemented',
      storage: 'not implemented'
    }
  });
});

// Service URLs (from environment variables or defaults)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4000';
const PROJECT_DATA_SERVICE_URL = process.env.PROJECT_DATA_SERVICE_URL || 'http://localhost:4001';
const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL || 'http://localhost:4002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4003';
const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://localhost:4004';
const PLATFORM_INTEGRATIONS_SERVICE_URL = process.env.PLATFORM_INTEGRATIONS_SERVICE_URL || 'http://localhost:4005';

// Enhanced error handling for proxy
const createProxyOptions = (serviceUrl: string, serviceName: string) => ({
  target: serviceUrl,
  changeOrigin: true,
  timeout: 30000,
  proxyErrorHandler: (err: any, res: any, next: any) => {
    console.error(`Proxy error for ${serviceName}:`, err.message);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: serviceName,
        message: 'Please try again later'
      });
    }
  },
  userResHeaderDecorator: (headers: any, userReq: any, userRes: any, proxyReq: any, proxyRes: any) => {
    // Add service identification header
    headers['x-service'] = serviceName;
    return headers;
  }
});

// Route API requests to appropriate microservices

// Authentication routes
app.use('/api/auth', proxy(AUTH_SERVICE_URL, {
  ...createProxyOptions(AUTH_SERVICE_URL, 'auth-service'),
  proxyReqPathResolver: (req) => `/api/auth${req.url}`
}));

// Platform integrations routes
app.use('/api/platforms', proxy(PLATFORM_INTEGRATIONS_SERVICE_URL, {
  ...createProxyOptions(PLATFORM_INTEGRATIONS_SERVICE_URL, 'platform-integrations-service'),
  proxyReqPathResolver: (req) => `/api/platforms${req.url}`
}));

app.use('/api/connections', proxy(PLATFORM_INTEGRATIONS_SERVICE_URL, {
  ...createProxyOptions(PLATFORM_INTEGRATIONS_SERVICE_URL, 'platform-integrations-service'),
  proxyReqPathResolver: (req) => `/api/connections${req.url}`
}));

// Report generation routes
app.use('/api/reports', proxy(REPORT_SERVICE_URL, {
  ...createProxyOptions(REPORT_SERVICE_URL, 'report-generation-service'),
  proxyReqPathResolver: (req) => `/api/reports${req.url}`
}));

// Project data routes (if you implement this service later)
app.use('/api/projects', proxy(PROJECT_DATA_SERVICE_URL, {
  ...createProxyOptions(PROJECT_DATA_SERVICE_URL, 'project-data-service'),
  proxyReqPathResolver: (req) => `/api/projects${req.url}`
}));

// Notification routes - Handle missing service gracefully
app.use('/api/notifications', (req, res) => {
  console.warn('Notification service not implemented yet');
  res.status(503).json({
    error: 'Service not implemented',
    service: 'notification-service',
    message: 'Notification service is planned for future implementation'
  });
});

// Storage routes - Handle missing service gracefully  
app.use('/api/storage', (req, res) => {
  console.warn('Storage service not implemented yet');
  res.status(503).json({
    error: 'Service not implemented',
    service: 'storage-service',
    message: 'Storage service is planned for future implementation'
  });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Gateway error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong processing your request'
    });
  }
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// For production, serve the static React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('../../frontend/dist'));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile('../../frontend/dist/index.html');
  });
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Service routes configured:`);
  console.log(`   - Auth: ${AUTH_SERVICE_URL}`);
  console.log(`   - Platform Integrations: ${PLATFORM_INTEGRATIONS_SERVICE_URL}`);
  console.log(`   - Report Generation: ${REPORT_SERVICE_URL}`);
  console.log(`   - Notifications: Not implemented (returns 503)`);
  console.log(`   - Storage: Not implemented (returns 503)`);
});