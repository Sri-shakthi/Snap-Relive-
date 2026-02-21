import { config } from '../config/index.js';
import { handleProcessDownloadJob, handleProcessPhotoJob, handleProcessSelfieJob } from './jobHandlers.js';
import { getQueueService } from './queue.js';

export const startWorkerLoop = async (): Promise<void> => {
  const queue = getQueueService();

  await queue.consume(async ({ job, ack, retry }) => {
    try {
      if (job.type === 'PROCESS_PHOTO') {
        await handleProcessPhotoJob(job);
      } else if (job.type === 'PROCESS_SELFIE') {
        await handleProcessSelfieJob(job);
      } else if (job.type === 'PROCESS_DOWNLOAD') {
        await handleProcessDownloadJob(job);
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
