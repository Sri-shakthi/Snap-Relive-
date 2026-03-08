import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';

interface UploadPhotosProps {
  eventId: string;
}

type UploadKind = 'IMAGE' | 'VIDEO';
type UploadStatus =
  | 'READY'
  | 'COMPRESSING'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'INVALID';

interface UploadItem {
  id: string;
  file: File;
  preparedFile: File;
  kind: UploadKind;
  status: UploadStatus;
  progress: number;
  durationSeconds?: number;
  message?: string;
}

interface EventGuestSummary {
  userId: string;
  fullName: string;
  phone: string;
  side?: 'BRIDE' | 'GROOM';
  relation?: string;
  matchCount: number;
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

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_IMAGE_COUNT = 50;
const MAX_VIDEO_COUNT = 10;
const MAX_IMAGE_BYTES = 500 * 1024;
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 30 * 60;
const CHUNK_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_CONCURRENCY = 5;
const MAX_PART_RETRIES = 3;

const createLimiter = (concurrency: number) => {
  let activeCount = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    activeCount -= 1;
    const job = queue.shift();
    if (job) job();
  };

  return async <T,>(task: () => Promise<T>): Promise<T> => {
    if (activeCount >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    activeCount += 1;
    try {
      return await task();
    } finally {
      next();
    }
  };
};

const readVideoDuration = async (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Math.ceil(video.duration || 0);
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to read video duration for ${file.name}`));
    };

    video.src = url;
  });

const loadImage = async (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to load image ${file.name}`));
    };
    image.src = url;
  });

const canvasToBlob = async (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to compress image'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });

const compressImageToTarget = async (file: File): Promise<File> => {
  if (file.size <= MAX_IMAGE_BYTES) {
    return file;
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas compression is unavailable');
  }

  let width = image.width;
  let height = image.height;
  let quality = 0.9;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    blob = await canvasToBlob(canvas, file.type === 'image/png' ? 'image/jpeg' : file.type, quality);

    if (blob.size <= MAX_IMAGE_BYTES) {
      break;
    }

    quality = Math.max(0.45, quality - 0.1);
    width = Math.max(480, Math.floor(width * 0.9));
    height = Math.max(480, Math.floor(height * 0.9));
  }

  if (!blob) {
    throw new Error('Image compression failed');
  }

  return new File([blob], file.name.replace(/\.(png)$/i, '.jpg'), {
    type: blob.type || 'image/jpeg',
    lastModified: Date.now()
  });
};

const uploadWithProgress = async (
  uploadUrl: string,
  file: Blob,
  contentType: string,
  onProgress: (progress: number) => void,
  options?: { requireEtag?: boolean }
) =>
  new Promise<{ etag?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag')?.replaceAll('"', '') ?? undefined;
        if (options?.requireEtag && !etag) {
          reject(new Error('S3 did not return an ETag for this video part. Expose the ETag header in your bucket CORS configuration.'));
          return;
        }
        resolve({ etag });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });

const uploadPartWithRetry = async (
  task: () => Promise<{ etag?: string }>,
  retries = MAX_PART_RETRIES
): Promise<{ etag?: string }> => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await task();
    } catch (error) {
      attempt += 1;
      if (attempt >= retries) throw error;
    }
  }
  throw new Error('Part upload failed');
};

const getResumeKey = (eventId: string, file: File) =>
  `snapshots-video-upload:${eventId}:${file.name}:${file.size}:${file.lastModified}`;

