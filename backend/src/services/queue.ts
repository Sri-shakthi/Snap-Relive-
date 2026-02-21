import {
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient
} from '@aws-sdk/client-sqs';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';

export type JobType = 'PROCESS_PHOTO' | 'PROCESS_SELFIE' | 'PROCESS_DOWNLOAD';

export interface QueueJobPayload {
  photoId?: string;
  selfieId?: string;
  downloadJobId?: string;
  eventId?: string;
  userId?: string;
  bucket?: string;
  s3Key?: string;
}

export interface QueueJob {
  id: string;
  type: JobType;
  payload: QueueJobPayload;
  attempts: number;
}

export interface QueueConsumer {
  job: QueueJob;
  ack: () => Promise<void>;
  retry: (attempts: number) => Promise<void>;
}

export interface QueueService {
  enqueue: (job: Omit<QueueJob, 'id' | 'attempts'>) => Promise<void>;
  consume: (handler: (consumer: QueueConsumer) => Promise<void>) => Promise<void>;
  getDepth: () => Promise<number>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class InMemoryQueueService implements QueueService {
  private queue: QueueJob[] = [];

  async enqueue(job: Omit<QueueJob, 'id' | 'attempts'>): Promise<void> {
    this.queue.push({
      ...job,
      id: randomUUID(),
      attempts: 0
    });
  }

  async consume(handler: (consumer: QueueConsumer) => Promise<void>): Promise<void> {
    while (true) {
      const job = this.queue.shift();
      if (!job) {
        await sleep(500);
        continue;
      }

      await handler({
        job,
        ack: async () => undefined,
        retry: async (attempts: number) => {
          const delayMs = Math.min(30000, config.queue.retryBaseMs * 2 ** (attempts - 1));
          setTimeout(() => {
            this.queue.push({ ...job, attempts });
          }, delayMs);
        }
      });
    }
  }

  async getDepth(): Promise<number> {
    return this.queue.length;
  }
}

class SqsQueueService implements QueueService {
  private client: SQSClient;

  constructor(private readonly queueUrl: string) {
    this.client = new SQSClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
      }
    });
  }

  async enqueue(job: Omit<QueueJob, 'id' | 'attempts'>): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({ ...job, id: randomUUID(), attempts: 0 })
      })
    );
  }

  async consume(handler: (consumer: QueueConsumer) => Promise<void>): Promise<void> {
    while (true) {
      const response = await this.client.send(
        new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 30
        })
      );

      const message = response.Messages?.[0];
      if (!message || !message.Body || !message.ReceiptHandle) {
        continue;
      }

      const parsedJob = JSON.parse(message.Body) as QueueJob;

      await handler({
        job: parsedJob,
        ack: async () => {
          await this.client.send(
            new DeleteMessageCommand({
              QueueUrl: this.queueUrl,
              ReceiptHandle: message.ReceiptHandle
            })
          );
        },
        retry: async (attempts: number) => {
          const delayMs = Math.min(30000, config.queue.retryBaseMs * 2 ** (attempts - 1));
          const delaySeconds = Math.max(1, Math.floor(delayMs / 1000));
          await this.client.send(
            new SendMessageCommand({
              QueueUrl: this.queueUrl,
              DelaySeconds: Math.min(900, delaySeconds),
              MessageBody: JSON.stringify({ ...parsedJob, attempts })
            })
          );
          await this.client.send(
            new DeleteMessageCommand({
              QueueUrl: this.queueUrl,
              ReceiptHandle: message.ReceiptHandle
            })
          );
        }
      });
    }
  }

  async getDepth(): Promise<number> {
    const response = await this.client.send(
      new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
      })
    );

    const visible = Number(response.Attributes?.ApproximateNumberOfMessages ?? 0);
    const inFlight = Number(response.Attributes?.ApproximateNumberOfMessagesNotVisible ?? 0);
    return visible + inFlight;
  }
}

let queueService: QueueService | null = null;

export const getQueueService = (): QueueService => {
  if (queueService) return queueService;

  if (config.queue.provider === 'sqs') {
    if (!config.aws.sqsQueueUrl) {
      throw new Error('AWS_SQS_QUEUE_URL is required when QUEUE_PROVIDER=sqs');
    }
    queueService = new SqsQueueService(config.aws.sqsQueueUrl);
    return queueService;
  }

  queueService = new InMemoryQueueService();
  return queueService;
};
