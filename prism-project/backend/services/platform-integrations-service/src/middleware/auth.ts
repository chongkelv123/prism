// backend/services/platform-integrations-service/src/middleware/auth.ts - COMPLETE WORKING VERSION
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    [key: string]: any;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.warn('Authorization header is missing for request:', req.path);
      res.status(401).json({
        error: 'Authorization header is missing',
        message: 'Please provide a valid authorization token',
      });
      return;
    }

    // Check if header follows Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      console.warn('Invalid authorization header format for request:', req.path);
      res.status(401).json({
        error: 'Invalid authorization header format',
        message: 'Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token || token.trim() === '') {
      console.warn('Empty token provided for request:', req.path);
      res.status(401).json({
        error: 'Empty authorization token',
        message: 'Please provide a valid authorization token',
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Validate token payload - handle different token formats
    let userId = decoded.userId;
    let email = decoded.email;
    
    // Handle different JWT payload formats
    if (!userId && decoded.id) {
      userId = decoded.id;
    }
    if (!email && decoded.user?.email) {
      email = decoded.user.email;
    }
    if (!userId && decoded.user?.id) {
      userId = decoded.user.id;
    }
    
    if (!userId) {
      console.warn('Invalid token payload - missing userId for request:', req.path);
      res.status(401).json({
        error: 'Invalid token payload',
        message: 'Token does not contain required user information',
      });
      return;
    }

    // Check token expiration (JWT library handles this, but we can add custom logic)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.warn('Expired token for request:', req.path);
      res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired, please log in again',
      });
      return;
    }

    // Attach user info to request for downstream use
    req.user = {
      userId: userId,
      email: email || 'unknown@example.com',
      ...decoded
    };

    console.debug('Authentication successful for user:', email, 'on path:', req.path);
    
    // Continue to next middleware
    next();

  } catch (error: any) {
    console.error('Token verification error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or malformed',
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired, please log in again',
      });
      return;
    }

    if (error.name === 'NotBeforeError') {
      res.status(401).json({
        error: 'Token not active',
        message: 'The provided token is not yet active',
      });
      return;
    }

    // Generic server error for unexpected cases
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying your authentication',
    });
  }
};

export default authenticateJWT;
export { authenticateJWT };