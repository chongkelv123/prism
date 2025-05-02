import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { registerValidator, loginValidator } from '../middleware/validation';

const router = Router();
router.post('/register', registerValidator, register);
router.post('/login',    loginValidator,    login);

export default router;
