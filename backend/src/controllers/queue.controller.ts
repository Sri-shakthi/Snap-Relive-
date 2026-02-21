import { config } from '../config/index.js';
import { getQueueService } from '../services/queue.js';

export const getQueueStatusController = async () => {
  const queueDepth = await getQueueService().getDepth();
  const threshold = config.queue.backpressureThreshold;
  const highDemand = queueDepth >= threshold;

  return {
    queueDepth,
    threshold,
    highDemand,
    message: highDemand ? 'High demand - results may take a few minutes.' : null
  };
};
