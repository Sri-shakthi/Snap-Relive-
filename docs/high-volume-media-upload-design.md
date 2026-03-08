# High-Volume Media Upload and Video Analysis Design

## Goal

Add a new high-speed, high-volume media pipeline for:

- batch image uploads
- batch video uploads
- Rekognition Video analysis
- gallery results for both images and video timestamps

without modifying or destabilizing the existing image recognition pipeline.

## Non-Negotiables

- Existing image upload, photo processing, and Rekognition image matching remain intact.
- New video processing lives in separate routes, service modules, queue jobs, and storage prefixes.
- Failed files never block the rest of the batch.
- Uploads continue to go browser -> S3 directly.

## Constraints

### Images

- Max 50 files per batch
- Max 500 KB per file after frontend compression
- Allowed types: `image/jpeg`, `image/png`, `image/webp`

### Videos

- Max 10 files per batch
- Max 2 GB per file
- Max duration 30 minutes
- Allowed types: `video/mp4`, `video/quicktime`

## Architecture Split

### Existing pipeline: unchanged

- `POST /photos/presign`
- `POST /photos/confirm`
- `PROCESS_PHOTO`
- Rekognition image indexing and rematch scheduling

### New image batch upload layer

- Frontend-only batching, validation, compression, concurrency control
- Reuses the existing photo presign/confirm endpoints for images
- Does not change the image backend contract

### New video pipeline

- New routes:
  - `POST /videos/multipart/init`
  - `POST /videos/multipart/part-url`
  - `POST /videos/multipart/complete`
  - `POST /videos/multipart/abort`
  - `GET /videos/uploads/:uploadId/status`
- New queue job types:
  - `PROCESS_VIDEO`
  - `PROCESS_VIDEO_REKOGNITION_RESULT`
  - `PROCESS_VIDEO_THUMBNAIL`
- New storage prefixes:
  - `uploads/images/events/{eventId}/...`
  - `uploads/videos/events/{eventId}/...`
  - derived assets under `videos/frames/` or `videos/clips/`

## Frontend Design

### Upload screen

Replace the current single-purpose uploader with three sections:

1. image picker
2. video picker
3. uploader dashboard

Per-file card fields:

- file name
- type
- size
- duration for video
- validation state
- compression state for images
- upload progress
- retry state
- final processing state

### Frontend validation

Before upload:

- reject unsupported MIME types
- reject image count above 50
- reject video count above 10
- reject videos above 2 GB
- reject videos above 30 minutes
- compress images above 500 KB before upload

Compression target:

- try `<= 500 KB`
- preserve JPEG/WebP quality for face visibility
- stop after a bounded number of iterations

### Upload strategy

#### Images

- validate all selected images
- compress oversized images
- upload valid images with `Promise.all`, but behind a concurrency limiter of 5
- for each image:
  - call existing `presignPhotoUpload`
  - direct upload to S3
  - call existing `confirmPhotoUpload`

#### Videos

- use multipart uploads only
- chunk size: 10 MB
- concurrency limiter: 5 files overall, 5 parts per file max
- retry each failed part up to 3 times
- persist resumable state in `localStorage`

Suggested localStorage key:

- `snapshots-video-upload:{eventId}:{fileFingerprint}`

Fingerprint:

- file name
- size
- lastModified

Stored state:

- `uploadId`
- `s3Key`
- completed parts array
- next remaining part numbers

Resume flow:

- if file fingerprint exists in localStorage, ask to resume
- skip completed parts
- complete multipart upload only after all parts succeed

## Backend Design

## New data model

Add new tables, separate from `Photo` and `MatchResult`.

### `VideoUpload`

- `id`
- `eventId`
- `s3Bucket`
- `s3Key`
- `originalFileName`
- `contentType`
- `sizeBytes`
- `durationSeconds`
- `status` enum: `PENDING | UPLOADED | PROCESSING | PROCESSED | FAILED`
- `rekognitionJobId`
- `errorMessage`
- `createdAt`
- `updatedAt`

### `VideoFaceMatch`

- `id`
- `videoUploadId`
- `eventId`
- `userId`
- `timestampMs`
- `similarity`
- `boundingBox`
- `thumbnailS3Key`
- `clipS3Key` nullable
- `createdAt`

Index for:

- `eventId, userId`
- `videoUploadId`
- `eventId, createdAt`

## S3 multipart endpoints

### `POST /videos/multipart/init`

Input:

- `eventId`
- `fileName`
- `contentType`
- `sizeBytes`
- `durationSeconds`

Backend responsibilities:

