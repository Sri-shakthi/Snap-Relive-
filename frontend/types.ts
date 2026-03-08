export enum Side {
  BRIDE = 'BRIDE',
  GROOM = 'GROOM'
}

export enum EventType {
  MARRIAGE = 'MARRIAGE',
  BIRTHDAY = 'BIRTHDAY',
  CORPORATE = 'CORPORATE',
  OTHER = 'OTHER'
}

export enum Confidence {
  HIGH = 'HIGH',
  POSSIBLE = 'POSSIBLE'
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export interface GuestDetails {
  fullName: string;
  side?: Side;
  relation?: string;
  phoneNumber: string;
}

export interface EventSummary {
  id: string;
  name: string;
  eventType: EventType;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  mediaType: MediaType;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  confidence: Confidence;
  timestamp: number;
  videoTimestampMs?: number;
}

export interface MatchPhoto {
  id: string;
  mediaType: MediaType;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  similarity: number;
  timestamp: number;
  videoTimestampMs?: number;
}

export interface MatchResponseItem {
  matchId: string;
  photoId: string;
  similarity: number;
  mediaType: MediaType;
  videoTimestampMs?: number;
  photo: {
    bucket: string;
    s3Key: string;
    downloadUrl: string;
    previewUrl: string;
    thumbnailUrl: string;
    expiresInSeconds: number;
  };
  createdAt: string;
}

export interface DownloadJobCreateResponse {
  downloadId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface DownloadJobStatusResponse {
  downloadId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  expiresInSeconds?: number;
  errorMessage?: string | null;
}

export interface DownloadLinksResponse {
  count: number;
  links: Array<{
    photoId: string;
    previewUrl: string;
    downloadUrl: string;
  }>;
}

export interface EventData {
  id: string;
  name: string;
  date: string;
  location: string;
}
