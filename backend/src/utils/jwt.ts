import jwt from 'jsonwebtoken';
import { Role } from '../types/enums';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function generateResetToken(): string {
  return jwt.sign({ type: 'reset' }, config.jwt.secret, { expiresIn: '1h' });
}
