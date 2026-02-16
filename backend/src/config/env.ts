import Joi from 'joi';
import { config as loadEnv } from 'dotenv';

loadEnv();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),
  API_PREFIX: Joi.string().default('/api/v1'),
  DATABASE_URL: Joi.string().uri({ scheme: ['mysql'] }).required(),
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET: Joi.string().required(),
  AWS_S3_PRESIGN_EXPIRES: Joi.number().integer().min(60).max(3600).default(900),
  REKOGNITION_COLLECTION_PREFIX: Joi.string().default('snapshots-event-'),
  QUEUE_PROVIDER: Joi.string().valid('memory', 'sqs').default('memory'),
  QUEUE_MAX_ATTEMPTS: Joi.number().integer().min(1).max(20).default(5),
  QUEUE_RETRY_BASE_MS: Joi.number().integer().min(100).default(500),
  AWS_SQS_QUEUE_URL: Joi.string().allow('').optional(),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(120)
}).unknown(true);

const { error, value } = envSchema.validate(process.env, { abortEarly: false, convert: true });

if (error) {
  throw new Error(`Invalid environment variables: ${error.message}`);
}

export interface EnvConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3Bucket: string;
  awsS3PresignExpires: number;
  rekognitionCollectionPrefix: string;
  queueProvider: 'memory' | 'sqs';
  queueMaxAttempts: number;
  queueRetryBaseMs: number;
  awsSqsQueueUrl?: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

export const env: EnvConfig = {
  nodeEnv: value.NODE_ENV,
  port: value.PORT,
  apiPrefix: value.API_PREFIX,
  databaseUrl: value.DATABASE_URL,
  awsRegion: value.AWS_REGION,
  awsAccessKeyId: value.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: value.AWS_SECRET_ACCESS_KEY,
  awsS3Bucket: value.AWS_S3_BUCKET,
  awsS3PresignExpires: value.AWS_S3_PRESIGN_EXPIRES,
  rekognitionCollectionPrefix: value.REKOGNITION_COLLECTION_PREFIX,
  queueProvider: value.QUEUE_PROVIDER,
  queueMaxAttempts: value.QUEUE_MAX_ATTEMPTS,
  queueRetryBaseMs: value.QUEUE_RETRY_BASE_MS,
  awsSqsQueueUrl: value.AWS_SQS_QUEUE_URL || undefined,
  rateLimitWindowMs: value.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: value.RATE_LIMIT_MAX
};
