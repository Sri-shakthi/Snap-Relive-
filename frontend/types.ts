export enum Side {
  BRIDE = 'BRIDE',
  GROOM = 'GROOM'
}

export enum Confidence {
  HIGH = 'HIGH',
  POSSIBLE = 'POSSIBLE'
}

export interface GuestDetails {
  fullName: string;
  side: Side;
  relation: string;
  phoneNumber?: string;
}

export interface Photo {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  confidence: Confidence;
  timestamp: number;
}

export interface MatchPhoto {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  similarity: number;
  timestamp: number;
}

export interface MatchResponseItem {
  matchId: string;
  photoId: string;
  similarity: number;
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
