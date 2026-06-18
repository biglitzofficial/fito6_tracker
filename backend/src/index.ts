import app from './app';
import { config } from './config';
import { pingFirebase } from './lib/firebase';

async function start() {
  try {
    await pingFirebase();
    console.log('Firebase connected');
  } catch (err) {
    console.error('Firebase warmup failed:', (err as Error).message);
  }

  app.listen(config.port, () => {
    console.log(`Fito6 API running on port ${config.port} [${config.nodeEnv}]`);
  });
}

start();

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
