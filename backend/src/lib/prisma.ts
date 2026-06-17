import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return client.$extends({
    query: {
      $allOperations({ args, query }) {
        const execute = () => query(args);
        return execute().catch(async (error: unknown) => {
          const code = (error as { code?: string })?.code;
          if (code === 'P1017' || code === 'P1001' || code === 'P2024') {
            await client.$connect();
            return execute();
          }
          throw error;
        });
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
