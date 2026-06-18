import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
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

const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '';
const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || '';
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';

function resolveStorageBucket(): string {
  if (process.env.FIREBASE_STORAGE_BUCKET) return process.env.FIREBASE_STORAGE_BUCKET;
  if (firebaseProjectId) return `${firebaseProjectId}.appspot.com`;

  const credPath = firebaseServiceAccountPath
    ? path.resolve(process.cwd(), firebaseServiceAccountPath)
    : path.resolve(process.cwd(), 'firebase-service-account.json');

  if (fs.existsSync(credPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(credPath, 'utf-8')) as { project_id?: string };
      if (parsed.project_id) return `${parsed.project_id}.appspot.com`;
    } catch {
      // fall through
    }
  }

  return '';
}

const firebaseStorageBucket = resolveStorageBucket();

function hasFirebaseCredentials() {
  return !!(
    firebaseServiceAccountJson ||
    firebaseServiceAccountPath ||
    fs.existsSync(path.resolve(process.cwd(), 'firebase-service-account.json')) ||
    (firebaseProjectId && firebaseClientEmail && firebasePrivateKey)
  );
}

if (isProduction) {
  requireEnv('JWT_SECRET', jwtSecret);
  if (isWeakJwtSecret(jwtSecret)) {
    throw new Error('JWT_SECRET must be at least 32 characters and not a default value');
  }
  requireEnv('FRONTEND_URL', process.env.FRONTEND_URL);

  if (!hasFirebaseCredentials()) {
    throw new Error(
      'Firebase credentials required: set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_PATH, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY'
    );
  }
  requireEnv('FIREBASE_STORAGE_BUCKET', firebaseStorageBucket);
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
  firebase: {
    serviceAccountPath: firebaseServiceAccountPath,
    serviceAccountJson: firebaseServiceAccountJson,
    projectId: firebaseProjectId,
    clientEmail: firebaseClientEmail,
    privateKey: firebasePrivateKey,
    storageBucket: firebaseStorageBucket,
  },
};
