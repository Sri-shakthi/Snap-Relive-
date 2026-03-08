import Joi from 'joi';
import { config as loadEnv } from 'dotenv';

loadEnv();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),
  API_PREFIX: Joi.string().default('/api/v1'),
  TRUST_PROXY: Joi.string().allow('').optional(),
  DATABASE_URL: Joi.string().uri({ scheme: ['mysql'] }).required(),
  DB_POOL_MAX: Joi.number().integer().min(1).max(200).default(30),
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET: Joi.string().required(),
  AWS_S3_PRESIGN_EXPIRES: Joi.number().integer().min(60).max(3600).default(900),
  AWS_S3_GET_EXPIRES: Joi.number().integer().min(300).max(604800).default(86400),
  AWS_S3_TRANSFER_ACCELERATION: Joi.boolean().truthy('true').falsy('false').default(false),
  CLOUDFRONT_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).allow('').optional(),
  REKOGNITION_COLLECTION_PREFIX: Joi.string().default('snapshots-event-'),
  QUEUE_PROVIDER: Joi.string().valid('memory', 'sqs').default('memory'),
  QUEUE_BACKPRESSURE_THRESHOLD: Joi.number().integer().min(1).default(100),
  QUEUE_MAX_ATTEMPTS: Joi.number().integer().min(1).max(20).default(5),
  QUEUE_RETRY_BASE_MS: Joi.number().integer().min(100).default(500),
  AWS_SQS_QUEUE_URL: Joi.string().allow('').optional(),
  AWS_SQS_WHATSAPP_QUEUE_URL: Joi.string().allow('').optional(),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(120),
  REMATCH_DEBOUNCE_MS: Joi.number().integer().min(200).default(5000),
  REMATCH_BATCH_SIZE: Joi.number().integer().min(1).max(500).default(25),
  MATCH_REFRESH_COOLDOWN_MS: Joi.number().integer().min(1000).default(15000),
  MATCH_REFRESH_BURST_LIMIT: Joi.number().integer().min(1).max(20).default(3),
  VIDEO_REKOGNITION_POLL_DELAY_SECONDS: Joi.number().integer().min(5).max(900).default(30),
  VIDEO_REKOGNITION_MAX_POLLS: Joi.number().integer().min(1).max(1000).default(120),
  FFMPEG_PATH: Joi.string().default('ffmpeg'),
  WHATSAPP_API_VERSION: Joi.string().default('v23.0'),
  WHATSAPP_ACCESS_TOKEN: Joi.string().allow('').optional(),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().allow('').optional(),
  WHATSAPP_BASE_URL: Joi.string().uri({ scheme: ['https'] }).default('https://graph.facebook.com'),
  WHATSAPP_TEXT_TEMPLATE: Joi.string().default('Hi {{name}}, your SnapShots gallery is ready. Open {{appLink}} to view and download your photos.'),
  FRONTEND_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:5173')
}).unknown(true);

const { error, value } = envSchema.validate(process.env, { abortEarly: false, convert: true });

if (error) {
  throw new Error(`Invalid environment variables: ${error.message}`);
}

const parseTrustProxy = (
  raw: string | undefined
): boolean | number | string | undefined => {
  if (!raw || raw.trim() === '') {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return raw.trim();
};

export interface EnvConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  trustProxy?: boolean | number | string;
  databaseUrl: string;
  dbPoolMax: number;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3Bucket: string;
  awsS3PresignExpires: number;
  awsS3GetExpires: number;
  awsS3TransferAcceleration: boolean;
  cloudFrontBaseUrl?: string;
  rekognitionCollectionPrefix: string;
  queueProvider: 'memory' | 'sqs';
  queueBackpressureThreshold: number;
  queueMaxAttempts: number;
  queueRetryBaseMs: number;
  awsSqsQueueUrl?: string;
  awsSqsWhatsAppQueueUrl?: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  rematchDebounceMs: number;
  rematchBatchSize: number;
  matchRefreshCooldownMs: number;
  matchRefreshBurstLimit: number;
  videoRekognitionPollDelaySeconds: number;
  videoRekognitionMaxPolls: number;
  ffmpegPath: string;
  whatsAppApiVersion: string;
  whatsAppAccessToken?: string;
  whatsAppPhoneNumberId?: string;
  whatsAppBaseUrl: string;
  whatsAppTextTemplate: string;
  frontendBaseUrl: string;
}

export const env: EnvConfig = {
  nodeEnv: value.NODE_ENV,
  port: value.PORT,
  apiPrefix: value.API_PREFIX,
  trustProxy: parseTrustProxy(value.TRUST_PROXY),
  databaseUrl: value.DATABASE_URL,
  dbPoolMax: value.DB_POOL_MAX,
  awsRegion: value.AWS_REGION,
  awsAccessKeyId: value.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: value.AWS_SECRET_ACCESS_KEY,
  awsS3Bucket: value.AWS_S3_BUCKET,
  awsS3PresignExpires: value.AWS_S3_PRESIGN_EXPIRES,
  awsS3GetExpires: value.AWS_S3_GET_EXPIRES,
  awsS3TransferAcceleration: value.AWS_S3_TRANSFER_ACCELERATION,
  cloudFrontBaseUrl: value.CLOUDFRONT_BASE_URL || undefined,
  rekognitionCollectionPrefix: value.REKOGNITION_COLLECTION_PREFIX,
  queueProvider: value.QUEUE_PROVIDER,
  queueBackpressureThreshold: value.QUEUE_BACKPRESSURE_THRESHOLD,
  queueMaxAttempts: value.QUEUE_MAX_ATTEMPTS,
  queueRetryBaseMs: value.QUEUE_RETRY_BASE_MS,
  awsSqsQueueUrl: value.AWS_SQS_QUEUE_URL || undefined,
  awsSqsWhatsAppQueueUrl: value.AWS_SQS_WHATSAPP_QUEUE_URL || undefined,
  rateLimitWindowMs: value.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: value.RATE_LIMIT_MAX,
  rematchDebounceMs: value.REMATCH_DEBOUNCE_MS,
  rematchBatchSize: value.REMATCH_BATCH_SIZE,
  matchRefreshCooldownMs: value.MATCH_REFRESH_COOLDOWN_MS,
  matchRefreshBurstLimit: value.MATCH_REFRESH_BURST_LIMIT,
  videoRekognitionPollDelaySeconds: value.VIDEO_REKOGNITION_POLL_DELAY_SECONDS,
  videoRekognitionMaxPolls: value.VIDEO_REKOGNITION_MAX_POLLS,
  ffmpegPath: value.FFMPEG_PATH,
  whatsAppApiVersion: value.WHATSAPP_API_VERSION,
  whatsAppAccessToken: value.WHATSAPP_ACCESS_TOKEN || undefined,
  whatsAppPhoneNumberId: value.WHATSAPP_PHONE_NUMBER_ID || undefined,
  whatsAppBaseUrl: value.WHATSAPP_BASE_URL,
  whatsAppTextTemplate: value.WHATSAPP_TEXT_TEMPLATE,
  frontendBaseUrl: value.FRONTEND_BASE_URL
};
