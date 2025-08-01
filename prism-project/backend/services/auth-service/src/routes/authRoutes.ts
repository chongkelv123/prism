// backend/services/auth-service/src/routes/authRoutes.ts
import { Router } from 'express';
import { register, login, getCurrentUser, updateUserProfile } from '../controllers/authController';
import { registerValidator, loginValidator } from '../middleware/validation';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);

// Protected routes
router.get('/me', authenticateJWT, getCurrentUser);
router.put('/profile', authenticateJWT, updateUserProfile);


export default router;