const formatTimestamp = (timestampMs?: number) => {
  if (!timestampMs && timestampMs !== 0) return '';
  const totalSeconds = Math.floor(timestampMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const UploadPhotos: React.FC<UploadPhotosProps> = ({ eventId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [isSendingGuestLink, setIsSendingGuestLink] = useState<string | null>(null);
  const [guests, setGuests] = useState<EventGuestSummary[]>([]);
  const [videoStatuses, setVideoStatuses] = useState<EventVideoStatusSummary[]>([]);
  const [isLoadingVideoStatuses, setIsLoadingVideoStatuses] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const imageCount = useMemo(() => items.filter((item) => item.kind === 'IMAGE').length, [items]);
  const videoCount = useMemo(() => items.filter((item) => item.kind === 'VIDEO').length, [items]);

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const loadGuests = async () => {
    if (!eventId.trim()) return;

    setIsLoadingGuests(true);
    try {
      const result = await api.getEventGuests(eventId.trim());
      setGuests(result.guests);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load guests');
    } finally {
      setIsLoadingGuests(false);
    }
  };

  const loadVideoStatuses = async (options?: { silent?: boolean }) => {
    if (!eventId.trim()) return;

    if (!options?.silent) {
      setIsLoadingVideoStatuses(true);
    }

    try {
      const result = await api.getEventVideoStatuses(eventId.trim());
      setVideoStatuses(result.videos);
    } catch (requestError) {
      if (!options?.silent) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load video statuses');
      }
    } finally {
      if (!options?.silent) {
        setIsLoadingVideoStatuses(false);
      }
    }
  };

  useEffect(() => {
    if (!eventId.trim()) return;
    void loadGuests();
    void loadVideoStatuses();
  }, [eventId]);

  useEffect(() => {
    if (!eventId.trim()) return;

    const intervalId = window.setInterval(() => {
      void loadVideoStatuses({ silent: true });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [eventId]);

  const prepareSelectedFiles = async (selected: File[]) => {
    const nextItems: UploadItem[] = [];
    const nextImageCount = selected.filter((file) => IMAGE_TYPES.includes(file.type)).length;
    const nextVideoCount = selected.filter((file) => VIDEO_TYPES.includes(file.type)).length;

    if (nextImageCount > MAX_IMAGE_COUNT) {
      setError(`You can upload at most ${MAX_IMAGE_COUNT} images at once.`);
      return;
    }

    if (nextVideoCount > MAX_VIDEO_COUNT) {
      setError(`You can upload at most ${MAX_VIDEO_COUNT} videos at once.`);
      return;
    }

    setError('');
    setStatusMessage('');

    for (const file of selected) {
      const id = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;

      if (IMAGE_TYPES.includes(file.type)) {
        nextItems.push({
          id,
          file,
          preparedFile: file,
          kind: 'IMAGE',
          status: 'COMPRESSING',
          progress: 0,
          message: file.size > MAX_IMAGE_BYTES ? 'Compressing...' : 'Ready'
        });
      } else if (VIDEO_TYPES.includes(file.type)) {
        nextItems.push({
          id,
          file,
          preparedFile: file,
          kind: 'VIDEO',
          status: 'READY',
          progress: 0
        });
      } else {
        nextItems.push({
          id,
          file,
          preparedFile: file,
          kind: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
          status: 'INVALID',
          progress: 0,
          message: 'Unsupported file format'
        });
      }
    }

    setItems(nextItems);

    for (const item of nextItems) {
      try {
        if (item.kind === 'IMAGE') {
          const compressed = await compressImageToTarget(item.file);
          updateItem(item.id, {
            preparedFile: compressed,
            status: 'READY',
            message: compressed.size > MAX_IMAGE_BYTES ? 'Could not compress under 500KB' : 'Ready'
          });
        } else if (item.kind === 'VIDEO') {
          if (item.file.size > MAX_VIDEO_BYTES) {
            updateItem(item.id, {
              status: 'INVALID',
              message: 'Video exceeds 2GB'
            });
            continue;
          }

          const durationSeconds = await readVideoDuration(item.file);
          if (durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
            updateItem(item.id, {
              status: 'INVALID',
              durationSeconds,
              message: 'Video exceeds 30 minutes'
            });
            continue;
          }

          updateItem(item.id, {
            durationSeconds,
            status: 'READY',
            message: 'Ready'
          });
        }
      } catch (requestError) {
        updateItem(item.id, {
          status: 'FAILED',
          message: requestError instanceof Error ? requestError.message : 'Preparation failed'
        });
      }
    }
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    await prepareSelectedFiles(selected);
    event.target.value = '';
  };

  const uploadImageItem = async (item: UploadItem) => {
    updateItem(item.id, { status: 'UPLOADING', progress: 0, message: 'Uploading image...' });
    const presigned = await api.presignPhotoUpload({
      eventId: eventId.trim(),
      contentType: item.preparedFile.type || 'image/jpeg'
    });

    await uploadWithProgress(presigned.uploadUrl, item.preparedFile, item.preparedFile.type || 'image/jpeg', (progress) => {
      updateItem(item.id, { progress });
    });

    updateItem(item.id, { status: 'PROCESSING', progress: 100, message: 'Queued for recognition...' });
    await api.confirmPhotoUpload({
      eventId: eventId.trim(),
      bucket: presigned.bucket,
      s3Key: presigned.s3Key
    });
    updateItem(item.id, { status: 'SUCCESS', message: 'Image uploaded successfully' });
  };

  const uploadVideoItem = async (item: UploadItem) => {
    const resumeKey = getResumeKey(eventId.trim(), item.file);
    const storedState = window.localStorage.getItem(resumeKey);
    const rawSaved = storedState
      ? (JSON.parse(storedState) as { uploadId: string; s3Key: string; parts: Array<{ partNumber: number; etag: string }> })
      : null;
    const saved = rawSaved
      ? {
          ...rawSaved,
          parts: (rawSaved.parts ?? []).filter((part) => part.etag && part.etag.trim().length > 0)
        }
      : null;

    updateItem(item.id, { status: 'UPLOADING', progress: 0, message: 'Uploading video...' });

    if (rawSaved && (saved?.parts.length ?? 0) !== (rawSaved.parts?.length ?? 0)) {
      window.localStorage.setItem(
        resumeKey,
        JSON.stringify({
          uploadId: rawSaved.uploadId,
          s3Key: rawSaved.s3Key,
          parts: saved?.parts ?? []
        })
      );
    }

    const init = saved ?? await api.initVideoMultipartUpload({
      eventId: eventId.trim(),
      fileName: item.file.name,
      contentType: item.file.type,
      sizeBytes: item.file.size,
      durationSeconds: item.durationSeconds || 0
    });

    const completedParts = new Map<number, string>((saved?.parts ?? []).map((part) => [part.partNumber, part.etag]));
    const totalParts = Math.ceil(item.file.size / CHUNK_SIZE_BYTES);
    const partNumbers = Array.from({ length: totalParts }, (_, index) => index + 1);
    const partLimiter = createLimiter(MAX_CONCURRENCY);

    await Promise.all(
      partNumbers.map((partNumber) =>
        partLimiter(async () => {
          if (completedParts.has(partNumber)) {
            updateItem(item.id, {
              progress: Math.round((completedParts.size / totalParts) * 100)
            });
            return;
          }

          const start = (partNumber - 1) * CHUNK_SIZE_BYTES;
          const end = Math.min(item.file.size, start + CHUNK_SIZE_BYTES);
          const blob = item.file.slice(start, end);
          const partUrl = await api.getVideoMultipartPartUrl({
            eventId: eventId.trim(),
            s3Key: init.s3Key,
            uploadId: init.uploadId,
            partNumber
          });

          const partResult = await uploadPartWithRetry(() =>
            uploadWithProgress(
              partUrl.uploadUrl,
              blob,
              item.file.type,
              () => {
                const estimated = completedParts.size + Math.min(0.95, blob.size / item.file.size);
                updateItem(item.id, {
                  progress: Math.round((estimated / totalParts) * 100)
                });
              },
              { requireEtag: true }
            )
          );

          if (!partResult.etag) {
            throw new Error('Video upload could not be completed because S3 did not return an ETag for one of the uploaded parts.');
          }

          completedParts.set(partNumber, partResult.etag);
          window.localStorage.setItem(
            resumeKey,
            JSON.stringify({
              uploadId: init.uploadId,
              s3Key: init.s3Key,
              parts: [...completedParts.entries()].map(([savedPartNumber, etag]) => ({
                partNumber: savedPartNumber,
                etag
              }))
            })
          );

          updateItem(item.id, {
            progress: Math.round((completedParts.size / totalParts) * 100)
          });
        })
      )
    );

    updateItem(item.id, { status: 'PROCESSING', progress: 100, message: 'Completing upload...' });
    await api.completeVideoMultipartUpload({
      eventId: eventId.trim(),
      s3Key: init.s3Key,
      uploadId: init.uploadId,
      fileName: item.file.name,
      contentType: item.file.type,
      sizeBytes: item.file.size,
      durationSeconds: item.durationSeconds || 0,
      parts: [...completedParts.entries()]
        .map(([partNumber, etag]) => ({ partNumber, etag }))
        .sort((a, b) => a.partNumber - b.partNumber)
    });
    window.localStorage.removeItem(resumeKey);
    updateItem(item.id, { status: 'SUCCESS', message: 'Video uploaded and queued for analysis' });
  };

  const uploadAll = async () => {
    if (!eventId.trim()) {
      setError('Event is missing from link. Please open the photographer invite link again.');
      return;
    }

    const readyItems = items.filter((item) => item.status === 'READY');
    if (readyItems.length === 0) {
      setError('No valid files are ready to upload.');
      return;
    }

    setError('');
    setStatusMessage('');
    setIsUploading(true);

    const limiter = createLimiter(MAX_CONCURRENCY);
    await Promise.all(
      readyItems.map((item) =>
        limiter(async () => {
          try {
            if (item.kind === 'IMAGE') {
              await uploadImageItem(item);
            } else {
              await uploadVideoItem(item);
            }
          } catch (requestError) {
            if (item.kind === 'VIDEO') {
              const saved = window.localStorage.getItem(getResumeKey(eventId.trim(), item.file));
              if (saved) {
                const parsed = JSON.parse(saved) as { uploadId: string; s3Key: string };
                try {
                  await api.abortVideoMultipartUpload({
                    eventId: eventId.trim(),
                    s3Key: parsed.s3Key,
                    uploadId: parsed.uploadId
                  });
                } catch {
                  // Keep local resume state if abort fails.
                }
              }
            }

            updateItem(item.id, {
              status: 'FAILED',
              message: requestError instanceof Error ? requestError.message : 'Upload failed'
            });
          }
        })
      )
    );

    setIsUploading(false);
    setStatusMessage('Batch upload finished. Successful files continue processing in the background.');
    void loadGuests();
    void loadVideoStatuses({ silent: true });
  };

  const handleSendGuestLink = async (guest: EventGuestSummary) => {
    setIsSendingGuestLink(guest.userId);
    setError('');
    setStatusMessage('');

    try {
      const result = await api.sendGuestWhatsAppLink({
        eventId: eventId.trim(),
        userId: guest.userId
      });
      setStatusMessage(`Greeting and app link queued for ${guest.fullName} on ${result.phoneNumber}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to queue WhatsApp message');
    } finally {
      setIsSendingGuestLink(null);
    }
  };

  const renderVideoStatusTone = (status: EventVideoStatusSummary['displayStatus']) => {
    if (status === 'MATCHED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'FAILED') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'NO_MATCH') return 'bg-stone-100 text-stone-600 border-stone-200';
    if (status === 'ANALYZING') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-sky-50 text-sky-700 border-sky-200';
  };

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        <header className="space-y-2">
          <Link to="/" className="text-stone-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 mb-4">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h2 className="text-3xl font-bold text-stone-900">High-Speed Media Upload</h2>
          <p className="text-stone-500">Upload up to 50 images and 10 videos with compression, multipart uploads, retries, and resumable progress.</p>
        </header>

        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 space-y-1">
          <p>Images: `jpg`, `jpeg`, `png`, `webp`, max 50 files, auto-compressed to 500KB when needed.</p>
          <p>Videos: `mp4`, `mov`, max 10 files, max 2GB, max 30 minutes, multipart upload in 10MB chunks.</p>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-semibold text-stone-600 ml-1">Select Images and Videos</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            multiple
            onChange={(event) => void handleFiles(event)}
            className="w-full bg-white border border-stone-200 px-4 py-4 rounded-2xl"
          />
          <p className="text-sm text-stone-500">{imageCount} image(s), {videoCount} video(s) prepared</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {statusMessage && <p className="text-sm text-green-700">{statusMessage}</p>}

        <button
          disabled={isUploading}
          onClick={() => void uploadAll()}
          className="w-full bg-stone-900 text-white py-5 rounded-2xl text-lg font-medium shadow-xl shadow-stone-200 disabled:opacity-70"
        >
          {isUploading ? 'Uploading Batch...' : 'Start Batch Upload'}
        </button>

        {items.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-stone-800">Upload Queue</h3>
            {items.map((item) => (
              <div key={item.id} className="space-y-2 border border-stone-100 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-800">{item.file.name}</p>
                    <p className="text-xs text-stone-500">
                      {item.kind} • {(item.preparedFile.size / 1024 / 1024).toFixed(2)} MB
                      {item.kind === 'VIDEO' && item.durationSeconds ? ` • ${formatTimestamp(item.durationSeconds * 1000)}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-stone-500">{item.status}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full bg-stone-900 transition-all" style={{ width: `${item.progress}%` }} />
                </div>
                {item.message && <p className="text-xs text-stone-500">{item.message}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-stone-800">Video Processing Status</h3>
              <p className="text-xs text-stone-500">Uploads move from uploaded to analyzing, then matched or failed.</p>
            </div>
            <button onClick={() => void loadVideoStatuses()} className="text-sm text-stone-500 underline underline-offset-2">
              Refresh
            </button>
          </div>
          {isLoadingVideoStatuses ? (
            <p className="text-sm text-stone-500">Loading video statuses...</p>
          ) : videoStatuses.length === 0 ? (
            <p className="text-sm text-stone-500">No videos uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {videoStatuses.map((video) => (
                <div key={video.id} className="border border-stone-100 rounded-2xl px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-800">{video.originalFileName}</p>
                      <p className="text-xs text-stone-500">
                        {formatTimestamp(video.durationSeconds * 1000)} • {new Date(video.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold border rounded-full px-2.5 py-1 ${renderVideoStatusTone(video.displayStatus)}`}>
                      {video.displayStatus === 'NO_MATCH' ? 'NO MATCH' : video.displayStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
                    <span>Matches: {video.matchCount}</span>
                    <span>Updated: {new Date(video.updatedAt).toLocaleTimeString()}</span>
                  </div>
                  {video.matchedUsers.length > 0 && (
                    <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 space-y-2">
                      <p className="text-xs font-semibold text-stone-600">Matched Guests</p>
                      {video.matchedUsers.map((user) => (
                        <div key={`${video.id}-${user.userId}`} className="flex items-center justify-between gap-3 text-xs text-stone-600">
                          <span>
                            {user.fullName}
                            {user.phone ? ` • ${user.phone}` : ''}
                          </span>
                          <span>
                            {formatTimestamp(user.timestampMs)} • {Math.round(user.similarity)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {video.errorMessage && (
                    <p className="text-xs text-red-500">{video.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Guest WhatsApp Delivery</h3>
            <button onClick={() => void loadGuests()} className="text-sm text-stone-500 underline underline-offset-2">
              Refresh
            </button>
          </div>
          {isLoadingGuests ? (
            <p className="text-sm text-stone-500">Loading guests...</p>
          ) : guests.length === 0 ? (
            <p className="text-sm text-stone-500">No registered guests yet.</p>
          ) : (
            <div className="space-y-3">
              {guests.map((guest) => (
                <div key={guest.userId} className="flex items-center justify-between gap-3 border border-stone-100 rounded-2xl px-4 py-3">
                  <div>
                    <p className="font-medium text-stone-800">{guest.fullName}</p>
                    <p className="text-xs text-stone-500">{guest.phone} • {guest.matchCount} match{guest.matchCount === 1 ? '' : 'es'}</p>
                  </div>
                  <button
                    onClick={() => void handleSendGuestLink(guest)}
                    disabled={isSendingGuestLink === guest.userId}
                    className="shrink-0 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                  >
                    {isSendingGuestLink === guest.userId ? 'Queueing...' : 'Send App Link'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => navigate('/')} className="w-full text-stone-500 font-medium py-2">
          Go to guest flow
        </button>
      </div>
    </Layout>
  );
};

export default UploadPhotos;
