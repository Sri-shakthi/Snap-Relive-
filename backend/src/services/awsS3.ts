import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { config } from '../config/index.js';

const s3Client = new S3Client({
  region: config.aws.region,
  useAccelerateEndpoint: config.aws.s3TransferAcceleration,
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

export interface MultipartUploadInitResult {
  uploadId: string;
  bucket: string;
  s3Key: string;
}

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

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
    expiresIn: config.aws.s3GetExpires
  });

  return {
    downloadUrl,
    expiresInSeconds: config.aws.s3GetExpires
  };
};

export const createAssetUrl = async (params: { s3Key: string }): Promise<PresignedGetResult> => {
  if (config.aws.cloudFrontBaseUrl) {
    const normalizedBase = config.aws.cloudFrontBaseUrl.replace(/\/+$/, '');
    const encodedKey = params.s3Key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return {
      downloadUrl: `${normalizedBase}/${encodedKey}`,
      expiresInSeconds: config.aws.s3GetExpires
    };
  }

  return createPresignedGetUrl(params);
};

export const createMultipartUpload = async (params: {
  s3Key: string;
  contentType: string;
}): Promise<MultipartUploadInitResult> => {
  const response = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: config.aws.s3Bucket,
      Key: params.s3Key,
      ContentType: params.contentType
    })
  );

  if (!response.UploadId) {
    throw new Error('Failed to create multipart upload');
  }

  return {
    uploadId: response.UploadId,
    bucket: config.aws.s3Bucket,
    s3Key: params.s3Key
  };
};

export const createPresignedUploadPartUrl = async (params: {
  s3Key: string;
  uploadId: string;
  partNumber: number;
}): Promise<PresignedPutResult> => {
  const command = new UploadPartCommand({
    Bucket: config.aws.s3Bucket,
    Key: params.s3Key,
    UploadId: params.uploadId,
    PartNumber: params.partNumber
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

export const completeMultipartUpload = async (params: {
  s3Key: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}): Promise<{ bucket: string; s3Key: string }> => {
  await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: config.aws.s3Bucket,
      Key: params.s3Key,
      UploadId: params.uploadId,
      MultipartUpload: {
        Parts: params.parts.map((part) => ({
          ETag: part.etag,
          PartNumber: part.partNumber
        }))
      }
    })
  );

  return {
    bucket: config.aws.s3Bucket,
    s3Key: params.s3Key
  };
};

export const abortMultipartUpload = async (params: {
  s3Key: string;
  uploadId: string;
}): Promise<void> => {
  await s3Client.send(
    new AbortMultipartUploadCommand({
      Bucket: config.aws.s3Bucket,
      Key: params.s3Key,
      UploadId: params.uploadId
    })
  );
};

export const getObjectAsBuffer = async (params: { bucket: string; s3Key: string }): Promise<Buffer> => {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.s3Key
    })
  );

  if (!response.Body || !(response.Body instanceof Readable)) {
    throw new Error('Unable to read S3 object body');
  }

  return streamToBuffer(response.Body);
};

export const downloadObjectToFile = async (params: { bucket: string; s3Key: string; filePath: string }): Promise<void> => {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.s3Key
    })
  );

  if (!response.Body || !(response.Body instanceof Readable)) {
    throw new Error('Unable to read S3 object body');
  }

  await pipeline(response.Body, createWriteStream(params.filePath));
};

export const putObjectBuffer = async (params: {
  bucket?: string;
  s3Key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ bucket: string; s3Key: string }> => {
  const bucket = params.bucket ?? config.aws.s3Bucket;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.s3Key,
      Body: params.body,
      ContentType: params.contentType
    })
  );

  return {
    bucket,
    s3Key: params.s3Key
  };
};

export const putObjectFile = async (params: {
  bucket?: string;
  s3Key: string;
  filePath: string;
  contentType: string;
}): Promise<{ bucket: string; s3Key: string }> => {
  const bucket = params.bucket ?? config.aws.s3Bucket;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.s3Key,
      Body: createReadStream(params.filePath),
      ContentType: params.contentType
    })
  );

  return {
    bucket,
    s3Key: params.s3Key
  };
};
