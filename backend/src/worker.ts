import { startWorkerLoop } from './services/workerRunner.js';

startWorkerLoop().catch((error) => {
  console.error('Worker failed to start', error);
  process.exit(1);
});
