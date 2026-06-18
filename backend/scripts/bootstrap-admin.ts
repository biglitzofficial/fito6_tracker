import { Role } from '../src/types/enums';
import { User } from '../src/types/models';
import { COL, create, findMany } from '../src/lib/firestore';
import { hashPassword, validatePassword } from '../src/utils/password';

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrator';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }

  validatePassword(password);

  const existingAdmin = (await findMany<User>(COL.users, (u) => u.role === Role.ADMIN))[0];
  if (existingAdmin) {
    console.error('An admin account already exists. Bootstrap skipped.');
    process.exit(1);
  }

  const hashed = await hashPassword(password);
  const admin = await create<User>(COL.users, {
    email,
    password: hashed,
    name,
    role: Role.ADMIN,
    isActive: true,
  });

  console.log(`Admin account created: ${admin.email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
