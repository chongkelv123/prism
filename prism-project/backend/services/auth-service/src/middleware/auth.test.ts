// backend/services/auth-service/src/middleware/auth.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateJWT, signToken } from '../middleware/auth';

// Mock dependencies
jest.mock('jsonwebtoken');

// Define proper types for the mocked Response object
type MockResponse = Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
};

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: MockResponse;
  let nextFunction: NextFunction;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      headers: {}
    };
    
    // Create properly typed mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as MockResponse;
    
    nextFunction = jest.fn();
    
    // Mock environment variable
    process.env.JWT_SECRET = 'test_secret';
    process.env.TOKEN_EXPIRATION = '1h';
  });
  
  describe('signToken', () => {
    it('signs JWT with correct payload and options', () => {
      // Mock jwt.sign to return a token
      (jwt.sign as jest.Mock).mockReturnValue('signed_token');
      
      const payload = { userId: 'user123', email: 'user@example.com' };
      const token = signToken(payload);
      
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test_secret',
        { expiresIn: '1h' }
      );
      
      expect(token).toBe('signed_token');
    });
    
    it('uses default expiration if not set in environment', () => {
      // Temporarily remove process.env.TOKEN_EXPIRATION
      const originalExpiration = process.env.TOKEN_EXPIRATION;
      delete process.env.TOKEN_EXPIRATION;
      
      // Mock jwt.sign to return a token
      (jwt.sign as jest.Mock).mockReturnValue('signed_token');
      
      const payload = { userId: 'user123' };
      signToken(payload);
      
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test_secret',
        { expiresIn: '24h' } // Default value
      );
      
      // Restore environment variable
      process.env.TOKEN_EXPIRATION = originalExpiration;
    });
  });
  
  describe('authenticateJWT', () => {
    it('authenticates valid JWT and sets user in request', () => {
      // Mock successful JWT verification
      const decodedToken = { userId: 'user123', email: 'user@example.com' };
      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
      
      // Set authorization header
      mockRequest.headers = {
        authorization: 'Bearer valid_token'
      };
      
      // Call middleware
      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
      expect(mockRequest.user).toEqual(decodedToken);
      expect(nextFunction).toHaveBeenCalled();
    });
    
    it('returns 401 if authorization header is missing', () => {
      // Call middleware without setting authorization header
      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        message: 'Authorization header is missing' 
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    it('returns 401 if authorization format is invalid', () => {
      // Set invalid authorization header (missing Bearer prefix)
      mockRequest.headers = {
        authorization: 'invalid_format'
      };
      
      // Call middleware
      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        message: 'Invalid authorization format' 
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    it('returns 401 if token is invalid', () => {
      // Mock JWT verification error
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });
      
      // Set authorization header
      mockRequest.headers = {
        authorization: 'Bearer invalid_token'
      };
      
      // Call middleware
      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        message: 'Invalid token' 
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    it('returns 401 if token has expired', () => {
      // Mock JWT expiration error
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });
      
      // Set authorization header
      mockRequest.headers = {
        authorization: 'Bearer expired_token'
      };
      
      // Call middleware
      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        message: 'Token has expired' 
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    it('returns 500 for other errors', () => {
      // Mock generic error
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Unknown error');
      });
      
      // Set authorization header
      mockRequest.headers = {
        authorization: 'Bearer token'
      };
      
      // Call middleware
      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        message: 'Internal server error during authentication' 
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});