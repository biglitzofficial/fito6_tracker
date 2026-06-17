import { PrismaClient, Role } from '@prisma/client';
import { hashPassword, validatePassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrator';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }

  validatePassword(password);

  const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (existingAdmin) {
    console.error('An admin account already exists. Bootstrap skipped.');
    process.exit(1);
  }

  const hashed = await hashPassword(password);
  const admin = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: Role.ADMIN,
    },
  });

  console.log(`Admin account created: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
