import { Role } from '../src/types/enums';
import { User } from '../src/types/models';
import { COL, create, findOne, update } from '../src/lib/firestore';
import { hashPassword, validatePassword } from '../src/utils/password';

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Super Admin';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }

  validatePassword(password);

  const hashed = await hashPassword(password);
  const existing = await findOne<User>(COL.users, 'email', email);

  if (existing) {
    await update<User>(COL.users, existing.id, {
      role: Role.SUPERADMIN,
      password: hashed,
      name,
      isActive: true,
    });
    console.log(`Updated super admin: ${email} (id ${existing.id})`);
    return;
  }

  const user = await create<User>(COL.users, {
    email,
    password: hashed,
    name,
    role: Role.SUPERADMIN,
    isActive: true,
  });
  console.log(`Created super admin: ${user.email} (id ${user.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
