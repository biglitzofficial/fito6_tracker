import dotenv from 'dotenv';
import { isWeakJwtSecret } from '../utils/password';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    if (isProduction) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return '';
  }
  return value;
}

const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'dev_secret_change_me');

if (isProduction) {
  requireEnv('JWT_SECRET', jwtSecret);
  if (isWeakJwtSecret(jwtSecret)) {
    throw new Error('JWT_SECRET must be at least 32 characters and not a default value');
  }
  requireEnv('DATABASE_URL', process.env.DATABASE_URL);
  requireEnv('DIRECT_URL', process.env.DIRECT_URL);
  requireEnv('FRONTEND_URL', process.env.FRONTEND_URL);
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  isProduction,
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};
