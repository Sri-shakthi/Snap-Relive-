import {
  DownloadJobCreateResponse,
  DownloadLinksResponse,
  DownloadJobStatusResponse,
  MatchPhoto,
  MatchResponseItem
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000/api/v1';

interface ApiErrorPayload {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  const payload = (await response.json()) as { success: boolean; data?: T } & ApiErrorPayload;

  if (!response.ok || !payload.success) {
    const message = payload.error?.message || 'Request failed';
    throw new Error(message);
  }

  if (!payload.data) {
    throw new Error('Missing response data');
  }

  return payload.data;
};

interface CreateEventResponse {
  event: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    createdAt: string;
  };
}

interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
  bucket: string;
  expiresInSeconds: number;
}

interface ConfirmSelfieResponse {
  selfieId: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
}

interface ConfirmPhotoResponse {
  photoId: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
}

interface MatchesResponse {
  items: MatchResponseItem[];
  nextCursor: string | null;
}

interface RefreshMatchesResponse {
  queued: boolean;
  selfieId: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  cooldownMs: number;
}

export const api = {
  createEvent: async (input: { name: string; startsAt: string; endsAt: string }) => {
    return apiFetch<CreateEventResponse>('/events', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  presignSelfieUpload: async (input: { userId: string; eventId: string; contentType: string }) => {
    return apiFetch<PresignResponse>('/selfies/presign', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  confirmSelfieUpload: async (input: { userId: string; eventId: string; bucket: string; s3Key: string }) => {
    return apiFetch<ConfirmSelfieResponse>('/selfies/confirm', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  presignPhotoUpload: async (input: { eventId: string; contentType: string }) => {
    return apiFetch<PresignResponse>('/photos/presign', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  confirmPhotoUpload: async (input: { eventId: string; bucket: string; s3Key: string }) => {
    return apiFetch<ConfirmPhotoResponse>('/photos/confirm', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  getMatches: async (input: { userId: string; eventId: string; cursor?: string; limit?: number }) => {
    const params = new URLSearchParams({
      userId: input.userId,
      eventId: input.eventId,
      limit: String(input.limit ?? 20)
    });

    if (input.cursor) params.set('cursor', input.cursor);

    const response = await apiFetch<MatchesResponse>(`/matches?${params.toString()}`);

    const items: MatchPhoto[] = response.items.map((item) => ({
      id: item.photoId,
      thumbnailUrl: item.photo.thumbnailUrl,
      previewUrl: item.photo.previewUrl,
      downloadUrl: item.photo.downloadUrl,
      similarity: item.similarity,
      timestamp: new Date(item.createdAt).getTime()
    }));

    return {
      items,
      nextCursor: response.nextCursor
    };
  },

  refreshMatches: async (input: { userId: string; eventId: string }) => {
    return apiFetch<RefreshMatchesResponse>('/matches/refresh', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  createDownloadJob: async (input: { userId: string; eventId: string; photoIds: string[] }) => {
    return apiFetch<DownloadJobCreateResponse>('/downloads', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  getDownloadJob: async (input: { downloadId: string; userId: string }) => {
    const params = new URLSearchParams({ userId: input.userId });
    return apiFetch<DownloadJobStatusResponse>(`/downloads/${input.downloadId}?${params.toString()}`);
  },

  createDownloadLinks: async (input: { userId: string; eventId: string; photoIds: string[] }) => {
    return apiFetch<DownloadLinksResponse>('/downloads/links', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }
};

export const uploadToPresignedUrl = async (uploadUrl: string, file: Blob, contentType: string) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType
    },
    body: file
  });

  if (!response.ok) {
    throw new Error('Upload to S3 failed');
  }
};
