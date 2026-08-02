import { Role } from '../types/enums';
import { User } from '../types/models';
import { COL, create, findOne, update } from '../lib/firestore';
import { hashPassword, validatePassword } from '../utils/password';

const DEFAULT_EMAIL = 'superadmin@fito6.com';

/** Creates or updates the dedicated platform Super Admin login on server start. */
export async function ensurePlatformSuperAdmin() {
  const email = (process.env.PLATFORM_SUPERADMIN_EMAIL || DEFAULT_EMAIL).toLowerCase().trim();
  const password = process.env.PLATFORM_SUPERADMIN_PASSWORD;
  const name = process.env.PLATFORM_SUPERADMIN_NAME?.trim() || 'Fito6 Super Admin';

  if (!password) {
    console.log('Platform super admin: set PLATFORM_SUPERADMIN_PASSWORD to auto-create login');
    return;
  }

  try {
    validatePassword(password);
  } catch (e) {
    console.error('Platform super admin: invalid password —', e instanceof Error ? e.message : e);
    return;
  }

  const hashed = await hashPassword(password);
  const existing = await findOne<User>(COL.users, 'email', email);

  if (existing) {
    await update<User>(COL.users, existing.id, {
      role: Role.SUPERADMIN,
      password: hashed,
      name,
      isActive: true,
    });
    console.log(`Platform super admin ready: ${email}`);
    return;
  }

  await create<User>(COL.users, {
    email,
    password: hashed,
    name,
    role: Role.SUPERADMIN,
    isActive: true,
  });
  console.log(`Platform super admin created: ${email}`);
}
