import jwt, { SignOptions } from 'jsonwebtoken';

export function signToken(payload: object): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.TOKEN_EXPIRATION!;

  return jwt.sign(
    payload,
    secret,
    { expiresIn } as SignOptions    // ← cast here
  );
}
