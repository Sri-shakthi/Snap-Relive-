import {
  CreateCollectionCommand,
  GetFaceSearchCommand,
  IndexFacesCommand,
  RekognitionClient,
  SearchFacesByImageCommand,
  StartFaceSearchCommand
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

export interface VideoFaceSearchMatchRecord {
  timestampMs: number;
  faceId?: string;
  similarity?: number;
  boundingBox?: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
  };
}

export const startFaceSearchForVideo = async (params: {
  eventId: string;
  bucket: string;
  s3Key: string;
}): Promise<string | undefined> => {
  const response = await client.send(
    new StartFaceSearchCommand({
      CollectionId: getCollectionIdForEvent(params.eventId),
      Video: {
        S3Object: {
          Bucket: params.bucket,
          Name: params.s3Key
        }
      }
    })
  );

  return response.JobId;
};

export const getFaceSearchResults = async (params: {
  jobId: string;
  nextToken?: string;
}): Promise<{
  status?: string;
  nextToken?: string;
  matches: VideoFaceSearchMatchRecord[];
  statusMessage?: string;
}> => {
  const response = await client.send(
    new GetFaceSearchCommand({
      JobId: params.jobId,
      NextToken: params.nextToken,
      SortBy: 'TIMESTAMP'
    })
  );

  return {
    status: response.JobStatus,
    nextToken: response.NextToken,
    statusMessage: response.StatusMessage,
    matches:
      response.Persons?.flatMap((personMatch) =>
        (personMatch.FaceMatches ?? []).map((match) => ({
          timestampMs: personMatch.Timestamp ?? 0,
          faceId: match.Face?.FaceId,
          similarity: match.Similarity,
          boundingBox: personMatch.Person?.Face?.BoundingBox
            ? {
                width: personMatch.Person.Face.BoundingBox.Width,
                height: personMatch.Person.Face.BoundingBox.Height,
                left: personMatch.Person.Face.BoundingBox.Left,
                top: personMatch.Person.Face.BoundingBox.Top
              }
            : undefined
        }))
      ) ?? []
  };
};

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
