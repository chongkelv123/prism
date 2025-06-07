// src/types/express/index.d.ts
import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by authenticateToken middleware.
       * Could be a string (the raw token) or a decoded JwtPayload.
       */
      user?: string | JwtPayload;
    }
  }
}

// This file needs no exports.
export {};
