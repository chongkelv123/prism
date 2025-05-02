// src/controllers/authController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { eventPublisher, AuthEventType } from '../events/publisher';
import { logger } from '../utils/logger';

// Token generation helper
const generateToken = (user: IUser): string => {
  const payload = {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };

  const secret = process.env.JWT_SECRET || 'default_jwt_secret_replace_in_production';
  const expiresIn = '24h';

  return jwt.sign(payload, secret, { expiresIn });
};

export const authController = {
  /**
   * Register a new user
   */
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { firstName, lastName, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: 'User already exists' });
        return;
      }

      // Create new user
      const user = new User({
        firstName,
        lastName,
        email,
        password
      });

      await user.save();

      // Publish user created event
      await eventPublisher.publish(AuthEventType.USER_CREATED, {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });

      // Generate JWT token
      const token = generateToken(user);

      // Return user info and token
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        },
        token
      });
    } catch (error) {
      logger.error(`Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Server error during registration' });
    }
  },

  /**
   * Login user
   */
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find user by email and include password for validation
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      // Validate password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      // Publish login event
      await eventPublisher.publish(AuthEventType.USER_LOGIN, {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      // Generate token
      const token = generateToken(user);

      // Return token and user info
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        },
        token
      });
    } catch (error) {
      logger.error(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Server error during login' });
    }
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(200).json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      logger.error(`Get current user error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Server error fetching user data' });
    }
  },

  /**
   * Log out a user
   */
  logout: async (req: Request, res: Response): Promise<void> => {
    try {
      // Publish logout event
      await eventPublisher.publish(AuthEventType.USER_LOGOUT, {
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      logger.error(`Logout error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Server error during logout' });
    }
  }
};