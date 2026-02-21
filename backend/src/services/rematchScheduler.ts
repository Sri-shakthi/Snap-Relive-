import { listSelfiesForEvent } from '../data-access/selfies.dao.js';
import { config } from '../config/index.js';
import { getQueueService } from './queue.js';

const rematchTimers = new Map<string, NodeJS.Timeout>();

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const enqueueSelfieRematchJobs = async (eventId: string): Promise<void> => {
  const selfies = await listSelfiesForEvent(eventId);
  if (selfies.length === 0) {
    return;
  }

  const queue = getQueueService();
  const batches = chunkArray(selfies, config.rematch.batchSize);

  for (const batch of batches) {
    await Promise.all(
      batch.map((selfie) =>
        queue.enqueue({
          type: 'PROCESS_SELFIE',
          payload: {
            selfieId: selfie.id,
            userId: selfie.userId,
            eventId: selfie.eventId,
            bucket: selfie.s3Bucket,
            s3Key: selfie.s3Key
          }
        })
      )
    );
  }
};

export const scheduleEventSelfieRematch = (eventId: string): void => {
  const existingTimer = rematchTimers.get(eventId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    rematchTimers.delete(eventId);

    try {
      await enqueueSelfieRematchJobs(eventId);
      console.log('Enqueued debounced selfie rematch jobs', { eventId });
    } catch (error) {
      console.error('Failed to enqueue debounced selfie rematch jobs', {
        eventId,
        error
      });
    }
  }, config.rematch.debounceMs);

  rematchTimers.set(eventId, timer);
};
