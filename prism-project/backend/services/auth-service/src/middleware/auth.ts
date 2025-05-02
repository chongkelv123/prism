// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Express Request type to include user object
declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware to protect routes
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    res.status(401).json({ message: 'No token, authorization denied' });
    return;
  }

  try {
    // Verify token
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_replace_in_production';
    const decoded = jwt.verify(token, secret) as any;

    // Set user data in request object
    req.user = decoded.user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Role-based authorization middleware
 * @param roles Array of allowed roles for the route
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Unauthorized: Insufficient permissions' });
      return;
    }

    next();
  };
};