- validate file constraints again
- verify event exists
- create S3 multipart upload
- return:
  - `uploadId`
  - `s3Key`
  - `bucket`
  - `acceleratedBaseUrl` if enabled

### `POST /videos/multipart/part-url`

Input:

- `eventId`
- `s3Key`
- `uploadId`
- `partNumber`

Return:

- presigned `UploadPart` URL

### `POST /videos/multipart/complete`

Input:

- `eventId`
- `s3Key`
- `uploadId`
- parts: `{ partNumber, etag }[]`
- original metadata

Backend:

- complete multipart upload
- store `VideoUpload` row
- enqueue `PROCESS_VIDEO`

### `POST /videos/multipart/abort`

Input:

- `eventId`
- `s3Key`
- `uploadId`

Backend:

- abort multipart upload
- clean resumable state if needed

## AWS S3 requirements

- Transfer Acceleration must be enabled on the bucket
- use accelerated endpoint for multipart presigns when configured
- videos and images live in separate prefixes

Suggested config:

- `AWS_S3_TRANSFER_ACCELERATION=true`
- `AWS_S3_ACCELERATED_BASE_URL=https://<bucket>.s3-accelerate.amazonaws.com`

## Rekognition Video flow

### `PROCESS_VIDEO`

1. call `StartFaceSearch`
2. target the same face collection already used for image matching
3. store the returned Rekognition job ID in `VideoUpload`
4. rely on SNS -> SQS notification for completion

### Completion ingestion

Option A:

- SNS topic subscribed to SQS queue
- worker consumes completion messages

Option B:

- polling job

Preferred:

- SNS -> SQS because it avoids active polling

### Result processing

1. call `GetFaceSearch`
2. flatten all matches
3. deduplicate by `(userId, videoUploadId)`
4. keep the highest-confidence or first match, based on configured policy
5. store `VideoFaceMatch`
6. enqueue thumbnail extraction

## Thumbnail or clip extraction

Preferred order:

1. MediaConvert if already available
2. Lambda with FFmpeg if cost and execution time are acceptable

For initial version:

- generate thumbnail frame at `timestampMs`
- store `thumbnailS3Key`
- defer clip extraction unless explicitly required

## Gallery changes

Preserve current image gallery behavior.

Extend result shape with:

- `kind: 'IMAGE' | 'VIDEO'`
- `thumbnailUrl`
- `downloadUrl` or `viewerUrl`
- `timestampMs` nullable
- `videoId` nullable

Frontend rendering:

- existing image cards unchanged
- new video cards show:
  - video badge
  - thumbnail frame
  - timestamp like `12:43`

## Error handling

- Per-file validation errors stay local to that file row
- Part failures retry 3 times
- Multipart abort does not block other files
- Rekognition Video failure marks only the `VideoUpload` row as failed
- Thumbnail extraction failure does not remove other successful matches

## Queue isolation

To avoid slowing current flows:

- keep existing image work on the core queue
- add a dedicated video queue
- keep WhatsApp queue separate

Recommended queues:

- core queue: photo/selfie/download
- video queue: video analysis/thumbnail generation
- whatsapp queue: outbound messages

## Suggested implementation phases

### Phase 1

- Frontend validation and image compression
- Multi-image uploads using existing endpoints
- New uploader dashboard

### Phase 2

- Backend multipart upload endpoints
- Frontend multipart client with resume and retry
- `VideoUpload` table

### Phase 3

- Rekognition Video start/completion pipeline
- SNS/SQS integration
- `VideoFaceMatch` table

### Phase 4

- Gallery video cards
- frame extraction
- uploader notifications

## Why this is backward-compatible

- Existing `/photos/*` endpoints remain for image uploads
- Existing `Photo`, `PhotoFace`, and `MatchResult` stay unchanged
- Existing gallery image rendering path remains the default
- Video processing is introduced through new routes, new tables, and new queue jobs

## Current repository impact estimate

Frontend:

- `frontend/pages/UploadPhotos.tsx`
- `frontend/services/api.ts`
- new upload utilities for compression, multipart, retry, resume, concurrency
- `frontend/pages/Gallery.tsx`
- `frontend/types.ts`

Backend:

- `backend/prisma/schema.prisma`
- new migrations
- `backend/src/services/awsS3.ts`
- new video controllers/routes/validation
- `backend/src/services/awsRekognition.ts`
- `backend/src/services/queue.ts`
- `backend/src/services/jobHandlers.ts`
- new SNS/SQS completion consumer path

## Risks to avoid

- do not merge video matches into existing `MatchResult`
- do not route video uploads through current photo confirm flow
- do not run video Rekognition on the API request thread
- do not make the gallery assume every result is an image
