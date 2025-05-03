import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function signToken(payload: object): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.TOKEN_EXPIRATION || '24h';

  return jwt.sign(
    payload,
    secret,
    { expiresIn } as SignOptions
  );
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header is missing' });
  }
  
  // Extract the token (Bearer token format)
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Invalid authorization format' });
  }
  
  const token = parts[1];
  
  try {
    // Verify the token
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    // Attach the decoded payload to the request object
    req.user = decoded;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token has expired' });
    }
    
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
}