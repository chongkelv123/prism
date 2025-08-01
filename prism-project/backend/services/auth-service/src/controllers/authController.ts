import { Request, Response } from 'express';
import { User } from '../models/User';
import { signToken } from '../middleware/auth';
import { eventPublisher, AuthEventType } from '../events/publisher';
import logger from '../utils/logger';

export async function register(req: Request, res: Response) {
  const { firstName, lastName, email, password } = req.body;
  
  try {
    // Check if user already exists
    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    // Create new user
    const user = new User({ 
      firstName, 
      lastName, 
      email, 
      passwordHash: password  // This will be hashed in the pre-save hook
    });
    
    await user.save();
    
    // Publish user created event
    eventPublisher.publish(AuthEventType.USER_CREATED, { 
      userId: user.id, 
      email 
    });

    logger.info(`User registered successfully: ${email}`);
    
    // Return success response
    return res.status(201).json({ userId: user.id });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  
  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists
    if (!user) {
      logger.warn(`Login attempt failed: User not found for email ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password is correct
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn(`Login attempt failed: Invalid password for email ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = signToken({ 
      userId: user.id, 
      email: user.email 
    });
    
    // Publish user logged in event
    eventPublisher.publish(AuthEventType.USER_LOGGED_IN, { 
      userId: user.id 
    });
    
    logger.info(`User logged in successfully: ${email}`);
    
    // Return token
    return res.json({ 
      accessToken: token,
      userId: user.id,
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    // Get user ID from authenticated request
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Find user by ID - exclude the passwordHash for security
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data
    return res.json(user);
  } catch (error) {
    logger.error('Get current user error:', error);
    return res.status(500).json({ message: 'Server error while fetching user data' });
  }
}

export async function updateUserProfile(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, email } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        message: 'First name, last name, and email are required' 
      });
    }
    
    // Check if email is already in use by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Email address is already in use' 
      });
    }
    
    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim()
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-passwordHash');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    logger.info(`User profile updated: ${userId} - ${email}`);
    
    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email
      }
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    return res.status(500).json({ 
      message: 'Server error while updating profile' 
    });
  }
}