import { getQueueService } from './services/queue.js';
import { handleProcessPhotoJob, handleProcessSelfieJob } from './services/jobHandlers.js';
import { config } from './config/index.js';

const queue = getQueueService();

const runWorker = async () => {
  await queue.consume(async ({ job, ack, retry }) => {
    try {
      if (job.type === 'PROCESS_PHOTO') {
        await handleProcessPhotoJob(job);
      } else if (job.type === 'PROCESS_SELFIE') {
        await handleProcessSelfieJob(job);
      }

      await ack();
    } catch (error) {
      const nextAttempt = job.attempts + 1;
      if (nextAttempt >= config.queue.maxAttempts) {
        console.error('Job failed permanently', { job, error });
        await ack();
      } else {
        console.warn('Job failed, scheduling retry', {
          jobId: job.id,
          currentAttempt: nextAttempt,
          maxAttempts: config.queue.maxAttempts
        });
        await retry(nextAttempt);
      }
    }
  });
};

runWorker().catch((error) => {
  console.error('Worker failed to start', error);
  process.exit(1);
});
