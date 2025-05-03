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
  res.status(200).json({ status: 'ok' });
});

// Service URLs (from environment variables or defaults)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4000';
const PROJECT_DATA_SERVICE_URL = process.env.PROJECT_DATA_SERVICE_URL || 'http://localhost:4001';
const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL || 'http://localhost:4002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4003';
const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://localhost:4004';

// Route API requests to appropriate microservices
app.use('/api/auth', proxy(AUTH_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/api/auth${req.url}`;
  }
}));

app.use('/api/projects', proxy(PROJECT_DATA_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/api/projects${req.url}`;
  }
}));

app.use('/api/reports', proxy(REPORT_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/api/reports${req.url}`;
  }
}));

app.use('/api/notifications', proxy(NOTIFICATION_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/api/notifications${req.url}`;
  }
}));

app.use('/api/storage', proxy(STORAGE_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/api/storage${req.url}`;
  }
}));

// For production, serve the static React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('../../frontend/dist'));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile('../../frontend/dist/index.html');
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});