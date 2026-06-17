import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

const WEAK_SECRETS = new Set([
  'dev_secret_change_me',
  'your_super_secret_jwt_key_change_in_production',
  'fito6_jwt_secret_change_in_production',
]);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Password must include uppercase, lowercase, and a number');
  }
}

export function isWeakJwtSecret(secret: string): boolean {
  return secret.length < 32 || WEAK_SECRETS.has(secret);
}
