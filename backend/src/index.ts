import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`🚀 Fito6 API running on port ${config.port} [${config.nodeEnv}]`);
});
