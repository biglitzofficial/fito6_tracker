import app from './app';
import { config } from './config';
import prisma from './lib/prisma';

const server = app.listen(config.port, () => {
  console.log(`Fito6 API running on port ${config.port} [${config.nodeEnv}]`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
