// >> index.d.ts <<
import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      /** Populated by authenticateToken middleware */
      user?: string | JwtPayload;
    }
  }
}
