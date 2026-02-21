import { createApp } from './app.js';
import { config } from './config/index.js';
import { startWorkerLoop } from './services/workerRunner.js';

const app = createApp();

app.listen(config.app.port, () => {
  console.log(`Snapshots API running on port ${config.app.port}`);

  if (config.queue.provider === 'memory') {
    console.log('Memory queue detected: starting embedded worker in API process.');
    startWorkerLoop().catch((error) => {
      console.error('Embedded worker failed', error);
    });
  }
});
