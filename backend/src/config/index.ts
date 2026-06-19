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

function parseServiceAccountJson(): { project_id?: string } | null {
  if (!firebaseServiceAccountJson) return null;
  try {
    return JSON.parse(firebaseServiceAccountJson) as { project_id?: string };
  } catch {
    return null;
  }
}

function resolveProjectId(): string {
  if (firebaseProjectId) return firebaseProjectId;
  const fromJson = parseServiceAccountJson()?.project_id;
  if (fromJson) return fromJson;

  const credPath = firebaseServiceAccountPath
    ? path.resolve(process.cwd(), firebaseServiceAccountPath)
    : path.resolve(process.cwd(), 'firebase-service-account.json');

  if (fs.existsSync(credPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(credPath, 'utf-8')) as { project_id?: string };
      if (parsed.project_id) return parsed.project_id;
    } catch {
      // fall through
    }
  }

  return '';
}

function resolveStorageBucket(): string {
  if (process.env.FIREBASE_STORAGE_BUCKET) return process.env.FIREBASE_STORAGE_BUCKET;

  const projectId = resolveProjectId();
  if (projectId) return `${projectId}.appspot.com`;

  return '';
}

const resolvedProjectId = resolveProjectId();
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
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@fito6.com',
    secure: process.env.SMTP_SECURE === 'true',
    configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from:
      process.env.RESEND_FROM ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'Fito6 <onboarding@resend.dev>',
    configured: !!(
      process.env.RESEND_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    ),
    smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    resendConfigured: !!process.env.RESEND_API_KEY,
  },
  firebase: {
    serviceAccountPath: firebaseServiceAccountPath,
    serviceAccountJson: firebaseServiceAccountJson,
    projectId: resolvedProjectId || firebaseProjectId,
    clientEmail: firebaseClientEmail,
    privateKey: firebasePrivateKey,
    storageBucket: firebaseStorageBucket,
  },
};
