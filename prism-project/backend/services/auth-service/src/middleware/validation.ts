import { check, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const registerValidator = [
  check('firstName').notEmpty(),
  check('lastName').notEmpty(),
  check('email').isEmail(),
  check('password').isLength({ min: 6 }),
  (req: Request, res: Response, next: NextFunction) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
  }
];

export const loginValidator = [
  check('email').isEmail(),
  check('password').notEmpty(),
  (req: Request, res: Response, next: NextFunction) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
  }
];
