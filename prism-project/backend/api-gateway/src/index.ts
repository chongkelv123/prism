// backend/api-gateway/src/index.ts - FIXED HEALTH ENDPOINTS
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import proxy from 'express-http-proxy';
import dotenv from 'dotenv';
import jiraProxy from './routes/jiraProxy';
import mondayProxy from './routes/mondayProxy';
import trofosProxy from './routes/trofosProxy';  // ADD THIS LINE


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));
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

// HEALTH ENDPOINTS - THESE MUST COME FIRST!

// API Gateway health check (accessed via /api/health from frontend)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth: AUTH_SERVICE_URL,
      platformIntegrations: PLATFORM_INTEGRATIONS_SERVICE_URL,
      reportGeneration: REPORT_SERVICE_URL,
      jiraProxy: 'enabled',
      mondayProxy: 'enabled',
      trofosProxy: 'enabled'  // ADD THIS LINE
    }
  });
});

// Root health check (accessed directly via /health)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth: AUTH_SERVICE_URL,
      platformIntegrations: PLATFORM_INTEGRATIONS_SERVICE_URL,
      reportGeneration: REPORT_SERVICE_URL,
      jiraProxy: 'enabled',
      mondayProxy: 'enabled',
      trofosProxy: 'enabled'  // ADD THIS LINE
    }
  });
});

// API Gateway status endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({
    service: 'api-gateway',
    status: 'running',
    uptime: `${Math.floor(process.uptime())}s`,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// PROXY ROUTES - These must come BEFORE other routes to avoid conflicts
app.use('/api/jira-proxy', jiraProxy);
app.use('/api/monday-proxy', mondayProxy);
app.use('/api/trofos-proxy', trofosProxy);  // ADD THIS LINE

// Route logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// 1. AUTHENTICATION ROUTES
app.use('/api/auth', proxy(AUTH_SERVICE_URL, {
  ...createProxyOptions(AUTH_SERVICE_URL, 'auth-service'),
  proxyReqPathResolver: (req) => {
    const path = `/api/auth${req.url}`;
    console.log(`Routing to auth-service: ${path}`);
    return path;
  }
}));

// 2. PLATFORM INTEGRATIONS ROUTES (CRITICAL - Fixed routing)

// 2a. General platform integrations service routes
app.use('/api/platform-integrations', proxy(PLATFORM_INTEGRATIONS_SERVICE_URL, {
  ...createProxyOptions(PLATFORM_INTEGRATIONS_SERVICE_URL, 'platform-integrations-service'),
  proxyReqPathResolver: (req) => {
    let path = req.url;
    
    // Handle specific route mappings
    if (path === '/' || path === '') {
      path = '/api/platform-integrations/info';
    } else if (path.startsWith('/')) {
      path = `/api/platform-integrations${path}`;
    } else {
      path = `/api/platform-integrations/${path}`;
    }
    
    console.log(`Routing to platform-integrations-service: ${path}`);
    return path;
  }
}));

// 2b. Platforms routes (for platform management)
app.use('/api/platforms', proxy(PLATFORM_INTEGRATIONS_SERVICE_URL, {
  ...createProxyOptions(PLATFORM_INTEGRATIONS_SERVICE_URL, 'platform-integrations-service'),
  proxyReqPathResolver: (req) => {
    const path = `/api/platforms${req.url}`;
    console.log(`Routing to platform-integrations-service (platforms): ${path}`);
    return path;
  }
}));

// 2c. Connections routes (for connection management)
app.use('/api/connections', proxy(PLATFORM_INTEGRATIONS_SERVICE_URL, {
  ...createProxyOptions(PLATFORM_INTEGRATIONS_SERVICE_URL, 'platform-integrations-service'),
  proxyReqPathResolver: (req) => {
    const path = `/api/connections${req.url}`;
    console.log(`Routing to platform-integrations-service (connections): ${path}`);
    return path;
  }
}));

