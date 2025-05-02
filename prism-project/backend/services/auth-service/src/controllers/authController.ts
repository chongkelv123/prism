import { Request, Response } from 'express';
import { User } from '../models/User';
import { signToken } from '../middleware/auth';
import { eventPublisher, AuthEventType } from '../events/publisher';

export async function register(req: Request, res: Response) {
  const { firstName, lastName, email, password } = req.body;
  if (await User.exists({ email })) {
    return res.status(409).json({ message: 'Email already in use' });
  }
  const user = new User({ firstName, lastName, email, passwordHash: password });
  await user.save();
  eventPublisher.publish(AuthEventType.USER_CREATED, { userId: user.id, email });
  return res.status(201).json({ userId: user.id });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = signToken({ userId: user.id, email });
  eventPublisher.publish(AuthEventType.USER_LOGGED_IN, { userId: user.id });
  return res.json({ accessToken: token });
}
