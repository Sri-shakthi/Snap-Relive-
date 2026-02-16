import {
  CreateCollectionCommand,
  IndexFacesCommand,
  RekognitionClient,
  SearchFacesByImageCommand
} from '@aws-sdk/client-rekognition';
import { config } from '../config/index.js';

const client = new RekognitionClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  }
});

export interface FaceIndexRecord {
  faceId?: string;
  confidence?: number;
  boundingBox?: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
  };
}

export interface FaceSearchRecord {
  faceId?: string;
  similarity?: number;
}

export const getCollectionIdForEvent = (eventId: string) => `${config.aws.collectionPrefix}${eventId}`;

export const ensureCollection = async (eventId: string): Promise<void> => {
  const collectionId = getCollectionIdForEvent(eventId);
  try {
    await client.send(new CreateCollectionCommand({ CollectionId: collectionId }));
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'ResourceAlreadyExistsException'
    ) {
      return;
    }
    throw error;
  }
};

export const indexFaces = async (params: {
  eventId: string;
  bucket: string;
  s3Key: string;
}): Promise<FaceIndexRecord[]> => {
  const response = await client.send(
    new IndexFacesCommand({
      CollectionId: getCollectionIdForEvent(params.eventId),
      Image: {
        S3Object: {
          Bucket: params.bucket,
          Name: params.s3Key
        }
      },
      DetectionAttributes: ['DEFAULT']
    })
  );

  return (
    response.FaceRecords?.map((record) => ({
      faceId: record.Face?.FaceId,
      confidence: record.Face?.Confidence,
      boundingBox: record.Face?.BoundingBox
        ? {
            width: record.Face.BoundingBox.Width,
            height: record.Face.BoundingBox.Height,
            left: record.Face.BoundingBox.Left,
            top: record.Face.BoundingBox.Top
          }
        : undefined
    })) ?? []
  );
};

export const searchFacesByImage = async (params: {
  eventId: string;
  bucket: string;
  s3Key: string;
  maxFaces?: number;
}): Promise<FaceSearchRecord[]> => {
  const response = await client.send(
    new SearchFacesByImageCommand({
      CollectionId: getCollectionIdForEvent(params.eventId),
      Image: {
        S3Object: {
          Bucket: params.bucket,
          Name: params.s3Key
        }
      },
      MaxFaces: params.maxFaces ?? 100
    })
  );

  return (
    response.FaceMatches?.map((match) => ({
      faceId: match.Face?.FaceId,
      similarity: match.Similarity
    })) ?? []
  );
};
