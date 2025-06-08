// backend/api-gateway/src/index.ts - SIMPLIFIED FIX
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import proxy from 'express-http-proxy';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4000';
const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL || 'http://localhost:4002';
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
        message: 'Please try again later',
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Gateway health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth: AUTH_SERVICE_URL,
      platformIntegrations: PLATFORM_INTEGRATIONS_SERVICE_URL,
      reportGeneration: REPORT_SERVICE_URL
    }
  });
});

// Route logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Authentication routes
app.use('/api/auth', proxy(AUTH_SERVICE_URL, {
  ...createProxyOptions(AUTH_SERVICE_URL, 'auth-service'),
  proxyReqPathResolver: (req) => {
    console.log(`Routing to auth-service: /api/auth${req.url}`);
    return `/api/auth${req.url}`;
  }
}));

// Platform routes (existing - should work)
app.use('/api/platforms', proxy(PLATFORM_INTEGRATIONS_SERVICE_URL, {
  ...createProxyOptions(PLATFORM_INTEGRATIONS_SERVICE_URL, 'platform-integrations-service'),
  proxyReqPathResolver: (req) => {
    console.log(`Routing to platform-integrations-service: /api/platforms${req.url}`);
    return `/api/platforms${req.url}`;
  }
}));

// Connection routes (existing - should work)
app.use('/api/connections', proxy(PLATFORM_INTEGRATIONS_SERVICE_URL, {
  ...createProxyOptions(PLATFORM_INTEGRATIONS_SERVICE_URL, 'platform-integrations-service'),
  proxyReqPathResolver: (req) => {
    console.log(`Routing to platform-integrations-service: /api/connections${req.url}`);
    return `/api/connections${req.url}`;
  }
}));

// NEW: Platform integrations general routes
app.use('/api/platform-integrations', proxy(PLATFORM_INTEGRATIONS_SERVICE_URL, {
  ...createProxyOptions(PLATFORM_INTEGRATIONS_SERVICE_URL, 'platform-integrations-service'),
  proxyReqPathResolver: (req) => {
    const path = req.url;
    console.log(`Routing to platform-integrations-service: /api/platform-integrations${path}`);
    
    // Map specific paths
    if (path === '/' || path === '') {
      return '/api/platform-integrations/info';  // Map root to info endpoint
    }
    
    return `/api/platform-integrations${path}`;
  }
}));

// Report generation routes
app.use('/api/reports', proxy(REPORT_SERVICE_URL, {
  ...createProxyOptions(REPORT_SERVICE_URL, 'report-generation-service'),
  proxyReqPathResolver: (req) => {
    console.log(`Routing to report-generation-service: /api/reports${req.url}`);
    return `/api/reports${req.url}`;
  }
}));

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Gateway error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong processing your request',
      timestamp: new Date().toISOString()
    });
  }
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  console.warn(`404 - API endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET /api/auth/me',
      'POST /api/auth/login', 
      'POST /api/auth/register',
      'GET /api/platforms',
      'POST /api/platforms/:platformId/validate',
      'GET /api/connections',
      'POST /api/connections',
      'GET /api/platform-integrations/',
      'GET /api/reports'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Service routes:`);
  console.log(`  - Auth: /api/auth/* -> ${AUTH_SERVICE_URL}`);
  console.log(`  - Platforms: /api/platforms/* -> ${PLATFORM_INTEGRATIONS_SERVICE_URL}`);
  console.log(`  - Connections: /api/connections/* -> ${PLATFORM_INTEGRATIONS_SERVICE_URL}`);
  console.log(`  - Platform Integrations: /api/platform-integrations/* -> ${PLATFORM_INTEGRATIONS_SERVICE_URL}`);
  console.log(`  - Reports: /api/reports/* -> ${REPORT_SERVICE_URL}`);
});