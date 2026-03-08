import {
  DownloadJobCreateResponse,
  DownloadLinksResponse,
  EventSummary,
  DownloadJobStatusResponse,
  MediaType,
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
      'ngrok-skip-browser-warning': '1',
      ...(init?.headers ?? {})
    }
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawBody = await response.text();
    const preview = rawBody.slice(0, 180).replace(/\s+/g, ' ').trim();
    throw new Error(`Unexpected non-JSON response from API (${response.status}): ${preview}`);
  }

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
  event: EventSummary;
}

interface GetEventResponse {
  event: EventSummary;
}

interface RegisterGuestResponse {
  user: {
    id: string;
  };
}

interface EventGuestSummary {
  userId: string;
  fullName: string;
  phone: string;
  side?: 'BRIDE' | 'GROOM';
  relation?: string;
  matchCount: number;
}

interface EventGuestsResponse {
  guests: EventGuestSummary[];
}

interface EventVideoStatusSummary {
  id: string;
  originalFileName: string;
  status: 'INITIATED' | 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  displayStatus: 'UPLOADED' | 'ANALYZING' | 'MATCHED' | 'FAILED' | 'NO_MATCH';
  matchCount: number;
  matchedUsers: Array<{
    userId: string;
    fullName: string;
    phone?: string;
    similarity: number;
    timestampMs: number;
  }>;
  durationSeconds: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface EventVideoStatusesResponse {
  videos: EventVideoStatusSummary[];
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

interface VideoMultipartInitResponse {
  uploadId: string;
  bucket: string;
  s3Key: string;
}

interface VideoMultipartPartResponse {
  uploadUrl: string;
  bucket: string;
  s3Key: string;
  expiresInSeconds: number;
}

interface VideoMultipartCompleteResponse {
  videoUploadId: string;
  status: 'INITIATED' | 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  bucket: string;
  s3Key: string;
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
  burstLimit: number;
  attemptsRemainingBeforeCooldown: number;
}

interface QueueStatusResponse {
  queueDepth: number;
  threshold: number;
  highDemand: boolean;
  message: string | null;
}

export const api = {
  createEvent: async (input: { name: string; eventType: EventSummary['eventType']; startsAt: string; endsAt: string }) => {
    return apiFetch<CreateEventResponse>('/events', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  getEvent: async (eventId: string) => {
    return apiFetch<GetEventResponse>(`/events/${encodeURIComponent(eventId)}`);
  },

  registerGuest: async (input: {
    eventId: string;
    fullName: string;
    phone: string;
    side?: 'BRIDE' | 'GROOM';
    relation?: string;
  }) => {
    return apiFetch<RegisterGuestResponse>('/users/register', {
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

  initVideoMultipartUpload: async (input: {
    eventId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    durationSeconds: number;
  }) => {
    return apiFetch<VideoMultipartInitResponse>('/videos/multipart/init', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  getVideoMultipartPartUrl: async (input: {
    eventId: string;
    s3Key: string;
    uploadId: string;
    partNumber: number;
  }) => {
    return apiFetch<VideoMultipartPartResponse>('/videos/multipart/part-url', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  completeVideoMultipartUpload: async (input: {
    eventId: string;
    s3Key: string;
    uploadId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    durationSeconds: number;
    parts: Array<{ partNumber: number; etag: string }>;
  }) => {
    return apiFetch<VideoMultipartCompleteResponse>('/videos/multipart/complete', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  abortVideoMultipartUpload: async (input: { eventId: string; s3Key: string; uploadId: string }) => {
    return apiFetch<{ aborted: boolean }>('/videos/multipart/abort', {
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
      mediaType: item.mediaType,
      thumbnailUrl: item.photo.thumbnailUrl,
      previewUrl: item.photo.previewUrl,
      downloadUrl: item.photo.downloadUrl,
      similarity: item.similarity,
      timestamp: new Date(item.createdAt).getTime(),
      videoTimestampMs: item.videoTimestampMs
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

  getQueueStatus: async () => {
    return apiFetch<QueueStatusResponse>('/queue/status');
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
  },

  downloadPhotoBlob: async (input: { photoId: string; userId: string; eventId: string }) => {
    const params = new URLSearchParams({
      userId: input.userId,
      eventId: input.eventId
    });

    const response = await fetch(
      `${API_BASE_URL}/photos/${encodeURIComponent(input.photoId)}/download?${params.toString()}`,
      {
        headers: {
          'ngrok-skip-browser-warning': '1'
        }
      }
    );

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.error?.message || 'Photo download failed');
      }
      throw new Error(`Photo download failed (${response.status})`);
    }

    return response.blob();
  },

  getEventGuests: async (eventId: string) => {
    return apiFetch<EventGuestsResponse>(`/events/${encodeURIComponent(eventId)}/guests`);
  },

  getEventVideoStatuses: async (eventId: string) => {
    return apiFetch<EventVideoStatusesResponse>(`/events/${encodeURIComponent(eventId)}/videos/status`);
  },

  sendGuestWhatsAppLink: async (input: { eventId: string; userId: string }) => {
    return apiFetch<{ queued: boolean; phoneNumber: string }>(
      `/events/${encodeURIComponent(input.eventId)}/guests/${encodeURIComponent(input.userId)}/whatsapp-link`,
      {
        method: 'POST'
      }
    );
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