// Add specific route for platform-integrations connections with projects
// 2d. CRITICAL FIX: Platform-integrations specific routes (must come before general routes)
app.use('/api/platform-integrations/connections', proxy(PLATFORM_INTEGRATIONS_SERVICE_URL, {
  ...createProxyOptions(PLATFORM_INTEGRATIONS_SERVICE_URL, 'platform-integrations-service'),
  proxyReqPathResolver: (req) => {
    const path = `/api/connections${req.url}`;
    console.log(`Routing to platform-integrations-service: ${path}`);
    return path;
  }
}));

// 3. REPORT GENERATION ROUTES
app.use('/api/reports', proxy(REPORT_SERVICE_URL, {
  ...createProxyOptions(REPORT_SERVICE_URL, 'report-generation-service'),
  proxyReqPathResolver: (req) => {
    const path = `/api/reports${req.url}`;
    console.log(`Routing to report-generation-service: ${path}`);
    return path;
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
      'GET /health (API Gateway health)',
      'GET /api/health (API Gateway health via /api)',
      'GET /api/status (API Gateway status)',
      'GET /api/auth/me',
      'POST /api/auth/login', 
      'POST /api/auth/register',
      'POST /api/jira-proxy/test-connection',
      'POST /api/monday-proxy/test-connection',
      'POST /api/monday-proxy/get-boards',
      'POST /api/trofos-proxy/test-connection',      // ADD THIS LINE
      'POST /api/trofos-proxy/get-projects',         // ADD THIS LINE
      'GET /api/platform-integrations/health',
      'GET /api/platform-integrations/status',
      'GET /api/platform-integrations/info',
      'GET /api/platforms',
      'POST /api/platforms/:platformId/validate',
      'GET /api/connections',
      'POST /api/connections',
      'POST /api/connections/import',
      'GET /api/reports'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Health check: http://localhost:${PORT}/api/health`);
  console.log(`Service routes configured:`);
  console.log(`  Auth: /api/auth/* -> ${AUTH_SERVICE_URL}`);
  console.log(`  Jira Proxy: /api/jira-proxy/* -> Direct proxy`);
  console.log(`  Monday Proxy: /api/monday-proxy/* -> Direct proxy`);
  console.log(`  TROFOS Proxy: /api/trofos-proxy/* -> Direct proxy`);  // ADD THIS LINE
  console.log(`  Platform Integrations: /api/platform-integrations/* -> ${PLATFORM_INTEGRATIONS_SERVICE_URL}`);
  console.log(`  Platforms: /api/platforms/* -> ${PLATFORM_INTEGRATIONS_SERVICE_URL}`);
  console.log(`  Connections: /api/connections/* -> ${PLATFORM_INTEGRATIONS_SERVICE_URL}`);
  console.log(`  Reports: /api/reports/* -> ${REPORT_SERVICE_URL}`);
  console.log(`\nTroubleshooting:`);
  console.log(`  1. Check if platform-integrations-service is running on ${PLATFORM_INTEGRATIONS_SERVICE_URL}`);
  console.log(`  2. Test direct service: curl ${PLATFORM_INTEGRATIONS_SERVICE_URL}/health`);
  console.log(`  3. Test through gateway: curl http://localhost:${PORT}/api/platform-integrations/health`);
  console.log(`  4. Test gateway health: curl http://localhost:${PORT}/api/health`);
});

// Additional startup check to verify platform integrations service
const checkPlatformServiceOnStartup = async () => {
  try {
    console.log(`Checking platform integrations service at ${PLATFORM_INTEGRATIONS_SERVICE_URL}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${PLATFORM_INTEGRATIONS_SERVICE_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Platform integrations service is healthy:`, data);
    } else {
      console.log(`⚠️ Platform integrations service responded with status ${response.status}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(`❌ Platform integrations service is not responding:`, error.message);
    } else {
      console.log(`❌ Platform integrations service is not responding: Unknown error`);
    }
    console.log(`Make sure the service is running: cd backend/services/platform-integrations-service && npm run dev`);
  }
};

// Run the check 2 seconds after startup
setTimeout(checkPlatformServiceOnStartup, 2000);