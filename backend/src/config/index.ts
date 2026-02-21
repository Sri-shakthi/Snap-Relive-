import { env } from './env.js';

export const config = {
  app: {
    port: env.port,
    apiPrefix: env.apiPrefix,
    isProduction: env.nodeEnv === 'production'
  },
  aws: {
    region: env.awsRegion,
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey,
    s3Bucket: env.awsS3Bucket,
    s3PresignExpires: env.awsS3PresignExpires,
    s3GetExpires: env.awsS3GetExpires,
    cloudFrontBaseUrl: env.cloudFrontBaseUrl,
    collectionPrefix: env.rekognitionCollectionPrefix,
    sqsQueueUrl: env.awsSqsQueueUrl
  },
  queue: {
    provider: env.queueProvider,
    maxAttempts: env.queueMaxAttempts,
    retryBaseMs: env.queueRetryBaseMs
  },
  rateLimit: {
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax
  },
  rematch: {
    debounceMs: env.rematchDebounceMs,
    batchSize: env.rematchBatchSize
  },
  matches: {
    refreshCooldownMs: env.matchRefreshCooldownMs
  }
};
