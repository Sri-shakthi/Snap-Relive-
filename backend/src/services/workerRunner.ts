import { config } from '../config/index.js';
import {
  handleProcessDownloadJob,
  handleProcessPhotoJob,
  handleProcessSelfieJob,
  handleProcessVideoJob,
  handleProcessVideoResultJob,
  handleProcessWhatsAppJob
} from './jobHandlers.js';
import { getQueueService } from './queue.js';

const runQueueLoop = async (channel: 'core' | 'whatsapp'): Promise<void> => {
  const queue = getQueueService(channel);

  await queue.consume(async ({ job, ack, retry }) => {
    try {
      if (job.type === 'PROCESS_PHOTO') {
        await handleProcessPhotoJob(job);
      } else if (job.type === 'PROCESS_SELFIE') {
        await handleProcessSelfieJob(job);
      } else if (job.type === 'PROCESS_DOWNLOAD') {
        await handleProcessDownloadJob(job);
      } else if (job.type === 'PROCESS_WHATSAPP') {
        await handleProcessWhatsAppJob(job);
      } else if (job.type === 'PROCESS_VIDEO') {
        await handleProcessVideoJob(job);
      } else if (job.type === 'PROCESS_VIDEO_RESULT') {
        await handleProcessVideoResultJob(job);
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

export const startWorkerLoop = async (): Promise<void> => {
  await Promise.all([runQueueLoop('core'), runQueueLoop('whatsapp')]);
};
