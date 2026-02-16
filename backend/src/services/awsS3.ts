import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  }
});

export interface PresignedPutResult {
  uploadUrl: string;
  bucket: string;
  s3Key: string;
  expiresInSeconds: number;
}

export interface PresignedGetResult {
  downloadUrl: string;
  expiresInSeconds: number;
}

export const createPresignedPutUrl = async (params: {
  s3Key: string;
  contentType: string;
}): Promise<PresignedPutResult> => {
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: params.s3Key,
    ContentType: params.contentType
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: config.aws.s3PresignExpires
  });

  return {
    uploadUrl,
    bucket: config.aws.s3Bucket,
    s3Key: params.s3Key,
    expiresInSeconds: config.aws.s3PresignExpires
  };
};

export const createPresignedGetUrl = async (params: { s3Key: string }): Promise<PresignedGetResult> => {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: params.s3Key
  });

  const downloadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: config.aws.s3PresignExpires
  });

  return {
    downloadUrl,
    expiresInSeconds: config.aws.s3PresignExpires
  };
};
