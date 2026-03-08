import { env } from './env.js';

export const config = {
  app: {
    port: env.port,
    apiPrefix: env.apiPrefix,
    trustProxy: env.trustProxy,
    isProduction: env.nodeEnv === 'production'
  },
  aws: {
    region: env.awsRegion,
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey,
    s3Bucket: env.awsS3Bucket,
    s3PresignExpires: env.awsS3PresignExpires,
    s3GetExpires: env.awsS3GetExpires,
    s3TransferAcceleration: env.awsS3TransferAcceleration,
    cloudFrontBaseUrl: env.cloudFrontBaseUrl,
    collectionPrefix: env.rekognitionCollectionPrefix,
    sqsQueueUrl: env.awsSqsQueueUrl
  },
  queue: {
    provider: env.queueProvider,
    backpressureThreshold: env.queueBackpressureThreshold,
    maxAttempts: env.queueMaxAttempts,
    retryBaseMs: env.queueRetryBaseMs,
    whatsappQueueUrl: env.awsSqsWhatsAppQueueUrl
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
    refreshCooldownMs: env.matchRefreshCooldownMs,
    refreshBurstLimit: env.matchRefreshBurstLimit
  },
  video: {
    rekognitionPollDelaySeconds: env.videoRekognitionPollDelaySeconds,
    rekognitionMaxPolls: env.videoRekognitionMaxPolls,
    ffmpegPath: env.ffmpegPath
  },
  whatsapp: {
    enabled: Boolean(env.whatsAppAccessToken && env.whatsAppPhoneNumberId),
    apiVersion: env.whatsAppApiVersion,
    accessToken: env.whatsAppAccessToken,
    phoneNumberId: env.whatsAppPhoneNumberId,
    baseUrl: env.whatsAppBaseUrl,
    textTemplate: env.whatsAppTextTemplate
  },
  frontend: {
    baseUrl: env.frontendBaseUrl
  }
};
