import { Request, Response } from 'express';
import { User } from '../models/User';
import { signToken } from '../middleware/auth';
import { eventPublisher, AuthEventType } from '../events/publisher';

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
      passwordHash: password 
    });
    
    await user.save();
    
    // Publish user created event
    eventPublisher.publish(AuthEventType.USER_CREATED, { 
      userId: user.id, 
      email 
    });
    
    // Return success response
    return res.status(201).json({ userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  
  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
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
    
    // Return token
    return res.json({ 
      accessToken: token,
      userId: user.id,
    });
  } catch (error) {
    console.error('Login error:', error);
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
    
    // Find user by ID
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data
    return res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Server error while fetching user data' });
  }
}