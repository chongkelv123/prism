// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { check, validationResult } from 'express-validator';

/**
 * Middleware to validate request data
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

/**
 * Registration request validation rules
 */
export const registerValidation = [
  check('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  
  check('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  
  check('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required'),
  
  check('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  validateRequest
];

/**
 * Login request validation rules
 */
export const loginValidation = [
  check('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required'),
  
  check('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  validateRequest
];