# Snapshots Backend

Production-ready MVP backend for selfie-to-event-photo matching with asynchronous face processing.

## Stack
- Node.js + Express + TypeScript
- Prisma ORM + MySQL (Docker)
- Joi validation
- AWS SDK v3 (S3 + Rekognition + optional SQS)
- Worker-based async processing

## Project Structure
Follows layered architecture:
- `routes`: try/catch, validation, controller call, response send
- `validation`: Joi schema + explicit `if/else`
- `controllers`: orchestration only
- `data-access`: Prisma-only DB operations
- `services`: AWS + queue + job handlers
- `middleware`: request-id, logger, rate-limit, error handler
- `config`: env validation + typed config

## Prerequisites
- Node.js 22+
- Docker
- AWS credentials with S3 and Rekognition access

## Environment
1. Copy env template:
```bash
cp .env.example .env
```
Prisma Migrate reads `DATABASE_URL` from `prisma.config.ts`.

2. Fill required values:
- `DATABASE_URL`
- `TRUST_PROXY` (set `1` when running behind ngrok/load balancer/reverse proxy)
- `DB_POOL_MAX` (recommended local: `20-40`, start with `30`)
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_S3_GET_EXPIRES` (recommended: `86400`)
- `CLOUDFRONT_BASE_URL` (optional but recommended for faster image delivery)

## Run MySQL via Docker
```bash
docker compose up -d
```

## Install + Migrate + Start
```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Run worker (separate terminal):
```bash
npm run worker
```

## API Base
- Base path: `/api/v1`
- Swagger docs: `/docs`
- Health: `GET /api/v1/health`

## Endpoint Flow
1. Create event
```http
POST /api/v1/events
```

2. Selfie upload
- Request presigned PUT URL
```http
POST /api/v1/selfies/presign
```
- Upload file directly to S3 with returned `uploadUrl`
- Confirm upload and enqueue processing
```http
POST /api/v1/selfies/confirm
```

3. Event photo upload
- Request presigned PUT URL
```http
POST /api/v1/photos/presign
```
- Upload file directly to S3 with returned `uploadUrl`
- Confirm upload and enqueue processing
```http
POST /api/v1/photos/confirm
```

4. Fetch matches (paginated)
```http
GET /api/v1/matches?userId=...&eventId=...&cursor=...&limit=20
```

5. Queue a manual rematch (cooldown protected)
```http
POST /api/v1/matches/refresh
Body: { "userId": "...", "eventId": "..." }
```

<!--
6. Download selected photos
```http
POST /api/v1/downloads
Body: { "userId": "...", "eventId": "...", "photoIds": ["photo1", "photo2"] }
```
```http
GET /api/v1/downloads/:downloadId?userId=...
```
```http
POST /api/v1/downloads/links
Body: { "userId": "...", "eventId": "...", "photoIds": ["photo1", "photo2"] }
```
-->

## Curl E2E Script
Run the full flow (create event -> presign -> upload -> confirm -> matches -> health):

```bash
cd backend
./scripts/e2e-curl-flow.sh ./selfie.jpg ./event-photo-1.jpg
```

Optional overrides:

```bash
BASE_URL="http://localhost:4000/api/v1" USER_ID="user_123" ./scripts/e2e-curl-flow.sh ./selfie.jpg ./event-photo-1.jpg
```

## Queue Notes
- `QUEUE_PROVIDER=memory`: local fallback queue.
- `QUEUE_PROVIDER=sqs`: production mode with external queue for horizontally-scaled API/worker instances.
- `QUEUE_BACKPRESSURE_THRESHOLD`: queue depth threshold to trigger high-demand UI messaging.
- Backpressure endpoint: `GET /api/v1/queue/status`.

## CloudFront Setup (Recommended)
Use CloudFront for faster image delivery and better mobile performance.

1. Create a CloudFront distribution:
- Origin: your S3 bucket
- Origin access: `Origin Access Control (OAC)` (keep S3 bucket private)

2. Distribution behavior/cache policy:
- Query strings: `none`
- Headers: minimal
- TTL: start with `1 day` and tune later

3. Update backend env:
```bash
CLOUDFRONT_BASE_URL=https://<your-distribution-domain>
AWS_S3_GET_EXPIRES=86400
```

4. Restart API/worker after env changes.

5. Cache invalidation:
- Not needed for new uploads when object keys are unique.
- Invalidate only if you overwrite the same key.

The matches/download APIs will return CloudFront URLs when `CLOUDFRONT_BASE_URL` is set, and fall back to presigned S3 URLs otherwise.

## Mobile Download UX
- Primary mobile flow: `Save Photos` (opens selected photos directly, no ZIP extraction needed).
- Desktop flow: `Download Selected` (ZIP).
- Mobile still exposes `Download ZIP (Advanced)` as a secondary option.

## Scaling Notes
- Do not run Rekognition in request path for large uploads.
- Use SQS (or Redis streams) for durable job delivery.
- Run multiple worker replicas for parallel processing.
- Keep API stateless; autoscale independently of workers.
- Add CloudFront in front of S3 and set `CLOUDFRONT_BASE_URL` for faster gallery loads.

## Tests
```bash
npm test
```
Includes:
- Joi validation unit tests
- Controller orchestration test
